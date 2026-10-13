import React, { useState } from 'react';
import { Search, Plus, Filter, ArrowUpDown, LayoutGrid, Table as TableIcon, Code, Edit2, Trash2, Download, Upload, Copy, Check, Clock } from 'lucide-react';

export default function DocumentExplorer({
  activeDb,
  activeColl,
  documents,
  totalCount,
  executionTimeMs,
  onRunQuery,
  onOpenInsertModal,
  onOpenEditModal,
  onDeleteDocument,
  onOpenImportExportModal
}) {
  const [filterStr, setFilterStr] = useState('{}');
  const [sortStr, setSortStr] = useState('{}');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table' | 'json'
  const [copiedId, setCopiedId] = useState(null);

  const handleQuerySubmit = (e) => {
    e?.preventDefault();
    let filter = {};
    let sort = null;

    try {
      if (filterStr.trim()) {
        filter = JSON.parse(filterStr);
      }
    } catch {
      alert('Invalid JSON filter format. Example: {"role": "admin"}');
      return;
    }

    try {
      if (sortStr.trim() && sortStr.trim() !== '{}') {
        sort = JSON.parse(sortStr);
      }
    } catch {
      alert('Invalid JSON sort format. Example: {"createdAt": -1}');
      return;
    }

    onRunQuery({ filter, sort });
  };

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Extract all distinct keys across current documents for Table view
  const allKeys = Array.from(
    documents.reduce((set, doc) => {
      Object.keys(doc).forEach(k => set.add(k));
      return set;
    }, new Set())
  );

  return (
    <div className="tab-content">
      {/* Query Filter Toolbar */}
      <form onSubmit={handleQuerySubmit} className="filter-toolbar">
        <div className="search-input-wrapper">
          <Filter size={14} className="input-prefix-icon" />
          <input
            type="text"
            className="code-input"
            placeholder='Filter: e.g. {"age": {"$gte": 25}} or {"status": "active"}'
            value={filterStr}
            onChange={(e) => setFilterStr(e.target.value)}
          />
        </div>

        <div className="search-input-wrapper" style={{ maxWidth: '240px' }}>
          <ArrowUpDown size={14} className="input-prefix-icon" />
          <input
            type="text"
            className="code-input"
            placeholder='Sort: e.g. {"createdAt": -1}'
            value={sortStr}
            onChange={(e) => setSortStr(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary">
          <Search size={14} />
          <span>Apply Filter</span>
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setFilterStr('{}');
            setSortStr('{}');
            onRunQuery({ filter: {}, sort: null });
          }}
        >
          Reset
        </button>

        {/* View Switchers */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '2px', marginLeft: 'auto' }}>
          <button
            id="btn-view-cards"
            type="button"
            className={`btn-icon ${viewMode === 'cards' ? 'active' : ''}`}
            onClick={() => setViewMode('cards')}
            style={{ color: viewMode === 'cards' ? 'var(--accent-emerald)' : 'var(--text-muted)' }}
            title="Card View"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            id="btn-view-table"
            type="button"
            className={`btn-icon ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            style={{ color: viewMode === 'table' ? 'var(--accent-emerald)' : 'var(--text-muted)' }}
            title="Table View"
          >
            <TableIcon size={15} />
          </button>
          <button
            id="btn-view-json"
            type="button"
            className={`btn-icon ${viewMode === 'json' ? 'active' : ''}`}
            onClick={() => setViewMode('json')}
            style={{ color: viewMode === 'json' ? 'var(--accent-emerald)' : 'var(--text-muted)' }}
            title="JSON Raw View"
          >
            <Code size={15} />
          </button>
        </div>

        {/* Action buttons */}
        <button
          id="btn-insert-doc"
          type="button"
          className="btn btn-secondary"
          onClick={onOpenInsertModal}
        >
          <Plus size={14} />
          <span>Insert Doc</span>
        </button>

        <button
          id="btn-io"
          type="button"
          className="btn btn-secondary"
          onClick={onOpenImportExportModal}
          title="Import or Export Collection"
        >
          <Download size={14} />
          <span>I/O</span>
        </button>
      </form>

      {/* Info bar */}
      <div style={{
        padding: '0.45rem 1.25rem',
        background: 'rgba(0, 0, 0, 0.25)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span>Showing <strong>{documents.length}</strong> of <strong>{totalCount}</strong> documents</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Clock size={12} />
          <span>Execution: {executionTimeMs ?? 0}ms</span>
        </div>
      </div>

      {/* Viewport */}
      <div className="documents-viewport">
        {documents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-title">No documents found</div>
            <div className="empty-desc">This collection is currently empty or no documents matched your query filter.</div>
            <button className="btn btn-primary" onClick={onOpenInsertModal}>
              <Plus size={14} />
              <span>Insert First Document</span>
            </button>
          </div>
        ) : viewMode === 'cards' ? (
          /* Cards View */
          documents.map((doc) => (
            <div key={doc._id} className="doc-card">
              <div className="doc-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="doc-id-pill">_id: {doc._id}</span>
                  <button
                    className="btn-icon"
                    onClick={() => handleCopyId(doc._id)}
                    title="Copy _id"
                  >
                    {copiedId === doc._id ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                  </button>
                </div>

                <div className="doc-actions">
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    onClick={() => onOpenEditModal(doc)}
                  >
                    <Edit2 size={12} />
                    <span>Edit</span>
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    onClick={() => onDeleteDocument(doc._id)}
                  >
                    <Trash2 size={12} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* JSON preview inside card */}
              <pre className="json-display">
                {JSON.stringify(doc, null, 2)}
              </pre>
            </div>
          ))
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="custom-table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Actions</th>
                  {allKeys.map(k => (
                    <th key={k}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc._id}>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn-icon"
                          onClick={() => onOpenEditModal(doc)}
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn-icon"
                          style={{ color: 'var(--accent-rose)' }}
                          onClick={() => onDeleteDocument(doc._id)}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                    {allKeys.map(key => {
                      const val = doc[key];
                      const rendered = val === undefined 
                        ? <span style={{ color: 'var(--text-muted)' }}>—</span>
                        : typeof val === 'object' 
                          ? JSON.stringify(val) 
                          : String(val);

                      return (
                        <td key={key} title={typeof rendered === 'string' ? rendered : ''}>
                          {rendered}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* JSON Raw View */
          <div className="code-box">
            <pre className="json-display">
              {JSON.stringify(documents, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
