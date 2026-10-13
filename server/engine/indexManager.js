/**
 * IndexManager - Handles in-memory secondary and unique indexes for fast lookups
 * and constraint enforcement.
 */

class IndexManager {
  constructor() {
    // collectionKey => Map(indexName => { field, unique, map: Map(val => Set(docId)) })
    this.indexes = new Map();
  }

  _getKey(dbName, collectionName) {
    return `${dbName}::${collectionName}`;
  }

  ensureIndex(dbName, collectionName, field, options = {}) {
    const collKey = this._getKey(dbName, collectionName);
    if (!this.indexes.has(collKey)) {
      this.indexes.set(collKey, new Map());
    }

    const collIndexes = this.indexes.get(collKey);
    const indexName = options.name || `${field}_1`;

    if (!collIndexes.has(indexName)) {
      collIndexes.set(indexName, {
        name: indexName,
        field,
        unique: !!options.unique,
        map: new Map() // indexedValue => Set(docId)
      });
    }

    return collIndexes.get(indexName);
  }

  rebuildAll(dbName, collectionName, documents) {
    const collKey = this._getKey(dbName, collectionName);
    const collIndexes = this.indexes.get(collKey);
    if (!collIndexes) return;

    for (const index of collIndexes.values()) {
      index.map.clear();
      for (const doc of documents) {
        this.addToIndex(dbName, collectionName, index.name, doc);
      }
    }
  }

  addToIndex(dbName, collectionName, indexName, doc) {
    const collKey = this._getKey(dbName, collectionName);
    const collIndexes = this.indexes.get(collKey);
    if (!collIndexes) return;

    const index = collIndexes.get(indexName);
    if (!index) return;

    const val = doc[index.field];
    if (val === undefined) return;

    const serializedVal = JSON.stringify(val);
    if (index.unique) {
      const existing = index.map.get(serializedVal);
      if (existing && existing.size > 0 && !existing.has(doc._id)) {
        throw new Error(`Duplicate key error: index '${index.name}' requires unique values for field '${index.field}'. Duplicate value: ${JSON.stringify(val)}`);
      }
    }

    if (!index.map.has(serializedVal)) {
      index.map.set(serializedVal, new Set());
    }
    index.map.get(serializedVal).add(doc._id);
  }

  removeFromIndex(dbName, collectionName, doc) {
    const collKey = this._getKey(dbName, collectionName);
    const collIndexes = this.indexes.get(collKey);
    if (!collIndexes) return;

    for (const index of collIndexes.values()) {
      const val = doc[index.field];
      if (val === undefined) continue;
      const serializedVal = JSON.stringify(val);
      const set = index.map.get(serializedVal);
      if (set) {
        set.delete(doc._id);
        if (set.size === 0) index.map.delete(serializedVal);
      }
    }
  }

  checkUniqueConstraint(dbName, collectionName, doc, excludeDocId = null) {
    const collKey = this._getKey(dbName, collectionName);
    const collIndexes = this.indexes.get(collKey);
    if (!collIndexes) return;

    for (const index of collIndexes.values()) {
      if (!index.unique) continue;
      const val = doc[index.field];
      if (val === undefined || val === null) continue;

      const serializedVal = JSON.stringify(val);
      const existing = index.map.get(serializedVal);
      if (existing) {
        for (const existingId of existing) {
          if (existingId !== excludeDocId) {
            throw new Error(`Duplicate key error: index '${index.name}' requires unique values for field '${index.field}'. Value '${val}' already exists.`);
          }
        }
      }
    }
  }

  getIndexes(dbName, collectionName) {
    const collKey = this._getKey(dbName, collectionName);
    const collIndexes = this.indexes.get(collKey);
    if (!collIndexes) {
      return [{ name: '_id_', field: '_id', unique: true }];
    }

    const list = [{ name: '_id_', field: '_id', unique: true }];
    for (const [name, idx] of collIndexes.entries()) {
      list.push({
        name,
        field: idx.field,
        unique: idx.unique
      });
    }
    return list;
  }

  dropIndex(dbName, collectionName, indexName) {
    if (indexName === '_id_') {
      throw new Error("Cannot drop default '_id_' index");
    }
    const collKey = this._getKey(dbName, collectionName);
    const collIndexes = this.indexes.get(collKey);
    if (collIndexes) {
      return collIndexes.delete(indexName);
    }
    return false;
  }
}

module.exports = new IndexManager();
