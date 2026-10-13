import React, { useState } from 'react';
import { X, Server, Database, CheckCircle2, AlertTriangle, Cpu } from 'lucide-react';
import { api } from '../api';

export default function ConnectionModal({ isOpen, onClose, currentEngine, onEngineSwitched, onShowToast }) {
  const [selectedMode, setSelectedMode] = useState(currentEngine?.mode || 'local');
  const [mongoUri, setMongoUri] = useState(currentEngine?.uri && currentEngine.mode === 'remote' ? currentEngine.uri : 'mongodb://localhost:27017');
  const [testing, setTesting] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testConnection(mongoUri);
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleApply = async () => {
    setSwitching(true);
    try {
      const res = await api.switchEngine(selectedMode, selectedMode === 'remote' ? mongoUri : null);
      onShowToast(res.message, 'success');
      onEngineSwitched(res.engine);
      onClose();
    } catch (err) {
      onShowToast('Switch failed: ' + err.message, 'error');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Server size={18} color="var(--accent-emerald)" />
            <span className="modal-title">Database Engine Settings</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Choose which database backend engine processes queries and stores data.
          </p>

          {/* Engine Choices */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            {/* Option 1: Local Scratch Engine */}
            <div
              className="doc-card"
              style={{
                cursor: 'pointer',
                border: selectedMode === 'local' ? '2px solid var(--accent-emerald)' : '1px solid var(--border-color)',
                background: selectedMode === 'local' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card)'
              }}
              onClick={() => setSelectedMode('local')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Cpu size={18} color="var(--accent-emerald)" />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Scratch Engine</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                100% built from scratch in Node.js. File-based atomic WAL persistence, zero external DB installation needed.
              </p>
            </div>

            {/* Option 2: Live MongoDB */}
            <div
              className="doc-card"
              style={{
                cursor: 'pointer',
                border: selectedMode === 'remote' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                background: selectedMode === 'remote' ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-card)'
              }}
              onClick={() => setSelectedMode('remote')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Server size={18} color="var(--accent-cyan)" />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Live MongoDB</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Connect to an official MongoDB daemon (e.g. MongoDB Atlas cloud or local port 27017).
              </p>
            </div>
          </div>

          {/* Remote URI input if remote selected */}
          {selectedMode === 'remote' && (
            <div className="form-group" style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <label className="form-label">MongoDB Connection String URI</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="text-input no-prefix"
                  placeholder="mongodb://localhost:27017 or mongodb+srv://..."
                  value={mongoUri}
                  onChange={e => setMongoUri(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleTest}
                  disabled={testing}
                >
                  {testing ? 'Testing...' : 'Test'}
                </button>
              </div>

              {testResult && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                  color: testResult.success ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  {testResult.success ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                  <span>{testResult.success ? `Connected! MongoDB v${testResult.version || ''}` : testResult.error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleApply} disabled={switching}>
            {switching ? 'Connecting...' : 'Apply & Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
