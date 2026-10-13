/**
 * DbManager - Unified Controller for Local Scratch Engine & Remote MongoDB
 */

const ScratchEngine = require('./engine/scratchDb');
const mongoAdapter = require('./mongoAdapter');

class DbManager {
  constructor() {
    this.scratchEngine = new ScratchEngine();
    this.mode = 'local'; // 'local' | 'remote'
    this.mongoUri = null;
  }

  getMode() {
    return {
      mode: this.mode,
      isLocal: this.mode === 'local',
      isRemote: this.mode === 'remote',
      connected: this.mode === 'local' ? true : mongoAdapter.isConnected,
      uri: this.mode === 'remote' ? this.mongoUri : 'embedded://scratch-engine',
      engineName: this.mode === 'local' ? 'Scratch NoSQL Engine v1.0 (File-Based WAL)' : 'Official MongoDB Server'
    };
  }

  async switchToLocal() {
    this.mode = 'local';
    return this.getMode();
  }

  async switchToRemote(uri) {
    if (!uri) throw new Error('MongoDB Connection URI is required');
    await mongoAdapter.connect(uri);
    this.mode = 'remote';
    this.mongoUri = uri;
    return this.getMode();
  }

  getActive() {
    return this.mode === 'local' ? this.scratchEngine : mongoAdapter;
  }

  // Proxies
  async listDatabases() {
    return await this.getActive().listDatabases();
  }

  async createDatabase(dbName) {
    return await this.getActive().createDatabase(dbName);
  }

  async dropDatabase(dbName) {
    return await this.getActive().dropDatabase(dbName);
  }

  async listCollections(dbName) {
    return await this.getActive().listCollections(dbName);
  }

  async createCollection(dbName, collName, schema = null) {
    return await this.getActive().createCollection(dbName, collName, schema);
  }

  async dropCollection(dbName, collName) {
    return await this.getActive().dropCollection(dbName, collName);
  }

  async getCollectionStats(dbName, collName) {
    return await this.getActive().getCollectionStats(dbName, collName);
  }

  async getSchema(dbName, collName) {
    return await this.getActive().getSchema(dbName, collName);
  }

  async setSchema(dbName, collName, schema) {
    return await this.getActive().setSchema(dbName, collName, schema);
  }

  async find(dbName, collName, options) {
    return await this.getActive().find(dbName, collName, options);
  }

  async findOne(dbName, collName, filter) {
    return await this.getActive().findOne(dbName, collName, filter);
  }

  async insertOne(dbName, collName, doc) {
    return await this.getActive().insertOne(dbName, collName, doc);
  }

  async insertMany(dbName, collName, docs) {
    return await this.getActive().insertMany(dbName, collName, docs);
  }

  async updateOne(dbName, collName, filter, updateData, options) {
    return await this.getActive().updateOne(dbName, collName, filter, updateData, options);
  }

  async updateMany(dbName, collName, filter, updateData) {
    return await this.getActive().updateMany(dbName, collName, filter, updateData);
  }

  async deleteOne(dbName, collName, filter) {
    return await this.getActive().deleteOne(dbName, collName, filter);
  }

  async deleteMany(dbName, collName, filter) {
    return await this.getActive().deleteMany(dbName, collName, filter);
  }

  async countDocuments(dbName, collName, filter) {
    return await this.getActive().countDocuments(dbName, collName, filter);
  }

  async aggregate(dbName, collName, pipeline) {
    return await this.getActive().aggregate(dbName, collName, pipeline);
  }

  async getIndexes(dbName, collName) {
    return await this.getActive().getIndexes(dbName, collName);
  }

  async createIndex(dbName, collName, field, options) {
    return await this.getActive().createIndex(dbName, collName, field, options);
  }

  async dropIndex(dbName, collName, indexName) {
    return await this.getActive().dropIndex(dbName, collName, indexName);
  }
}

module.exports = new DbManager();
