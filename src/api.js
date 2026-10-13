/**
 * API client helper to interact with Express backend
 */

const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  // Status & Engine
  getStatus: () => request('/status'),
  switchEngine: (mode, uri) => request('/engine/switch', { method: 'POST', body: JSON.stringify({ mode, uri }) }),
  testConnection: (uri) => request('/engine/test-connection', { method: 'POST', body: JSON.stringify({ uri }) }),

  // Databases & Collections
  getDatabases: () => request('/databases'),
  createDatabase: (name) => request('/databases', { method: 'POST', body: JSON.stringify({ name }) }),
  dropDatabase: (name) => request(`/databases/${name}`, { method: 'DELETE' }),

  getCollections: (db) => request(`/databases/${db}/collections`),
  createCollection: (db, name, schema) => request(`/databases/${db}/collections`, { method: 'POST', body: JSON.stringify({ name, schema }) }),
  dropCollection: (db, name) => request(`/databases/${db}/collections/${name}`, { method: 'DELETE' }),
  getCollectionStats: (db, name) => request(`/databases/${db}/collections/${name}/stats`),

  // Schemas
  getSchema: (db, coll) => request(`/databases/${db}/collections/${coll}/schema`),
  saveSchema: (db, coll, schema) => request(`/databases/${db}/collections/${coll}/schema`, { method: 'PUT', body: JSON.stringify({ schema }) }),
  validateDocument: (db, coll, document, customSchema) => request(`/databases/${db}/collections/${coll}/schema/validate`, { method: 'POST', body: JSON.stringify({ document, customSchema }) }),

  // Documents
  queryDocuments: (db, coll, params) => request(`/databases/${db}/collections/${coll}/query`, { method: 'POST', body: JSON.stringify(params) }),
  insertDocument: (db, coll, doc) => request(`/databases/${db}/collections/${coll}/documents`, { method: 'POST', body: JSON.stringify(doc) }),
  updateDocument: (db, coll, id, doc) => request(`/databases/${db}/collections/${coll}/documents/${id}`, { method: 'PUT', body: JSON.stringify(doc) }),
  deleteDocument: (db, coll, id) => request(`/databases/${db}/collections/${coll}/documents/${id}`, { method: 'DELETE' }),

  // Query & Aggregation
  aggregate: (db, coll, pipeline) => request(`/databases/${db}/collections/${coll}/aggregate`, { method: 'POST', body: JSON.stringify({ pipeline }) }),
  rawQuery: (db, coll, command) => request(`/databases/${db}/collections/${coll}/raw-query`, { method: 'POST', body: JSON.stringify({ command }) }),

  // Indexes
  getIndexes: (db, coll) => request(`/databases/${db}/collections/${coll}/indexes`),
  createIndex: (db, coll, field, unique) => request(`/databases/${db}/collections/${coll}/indexes`, { method: 'POST', body: JSON.stringify({ field, unique }) }),
  dropIndex: (db, coll, indexName) => request(`/databases/${db}/collections/${coll}/indexes/${indexName}`, { method: 'DELETE' }),

  // Import / Export
  importData: (db, coll, format, content) => request(`/databases/${db}/collections/${coll}/import`, { method: 'POST', body: JSON.stringify({ format, content }) })
};
