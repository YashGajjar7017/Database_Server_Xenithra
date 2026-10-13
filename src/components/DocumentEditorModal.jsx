import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { api } from '../api';

export default function DocumentEditorModal({
  isOpen,
  onClose,
  activeDb,
  activeColl,
  initialDoc,
  onSave
}) {
  const [content, setContent] = useState('');
  const [jsonError, setJsonError] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (initialDoc) {
      setContent(JSON.stringify(initialDoc, null, 2));
    } else {
      // Default template
      setContent(JSON.stringify({
        name: "New Entry",
        status: "active"
      }, null, 2));
    }
    setJsonError(null);
    setValidationResult(null);
  }, [initialDoc, isOpen]);

  if (!isOpen) return null;

  const handleValidate = async () => {
    setJsonError(null);
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      setJsonError(`JSON Syntax Error: ${e.message}`);
      return;
    }

    setIsValidating(true);
    try {
      const res = await api.validateDocument(activeDb, activeColl, parsed);
      setValidationResult(res);
    } catch (e) {
      setJsonError(`Validation request failed: ${e.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setJsonError(null);
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      setJsonError(`JSON Syntax Error: ${e.message}`);
      return;
    }

    onSave(parsed);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">
            {initialDoc ? `Edit Document (${initialDoc._id})` : `Insert Document into ${activeColl}`}
          </span>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Document Content (JSON)</label>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={handleValidate}
                  disabled={isValidating}
                >
                  <ShieldCheck size={13} />
                  <span>Validate against Schema</span>
                </button>
              </div>

              <textarea
                className="textarea-code"
                value={content}
                onChange={e => {
                  setContent(e.target.value);
                  setJsonError(null);
                  setValidationResult(null);
                }}
                rows={14}
                spellCheck={false}
              />
            </div>

            {/* JSON Error */}
            {jsonError && (
              <div style={{
                padding: '0.6rem 0.8rem',
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                borderRadius: '6px',
                color: 'var(--accent-rose)',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}>
                <AlertTriangle size={15} />
                <span>{jsonError}</span>
              </div>
            )}

            {/* Schema Validation Feedback */}
            {validationResult && (
              <div style={{
                padding: '0.6rem 0.8rem',
                background: validationResult.valid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                border: `1px solid ${validationResult.valid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                borderRadius: '6px',
                color: validationResult.valid ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                fontSize: '0.8rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  {validationResult.valid ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>{validationResult.valid ? 'Document conforms to collection schema!' : 'Schema Validation Issues:'}</span>
                </div>
                {validationResult.errors?.length > 0 && (
                  <ul style={{ marginTop: '0.4rem', paddingLeft: '1.25rem' }}>
                    {validationResult.errors.map((err, idx) => (
                      <li key={idx}>{err.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {initialDoc ? 'Save Changes' : 'Insert Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
