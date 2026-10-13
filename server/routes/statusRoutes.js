const express = require('express');
const router = express.Router();
const dbManager = require('../dbManager');
const { MongoClient } = require('mongodb');

// Get system & engine status
router.get('/status', (req, res) => {
  const modeInfo = dbManager.getMode();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    success: true,
    engine: modeInfo,
    uptimeSeconds: Math.floor(process.uptime()),
    serverTime: new Date().toISOString(),
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      memory: {
        heapUsedMb: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
        heapTotalMb: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2),
        rssMb: (memoryUsage.rss / 1024 / 1024).toFixed(2)
      }
    }
  });
});

// Switch engine mode (local vs remote)
router.post('/engine/switch', async (req, res) => {
  try {
    const { mode, uri } = req.body;
    if (mode === 'local') {
      const result = await dbManager.switchToLocal();
      return res.json({ success: true, message: 'Switched to Local Scratch Engine', engine: result });
    } else if (mode === 'remote') {
      if (!uri) {
        return res.status(400).json({ success: false, error: 'MongoDB connection URI is required' });
      }
      const result = await dbManager.switchToRemote(uri);
      return res.json({ success: true, message: 'Connected to Remote MongoDB', engine: result });
    } else {
      return res.status(400).json({ success: false, error: "Invalid mode. Choose 'local' or 'remote'." });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test connection URI without switching
router.post('/engine/test-connection', async (req, res) => {
  const { uri } = req.body;
  if (!uri) return res.status(400).json({ success: false, error: 'URI required' });

  let client = null;
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 4000 });
    await client.connect();
    const adminDb = client.db().admin();
    const info = await adminDb.serverStatus();
    await client.close();
    res.json({
      success: true,
      message: 'Connection successful!',
      version: info.version,
      host: info.host
    });
  } catch (err) {
    if (client) {
      try { await client.close(); } catch {}
    }
    res.status(400).json({ success: false, error: `Connection failed: ${err.message}` });
  }
});

module.exports = router;
