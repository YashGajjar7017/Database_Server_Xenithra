import React, { useState } from 'react';
import { Terminal, Play, Clock, Sparkles, History, Check, Copy } from 'lucide-react';
import { api } from '../api';

export default function QueryPlayground({ activeDb, activeColl, onShowToast }) {
  const [command, setCommand] = useState(`find({}).sort({ createdAt: -1 }).limit(20)`);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([
    'find({}).limit(10)',
    'find({ active: true })',
    'countDocuments({})'
  ]);
  const [copied, setCopied] = useState(false);

  const sampleTemplates = [
    { label: 'Find All', code: 'find({}).limit(50)' },
    { label: 'Filter Greater Than', code: 'find({ price: { $gt: 50 } })' },
    { label: 'Sort Descending', code: 'find({}).sort({ createdAt: -1 })' },
    { label: 'Regex Search', code: 'find({ name: { $regex: "^A", $options: "i" } })' },
    { label: 'Count Documents', code: 'countDocuments({})' }
  ];

  const handleExecute = async () => {
    if (!command.trim()) return;
    setLoading(true);

    try {
      const res = await api.rawQuery(activeDb, activeColl, command.trim());
      setResults(res);

      if (!history.includes(command.trim())) {
        setHistory([command.trim(), ...history.slice(0, 7)]);
      }
    } catch (err) {
      setResults({
        success: false,
        error: err.message,
        executionTimeMs: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResults = () => {
    if (!results) return;
    navigator.clipboard.writeText(JSON.stringify(results.result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="tab-content" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr', height: '100%', overflow: 'hidden' }}>
      {/* Left Column: Editor & Templates */}
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', background: 'var(--bg-secondary)', padding: '1rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600, fontSize: '0.9rem' }}>
            <Terminal size={17} color="var(--accent-emerald)" />
            <span>MQL Query Console: db.{activeColl}</span>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleExecute}
            disabled={loading}
          >
            <Play size={14} />
            <span>{loading ? 'Running...' : 'Run Query'}</span>
          </button>
        </div>

        {/* Snippet Quick Buttons */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {sampleTemplates.map((item, idx) => (
            <button
              key={idx}
              className="btn btn-secondary"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
              onClick={() => setCommand(item.code)}
            >
              <Sparkles size={11} color="var(--accent-cyan)" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Code input */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '220px' }}>
          <textarea
            className="textarea-code"
            style={{ flex: 1, resize: 'none', background: '#050811' }}
            value={command}
            onChange={e => setCommand(e.target.value)}
            placeholder="Type query: find({...}), aggregate([...]), or countDocuments({...})"
            spellCheck={false}
          />
        </div>

        {/* History section */}
        {history.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.4rem' }}>
              <History size={12} />
              <span>Recent Queries</span>
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {history.map((h, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    padding: '0.3rem 0.5rem',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  onClick={() => setCommand(h)}
                >
                  {h}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Query Results Output */}
      <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>
        {/* Results Header */}
        <div style={{
          padding: '0.65rem 1rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(14, 19, 31, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem' }}>
            <span style={{ fontWeight: 600 }}>Results</span>
            {results && (
              <>
                <span className="coll-badge">{results.count ?? 0} items</span>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                  <Clock size={11} />
                  {results.executionTimeMs}ms
                </span>
              </>
            )}
          </div>

          {results && results.result && (
            <button
              className="btn btn-secondary"
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem' }}
              onClick={handleCopyResults}
            >
              {copied ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
              <span>{copied ? 'Copied!' : 'Copy Result'}</span>
            </button>
          )}
        </div>

        {/* Results Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
          {!results ? (
            <div className="empty-state" style={{ height: '100%' }}>
              <div className="empty-title">Ready to execute</div>
              <div className="empty-desc">Choose a template or write your query and click "Run Query" to see output.</div>
            </div>
          ) : results.error ? (
            <div style={{
              padding: '1rem',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: '8px',
              color: 'var(--accent-rose)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem'
            }}>
              {results.error}
            </div>
          ) : (
            <pre className="json-display">
              {JSON.stringify(results.result, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
