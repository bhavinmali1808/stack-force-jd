import React, { useState } from 'react';
import { X, Upload, Loader } from 'lucide-react';
import styles from './ApplyModal.module.css';

export default function ApplyModal({ job, open, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', experience: '', linkedin: '', cover: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.');
      return;
    }
    setError('');
    setLoading(true);
    // Simulate submission (wire to real endpoint when available)
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setDone(true);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => { setDone(false); setForm({ name:'',email:'',phone:'',experience:'',linkedin:'',cover:'' }); setError(''); }, 300);
  };

  if (!open) return null;
  const c = job?.company || {};

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={handleClose}><X size={17} /></button>

        {done ? (
          <div className={styles.success}>
            <div className={styles.successIcon}>✓</div>
            <h2>Application Submitted!</h2>
            <p>We've received your application for <strong>{job?.title}</strong> at <strong>{c.name}</strong>.</p>
            <p className={styles.successSub}>The recruiter will reach out if your profile matches.</p>
            <button className={styles.btnPrimary} onClick={handleClose}>Done</button>
          </div>
        ) : (
          <>
            <div className={styles.header}>
              <h2 className={styles.title}>Apply for this Role</h2>
              <p className={styles.sub}>
                <strong>{job?.title}</strong> · {c.name}
              </p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.row}>
                <Field label="Full Name *" id="apply-name">
                  <input id="apply-name" type="text" className={styles.input} placeholder="John Doe" value={form.name} onChange={set('name')} required />
                </Field>
                <Field label="Email Address *" id="apply-email">
                  <input id="apply-email" type="email" className={styles.input} placeholder="john@example.com" value={form.email} onChange={set('email')} required />
                </Field>
              </div>

              <div className={styles.row}>
                <Field label="Phone Number" id="apply-phone">
                  <input id="apply-phone" type="tel" className={styles.input} placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} />
                </Field>
                <Field label="Years of Experience" id="apply-exp">
                  <input id="apply-exp" type="number" className={styles.input} placeholder="3" min="0" max="50" value={form.experience} onChange={set('experience')} />
                </Field>
              </div>

              <Field label="LinkedIn Profile URL" id="apply-linkedin">
                <input id="apply-linkedin" type="url" className={styles.input} placeholder="https://linkedin.com/in/yourprofile" value={form.linkedin} onChange={set('linkedin')} />
              </Field>

              <Field label="Cover Note (optional)" id="apply-cover">
                <textarea
                  id="apply-cover"
                  className={styles.input}
                  rows={3}
                  placeholder="Briefly describe why you're a great fit..."
                  value={form.cover}
                  onChange={set('cover')}
                />
              </Field>

              <div className={styles.footer}>
                <button type="button" className={styles.btnCancel} onClick={handleClose}>Cancel</button>
                <button type="submit" className={styles.btnPrimary} disabled={loading}>
                  {loading ? <><Loader size={16} className={styles.spin} /> Submitting...</> : 'Submit Application →'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, id, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label htmlFor={id} style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>{label}</label>
      {children}
    </div>
  );
}
