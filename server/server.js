const express = require('express');
const cors = require('cors');
const path = require('path');
const { seedDefaultData } = require('./defaultData');

const statusRoutes = require('./routes/statusRoutes');
const databaseRoutes = require('./routes/databaseRoutes');
const schemaRoutes = require('./routes/schemaRoutes');
const documentRoutes = require('./routes/documentRoutes');
const queryRoutes = require('./routes/queryRoutes');
const exportImportRoutes = require('./routes/exportImportRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount API routes
app.use('/api', statusRoutes);
app.use('/api', databaseRoutes);
app.use('/api', schemaRoutes);
app.use('/api', documentRoutes);
app.use('/api', queryRoutes);
app.use('/api', exportImportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend build in production mode
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));
app.get(/^(?!\/api).*/, (req, res) => {
  const indexHtml = path.join(distPath, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      res.status(200).send('MongoDB Studio & API Server is running. Frontend dev server is at http://localhost:5173');
    }
  });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

function startServer(port = PORT) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, async () => {
      console.log(`🚀 MongoDB Studio API Server running on port ${port} [http://localhost:${port}]`);
      await seedDefaultData();
      resolve(server);
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// If run directly via node server/server.js
if (require.main === module) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
  });
}

module.exports = { app, startServer };
