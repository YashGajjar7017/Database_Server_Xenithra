const express = require('express');
const router = express.Router();
const dbManager = require('../dbManager');

// Query documents (POST /query to allow complex filter and projection objects)
router.post('/databases/:dbName/collections/:collName/query', async (req, res) => {
  try {
    const { dbName, collName } = req.params;
    const { filter = {}, sort = null, skip = 0, limit = 50, projection = null } = req.body;
    
    const result = await dbManager.find(dbName, collName, {
      filter,
      sort,
      skip,
      limit,
      projection
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single document by ID
router.get('/databases/:dbName/collections/:collName/documents/:id', async (req, res) => {
  try {
    const { dbName, collName, id } = req.params;
    const doc = await dbManager.findOne(dbName, collName, { _id: id });
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    res.json({ success: true, document: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Insert single document
router.post('/databases/:dbName/collections/:collName/documents', async (req, res) => {
  try {
    const { dbName, collName } = req.params;
    const doc = req.body;
    if (!doc || typeof doc !== 'object') {
      return res.status(400).json({ success: false, error: 'Document body must be an object' });
    }
    const inserted = await dbManager.insertOne(dbName, collName, doc);
    res.status(201).json({ success: true, document: inserted });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Insert multiple documents
router.post('/databases/:dbName/collections/:collName/documents/batch', async (req, res) => {
  try {
    const { dbName, collName } = req.params;
    const { documents } = req.body;
    if (!Array.isArray(documents)) {
      return res.status(400).json({ success: false, error: 'documents must be an array' });
    }
    const result = await dbManager.insertMany(dbName, collName, documents);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update document by ID
router.put('/databases/:dbName/collections/:collName/documents/:id', async (req, res) => {
  try {
    const { dbName, collName, id } = req.params;
    const updateData = req.body;
    const result = await dbManager.updateOne(dbName, collName, { _id: id }, updateData);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Delete document by ID
router.delete('/databases/:dbName/collections/:collName/documents/:id', async (req, res) => {
  try {
    const { dbName, collName, id } = req.params;
    const result = await dbManager.deleteOne(dbName, collName, { _id: id });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete many with filter
router.delete('/databases/:dbName/collections/:collName/documents', async (req, res) => {
  try {
    const { dbName, collName } = req.params;
    const { filter = {} } = req.body;
    const result = await dbManager.deleteMany(dbName, collName, filter);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
