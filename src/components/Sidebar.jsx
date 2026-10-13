import React, { useState } from 'react';
import { Database, Folder, Table, Plus, Trash2, ChevronRight, ChevronDown, Layers, HardDrive } from 'lucide-react';

export default function Sidebar({
  databases,
  activeDb,
  activeColl,
  collections,
  onSelectDb,
  onSelectColl,
  onCreateDb,
  onDropDb,
  onCreateColl,
  onDropColl
}) {
  const [newDbModal, setNewDbModal] = useState(false);
  const [newCollModal, setNewCollModal] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [newCollName, setNewCollName] = useState('');

  const handleCreateDb = (e) => {
    e.preventDefault();
    if (newDbName.trim()) {
      onCreateDb(newDbName.trim());
      setNewDbName('');
      setNewDbModal(false);
    }
  };

  const handleCreateColl = (e) => {
    e.preventDefault();
    if (newCollName.trim()) {
      onCreateColl(newCollName.trim());
      setNewCollName('');
      setNewCollModal(false);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Databases & Collections</span>
        <button
          className="btn btn-secondary"
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
          onClick={() => setNewDbModal(true)}
          title="Create New Database"
        >
          <Plus size={14} />
          <span>New DB</span>
        </button>
      </div>

      <div className="database-list">
        {databases.length === 0 ? (
          <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
            No databases found.
          </div>
        ) : (
          databases.map((db) => {
            const isSelected = activeDb === db.name;

            return (
              <div key={db.name} className="db-group">
                <div
                  className={`db-item ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectDb(db.name)}
                >
                  <div className="db-item-left">
                    {isSelected ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Database size={15} style={{ color: isSelected ? 'var(--accent-emerald)' : 'var(--text-muted)' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{db.name}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span className="coll-badge">{db.collectionsCount ?? 0}</span>
                    <button
                      className="btn-icon"
                      style={{ padding: '2px', opacity: 0.6 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to drop database "${db.name}"?`)) {
                          onDropDb(db.name);
                        }
                      }}
                      title="Drop Database"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Sublist of collections for active database */}
                {isSelected && (
                  <div className="collections-sublist">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.2rem 0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Collections</span>
                      <button
                        className="btn-icon"
                        style={{ padding: '2px', color: 'var(--accent-emerald)' }}
                        onClick={() => setNewCollModal(true)}
                        title="Add Collection"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    {collections.length === 0 ? (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.3rem 0.6rem' }}>
                        No collections
                      </div>
                    ) : (
                      collections.map((coll) => {
                        const isCollActive = activeColl === coll.name;
                        return (
                          <div
                            key={coll.name}
                            className={`coll-item ${isCollActive ? 'active' : ''}`}
                            onClick={() => onSelectColl(coll.name)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden' }}>
                              <Table size={13} style={{ color: isCollActive ? 'var(--accent-emerald)' : 'var(--text-muted)' }} />
                              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>{coll.name}</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <span className="coll-badge">{coll.count ?? 0}</span>
                              <button
                                className="btn-icon"
                                style={{ padding: '2px', opacity: 0.6 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Drop collection "${coll.name}"?`)) {
                                    onDropColl(coll.name);
                                  }
                                }}
                                title="Drop Collection"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer stats */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <HardDrive size={13} />
            <span>Active DB:</span>
          </span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{activeDb || 'None'}</span>
        </div>
      </div>

      {/* New Database Modal */}
      {newDbModal && (
        <div className="modal-overlay" onClick={() => setNewDbModal(false)}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Create Database</span>
            </div>
            <form onSubmit={handleCreateDb}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Database Name</label>
                  <input
                    type="text"
                    className="text-input no-prefix"
                    placeholder="e.g. company_db"
                    value={newDbName}
                    onChange={e => setNewDbName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setNewDbModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Collection Modal */}
      {newCollModal && (
        <div className="modal-overlay" onClick={() => setNewCollModal(false)}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Create Collection in {activeDb}</span>
            </div>
            <form onSubmit={handleCreateColl}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Collection Name</label>
                  <input
                    type="text"
                    className="text-input no-prefix"
                    placeholder="e.g. customers, products"
                    value={newCollName}
                    onChange={e => setNewCollName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setNewCollModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
