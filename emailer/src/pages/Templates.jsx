import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, Copy, Zap, Mail, FileText, Briefcase, Star } from 'lucide-react';
import store from '../store/emailerStore';

const CATEGORY_ICONS = {
  otp: Zap,
  welcome: Star,
  outreach: Briefcase,
  interview: Mail,
  marketing: FileText,
  custom: FileText,
};

const CATEGORY_COLORS = {
  otp:       { bg: 'rgba(245,158,11,0.12)',   text: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
  welcome:   { bg: 'rgba(16,185,129,0.12)',   text: '#34d399', border: 'rgba(16,185,129,0.2)' },
  outreach:  { bg: 'rgba(99,102,241,0.12)',   text: '#818cf8', border: 'rgba(99,102,241,0.2)' },
  interview: { bg: 'rgba(6,182,212,0.12)',    text: '#22d3ee', border: 'rgba(6,182,212,0.2)' },
  marketing: { bg: 'rgba(168,85,247,0.12)',   text: '#c084fc', border: 'rgba(168,85,247,0.2)' },
  custom:    { bg: 'rgba(255,255,255,0.06)',  text: '#94a3b8', border: 'rgba(255,255,255,0.1)' },
};

const INIT_FORM = { name: '', subject: '', category: 'custom', bodyHtml: '' };

const HTML_SNIPPETS = {
  greeting:  '<p>Hi <strong>{{name}}</strong>,</p>\n<p>I hope you\'re doing well!</p>',
  button:    '<a href="{{url}}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:12px 0;">{{buttonText}}</a>',
  divider:   '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:20px 0;"/>',
  signature: '<p>Best regards,<br/><strong>{{recruiterName}}</strong><br/>{{company}}</p>',
  otpBlock:  '<div style="background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:20px;text-align:center;margin:20px 0;"><div style="font-size:40px;font-weight:800;color:#a78bfa;letter-spacing:10px;">{{otp}}</div><div style="font-size:12px;color:#64748b;margin-top:8px;">Expires in {{expiryMinutes}} minutes</div></div>',
};

export default function Templates({ showToast }) {
  const [templates, setTemplates]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form, setForm]                 = useState(INIT_FORM);
  const [saving, setSaving]             = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const fetchTemplates = async () => {
    setLoading(true);
    const list = await store.templates.list();
    setTemplates(list);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  /* ── Editor open helpers ── */
  const openCreate = () => {
    setForm(INIT_FORM);
    setEditingTemplate(null);
    setIsEditorOpen(true);
  };

  const openEdit = (t) => {
    if (t.isSystem) {
      showToast('info', '💡 System templates can\'t be edited — duplicate it first.');
      return;
    }
    setForm({ name: t.name, subject: t.subject, category: t.category, bodyHtml: t.bodyHtml });
    setEditingTemplate(t);
    setIsEditorOpen(true);
  };

  const handleDuplicate = (t) => {
    setForm({ name: `${t.name} (Copy)`, subject: t.subject, category: t.category, bodyHtml: t.bodyHtml });
    setEditingTemplate(null);
    setIsEditorOpen(true);
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!form.name.trim() || !form.subject.trim() || !form.bodyHtml.trim()) {
      showToast('error', '⚠️ Please fill in Name, Subject, and Body');
      return;
    }
    setSaving(true);
    try {
      if (editingTemplate?._id) {
        await store.templates.update(editingTemplate._id, form);
        showToast('success', '✓ Template updated');
      } else {
        await store.templates.create(form);
        showToast('success', '✓ Template saved');
      }
      setIsEditorOpen(false);
      fetchTemplates();
    } catch (err) {
      showToast('error', err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async (t) => {
    if (!window.confirm(`Delete "${t.name}"?`)) return;
    try {
      await store.templates.delete(t._id);
      showToast('success', 'Template deleted');
      fetchTemplates();
    } catch {
      showToast('error', 'Failed to delete');
    }
  };

  /* ── Snippet insert ── */
  const insertSnippet = (key) => {
    setForm(f => ({ ...f, bodyHtml: (f.bodyHtml ? f.bodyHtml + '\n' : '') + HTML_SNIPPETS[key] }));
  };

  const catColors = (cat) => CATEGORY_COLORS[cat] || CATEGORY_COLORS.custom;

  return (
    <>
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">Email Templates</h1>
          <p className="page-subtitle">Create and manage reusable email templates</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={14} /> New Template
          </button>
        </div>
      </div>

      <div className="page-container" style={{ paddingTop: 16 }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 172, borderRadius: 'var(--radius-lg)' }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {templates.map((t) => {
              const colors = catColors(t.category);
              const IconComp = CATEGORY_ICONS[t.category] || FileText;
              return (
                <div
                  key={t._id}
                  className="card"
                  style={{ transition: 'border-color 0.18s, transform 0.18s, box-shadow 0.18s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {/* Header */}
                  <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 'var(--radius-md)', flexShrink: 0,
                        background: colors.bg, border: `1px solid ${colors.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <IconComp size={16} style={{ color: colors.text }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.name}
                        </div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: colors.bg, color: colors.text }}>
                            {t.category}
                          </span>
                          {t.isSystem && (
                            <span className="badge badge-default" style={{ fontSize: 10 }}>System</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subject preview */}
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 4 }}>
                      SUBJECT
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.subject}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ padding: '10px 16px', display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setPreviewTemplate(t)}
                      style={{ flex: 1, justifyContent: 'center' }}>
                      <Eye size={12} /> Preview
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDuplicate(t)}
                      title="Duplicate"
                    >
                      <Copy size={12} />
                    </button>
                    {!t.isSystem && (
                      <>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)} title="Edit">
                          <Edit2 size={12} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t)} title="Delete">
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Create new card */}
            <button
              onClick={openCreate}
              style={{
                background: 'rgba(99,102,241,0.05)',
                border: '1px dashed rgba(99,102,241,0.3)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: 32, gap: 10, cursor: 'pointer', transition: 'all 0.2s', minHeight: 172,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={18} style={{ color: 'var(--color-primary)' }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>
                Create Template
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ── Template Editor Modal ─────────────────────────────── */}
      {isEditorOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 900 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {editingTemplate ? '✏️ Edit Template' : '✨ New Template'}
              </span>
              <button className="modal-close" onClick={() => setIsEditorOpen(false)}>×</button>
            </div>

            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Left: Meta */}
              <div>
                <div className="form-group">
                  <label className="form-label">Template Name *</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Q3 React Developer Outreach"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  >
                    <option value="custom">Custom</option>
                    <option value="otp">OTP / Auth</option>
                    <option value="welcome">Welcome</option>
                    <option value="outreach">Job Outreach</option>
                    <option value="interview">Interview Invite</option>
                    <option value="marketing">Marketing</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Subject Line *</label>
                  <input
                    className="form-input"
                    placeholder="Use {{name}}, {{company}} for personalization"
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  />
                </div>

                {/* Quick Insert Snippets */}
                <div className="form-group">
                  <label className="form-label">Quick Insert Blocks</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.keys(HTML_SNIPPETS).map(k => (
                      <button
                        key={k}
                        className="btn btn-secondary btn-sm"
                        onClick={() => insertSnippet(k)}
                      >
                        + {k}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Variable reference */}
                <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📝 Available Variables
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
                    {[
                      '{{name}}', '{{company}}', '{{otp}}', '{{expiryMinutes}}',
                      '{{jobTitle}}', '{{applyUrl}}', '{{interviewDate}}', '{{interviewTime}}',
                      '{{recruiterName}}', '{{interviewLink}}', '{{loginUrl}}', '{{ctaText}}',
                    ].map(v => (
                      <code key={v} style={{ color: '#a78bfa', fontSize: 11, fontFamily: 'monospace' }}>{v}</code>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: HTML Editor */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="form-label">HTML Body *</label>
                <textarea
                  className="form-textarea"
                  style={{
                    flex: 1,
                    minHeight: 380,
                    fontFamily: '"Courier New", Courier, monospace',
                    fontSize: 12,
                    lineHeight: 1.6,
                    resize: 'vertical',
                  }}
                  placeholder={`<p>Hi <strong>{{name}}</strong>,</p>\n<p>Your message here...</p>`}
                  value={form.bodyHtml}
                  onChange={e => setForm(f => ({ ...f, bodyHtml: e.target.value }))}
                  spellCheck={false}
                />
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  HTML is safe — rendered in the email body only. Styles are inline.
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsEditorOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
                style={{ minWidth: 140 }}
              >
                {saving ? '⟳ Saving...' : editingTemplate ? '✓ Update Template' : '✓ Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview Modal ──────────────────────────────────────── */}
      {previewTemplate && (
        <div className="modal-overlay" onClick={() => setPreviewTemplate(null)}>
          <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">👁️ Preview — {previewTemplate.name}</span>
              <button className="modal-close" onClick={() => setPreviewTemplate(null)}>×</button>
            </div>
            <div className="modal-body">
              {/* Subject */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', background: 'var(--color-surface-2)',
                borderRadius: 'var(--radius-md)', marginBottom: 14, fontSize: 13,
              }}>
                <span style={{ color: 'var(--color-text-muted)', fontWeight: 600, fontSize: 11, minWidth: 60 }}>SUBJECT</span>
                <span style={{ color: 'var(--color-text)' }}>{previewTemplate.subject}</span>
              </div>
              {/* Body */}
              <div
                style={{
                  background: '#1a2235',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px 24px',
                  border: '1px solid var(--color-border)',
                  maxHeight: 440,
                  overflowY: 'auto',
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: '#cbd5e1',
                }}
                dangerouslySetInnerHTML={{
                  __html: previewTemplate.bodyHtml
                    .replace(/\{\{name\}\}/g, 'John Doe')
                    .replace(/\{\{company\}\}/g, 'StackForce')
                    .replace(/\{\{otp\}\}/g, '847291')
                    .replace(/\{\{expiryMinutes\}\}/g, '10')
                    .replace(/\{\{jobTitle\}\}/g, 'Senior React Developer')
                    .replace(/\{\{recruiterName\}\}/g, 'Hiring Team')
                    .replace(/\{\{interviewDate\}\}/g, 'Aug 5, 2026')
                    .replace(/\{\{interviewTime\}\}/g, '10:00 AM IST'),
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
