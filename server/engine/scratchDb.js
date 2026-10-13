/**
 * ScratchEngine - A Full-Featured NoSQL Document Database Engine Built from Scratch
 * Features:
 * - Atomic write file persistence (WAL/rename)
 * - Multi-database and multi-collection support
 * - MongoDB-compatible 24-char ObjectId generator
 * - Query evaluation, aggregation pipeline, index management, dynamic schema enforcement
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { filterDocuments, sortDocuments, projectDocument, matchesQuery, getNestedValue } = require('./queryEngine');
const { validateDocument } = require('./schemaValidator');
const indexManager = require('./indexManager');
const { executePipeline } = require('./aggregationEngine');

// Generate 24-character hex MongoDB-like ObjectId
function generateObjectId() {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const randomBytes = crypto.randomBytes(8).toString('hex');
  return (timestamp + randomBytes).slice(0, 24);
}

class ScratchEngine {
  constructor(baseDataDir = null) {
    this.baseDir = baseDataDir || path.resolve(__dirname, '../../data/databases');
    this.cache = new Map(); // dbName::collName => { documents, schema, indexes, isLoaded }
    this.ensureDir(this.baseDir);
  }

  ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  _getCollKey(dbName, collName) {
    return `${dbName}::${collName}`;
  }

  _getDbPath(dbName) {
    return path.join(this.baseDir, dbName);
  }

  _getCollPath(dbName, collName) {
    return path.join(this.baseDir, dbName, collName);
  }

  // Atomic file write using temporary file + rename
  _writeFileAtomic(filePath, data) {
    this.ensureDir(path.dirname(filePath));
    const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(2)}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  }

  // Load collection into memory cache
  _loadCollection(dbName, collName) {
    const key = this._getCollKey(dbName, collName);
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const collPath = this._getCollPath(dbName, collName);
    this.ensureDir(collPath);

    const docsFile = path.join(collPath, 'documents.json');
    const schemaFile = path.join(collPath, 'schema.json');
    const indexesFile = path.join(collPath, 'indexes.json');

    let documents = [];
    if (fs.existsSync(docsFile)) {
      try {
        const raw = fs.readFileSync(docsFile, 'utf-8');
        documents = JSON.parse(raw);
        if (!Array.isArray(documents)) documents = [];
      } catch (e) {
        console.error(`Error loading documents for ${key}:`, e.message);
        documents = [];
      }
    } else {
      this._writeFileAtomic(docsFile, []);
    }

    let schema = null;
    if (fs.existsSync(schemaFile)) {
      try {
        schema = JSON.parse(fs.readFileSync(schemaFile, 'utf-8'));
      } catch (e) {
        schema = null;
      }
    }

    let indexes = [];
    if (fs.existsSync(indexesFile)) {
      try {
        indexes = JSON.parse(fs.readFileSync(indexesFile, 'utf-8'));
        if (Array.isArray(indexes)) {
          for (const idx of indexes) {
            indexManager.ensureIndex(dbName, collName, idx.field, { name: idx.name, unique: idx.unique });
          }
        }
      } catch (e) {
        indexes = [];
      }
    }

    // Rebuild in-memory indexes
    indexManager.rebuildAll(dbName, collName, documents);

    const collData = { documents, schema, indexes, isLoaded: true };
    this.cache.set(key, collData);
    return collData;
  }

  // Flush in-memory collection back to disk
  _persistCollection(dbName, collName) {
    const key = this._getCollKey(dbName, collName);
    const collData = this.cache.get(key);
    if (!collData) return;

    const collPath = this._getCollPath(dbName, collName);
    const docsFile = path.join(collPath, 'documents.json');
    this._writeFileAtomic(docsFile, collData.documents);
  }

  // Flush schema to disk
  _persistSchema(dbName, collName) {
    const key = this._getCollKey(dbName, collName);
    const collData = this.cache.get(key);
    if (!collData) return;

    const collPath = this._getCollPath(dbName, collName);
    const schemaFile = path.join(collPath, 'schema.json');
    this._writeFileAtomic(schemaFile, collData.schema || {});
  }

  // Flush indexes to disk
  _persistIndexes(dbName, collName) {
    const collPath = this._getCollPath(dbName, collName);
    const indexesFile = path.join(collPath, 'indexes.json');
    const indexes = indexManager.getIndexes(dbName, collName).filter(i => i.name !== '_id_');
    this._writeFileAtomic(indexesFile, indexes);
  }

  // === Database & Collection Operations ===

  listDatabases() {
    this.ensureDir(this.baseDir);
    const entries = fs.readdirSync(this.baseDir, { withFileTypes: true });
    const databases = [];

    for (const ent of entries) {
      if (ent.isDirectory()) {
        const dbPath = path.join(this.baseDir, ent.name);
        const collEntries = fs.readdirSync(dbPath, { withFileTypes: true }).filter(c => c.isDirectory());
        let totalDocs = 0;
        let totalBytes = 0;

        for (const c of collEntries) {
          const docFile = path.join(dbPath, c.name, 'documents.json');
          if (fs.existsSync(docFile)) {
            const stat = fs.statSync(docFile);
            totalBytes += stat.size;
            try {
              const count = JSON.parse(fs.readFileSync(docFile, 'utf-8')).length;
              totalDocs += count;
            } catch {}
          }
        }

        databases.push({
          name: ent.name,
          collectionsCount: collEntries.length,
          totalDocuments: totalDocs,
          sizeBytes: totalBytes,
          sizeFormatted: `${(totalBytes / 1024).toFixed(2)} KB`
        });
      }
    }

    return databases;
  }

  createDatabase(dbName) {
    if (!dbName || !/^[a-zA-Z0-9_-]+$/.test(dbName)) {
      throw new Error('Invalid database name. Only alphanumeric, dashes, and underscores allowed.');
    }
    const dbPath = this._getDbPath(dbName);
    if (fs.existsSync(dbPath)) {
      return { created: false, message: 'Database already exists' };
    }
    this.ensureDir(dbPath);
    return { created: true, name: dbName };
  }

  dropDatabase(dbName) {
    const dbPath = this._getDbPath(dbName);
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { recursive: true, force: true });
      // clear cache for this db
      for (const key of Array.from(this.cache.keys())) {
        if (key.startsWith(`${dbName}::`)) {
          this.cache.delete(key);
        }
      }
      return { dropped: true, name: dbName };
    }
    return { dropped: false, message: 'Database not found' };
  }

  listCollections(dbName) {
    const dbPath = this._getDbPath(dbName);
    if (!fs.existsSync(dbPath)) {
      return [];
    }

    const entries = fs.readdirSync(dbPath, { withFileTypes: true });
    const collections = [];

    for (const ent of entries) {
      if (ent.isDirectory()) {
        const stats = this.getCollectionStats(dbName, ent.name);
        collections.push({
          name: ent.name,
          ...stats
        });
      }
    }

    return collections;
  }

  createCollection(dbName, collName, schema = null) {
    if (!collName || !/^[a-zA-Z0-9_-]+$/.test(collName)) {
      throw new Error('Invalid collection name.');
    }
    const collPath = this._getCollPath(dbName, collName);
    this.ensureDir(collPath);

    const coll = this._loadCollection(dbName, collName);
    if (schema) {
      coll.schema = schema;
      this._persistSchema(dbName, collName);
    }
    return { created: true, name: collName, db: dbName };
  }

  dropCollection(dbName, collName) {
    const collPath = this._getCollPath(dbName, collName);
    if (fs.existsSync(collPath)) {
      fs.rmSync(collPath, { recursive: true, force: true });
      this.cache.delete(this._getCollKey(dbName, collName));
      return { dropped: true, name: collName };
    }
    return { dropped: false, message: 'Collection not found' };
  }

  getCollectionStats(dbName, collName) {
    const coll = this._loadCollection(dbName, collName);
    const collPath = this._getCollPath(dbName, collName);
    const docFile = path.join(collPath, 'documents.json');
    let sizeBytes = 0;
    if (fs.existsSync(docFile)) {
      sizeBytes = fs.statSync(docFile).size;
    }

    return {
      count: coll.documents.length,
      sizeBytes,
      sizeFormatted: `${(sizeBytes / 1024).toFixed(2)} KB`,
      indexesCount: indexManager.getIndexes(dbName, collName).length,
      hasSchema: !!coll.schema && Object.keys(coll.schema.fields || {}).length > 0
    };
  }

  // === Schema Management ===

  getSchema(dbName, collName) {
    const coll = this._loadCollection(dbName, collName);
    return coll.schema || {
      enforcement: 'strict',
      strict: false,
      fields: {}
    };
  }

  setSchema(dbName, collName, schema) {
    const coll = this._loadCollection(dbName, collName);
    coll.schema = schema;
    this._persistSchema(dbName, collName);

    // If schema defines unique fields, register indexes
    if (schema && schema.fields) {
      for (const [fieldName, rule] of Object.entries(schema.fields)) {
        if (rule.unique) {
          indexManager.ensureIndex(dbName, collName, fieldName, { unique: true });
        }
      }
      this._persistIndexes(dbName, collName);
    }

    return coll.schema;
  }

  // === CRUD Operations ===

  find(dbName, collName, { filter = {}, sort = null, skip = 0, limit = 50, projection = null } = {}) {
    const coll = this._loadCollection(dbName, collName);
    const startTime = Date.now();

    // 1. Filter
    let matched = filterDocuments(coll.documents, filter);
    const totalCount = matched.length;

    // 2. Sort
    if (sort) {
      matched = sortDocuments(matched, sort);
    }

    // 3. Skip & Limit
    const start = Math.max(0, parseInt(skip, 10) || 0);
    const lim = Math.max(1, parseInt(limit, 10) || 50);
    const paginated = matched.slice(start, start + lim);

    // 4. Projection
    const finalDocs = paginated.map(doc => projectDocument(doc, projection));
    const executionTimeMs = Date.now() - startTime;

    return {
      documents: finalDocs,
      totalCount,
      count: finalDocs.length,
      skip: start,
      limit: lim,
      executionTimeMs
    };
  }

  findOne(dbName, collName, filter = {}) {
    const coll = this._loadCollection(dbName, collName);
    const doc = coll.documents.find(d => matchesQuery(d, filter));
    return doc ? { ...doc } : null;
  }

  insertOne(dbName, collName, doc) {
    const coll = this._loadCollection(dbName, collName);

    // Clone doc
    let newDoc = { ...doc };

    // Assign _id if missing
    if (!newDoc._id) {
      newDoc._id = generateObjectId();
    } else {
      newDoc._id = String(newDoc._id);
    }

    // Assign timestamps
    const now = new Date().toISOString();
    if (!newDoc.createdAt) newDoc.createdAt = now;
    newDoc.updatedAt = now;

    // Validate against schema
    if (coll.schema) {
      const validation = validateDocument(newDoc, coll.schema);
      if (!validation.valid) {
        const msg = validation.errors.map(e => e.message).join('; ');
        throw new Error(`Schema Validation Error: ${msg}`);
      }
      newDoc = validation.sanitizedDoc;
    }

    // Check unique constraints & indexes
    indexManager.checkUniqueConstraint(dbName, collName, newDoc);

    // Insert
    coll.documents.push(newDoc);
    indexManager.addToIndex(dbName, collName, '_id_', newDoc);

    // Update custom indexes
    const indexes = indexManager.getIndexes(dbName, collName);
    for (const idx of indexes) {
      if (idx.name !== '_id_') {
        indexManager.addToIndex(dbName, collName, idx.name, newDoc);
      }
    }

    this._persistCollection(dbName, collName);
    return newDoc;
  }

  insertMany(dbName, collName, docs) {
    if (!Array.isArray(docs)) {
      throw new Error('docs must be an array');
    }
    const inserted = [];
    for (const doc of docs) {
      inserted.push(this.insertOne(dbName, collName, doc));
    }
    return {
      acknowledged: true,
      insertedCount: inserted.length,
      insertedIds: inserted.map(d => d._id)
    };
  }

  updateOne(dbName, collName, filter, updateData, options = {}) {
    const coll = this._loadCollection(dbName, collName);
    const index = coll.documents.findIndex(d => matchesQuery(d, filter));

    if (index === -1) {
      if (options.upsert) {
        const newDoc = { ...filter, ...(updateData.$set || updateData) };
        const inserted = this.insertOne(dbName, collName, newDoc);
        return { matchedCount: 0, modifiedCount: 1, upsertedId: inserted._id };
      }
      return { matchedCount: 0, modifiedCount: 0 };
    }

    const existingDoc = coll.documents[index];
    let updatedDoc = { ...existingDoc };

    // Support MongoDB update operators: $set, $unset, $inc
    if (updateData && (updateData.$set || updateData.$unset || updateData.$inc)) {
      if (updateData.$set) {
        Object.assign(updatedDoc, updateData.$set);
      }
      if (updateData.$unset) {
        for (const field of Object.keys(updateData.$unset)) {
          delete updatedDoc[field];
        }
      }
      if (updateData.$inc) {
        for (const [field, incVal] of Object.entries(updateData.$inc)) {
          updatedDoc[field] = (Number(updatedDoc[field]) || 0) + Number(incVal);
        }
      }
    } else {
      // Direct replacement
      updatedDoc = { ...updateData, _id: existingDoc._id, createdAt: existingDoc.createdAt };
    }

    updatedDoc.updatedAt = new Date().toISOString();

    // Validate against schema
    if (coll.schema) {
      const validation = validateDocument(updatedDoc, coll.schema);
      if (!validation.valid) {
        const msg = validation.errors.map(e => e.message).join('; ');
        throw new Error(`Schema Validation Error: ${msg}`);
      }
      updatedDoc = validation.sanitizedDoc;
    }

    // Check unique constraints excluding existing document
    indexManager.checkUniqueConstraint(dbName, collName, updatedDoc, existingDoc._id);

    // Update in-memory index
    indexManager.removeFromIndex(dbName, collName, existingDoc);
    coll.documents[index] = updatedDoc;

    const indexes = indexManager.getIndexes(dbName, collName);
    for (const idx of indexes) {
      if (idx.name !== '_id_') {
        indexManager.addToIndex(dbName, collName, idx.name, updatedDoc);
      }
    }

    this._persistCollection(dbName, collName);
    return { matchedCount: 1, modifiedCount: 1, document: updatedDoc };
  }

  updateMany(dbName, collName, filter, updateData) {
    const coll = this._loadCollection(dbName, collName);
    let modifiedCount = 0;

    for (let i = 0; i < coll.documents.length; i++) {
      if (matchesQuery(coll.documents[i], filter)) {
        this.updateOne(dbName, collName, { _id: coll.documents[i]._id }, updateData);
        modifiedCount++;
      }
    }

    return { matchedCount: modifiedCount, modifiedCount };
  }

  deleteOne(dbName, collName, filter) {
    const coll = this._loadCollection(dbName, collName);
    const index = coll.documents.findIndex(d => matchesQuery(d, filter));

    if (index === -1) {
      return { acknowledged: true, deletedCount: 0 };
    }

    const removed = coll.documents.splice(index, 1)[0];
    indexManager.removeFromIndex(dbName, collName, removed);
    this._persistCollection(dbName, collName);

    return { acknowledged: true, deletedCount: 1, deletedDoc: removed };
  }

  deleteMany(dbName, collName, filter) {
    const coll = this._loadCollection(dbName, collName);
    const beforeCount = coll.documents.length;
    const remaining = [];
    let deletedCount = 0;

    for (const doc of coll.documents) {
      if (matchesQuery(doc, filter)) {
        indexManager.removeFromIndex(dbName, collName, doc);
        deletedCount++;
      } else {
        remaining.push(doc);
      }
    }

    coll.documents = remaining;
    this._persistCollection(dbName, collName);

    return { acknowledged: true, deletedCount };
  }

  countDocuments(dbName, collName, filter = {}) {
    const coll = this._loadCollection(dbName, collName);
    return filterDocuments(coll.documents, filter).length;
  }

  // === Aggregation ===
  aggregate(dbName, collName, pipeline) {
    const coll = this._loadCollection(dbName, collName);
    const startTime = Date.now();
    const result = executePipeline(coll.documents, pipeline);
    const executionTimeMs = Date.now() - startTime;
    return {
      result,
      count: result.length,
      executionTimeMs
    };
  }

  // === Indexes ===
  createIndex(dbName, collName, field, options = {}) {
    const coll = this._loadCollection(dbName, collName);
    const idx = indexManager.ensureIndex(dbName, collName, field, options);
    indexManager.rebuildAll(dbName, collName, coll.documents);
    this._persistIndexes(dbName, collName);
    return idx;
  }

  getIndexes(dbName, collName) {
    return indexManager.getIndexes(dbName, collName);
  }

  dropIndex(dbName, collName, indexName) {
    const res = indexManager.dropIndex(dbName, collName, indexName);
    this._persistIndexes(dbName, collName);
    return { dropped: res, name: indexName };
  }
}

module.exports = ScratchEngine;
