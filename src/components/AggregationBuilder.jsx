import React, { useState } from 'react';
import { Layers, Plus, Trash2, Play, Clock, Sparkles } from 'lucide-react';
import { api } from '../api';

const DEFAULT_STAGES = [
  {
    type: '$group',
    content: JSON.stringify({
      _id: "$category",
      totalProducts: { $count: {} },
      avgPrice: { $avg: "$price" },
      totalStock: { $sum: "$stock" }
    }, null, 2)
  },
  {
    type: '$sort',
    content: JSON.stringify({ totalProducts: -1 }, null, 2)
  }
];

export default function AggregationBuilder({ activeDb, activeColl, onShowToast }) {
  const [stages, setStages] = useState(DEFAULT_STAGES);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAddStage = (stageType) => {
    let defaultContent = '{}';
    switch (stageType) {
      case '$match':
        defaultContent = JSON.stringify({ active: true }, null, 2);
        break;
      case '$group':
        defaultContent = JSON.stringify({ _id: "$role", count: { $sum: 1 } }, null, 2);
        break;
      case '$sort':
        defaultContent = JSON.stringify({ count: -1 }, null, 2);
        break;
      case '$limit':
        defaultContent = '10';
        break;
      case '$project':
        defaultContent = JSON.stringify({ name: 1, email: 1 }, null, 2);
        break;
      case '$count':
        defaultContent = '"total_matching"';
        break;
      default:
        defaultContent = '{}';
    }

    setStages([...stages, { type: stageType, content: defaultContent }]);
  };

  const handleRemoveStage = (index) => {
    setStages(stages.filter((_, i) => i !== index));
  };

  const handleUpdateStageContent = (index, newContent) => {
    const updated = [...stages];
    updated[index].content = newContent;
    setStages(updated);
  };

  const handleExecute = async () => {
    setLoading(true);
    try {
      const pipeline = stages.map(s => {
        let parsed;
        try {
          parsed = JSON.parse(s.content);
        } catch {
          parsed = s.content;
        }
        return { [s.type]: parsed };
      });

      const res = await api.aggregate(activeDb, activeColl, pipeline);
      setResults(res);
    } catch (err) {
      setResults({ error: err.message, executionTimeMs: 0 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tab-content" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr', height: '100%', overflow: 'hidden' }}>
      {/* Left Column: Pipeline Stages */}
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', background: 'var(--bg-secondary)', padding: '1rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600, fontSize: '0.9rem' }}>
            <Layers size={17} color="var(--accent-cyan)" />
            <span>Aggregation Pipeline: {activeColl}</span>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleExecute}
            disabled={loading}
          >
            <Play size={14} />
            <span>{loading ? 'Processing...' : 'Run Pipeline'}</span>
          </button>
        </div>

        {/* Add Stage Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+ Add Stage:</span>
          {['$match', '$group', '$sort', '$project', '$limit', '$count'].map(st => (
            <button
              key={st}
              className="btn btn-secondary"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
              onClick={() => handleAddStage(st)}
            >
              <Plus size={11} />
              <span>{st}</span>
            </button>
          ))}
        </div>

        {/* Stages List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
          {stages.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              No stages in pipeline. Click "+ Add Stage" above to begin.
            </div>
          ) : (
            stages.map((stage, idx) => (
              <div key={idx} className="doc-card" style={{ padding: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    Stage {idx + 1}: {stage.type}
                  </span>
                  <button
                    className="btn-icon"
                    style={{ color: 'var(--accent-rose)' }}
                    onClick={() => handleRemoveStage(idx)}
                    title="Remove stage"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <textarea
                  className="textarea-code"
                  style={{ minHeight: '85px', fontSize: '0.78rem' }}
                  value={stage.content}
                  onChange={e => handleUpdateStageContent(idx, e.target.value)}
                  spellCheck={false}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Aggregation Output */}
      <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>
        <div style={{
          padding: '0.65rem 1rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(14, 19, 31, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem' }}>
            <span style={{ fontWeight: 600 }}>Aggregated Output</span>
            {results && (
              <>
                <span className="coll-badge">{results.count ?? 0} groups</span>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                  <Clock size={11} />
                  {results.executionTimeMs}ms
                </span>
              </>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
          {!results ? (
            <div className="empty-state" style={{ height: '100%' }}>
              <div className="empty-title">Pipeline Ready</div>
              <div className="empty-desc">Configure your stages on the left and click "Run Pipeline" to compute aggregations.</div>
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
