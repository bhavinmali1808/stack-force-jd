import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Check, ChevronRight } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

/* ── Multi-step progress bar ─────────────────────────── */
function StepBar({ step }) {
  const steps = ['Recipients', 'Content', 'Review', 'Success'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)' }}>
      {steps.map((s, i) => {
        const done    = i < step;
        const current = i === step;
        return (
          <React.Fragment key={s}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{
                width: 28, height: 28,
                borderRadius: '50%',
                background: done || current ? 'var(--purple)' : '#e5e7eb',
                color: done || current ? '#fff' : '#9ca3af',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700,
                flexShrink: 0,
              }}>
                {done ? <Check size={14} /> : i + 1}
              </div>
              <span style={{
                fontSize: '0.6875rem', fontWeight: current ? 700 : 500,
                color: current ? 'var(--purple)' : done ? 'var(--text-2)' : 'var(--text-muted)',
                whiteSpace: 'nowrap',
              }}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2,
                background: done ? 'var(--purple)' : '#e5e7eb',
                margin: '0 0.25rem', marginBottom: '1rem',
                minWidth: 40,
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── Field wrapper ────────────────────────────────────── */
function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: '0.4rem' }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.3rem' }}>{hint}</div>}
    </div>
  );
}

export default function CampaignBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [step, setStep]           = useState(0);
  const [form, setForm] = useState({
    name: '', subject: '', previewText: '',
    senderName: 'Resuming.io', senderEmail: 'no-reply@resuming.io',
    replyTo: 'teams@resuming.io', templateId: '', audienceType: 'all',
  });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  useEffect(() => {
    api.get('/templates').then(res => { if (res.data.success) setTemplates(res.data.templates); });
    if (id) api.get(`/campaigns/${id}`).then(res => { if (res.data.success) setForm(res.data.campaign); });
  }, [id]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (step < 2) { setStep(s => s + 1); return; }
    setLoading(true);
    try {
      if (id) { await api.put(`/campaigns/${id}`, form); toast.success('Campaign updated'); }
      else    { await api.post('/campaigns', form);       toast.success('Campaign created'); }
      navigate('/campaigns');
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>

      {/* Top header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 0 1.25rem',
      }}>
        <button
          onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/campaigns')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.875rem', fontWeight: 500 }}
        >
          <ArrowLeft size={16} /> {id ? 'Edit Campaign' : 'Regular campaign'}
        </button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-ghost" style={{ fontSize: '0.8125rem' }}>Edit</button>
          <button className="btn-primary" style={{ fontSize: '0.8125rem' }}>Account plans</button>
        </div>
      </div>

      {/* Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Step bar */}
        <StepBar step={step} />

        {/* Form body */}
        <form onSubmit={handleSave} style={{ padding: '2rem' }}>

          {/* ── STEP 0: Recipients ── */}
          {step === 0 && (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.25rem' }}>Set up your campaign</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>Fill in the basic info for your campaign.</p>
              </div>

              <Field label="Campaign">
                <input className="input" placeholder="Campaign name" value={form.name} onChange={e => set('name', e.target.value)} required />
              </Field>

              <Field label="Date">
                <div style={{ position: 'relative' }}>
                  <input className="input" type="date" style={{ paddingLeft: '2.5rem' }} />
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem' }}>📅</span>
                </div>
              </Field>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <label style={{
                  flex: 1, display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                  padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)',
                  cursor: 'pointer', background: form.audienceType === 'email' ? 'var(--purple-light)' : '#fff',
                  borderColor: form.audienceType === 'email' ? 'var(--purple)' : 'var(--border)',
                }}>
                  <input type="checkbox" checked={form.audienceType !== 'none'} onChange={() => {}} style={{ marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-1)' }}>📧 Email</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Fills up the entire page</div>
                  </div>
                </label>
                <label style={{
                  flex: 1, display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                  padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)',
                  cursor: 'pointer', background: '#fff',
                }}>
                  <input type="checkbox" style={{ marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-1)' }}>💬 Set up: SMS</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Fills up the entire page</div>
                  </div>
                </label>
              </div>

              <Field label="Target Audience">
                <select className="select" value={form.audienceType} onChange={e => set('audienceType', e.target.value)}>
                  <option value="all">All Contacts</option>
                  <option value="premium">Premium Users</option>
                  <option value="free">Free Users</option>
                  <option value="trial">Trial Users</option>
                  <option value="verified">Verified Users</option>
                  <option value="unverified">Unverified Users</option>
                  <option value="has_resume">Users with Resume</option>
                  <option value="no_resume">Users without Resume</option>
                </select>
              </Field>

              <Field label="Select tags (optional)">
                <select className="select" style={{ color: 'var(--text-muted)' }}>
                  <option value="">Select tags</option>
                </select>
              </Field>
            </>
          )}

          {/* ── STEP 1: Content ── */}
          {step === 1 && (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.25rem' }}>
                  How would you like to design your email?
                  <span style={{ background: 'var(--green-bg)', color: 'var(--green)', fontSize: '0.6875rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '6px', marginLeft: '0.625rem', verticalAlign: 'middle' }}>Popular</span>
                </h2>
              </div>

              {/* Template drag area */}
              <div style={{
                border: '1.5px dashed #d1d5db',
                borderRadius: '12px', background: '#f9fafb',
                padding: '3rem 2rem', textAlign: 'center', marginBottom: '1.5rem', cursor: 'pointer',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.4 }}>📎</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-3)' }}>
                  Upload multiple files or <span style={{ color: 'var(--purple)', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>Drag and drop</span>
                </div>
              </div>

              <Field label="Subject">
                <input className="input" placeholder="Add a subject" value={form.subject} onChange={e => set('subject', e.target.value)} required />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Field label="Sender">
                  <input className="input" placeholder="Sender name" value={form.senderName} onChange={e => set('senderName', e.target.value)} />
                </Field>
                <Field label="Sender mail address">
                  <select className="select" value={form.senderEmail} onChange={e => set('senderEmail', e.target.value)}>
                    <option value="no-reply@resuming.io">no-reply@resuming.io</option>
                    <option value="teams@resuming.io">teams@resuming.io</option>
                    <option value="support@resuming.io">support@resuming.io</option>
                    <option value="hr@resuming.io">hr@resuming.io</option>
                  </select>
                </Field>
              </div>

              <Field label="Select Template">
                <select className="select" value={form.templateId?._id || form.templateId || ''} onChange={e => set('templateId', e.target.value)} required>
                  <option value="">-- Choose a template --</option>
                  {templates.map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.category})</option>
                  ))}
                </select>
              </Field>
            </>
          )}

          {/* ── STEP 2: Review ── */}
          {step === 2 && (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '0.25rem' }}>Review your campaign</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>Everything look good? You can go back to make changes.</p>
              </div>
              {[
                { label: 'Campaign Name', value: form.name || '—' },
                { label: 'Subject Line',  value: form.subject || '—' },
                { label: 'Sender',        value: `${form.senderName} <${form.senderEmail}>` },
                { label: 'Reply-To',      value: form.replyTo },
                { label: 'Audience',      value: form.audienceType },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-3)', fontWeight: 500 }}>{row.label}</span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-1)', fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}
            </>
          )}

          {/* Bottom actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/campaigns')}
              className="btn-ghost"
            >
              {step === 0 ? 'Cancel' : 'Save'}
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : step < 2 ? 'Save and continue' : 'Launch Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
