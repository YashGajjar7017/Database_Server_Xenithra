import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DocumentExplorer from './components/DocumentExplorer';
import DocumentEditorModal from './components/DocumentEditorModal';
import SchemaStudio from './components/SchemaStudio';
import QueryPlayground from './components/QueryPlayground';
import AggregationBuilder from './components/AggregationBuilder';
import ApiDocModal from './components/ApiDocModal';
import ImportExportModal from './components/ImportExportModal';
import ConnectionModal from './components/ConnectionModal';
import { FileText, Shield, Terminal, Layers, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { api } from './api';

export default function App() {
  const [engineInfo, setEngineInfo] = useState(null);
  const [databases, setDatabases] = useState([]);
  const [activeDb, setActiveDb] = useState('');
  const [collections, setCollections] = useState([]);
  const [activeColl, setActiveColl] = useState('');

  // Workspace View Tabs: 'documents' | 'schema' | 'query' | 'aggregate'
  const [activeTab, setActiveTab] = useState('documents');

  // Documents State
  const [documents, setDocuments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [executionTimeMs, setExecutionTimeMs] = useState(0);
  const [lastQueryParams, setLastQueryParams] = useState({ filter: {}, sort: null, limit: 50, skip: 0 });
  const [loading, setLoading] = useState(false);

  // Modals State
  const [insertModalOpen, setInsertModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [connectionModalOpen, setConnectionModalOpen] = useState(false);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Initial load
  useEffect(() => {
    loadStatus();
    loadDatabases();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await api.getStatus();
      setEngineInfo(res.engine);
    } catch (err) {
      console.error('Error fetching engine status:', err);
    }
  };

  const loadDatabases = async (preferredDb = null) => {
    try {
      const res = await api.getDatabases();
      const dbs = res.databases || [];
      setDatabases(dbs);

      if (dbs.length > 0) {
        const targetDb = preferredDb && dbs.some(d => d.name === preferredDb)
          ? preferredDb
          : (activeDb && dbs.some(d => d.name === activeDb) ? activeDb : dbs[0].name);
        
        setActiveDb(targetDb);
        loadCollections(targetDb);
      } else {
        setActiveDb('');
        setCollections([]);
        setActiveColl('');
        setDocuments([]);
      }
    } catch (err) {
      showToast('Failed to load databases: ' + err.message, 'error');
    }
  };

  const loadCollections = async (dbName, preferredColl = null) => {
    try {
      const res = await api.getCollections(dbName);
      const colls = res.collections || [];
      setCollections(colls);

      if (colls.length > 0) {
        const targetColl = preferredColl && colls.some(c => c.name === preferredColl)
          ? preferredColl
          : (activeColl && colls.some(c => c.name === activeColl) ? activeColl : colls[0].name);
        
        setActiveColl(targetColl);
        fetchDocuments(dbName, targetColl, lastQueryParams);
      } else {
        setActiveColl('');
        setDocuments([]);
        setTotalCount(0);
      }
    } catch (err) {
      showToast('Failed to load collections: ' + err.message, 'error');
    }
  };

  const fetchDocuments = async (dbName, collName, queryParams) => {
    if (!dbName || !collName) return;
    setLoading(true);
    try {
      const res = await api.queryDocuments(dbName, collName, queryParams);
      setDocuments(res.documents || []);
      setTotalCount(res.totalCount || 0);
      setExecutionTimeMs(res.executionTimeMs || 0);
    } catch (err) {
      showToast('Error querying documents: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDb = (dbName) => {
    setActiveDb(dbName);
    loadCollections(dbName);
  };

  const handleSelectColl = (collName) => {
    setActiveColl(collName);
    fetchDocuments(activeDb, collName, lastQueryParams);
  };

  const handleCreateDb = async (name) => {
    try {
      await api.createDatabase(name);
      showToast(`Database "${name}" created`, 'success');
      loadDatabases(name);
    } catch (err) {
      showToast('Failed to create database: ' + err.message, 'error');
    }
  };

  const handleDropDb = async (name) => {
    try {
      await api.dropDatabase(name);
      showToast(`Database "${name}" dropped`, 'info');
      loadDatabases();
    } catch (err) {
      showToast('Failed to drop database: ' + err.message, 'error');
    }
  };

  const handleCreateColl = async (name) => {
    try {
      await api.createCollection(activeDb, name);
      showToast(`Collection "${name}" created`, 'success');
      loadCollections(activeDb, name);
    } catch (err) {
      showToast('Failed to create collection: ' + err.message, 'error');
    }
  };

  const handleDropColl = async (name) => {
    try {
      await api.dropCollection(activeDb, name);
      showToast(`Collection "${name}" dropped`, 'info');
      loadCollections(activeDb);
    } catch (err) {
      showToast('Failed to drop collection: ' + err.message, 'error');
    }
  };

  const handleRunQuery = (params) => {
    const updated = { ...lastQueryParams, ...params };
    setLastQueryParams(updated);
    fetchDocuments(activeDb, activeColl, updated);
  };

  const handleSaveDoc = async (docData) => {
    try {
      if (editingDoc) {
        await api.updateDocument(activeDb, activeColl, editingDoc._id, docData);
        showToast('Document updated successfully', 'success');
      } else {
        await api.insertDocument(activeDb, activeColl, docData);
        showToast('Document inserted successfully', 'success');
      }
      setInsertModalOpen(false);
      setEditingDoc(null);
      fetchDocuments(activeDb, activeColl, lastQueryParams);
      loadCollections(activeDb, activeColl); // refresh counts
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteDoc = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.deleteDocument(activeDb, activeColl, id);
      showToast('Document deleted', 'info');
      fetchDocuments(activeDb, activeColl, lastQueryParams);
      loadCollections(activeDb, activeColl);
    } catch (err) {
      showToast('Failed to delete: ' + err.message, 'error');
    }
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        engineInfo={engineInfo}
        activeDb={activeDb}
        databases={databases}
        onSelectDb={handleSelectDb}
        onOpenConnectionModal={() => setConnectionModalOpen(true)}
        onOpenApiModal={() => setApiModalOpen(true)}
        onRefresh={() => {
          loadDatabases(activeDb);
          if (activeDb && activeColl) {
            fetchDocuments(activeDb, activeColl, lastQueryParams);
          }
        }}
        loading={loading}
      />

      {/* Main Workspace Layout */}
      <div className="main-layout">
        <Sidebar
          databases={databases}
          activeDb={activeDb}
          activeColl={activeColl}
          collections={collections}
          onSelectDb={handleSelectDb}
          onSelectColl={handleSelectColl}
          onCreateDb={handleCreateDb}
          onDropDb={handleDropDb}
          onCreateColl={handleCreateColl}
          onDropColl={handleDropColl}
        />

        {/* Right Content Area */}
        <main className="content-area">
          {/* Tabs Navigation */}
          {activeColl ? (
            <div className="tabs-bar">
              <div className="tabs-group">
                <button
                  id="tab-documents"
                  className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
                  onClick={() => setActiveTab('documents')}
                >
                  <FileText size={15} />
                  <span>Documents ({totalCount})</span>
                </button>

                <button
                  id="tab-schema"
                  className={`tab-btn ${activeTab === 'schema' ? 'active' : ''}`}
                  onClick={() => setActiveTab('schema')}
                >
                  <Shield size={15} />
                  <span>Schema Studio</span>
                </button>

                <button
                  id="tab-query"
                  className={`tab-btn ${activeTab === 'query' ? 'active' : ''}`}
                  onClick={() => setActiveTab('query')}
                >
                  <Terminal size={15} />
                  <span>Query Runner</span>
                </button>

                <button
                  id="tab-aggregate"
                  className={`tab-btn ${activeTab === 'aggregate' ? 'active' : ''}`}
                  onClick={() => setActiveTab('aggregate')}
                >
                  <Layers size={15} />
                  <span>Aggregation Pipeline</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="tabs-bar">
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Select a collection from the sidebar to start exploring.
              </span>
            </div>
          )}

          {/* Active View Tab Content */}
          {!activeColl ? (
            <div className="empty-state" style={{ flex: 1 }}>
              <div className="empty-title">No Collection Selected</div>
              <div className="empty-desc">Choose a database and collection on the left sidebar or create a new one.</div>
            </div>
          ) : activeTab === 'documents' ? (
            <DocumentExplorer
              activeDb={activeDb}
              activeColl={activeColl}
              documents={documents}
              totalCount={totalCount}
              executionTimeMs={executionTimeMs}
              onRunQuery={handleRunQuery}
              onOpenInsertModal={() => {
                setEditingDoc(null);
                setInsertModalOpen(true);
              }}
              onOpenEditModal={(doc) => {
                setEditingDoc(doc);
                setInsertModalOpen(true);
              }}
              onDeleteDocument={handleDeleteDoc}
              onOpenImportExportModal={() => setImportExportOpen(true)}
            />
          ) : activeTab === 'schema' ? (
            <SchemaStudio
              activeDb={activeDb}
              activeColl={activeColl}
              onShowToast={showToast}
            />
          ) : activeTab === 'query' ? (
            <QueryPlayground
              activeDb={activeDb}
              activeColl={activeColl}
              onShowToast={showToast}
            />
          ) : (
            <AggregationBuilder
              activeDb={activeDb}
              activeColl={activeColl}
              onShowToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Insert / Edit Modal */}
      <DocumentEditorModal
        isOpen={insertModalOpen}
        onClose={() => {
          setInsertModalOpen(false);
          setEditingDoc(null);
        }}
        activeDb={activeDb}
        activeColl={activeColl}
        initialDoc={editingDoc}
        onSave={handleSaveDoc}
      />

      {/* Engine Switcher Modal */}
      <ConnectionModal
        isOpen={connectionModalOpen}
        onClose={() => setConnectionModalOpen(false)}
        currentEngine={engineInfo}
        onEngineSwitched={(engine) => {
          setEngineInfo(engine);
          loadDatabases();
        }}
        onShowToast={showToast}
      />

      {/* REST API Explorer Modal */}
      <ApiDocModal
        isOpen={apiModalOpen}
        onClose={() => setApiModalOpen(false)}
        activeDb={activeDb}
        activeColl={activeColl}
      />

      {/* Import / Export Modal */}
      <ImportExportModal
        isOpen={importExportOpen}
        onClose={() => setImportExportOpen(false)}
        activeDb={activeDb}
        activeColl={activeColl}
        onShowToast={showToast}
        onRefresh={() => fetchDocuments(activeDb, activeColl, lastQueryParams)}
      />

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' && <CheckCircle2 size={16} color="var(--accent-emerald)" />}
            {t.type === 'error' && <AlertTriangle size={16} color="var(--accent-rose)" />}
            {t.type === 'info' && <Info size={16} color="var(--accent-cyan)" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
