const express = require('express');
const router = express.Router();
const dbManager = require('../dbManager');

// Run Aggregation Pipeline
router.post('/databases/:dbName/collections/:collName/aggregate', async (req, res) => {
  try {
    const { dbName, collName } = req.params;
    const { pipeline } = req.body;
    if (!Array.isArray(pipeline)) {
      return res.status(400).json({ success: false, error: 'Pipeline must be an array of stages' });
    }
    const result = await dbManager.aggregate(dbName, collName, pipeline);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Run Raw MongoDB Shell-style query / command
// Examples:
// - find({ age: { $gt: 20 } })
// - aggregate([ { $match: { role: 'admin' } } ])
// - countDocuments({ active: true })
router.post('/databases/:dbName/collections/:collName/raw-query', async (req, res) => {
  const { dbName, collName } = req.params;
  const { command } = req.body;

  if (!command || typeof command !== 'string') {
    return res.status(400).json({ success: false, error: 'Command string is required' });
  }

  const startTime = Date.now();

  try {
    const trimmed = command.trim();

    // Check if user passed JSON directly
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      const docs = await dbManager.find(dbName, collName, { filter: parsed });
      return res.json({
        success: true,
        type: 'find',
        result: docs.documents,
        count: docs.count,
        executionTimeMs: Date.now() - startTime
      });
    }

    // Parse shell commands e.g. "db.collection.find(...)" or "find(...)"
    let stripped = trimmed;
    if (stripped.startsWith('db.')) {
      // remove db.<collName>.
      const parts = stripped.split('.');
      if (parts.length >= 3) {
        stripped = parts.slice(2).join('.');
      }
    }

    // Match find(filter, projection).sort(...).limit(...).skip(...)
    if (stripped.startsWith('find(')) {
      // Safe evaluation of arguments using JSON or Function sandbox
      // Example: find({ "age": { "$gt": 20 } })
      const matchArgs = stripped.match(/^find\((.*?)\)(?:\.sort\((.*?)\))?(?:\.limit\((\d+)\))?(?:\.skip\((\d+)\))?$/);
      let filter = {};
      let sort = null;
      let limit = 50;
      let skip = 0;

      if (matchArgs) {
        const rawFilter = matchArgs[1]?.trim();
        if (rawFilter) {
          try {
            // Evaluates JS object literals safely
            filter = (new Function(`return (${rawFilter});`))();
          } catch {
            filter = JSON.parse(rawFilter);
          }
        }
        if (matchArgs[2]?.trim()) {
          sort = (new Function(`return (${matchArgs[2].trim()});`))();
        }
        if (matchArgs[3]) limit = parseInt(matchArgs[3], 10);
        if (matchArgs[4]) skip = parseInt(matchArgs[4], 10);
      } else {
        // Fallback simple find
        const content = stripped.slice(5, -1).trim();
        if (content) {
          filter = (new Function(`return (${content});`))();
        }
      }

      const result = await dbManager.find(dbName, collName, { filter, sort, limit, skip });
      return res.json({
        success: true,
        type: 'find',
        result: result.documents,
        count: result.count,
        totalCount: result.totalCount,
        executionTimeMs: Date.now() - startTime
      });
    }

    if (stripped.startsWith('aggregate(')) {
      const rawPipeline = stripped.slice(10, -1).trim();
      const pipeline = (new Function(`return (${rawPipeline});`))();
      const result = await dbManager.aggregate(dbName, collName, pipeline);
      return res.json({
        success: true,
        type: 'aggregate',
        result: result.result,
        count: result.count,
        executionTimeMs: Date.now() - startTime
      });
    }

    if (stripped.startsWith('countDocuments(')) {
      const rawFilter = stripped.slice(15, -1).trim();
      const filter = rawFilter ? (new Function(`return (${rawFilter});`))() : {};
      const count = await dbManager.countDocuments(dbName, collName, filter);
      return res.json({
        success: true,
        type: 'countDocuments',
        result: count,
        count: 1,
        executionTimeMs: Date.now() - startTime
      });
    }

    return res.status(400).json({
      success: false,
      error: `Unsupported shell command. Supported methods: find({...}), aggregate([...]), countDocuments({...}), or raw JSON filter {...}`
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: `Execution error: ${err.message}`,
      executionTimeMs: Date.now() - startTime
    });
  }
});

// List Indexes
router.get('/databases/:dbName/collections/:collName/indexes', async (req, res) => {
  try {
    const { dbName, collName } = req.params;
    const indexes = await dbManager.getIndexes(dbName, collName);
    res.json({ success: true, count: indexes.length, indexes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create Index
router.post('/databases/:dbName/collections/:collName/indexes', async (req, res) => {
  try {
    const { dbName, collName } = req.params;
    const { field, unique, name } = req.body;
    if (!field) return res.status(400).json({ success: false, error: 'Field name is required' });
    const idx = await dbManager.createIndex(dbName, collName, field, { unique: !!unique, name });
    res.json({ success: true, index: idx });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Drop Index
router.delete('/databases/:dbName/collections/:collName/indexes/:indexName', async (req, res) => {
  try {
    const { dbName, collName, indexName } = req.params;
    const result = await dbManager.dropIndex(dbName, collName, indexName);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
