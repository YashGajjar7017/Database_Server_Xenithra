/**
 * MongoAdapter - Adapter for Real MongoDB instances (Atlas or Local)
 * Implements the same interface as ScratchEngine so switching is completely transparent.
 */

const { MongoClient, ObjectId } = require('mongodb');

class MongoAdapter {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.currentUri = null;
  }

  async connect(uri) {
    if (this.client) {
      await this.disconnect();
    }
    this.client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    await this.client.connect();
    this.isConnected = true;
    this.currentUri = uri;
    return { connected: true, uri };
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.isConnected = false;
      this.currentUri = null;
    }
  }

  _getDb(dbName) {
    if (!this.isConnected || !this.client) {
      throw new Error('MongoDB client is not connected');
    }
    return this.client.db(dbName);
  }

  _parseFilter(filter) {
    if (!filter) return {};
    const parsed = { ...filter };
    if (parsed._id && typeof parsed._id === 'string' && ObjectId.isValid(parsed._id)) {
      try {
        parsed._id = new ObjectId(parsed._id);
      } catch {}
    }
    return parsed;
  }

  async listDatabases() {
    if (!this.isConnected) return [];
    const adminDb = this.client.db().admin();
    const dbs = await adminDb.listDatabases();
    return dbs.databases.map(d => ({
      name: d.name,
      sizeBytes: d.sizeOnDisk,
      sizeFormatted: `${(d.sizeOnDisk / 1024).toFixed(2)} KB`,
      empty: d.empty
    }));
  }

  async createDatabase(dbName) {
    // MongoDB creates databases on first collection insert
    const db = this._getDb(dbName);
    await db.createCollection('init');
    return { created: true, name: dbName };
  }

  async dropDatabase(dbName) {
    const db = this._getDb(dbName);
    const res = await db.dropDatabase();
    return { dropped: res, name: dbName };
  }

  async listCollections(dbName) {
    const db = this._getDb(dbName);
    const colls = await db.listCollections().toArray();
    const result = [];
    for (const c of colls) {
      if (c.name.startsWith('__')) continue; // Skip internal system collections
      const coll = db.collection(c.name);
      let count = 0;
      try {
        count = await coll.estimatedDocumentCount();
      } catch {}
      result.push({
        name: c.name,
        count,
        hasSchema: false
      });
    }
    return result;
  }

  async createCollection(dbName, collName) {
    const db = this._getDb(dbName);
    await db.createCollection(collName);
    return { created: true, name: collName, db: dbName };
  }

  async dropCollection(dbName, collName) {
    const db = this._getDb(dbName);
    const res = await db.collection(collName).drop();
    return { dropped: res, name: collName };
  }

  async getCollectionStats(dbName, collName) {
    const db = this._getDb(dbName);
    const coll = db.collection(collName);
    const count = await coll.countDocuments();
    return {
      count,
      sizeBytes: 0,
      sizeFormatted: 'Live DB',
      indexesCount: 1,
      hasSchema: false
    };
  }

  async getSchema(dbName, collName) {
    const db = this._getDb(dbName);
    const schemasColl = db.collection('__schemas');
    const record = await schemasColl.findOne({ collection: collName });
    return record?.schema || { enforcement: 'strict', strict: false, fields: {} };
  }

  async setSchema(dbName, collName, schema) {
    const db = this._getDb(dbName);
    const schemasColl = db.collection('__schemas');
    await schemasColl.updateOne(
      { collection: collName },
      { $set: { collection: collName, schema, updatedAt: new Date() } },
      { upsert: true }
    );
    return schema;
  }

  async find(dbName, collName, { filter = {}, sort = null, skip = 0, limit = 50, projection = null } = {}) {
    const db = this._getDb(dbName);
    const coll = db.collection(collName);
    const startTime = Date.now();

    const queryFilter = this._parseFilter(filter);
    const totalCount = await coll.countDocuments(queryFilter);

    let cursor = coll.find(queryFilter);
    if (sort) cursor = cursor.sort(sort);
    if (skip) cursor = cursor.skip(parseInt(skip, 10));
    if (limit) cursor = cursor.limit(parseInt(limit, 10));
    if (projection) cursor = cursor.project(projection);

    const documents = await cursor.toArray();
    const executionTimeMs = Date.now() - startTime;

    return {
      documents: documents.map(d => ({ ...d, _id: d._id.toString() })),
      totalCount,
      count: documents.length,
      skip,
      limit,
      executionTimeMs
    };
  }

  async findOne(dbName, collName, filter = {}) {
    const db = this._getDb(dbName);
    const doc = await db.collection(collName).findOne(this._parseFilter(filter));
    return doc ? { ...doc, _id: doc._id.toString() } : null;
  }

  async insertOne(dbName, collName, doc) {
    const db = this._getDb(dbName);
    const toInsert = { ...doc };
    if (!toInsert.createdAt) toInsert.createdAt = new Date().toISOString();
    toInsert.updatedAt = new Date().toISOString();

    const res = await db.collection(collName).insertOne(toInsert);
    return { ...toInsert, _id: res.insertedId.toString() };
  }

  async insertMany(dbName, collName, docs) {
    const db = this._getDb(dbName);
    const formatted = docs.map(d => ({
      ...d,
      createdAt: d.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    const res = await db.collection(collName).insertMany(formatted);
    return {
      acknowledged: res.acknowledged,
      insertedCount: res.insertedCount,
      insertedIds: Object.values(res.insertedIds).map(id => id.toString())
    };
  }

  async updateOne(dbName, collName, filter, updateData) {
    const db = this._getDb(dbName);
    const parsedFilter = this._parseFilter(filter);
    const updatePayload = updateData.$set ? updateData : { $set: updateData };
    if (updatePayload.$set) {
      updatePayload.$set.updatedAt = new Date().toISOString();
    }
    const res = await db.collection(collName).updateOne(parsedFilter, updatePayload);
    return { matchedCount: res.matchedCount, modifiedCount: res.modifiedCount };
  }

  async updateMany(dbName, collName, filter, updateData) {
    const db = this._getDb(dbName);
    const parsedFilter = this._parseFilter(filter);
    const updatePayload = updateData.$set ? updateData : { $set: updateData };
    const res = await db.collection(collName).updateMany(parsedFilter, updatePayload);
    return { matchedCount: res.matchedCount, modifiedCount: res.modifiedCount };
  }

  async deleteOne(dbName, collName, filter) {
    const db = this._getDb(dbName);
    const res = await db.collection(collName).deleteOne(this._parseFilter(filter));
    return { acknowledged: res.acknowledged, deletedCount: res.deletedCount };
  }

  async deleteMany(dbName, collName, filter) {
    const db = this._getDb(dbName);
    const res = await db.collection(collName).deleteMany(this._parseFilter(filter));
    return { acknowledged: res.acknowledged, deletedCount: res.deletedCount };
  }

  async countDocuments(dbName, collName, filter = {}) {
    const db = this._getDb(dbName);
    return await db.collection(collName).countDocuments(this._parseFilter(filter));
  }

  async aggregate(dbName, collName, pipeline) {
    const db = this._getDb(dbName);
    const startTime = Date.now();
    const result = await db.collection(collName).aggregate(pipeline).toArray();
    const executionTimeMs = Date.now() - startTime;
    return {
      result: result.map(d => ({ ...d, _id: d._id?.toString ? d._id.toString() : d._id })),
      count: result.length,
      executionTimeMs
    };
  }

  async getIndexes(dbName, collName) {
    const db = this._getDb(dbName);
    const list = await db.collection(collName).indexes();
    return list.map(idx => ({
      name: idx.name,
      field: Object.keys(idx.key)[0],
      unique: !!idx.unique
    }));
  }

  async createIndex(dbName, collName, field, options = {}) {
    const db = this._getDb(dbName);
    const name = await db.collection(collName).createIndex({ [field]: 1 }, options);
    return { name, field, unique: !!options.unique };
  }

  async dropIndex(dbName, collName, indexName) {
    const db = this._getDb(dbName);
    const res = await db.collection(collName).dropIndex(indexName);
    return { dropped: res, name: indexName };
  }
}

module.exports = new MongoAdapter();
