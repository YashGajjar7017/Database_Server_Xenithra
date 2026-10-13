import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Globe, Code } from 'lucide-react';

export default function ApiDocModal({ isOpen, onClose, activeDb, activeColl }) {
  const [lang, setLang] = useState('curl'); // 'curl' | 'js' | 'python'
  const [copiedKey, setCopiedKey] = useState(null);

  if (!isOpen) return null;

  const db = activeDb || 'ecommerce_db';
  const coll = activeColl || 'products';
  const origin = window.location.origin;

  const snippets = {
    query: {
      curl: `curl -X POST "${origin}/api/databases/${db}/collections/${coll}/query" \\
  -H "Content-Type: application/json" \\
  -d '{
    "filter": { "price": { "$gt": 50 } },
    "sort": { "price": -1 },
    "limit": 10
  }'`,
      js: `const response = await fetch('${origin}/api/databases/${db}/collections/${coll}/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filter: { price: { $gt: 50 } },
    sort: { price: -1 },
    limit: 10
  })
});
const data = await response.json();
console.log(data.documents);`,
      python: `import requests

url = "${origin}/api/databases/${db}/collections/${coll}/query"
payload = {
    "filter": { "price": { "$gt": 50 } },
    "sort": { "price": -1 },
    "limit": 10
}
response = requests.post(url, json=payload)
data = response.json()
print(data["documents"])`
    },
    insert: {
      curl: `curl -X POST "${origin}/api/databases/${db}/collections/${coll}/documents" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Wireless Ergonomic Mouse",
    "price": 59.99,
    "category": "Electronics"
  }'`,
      js: `const response = await fetch('${origin}/api/databases/${db}/collections/${coll}/documents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Wireless Ergonomic Mouse',
    price: 59.99,
    category: 'Electronics'
  })
});
const result = await response.json();
console.log('Inserted doc:', result.document);`,
      python: `import requests

url = "${origin}/api/databases/${db}/collections/${coll}/documents"
doc = {
    "title": "Wireless Ergonomic Mouse",
    "price": 59.99,
    "category": "Electronics"
}
response = requests.post(url, json=doc)
print(response.json())`
    },
    aggregate: {
      curl: `curl -X POST "${origin}/api/databases/${db}/collections/${coll}/aggregate" \\
  -H "Content-Type: application/json" \\
  -d '{
    "pipeline": [
      { "$group": { "_id": "$category", "count": { "$sum": 1 } } },
      { "$sort": { "count": -1 } }
    ]
  }'`,
      js: `const response = await fetch('${origin}/api/databases/${db}/collections/${coll}/aggregate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pipeline: [
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]
  })
});
const data = await response.json();
console.log(data.result);`,
      python: `import requests

url = "${origin}/api/databases/${db}/collections/${coll}/aggregate"
pipeline = {
    "pipeline": [
        { "$group": { "_id": "$category", "count": { "$sum": 1 } } },
        { "$sort": { "count": -1 } }
    ]
}
response = requests.post(url, json=pipeline)
print(response.json()["result"])`
    }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Code size={18} color="var(--accent-emerald)" />
            <span className="modal-title">REST API Endpoints & Code Generator</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Language Selector */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {[
              { id: 'curl', label: 'cURL' },
              { id: 'js', label: 'JavaScript (Fetch)' },
              { id: 'python', label: 'Python (Requests)' }
            ].map(l => (
              <button
                key={l.id}
                className={`btn ${lang === l.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}
                onClick={() => setLang(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Section 1: Query Documents */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                1. Query Documents (with filters, sort & pagination)
              </span>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                onClick={() => handleCopy(snippets.query[lang], 'query')}
              >
                {copiedKey === 'query' ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                <span>{copiedKey === 'query' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="code-box">
              <pre className="json-display">{snippets.query[lang]}</pre>
            </div>
          </div>

          {/* Section 2: Insert Document */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                2. Insert Document (validates schema automatically)
              </span>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                onClick={() => handleCopy(snippets.insert[lang], 'insert')}
              >
                {copiedKey === 'insert' ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                <span>{copiedKey === 'insert' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="code-box">
              <pre className="json-display">{snippets.insert[lang]}</pre>
            </div>
          </div>

          {/* Section 3: Aggregation Pipeline */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                3. Run Aggregation Pipeline
              </span>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                onClick={() => handleCopy(snippets.aggregate[lang], 'agg')}
              >
                {copiedKey === 'agg' ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                <span>{copiedKey === 'agg' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="code-box">
              <pre className="json-display">{snippets.aggregate[lang]}</pre>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
