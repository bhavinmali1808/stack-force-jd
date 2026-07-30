import React, { useState } from 'react';
import { Send, X, User, ChevronDown } from 'lucide-react';

export default function ComposeModal({ isOpen, onClose, selectedContacts = [], quota, templates = [], onSend }) {
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [category, setCategory] = useState('outreach');
  const [templateId, setTemplateId] = useState('');
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const applyTemplate = (id) => {
    const t = templates.find(t => t._id === id || t._id?.toString() === id);
    if (t) {
      setSubject(t.subject);
      setBodyHtml(t.bodyHtml);
      setCategory(t.category || 'outreach');
    }
    setTemplateId(id);
  };

  const handleSend = async () => {
    if (!subject || !bodyHtml) return;
    setSending(true);
    try {
      await onSend({
        recipients: selectedContacts.map(c => ({ email: c.email, name: c.name })),
        subject,
        bodyHtml,
        category,
      });
    } finally {
      setSending(false);
    }
  };

  const remaining = quota?.remaining ?? 999;
  const overQuota = typeof remaining === 'number' && selectedContacts.length > remaining;

  return (
    <div className="modal-overlay">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">✉️ Compose Email</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Recipients */}
          <div className="form-group">
            <label className="form-label">To ({selectedContacts.length} contacts)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border-2)', borderRadius: 'var(--radius-md)', maxHeight: 80, overflowY: 'auto' }}>
              {selectedContacts.map(c => (
                <span key={c.id || c._id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(99,102,241,0.12)', color: '#a78bfa', padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>
                  <User size={10} />
                  {c.name || c.email}
                </span>
              ))}
            </div>
          </div>

          {/* Template selector */}
          <div className="form-group">
            <label className="form-label">Load Template</label>
            <select className="form-select" value={templateId} onChange={e => applyTemplate(e.target.value)}>
              <option value="">— Choose template or compose below —</option>
              {templates.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="outreach">Outreach</option>
              <option value="interview">Interview</option>
              <option value="marketing">Marketing</option>
              <option value="welcome">Welcome</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Subject */}
          <div className="form-group">
            <label className="form-label">Subject *</label>
            <input
              className="form-input"
              placeholder="Use {{name}}, {{company}} for personalization"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          {/* Body */}
          <div className="form-group">
            <label className="form-label">Body (HTML) *</label>
            <textarea
              className="form-textarea"
              style={{ minHeight: 180, fontFamily: 'monospace', fontSize: 12 }}
              placeholder="<p>Hi <strong>{{name}}</strong>,</p>..."
              value={bodyHtml}
              onChange={e => setBodyHtml(e.target.value)}
            />
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Variables: {'{{name}}'} {'{{company}}'} {'{{jobTitle}}'}
            </div>
          </div>

          {overQuota && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 12, color: 'var(--color-danger)' }}>
              ⚠️ You've selected {selectedContacts.length} recipients but only have {remaining} emails remaining today.
            </div>
          )}

          {quota && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'right' }}>
              Quota: {quota.sentCount}/{quota.dailyLimit} used · {remaining} remaining today
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!subject || !bodyHtml || sending || overQuota}
            onClick={handleSend}
            style={{ minWidth: 120 }}
          >
            {sending ? (
              <><span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>⟳</span> Sending...</>
            ) : (
              <><Send size={13} /> Send to {selectedContacts.length}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
