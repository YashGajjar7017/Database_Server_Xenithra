const express = require('express');
const router = express.Router();
const dbManager = require('../dbManager');

// List all databases
router.get('/databases', async (req, res) => {
  try {
    const databases = await dbManager.listDatabases();
    res.json({ success: true, count: databases.length, databases });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create new database
router.post('/databases', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Database name required' });
    const result = await dbManager.createDatabase(name);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Drop database
router.delete('/databases/:dbName', async (req, res) => {
  try {
    const { dbName } = req.params;
    const result = await dbManager.dropDatabase(dbName);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List collections in a database
router.get('/databases/:dbName/collections', async (req, res) => {
  try {
    const { dbName } = req.params;
    const collections = await dbManager.listCollections(dbName);
    res.json({ success: true, count: collections.length, collections });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create collection
router.post('/databases/:dbName/collections', async (req, res) => {
  try {
    const { dbName } = req.params;
    const { name, schema } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Collection name required' });
    const result = await dbManager.createCollection(dbName, name, schema);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Drop collection
router.delete('/databases/:dbName/collections/:collName', async (req, res) => {
  try {
    const { dbName, collName } = req.params;
    const result = await dbManager.dropCollection(dbName, collName);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Collection stats
router.get('/databases/:dbName/collections/:collName/stats', async (req, res) => {
  try {
    const { dbName, collName } = req.params;
    const stats = await dbManager.getCollectionStats(dbName, collName);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
