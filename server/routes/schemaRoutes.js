const express = require('express');
const router = express.Router();
const dbManager = require('../dbManager');
const { validateDocument } = require('../engine/schemaValidator');

// Get schema for collection
router.get('/databases/:dbName/collections/:collName/schema', async (req, res) => {
  try {
    const { dbName, collName } = req.params;
    const schema = await dbManager.getSchema(dbName, collName);
    res.json({ success: true, schema });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update / Save schema for collection
router.put('/databases/:dbName/collections/:collName/schema', async (req, res) => {
  try {
    const { dbName, collName } = req.params;
    const { schema } = req.body;
    if (!schema) return res.status(400).json({ success: false, error: 'Schema object required' });
    const saved = await dbManager.setSchema(dbName, collName, schema);
    res.json({ success: true, message: 'Schema updated successfully', schema: saved });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Test validation against schema
router.post('/databases/:dbName/collections/:collName/schema/validate', async (req, res) => {
  try {
    const { dbName, collName } = req.params;
    const { document, customSchema } = req.body;
    const schemaToUse = customSchema || (await dbManager.getSchema(dbName, collName));
    const result = validateDocument(document, schemaToUse);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
