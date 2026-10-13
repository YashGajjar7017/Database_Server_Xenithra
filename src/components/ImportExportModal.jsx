import React, { useState } from 'react';
import { X, Download, Upload, FileJson, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

export default function ImportExportModal({ isOpen, onClose, activeDb, activeColl, onShowToast, onRefresh }) {
  const [activeTab, setActiveTab] = useState('export'); // 'export' | 'import'
  const [importFormat, setImportFormat] = useState('json');
  const [importContent, setImportContent] = useState('');
  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;

  const handleDownload = (format) => {
    const url = `/api/databases/${activeDb}/collections/${activeColl}/export?format=${format}`;
    window.open(url, '_blank');
    onShowToast(`Downloading ${format.toUpperCase()} export...`, 'info');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImportContent(event.target.result);
      if (file.name.endsWith('.csv')) {
        setImportFormat('csv');
      } else {
        setImportFormat('json');
      }
    };
    reader.readAsText(file);
  };

  const handleRunImport = async () => {
    if (!importContent.trim()) {
      onShowToast('Please provide file or paste content to import', 'error');
      return;
    }

    setImporting(true);
    try {
      const res = await api.importData(activeDb, activeColl, importFormat, importContent);
      onShowToast(res.message || 'Import successful!', 'success');
      onRefresh();
      onClose();
    } catch (err) {
      onShowToast('Import failed: ' + err.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Import / Export: {activeColl}</span>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          <button
            className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <Download size={14} />
            <span>Export Data</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <Upload size={14} />
            <span>Import Data</span>
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'export' ? (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Download all documents from <strong>{activeColl}</strong> directly to your computer.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div
                  className="doc-card"
                  style={{ textAlign: 'center', cursor: 'pointer', padding: '1.5rem' }}
                  onClick={() => handleDownload('json')}
                >
                  <FileJson size={36} color="var(--accent-emerald)" style={{ margin: '0 auto 0.75rem' }} />
                  <span style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>JSON Export</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Complete document objects</span>
                </div>

                <div
                  className="doc-card"
                  style={{ textAlign: 'center', cursor: 'pointer', padding: '1.5rem' }}
                  onClick={() => handleDownload('csv')}
                >
                  <FileSpreadsheet size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 0.75rem' }} />
                  <span style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>CSV Export</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Spreadsheet tabular format</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className={`btn ${importFormat === 'json' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                    onClick={() => setImportFormat('json')}
                  >
                    JSON
                  </button>
                  <button
                    className={`btn ${importFormat === 'csv' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                    onClick={() => setImportFormat('csv')}
                  >
                    CSV
                  </button>
                </div>

                <label className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                  <Upload size={12} />
                  <span>Choose File</span>
                  <input type="file" accept=".json,.csv" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </div>

              <textarea
                className="textarea-code"
                placeholder={importFormat === 'json' ? '[{"name": "Alice"}, {"name": "Bob"}]' : 'name,email\nAlice,alice@example.com'}
                value={importContent}
                onChange={e => setImportContent(e.target.value)}
                rows={9}
                spellCheck={false}
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          {activeTab === 'import' && (
            <button className="btn btn-primary" onClick={handleRunImport} disabled={importing}>
              {importing ? 'Importing...' : 'Start Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
