import React from 'react';
import { Database, Server, Code, FileText, RefreshCw, Zap } from 'lucide-react';

export default function Navbar({
  engineInfo,
  activeDb,
  databases,
  onSelectDb,
  onOpenConnectionModal,
  onOpenApiModal,
  onRefresh,
  loading
}) {
  const isLocal = engineInfo?.isLocal;

  return (
    <header className="top-navbar">
      <div className="brand-section">
        <div className="brand-logo-icon">
          <Database size={18} />
        </div>
        <div>
          <span className="brand-title">MongoDB Studio</span>
        </div>
        <span className="brand-badge">Engine v1.0</span>
      </div>

      <div className="nav-actions">
        {/* Active Database selector */}
        {databases.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>DB:</span>
            <select
              value={activeDb || ''}
              onChange={(e) => onSelectDb(e.target.value)}
              className="text-input"
              style={{
                padding: '0.3rem 0.6rem',
                fontSize: '0.8rem',
                width: 'auto',
                background: 'var(--bg-secondary)',
                cursor: 'pointer'
              }}
            >
              {databases.map(d => (
                <option key={d.name} value={d.name}>{d.name} ({d.collectionsCount || 0} colls)</option>
              ))}
            </select>
          </div>
        )}

        {/* Engine switcher pill */}
        <button
          className="engine-status-pill"
          onClick={onOpenConnectionModal}
          title="Click to switch between Scratch NoSQL Engine and Remote MongoDB"
        >
          <span className={`status-dot ${isLocal ? 'pulse' : ''}`} style={{
            background: isLocal ? 'var(--accent-emerald)' : 'var(--accent-cyan)'
          }} />
          <span style={{ fontWeight: 600 }}>
            {isLocal ? 'Scratch NoSQL' : 'MongoDB Live'}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            ({isLocal ? 'Local WAL' : 'External'})
          </span>
        </button>

        {/* API Docs Button */}
        <button
          className="btn btn-secondary"
          onClick={onOpenApiModal}
          title="View REST API Documentation & Snippets"
        >
          <Code size={15} />
          <span>REST API</span>
        </button>

        {/* Refresh button */}
        <button
          className="btn btn-icon"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh Data"
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>
    </header>
  );
}
