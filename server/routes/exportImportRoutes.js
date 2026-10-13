const express = require('express');
const router = express.Router();
const dbManager = require('../dbManager');

// Helper to convert objects array to CSV string
function objectsToCsv(items) {
  if (!items || items.length === 0) return '';
  const headers = Array.from(
    items.reduce((set, obj) => {
      Object.keys(obj).forEach(k => set.add(k));
      return set;
    }, new Set())
  );

  const csvRows = [];
  csvRows.push(headers.join(','));

  for (const item of items) {
    const values = headers.map(header => {
      const val = item[header];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'object') {
        return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      }
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

// Helper to parse simple CSV text into objects
function csvToObjects(csvText) {
  const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Simple CSV parser supporting quotes
  function parseLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    return values.map(v => v.trim());
  }

  const headers = parseLine(lines[0]);
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const obj = {};
    headers.forEach((header, idx) => {
      let val = values[idx];
      if (val !== undefined && val !== '') {
        // Try parsing numbers, booleans, or JSON
        if (val.toLowerCase() === 'true') val = true;
        else if (val.toLowerCase() === 'false') val = false;
        else if (!isNaN(Number(val)) && val.trim() !== '') val = Number(val);
        else if (val.startsWith('{') || val.startsWith('[')) {
          try { val = JSON.parse(val); } catch {}
        }
        obj[header] = val;
      }
    });
    result.push(obj);
  }

  return result;
}

// Export collection documents
router.get('/databases/:dbName/collections/:collName/export', async (req, res) => {
  try {
    const { dbName, collName } = req.params;
    const { format = 'json' } = req.query;

    const data = await dbManager.find(dbName, collName, { limit: 100000 });
    const docs = data.documents;

    if (format === 'csv') {
      const csv = objectsToCsv(docs);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${collName}_export.csv"`);
      return res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${collName}_export.json"`);
      return res.json(docs);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Import documents into collection
router.post('/databases/:dbName/collections/:collName/import', async (req, res) => {
  try {
    const { dbName, collName } = req.params;
    const { format = 'json', content } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'Content is required for import' });
    }

    let docsToInsert = [];

    if (format === 'csv') {
      docsToInsert = csvToObjects(content);
    } else {
      if (typeof content === 'string') {
        docsToInsert = JSON.parse(content);
      } else if (Array.isArray(content)) {
        docsToInsert = content;
      } else {
        docsToInsert = [content];
      }
    }

    if (!Array.isArray(docsToInsert) || docsToInsert.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid documents found in payload' });
    }

    const result = await dbManager.insertMany(dbName, collName, docsToInsert);
    res.json({
      success: true,
      message: `Successfully imported ${result.insertedCount} documents`,
      ...result
    });
  } catch (err) {
    res.status(400).json({ success: false, error: `Import failed: ${err.message}` });
  }
});

module.exports = router;
