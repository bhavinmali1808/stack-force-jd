import React, { useState, useEffect } from 'react';
import { Users, Send, X } from 'lucide-react';
import api from '../api';

export default function CampaignModal({ isOpen, onClose, onSubmit, quota }) {
  const [step, setStep] = useState(1); // 1=Setup, 2=Recipients, 3=Review
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [form, setForm] = useState({
    name: '',
    subject: '',
    bodyHtml: '',
    category: 'marketing',
    templateId: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setSelectedIds(new Set());
    setForm({ name: '', subject: '', bodyHtml: '', category: 'marketing', templateId: '' });
    setLoading(true);
    Promise.all([
      api.get('/emailer/templates').catch(() => ({ data: { templates: [] } })),
      api.get('/emailer/contacts').catch(() => ({ data: { contacts: [] } })),
    ]).then(([tRes, cRes]) => {
      setTemplates(tRes.data.templates || []);
      setContacts(cRes.data.contacts || []);
      setLoading(false);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const applyTemplate = (id) => {
    const t = templates.find(t => t._id === id || t._id?.toString() === id);
    if (t) {
      setForm(f => ({ ...f, subject: t.subject, bodyHtml: t.bodyHtml, category: t.category, templateId: id }));
    }
  };

  const toggleContact = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === contacts.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(contacts.map(c => c.id || c._id)));
  };

  const selectedContacts = contacts.filter(c => selectedIds.has(c.id || c._id));

  const handleSend = async () => {
    setSending(true);
    try {
      const payload = {
        ...form,
        recipients: selectedContacts.map(c => ({ email: c.email, name: c.name })),
      };
      await onSubmit(payload);
    } finally {
      setSending(false);
    }
  };

  const canNext1 = form.name && form.subject && form.bodyHtml;
  const canNext2 = selectedIds.size > 0;

  const remaining = quota?.remaining ?? 999;
  const overQuota = typeof remaining === 'number' && selectedIds.size > remaining;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">🚀 Create Campaign</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 3 }}>
              Step {step} of 3 — {['Setup', 'Select Recipients', 'Review & Send'][step - 1]}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 0, padding: '0 24px' }}>
          {['Setup', 'Recipients', 'Review'].map((label, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderBottom: `2px solid ${step === i + 1 ? 'var(--color-primary)' : step > i + 1 ? 'var(--color-success)' : 'var(--color-border)'}`, fontSize: 11, fontWeight: 600, color: step === i + 1 ? 'var(--color-primary)' : step > i + 1 ? 'var(--color-success)' : 'var(--color-text-muted)', transition: 'all 0.2s' }}>
              {step > i + 1 ? '✓' : i + 1} {label}
            </div>
          ))}
        </div>

        <div className="modal-body">
          {/* Step 1: Setup */}
          {step === 1 && (
            <div>
              <div className="form-group">
                <label className="form-label">Campaign Name *</label>
                <input className="form-input" placeholder="e.g. Q3 React Developer Outreach" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="marketing">Marketing</option>
                  <option value="outreach">Job Outreach</option>
                  <option value="interview">Interview Invite</option>
                  <option value="newsletter">Newsletter</option>
                  <option value="announcement">Announcement</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Load from Template (optional)</label>
                <select className="form-select" value={form.templateId} onChange={e => applyTemplate(e.target.value)}>
                  <option value="">— Start blank —</option>
                  {templates.map(t => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Subject Line *</label>
                <input className="form-input" placeholder="e.g. Exciting React role at {{company}}" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email Body (HTML) *</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: 200, fontFamily: 'monospace', fontSize: 12 }}
                  placeholder="<p>Hi <strong>{{name}}</strong>,</p>..."
                  value={form.bodyHtml}
                  onChange={e => setForm(f => ({ ...f, bodyHtml: e.target.value }))}
                />
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  Variables: {'{{name}}'} {'{{company}}'} {'{{jobTitle}}'} {'{{recruiterName}}'}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Recipients */}
          {step === 2 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-2)' }}>
                  {selectedIds.size} of {contacts.length} selected
                </span>
                <button className="btn btn-ghost btn-sm" onClick={selectAll}>
                  {selectedIds.size === contacts.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {overQuota && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 12, fontSize: 12, color: 'var(--color-danger)' }}>
                  ⚠️ You've selected {selectedIds.size} recipients but only have {remaining} emails remaining today. Reduce selection or wait until tomorrow.
                </div>
              )}

              {loading ? (
                [...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44, marginBottom: 8, borderRadius: 8 }} />)
              ) : (
                <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {contacts.map((c) => {
                    const id = c.id || c._id;
                    const isSelected = selectedIds.has(id);
                    return (
                      <div
                        key={id}
                        onClick={() => toggleContact(id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 12px', borderRadius: 'var(--radius-md)',
                          border: `1px solid ${isSelected ? 'rgba(99,102,241,0.4)' : 'var(--color-border)'}`,
                          background: isSelected ? 'rgba(99,102,241,0.08)' : 'var(--color-surface-2)',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border-2)'}`, background: isSelected ? 'var(--color-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isSelected && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
                        </div>
                        <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{c.name[0]}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{c.email}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {(c.skills || []).slice(0, 2).map((s, i) => <span key={i} className="tag" style={{ fontSize: 10 }}>{s}</span>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Campaign', value: form.name },
                  { label: 'Category', value: form.category },
                  { label: 'Subject', value: form.subject },
                  { label: 'Recipients', value: `${selectedIds.size} contacts` },
                ].map((row, i) => (
                  <div key={i} style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 500 }}>{row.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 600, marginBottom: 8 }}>Email Preview</div>
                <div
                  style={{ background: '#1e293b', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 16, maxHeight: 200, overflowY: 'auto', fontSize: 13 }}
                  dangerouslySetInnerHTML={{ __html: form.bodyHtml.replace(/\{\{name\}\}/g, 'John Doe').replace(/\{\{company\}\}/g, 'StackForce') }}
                />
              </div>

              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: 13 }}>
                <div style={{ fontWeight: 600, color: 'var(--color-primary)', marginBottom: 4 }}>Ready to send</div>
                <div style={{ color: 'var(--color-text-2)' }}>
                  This will send <strong>{selectedIds.size}</strong> personalized emails using your SMTP server at <code style={{ color: '#a78bfa', fontSize: 12 }}>mail.resuming.io</code>.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step > 1 && (
            <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>
              ← Back
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          {step < 3 ? (
            <button
              className="btn btn-primary"
              disabled={step === 1 ? !canNext1 : !canNext2 || overQuota}
              onClick={() => setStep(s => s + 1)}
            >
              Next →
            </button>
          ) : (
            <button
              className="btn btn-primary"
              disabled={sending || overQuota}
              onClick={handleSend}
              style={{ minWidth: 120 }}
            >
              {sending ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>⟳</span>
                  Sending...
                </span>
              ) : (
                <><Send size={13} /> Send Campaign</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
