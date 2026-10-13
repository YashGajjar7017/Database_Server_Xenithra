import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Check, AlertCircle, Save, Sliders, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

const FIELD_TYPES = ['string', 'number', 'boolean', 'date', 'array', 'object', 'objectId', 'any'];

export default function SchemaStudio({ activeDb, activeColl, onShowToast }) {
  const [schema, setSchema] = useState({
    name: '',
    enforcement: 'strict',
    strict: false,
    fields: {}
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // New field state
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('string');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldUnique, setNewFieldUnique] = useState(false);
  const [newFieldMin, setNewFieldMin] = useState('');
  const [newFieldMax, setNewFieldMax] = useState('');
  const [newFieldPattern, setNewFieldPattern] = useState('');
  const [newFieldEnum, setNewFieldEnum] = useState('');
  const [newFieldDefault, setNewFieldDefault] = useState('');
  const [newFieldDesc, setNewFieldDesc] = useState('');

  // Sandbox state
  const [testPayload, setTestPayload] = useState('{\n  \n}');
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (activeDb && activeColl) {
      loadSchema();
    }
  }, [activeDb, activeColl]);

  const loadSchema = async () => {
    setLoading(true);
    try {
      const res = await api.getSchema(activeDb, activeColl);
      setSchema(res.schema || { name: `${activeColl} Schema`, enforcement: 'strict', strict: false, fields: {} });
    } catch (err) {
      onShowToast('Failed to load schema: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = (e) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;

    const fieldConfig = {
      type: newFieldType,
      required: newFieldRequired,
      unique: newFieldUnique
    };

    if (newFieldMin !== '') fieldConfig.min = Number(newFieldMin);
    if (newFieldMax !== '') fieldConfig.max = Number(newFieldMax);
    if (newFieldPattern.trim()) fieldConfig.pattern = newFieldPattern.trim();
    if (newFieldEnum.trim()) {
      fieldConfig.enum = newFieldEnum.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (newFieldDefault.trim()) {
      fieldConfig.default = newFieldDefault.trim();
    }
    if (newFieldDesc.trim()) {
      fieldConfig.description = newFieldDesc.trim();
    }

    setSchema(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [newFieldName.trim()]: fieldConfig
      }
    }));

    // Reset new field inputs
    setNewFieldName('');
    setNewFieldMin('');
    setNewFieldMax('');
    setNewFieldPattern('');
    setNewFieldEnum('');
    setNewFieldDefault('');
    setNewFieldDesc('');
    setNewFieldRequired(false);
    setNewFieldUnique(false);
  };

  const handleRemoveField = (fieldName) => {
    setSchema(prev => {
      const updated = { ...prev.fields };
      delete updated[fieldName];
      return { ...prev, fields: updated };
    });
  };

  const handleSaveSchema = async () => {
    setSaving(true);
    try {
      await api.saveSchema(activeDb, activeColl, schema);
      onShowToast('Schema successfully updated & enforced!', 'success');
    } catch (err) {
      onShowToast('Failed to save schema: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSandbox = async () => {
    try {
      const parsed = JSON.parse(testPayload);
      const res = await api.validateDocument(activeDb, activeColl, parsed, schema);
      setTestResult(res);
    } catch (err) {
      setTestResult({ valid: false, errors: [{ message: 'Invalid JSON format: ' + err.message }] });
    }
  };

  return (
    <div className="tab-content" style={{ overflowY: 'auto', padding: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} color="var(--accent-emerald)" />
            <span>Schema Studio: {activeColl}</span>
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Define strong typing, constraints, unique indexes, and defaults enforced on documents.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSaveSchema}
          disabled={saving}
        >
          <Save size={15} />
          <span>{saving ? 'Saving...' : 'Save & Enforce Schema'}</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem' }}>
        {/* Left Column: Schema Configuration & Fields */}
        <div>
          {/* Schema Settings Card */}
          <div className="doc-card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.85rem' }}>
              <Sliders size={15} />
              <span>General Settings</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">Enforcement Mode</label>
                <select
                  className="text-input no-prefix"
                  value={schema.enforcement || 'strict'}
                  onChange={e => setSchema({ ...schema, enforcement: e.target.value })}
                >
                  <option value="strict">Strict (Reject invalid documents)</option>
                  <option value="warn">Warn (Allow invalid, report warnings)</option>
                  <option value="disabled">Disabled (Do not validate)</option>
                </select>
              </div>

              <div>
                <label className="form-label">Extra Fields (Disallow Unknown)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                  <input
                    type="checkbox"
                    id="strictFields"
                    checked={!!schema.strict}
                    onChange={e => setSchema({ ...schema, strict: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-emerald)' }}
                  />
                  <label htmlFor="strictFields" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    Strict Mode (reject unlisted fields)
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Add Field Section */}
          <div className="doc-card" style={{ marginBottom: '1.25rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '0.75rem' }}>
              Add Field to Schema
            </span>

            <form onSubmit={handleAddField}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label className="form-label">Field Name</label>
                  <input
                    type="text"
                    className="text-input no-prefix"
                    placeholder="e.g. email, price, status"
                    value={newFieldName}
                    onChange={e => setNewFieldName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Data Type</label>
                  <select
                    className="text-input no-prefix"
                    value={newFieldType}
                    onChange={e => setNewFieldType(e.target.value)}
                  >
                    {FIELD_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Constraints row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <div>
                  <label className="form-label">Min / MinLen</label>
                  <input
                    type="number"
                    className="text-input no-prefix"
                    placeholder="0"
                    value={newFieldMin}
                    onChange={e => setNewFieldMin(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Max / MaxLen</label>
                  <input
                    type="number"
                    className="text-input no-prefix"
                    placeholder="100"
                    value={newFieldMax}
                    onChange={e => setNewFieldMax(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Regex Pattern</label>
                  <input
                    type="text"
                    className="text-input no-prefix"
                    placeholder="^[a-z]+$"
                    value={newFieldPattern}
                    onChange={e => setNewFieldPattern(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Enum (comma-sep)</label>
                  <input
                    type="text"
                    className="text-input no-prefix"
                    placeholder="active, inactive"
                    value={newFieldEnum}
                    onChange={e => setNewFieldEnum(e.target.value)}
                  />
                </div>
              </div>

              {/* Checkboxes & Default */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '1.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newFieldRequired}
                      onChange={e => setNewFieldRequired(e.target.checked)}
                      style={{ accentColor: 'var(--accent-emerald)' }}
                    />
                    <span>Required</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newFieldUnique}
                      onChange={e => setNewFieldUnique(e.target.checked)}
                      style={{ accentColor: 'var(--accent-emerald)' }}
                    />
                    <span>Unique Index</span>
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Default:</span>
                  <input
                    type="text"
                    className="text-input no-prefix"
                    placeholder="default value"
                    style={{ width: '130px', padding: '0.3rem 0.5rem' }}
                    value={newFieldDefault}
                    onChange={e => setNewFieldDefault(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                <Plus size={15} />
                <span>Add Field to Schema</span>
              </button>
            </form>
          </div>

          {/* Current Defined Fields List */}
          <div className="schema-grid">
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Configured Fields ({Object.keys(schema.fields || {}).length})
            </span>

            {Object.keys(schema.fields || {}).length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No fields specified yet. Add your first field above!
              </div>
            ) : (
              Object.entries(schema.fields).map(([fieldName, rule]) => (
                <div key={fieldName} className="schema-field-card">
                  <div className="schema-field-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{fieldName}</span>
                      <span className="field-type-pill">{rule.type}</span>
                    </div>

                    <button
                      className="btn-icon"
                      style={{ color: 'var(--accent-rose)' }}
                      onClick={() => handleRemoveField(fieldName)}
                      title="Remove field"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="rule-tags">
                    {rule.required && <span className="rule-tag" style={{ color: 'var(--accent-amber)', background: 'rgba(245, 158, 11, 0.15)' }}>Required</span>}
                    {rule.unique && <span className="rule-tag" style={{ color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.15)' }}>Unique Index</span>}
                    {rule.min !== undefined && <span className="rule-tag">Min: {rule.min}</span>}
                    {rule.max !== undefined && <span className="rule-tag">Max: {rule.max}</span>}
                    {rule.pattern && <span className="rule-tag">Pattern: {rule.pattern}</span>}
                    {rule.default !== undefined && <span className="rule-tag">Default: {String(rule.default)}</span>}
                    {rule.enum && <span className="rule-tag">Enum: [{rule.enum.join(', ')}]</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Schema Test Sandbox */}
        <div>
          <div className="doc-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Live Sandbox Validator</span>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }} onClick={handleTestSandbox}>
                Run Validation
              </button>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Paste a sample JSON document to check if it satisfies the defined schema rules.
            </p>

            <textarea
              className="textarea-code"
              style={{ flex: 1, minHeight: '200px' }}
              value={testPayload}
              onChange={e => setTestPayload(e.target.value)}
              spellCheck={false}
            />

            {/* Test result output */}
            {testResult && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                background: testResult.valid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                border: `1px solid ${testResult.valid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                color: testResult.valid ? 'var(--accent-emerald)' : 'var(--accent-rose)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                  {testResult.valid ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                  <span>{testResult.valid ? 'Passed: Valid Document!' : 'Validation Errors:'}</span>
                </div>
                {testResult.errors?.length > 0 && (
                  <ul style={{ marginTop: '0.4rem', paddingLeft: '1.25rem' }}>
                    {testResult.errors.map((e, idx) => (
                      <li key={idx}>{e.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
