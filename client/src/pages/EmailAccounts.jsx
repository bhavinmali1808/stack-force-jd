import React, { useState, useEffect } from 'react';
import { Mail, ShieldAlert, ArrowLeft, Eye, ExternalLink, MoreHorizontal, CheckCircle2 } from 'lucide-react';
import { emailAPI } from '../api/index.js';

export default function EmailAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [provider, setProvider] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [appPassword, setAppPassword] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await emailAPI.list();
      setAccounts(res.data.accounts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      await emailAPI.create({
        emailAddress: emailInput,
        provider,
        appPassword
      });
      fetchAccounts();
      closeModal();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to connect email');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Disconnect this email account?')) return;
    try {
      await emailAPI.delete(id);
      setAccounts(prev => prev.filter(a => a._id !== id));
    } catch (err) {
      alert('Failed to disconnect');
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setTimeout(() => setModalStep(1), 300);
  };

  return (
    <>
      <div className="main-header" style={{ padding: '0 2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h1 style={{ fontSize: '1.25rem' }}>Email Accounts</h1>
        </div>
      </div>

      <div className="main-body" style={{ padding: '2rem 2.5rem' }}>
        <div className="container" style={{ maxWidth: 1200, padding: 0 }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>Email configuration</h3>
              <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>Connect your own email for full branding and higher send limits</p>
            </div>
            <button
              className="btn btn-primary"
              style={{ background: '#5C67ED', border: 'none', padding: '0.6rem 1.25rem', fontSize: '0.875rem' }}
              onClick={() => setModalOpen(true)}
            >
              + Add email
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#374151', fontWeight: 600 }}>
                <th style={{ padding: '1rem 0' }}>Email address</th>
                <th style={{ padding: '1rem 0' }}>Daily send limit</th>
                <th style={{ padding: '1rem 0' }}>Status</th>
                <th style={{ padding: '1rem 0' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>Loading...</td></tr>
              ) : accounts.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>No email accounts connected yet.</td></tr>
              ) : accounts.map((acc) => (
                <tr key={acc._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '1.25rem 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 500, color: '#111827' }}>{acc.emailAddress}</span>
                      <span style={{ fontSize: '0.7rem', background: '#F5F3FF', color: '#7C3AED', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>🎁 {acc.plan || 'Free'}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.2rem', textTransform: 'capitalize' }}>
                      Signed as "Team TalentForce" · {acc.provider}
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 0', color: '#111827', fontWeight: 500 }}>{acc.dailySendLimit}</td>
                  <td style={{ padding: '1.25rem 0', color: acc.status === 'Active' ? '#4F46E5' : '#EF4444', fontWeight: 500 }}>{acc.status}</td>
                  <td style={{ padding: '1.25rem 0', color: '#9CA3AF' }}>
                    <button onClick={() => handleDelete(acc._id)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.2rem 0.5rem' }}>Disconnect</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', width: 520, borderRadius: '12px', padding: '2rem', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <button
              onClick={closeModal}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
            >
              ✕
            </button>

            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>Connect Account</h2>

            {modalStep === 1 && (
              <div style={{ marginTop: '1.5rem' }}>
                <p style={{ fontSize: '0.9rem', color: '#6B7280', marginBottom: '1.5rem' }}>Choose the email provider you want to use for sending campaigns.</p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div
                    onClick={() => { setProvider('gmail'); setModalStep(2); }}
                    style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: '8px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.borderColor = '#4F46E5'}
                    onMouseOut={e => e.currentTarget.style.borderColor = '#E5E7EB'}
                  >
                    <svg viewBox="0 0 24 24" width="36" height="36" style={{ margin: '0 auto 1rem' }}>
                      <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
                      <path fill="#34A853" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" opacity="0" />
                      <path fill="#4285F4" d="M24 5.457c0-2.023-2.309-3.178-3.927-1.964L12 9.548l-6.545-4.91C3.837 3.425 1.528 4.58 1.528 6.602V19.366a1.636 1.636 0 0 0 1.636 1.636h2.29V11.73L12 16.64l6.545-4.91v9.273h2.29a1.636 1.636 0 0 0 1.636-1.636V5.457z" opacity="0" />
                      <path fill="#FBBC05" d="M24 5.457c0-2.023-2.309-3.178-3.927-1.964L12 9.548l-6.545-4.91C3.837 3.425 1.528 4.58 1.528 6.602v.001L12 11.512l10.472-4.91v-.001z" opacity="0" />
                      <path fill="#34A853" d="M12 9.548L5.455 4.64 3.927 3.493C2.309 2.279 0 3.434 0 5.457v13.909c0 .904.732 1.636 1.636 1.636h3.819V11.73L12 16.64V9.548z" />
                      <path fill="#4285F4" d="M12 9.548v7.092L18.545 11.73v9.273h3.819c.904 0 1.636-.732 1.636-1.636V5.457c0-2.023-2.309-3.178-3.927-1.964L18.545 4.64 12 9.548z" />
                      <path fill="#FBBC05" d="M0 5.457c0 1.05.441 2.056 1.227 2.768L12 16.64l10.773-8.415c.786-.712 1.227-1.718 1.227-2.768 0-2.023-2.309-3.178-3.927-1.964L12 9.548 3.927 3.493C2.309 2.279 0 3.434 0 5.457z" />
                    </svg>
                    <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827', margin: 0 }}>Connect Gmail</p>
                  </div>
                  <div
                    onClick={() => { setProvider('outlook'); setModalStep(2); }}
                    style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: '8px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.borderColor = '#4F46E5'}
                    onMouseOut={e => e.currentTarget.style.borderColor = '#E5E7EB'}
                  >
                    <svg viewBox="0 0 24 24" width="36" height="36" style={{ margin: '0 auto 1rem' }}>
                      <path fill="#0072C6" d="M0 24h24V0H0v24z" opacity="0" />
                      <path fill="#0072C6" d="M12 14.5c0 .3-.1.5-.2.7L6.5 19c-.3.2-.8.3-1.1 0-.3-.2-.4-.6-.2-.8l4.8-3.6H1.5c-.4 0-.8-.3-.8-.8s.3-.8.8-.8h8.6l-4.8-3.6c-.3-.2-.2-.6.1-.8.2-.1.5-.1.8.1L11.8 13c.1.1.2.3.2.5v1zm10.5-8.5v12c0 1.1-.9 2-2 2H13.5v-1.5h7c.3 0 .5-.2.5-.5v-11c0-.3-.2-.5-.5-.5h-7v-1.5h7c1.1 0 2 .9 2 2z" />
                      <path fill="#0072C6" d="M12.5 4h9v16h-9V4zm2 2v12h5V6h-5z" opacity="0" />
                      <path fill="#0072C6" d="M14 17h6v-2h-6v2zm0-4h6v-2h-6v2zm0-4h6V7h-6v2z" opacity="0" />
                      <path fill="#0072C6" d="M22 6.5v11c0 1.1-.9 2-2 2H11.5c-1.1 0-2-.9-2-2v-11c0-1.1.9-2 2-2H20c1.1 0 2 .9 2 2zM11.5 6.5v11h8.5v-11h-8.5z" />
                    </svg>
                    <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827', margin: 0 }}>Connect Outlook</p>
                  </div>
                </div>
              </div>
            )}

            {modalStep === 2 && (
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                  <div style={{ background: '#fff', borderRadius: '50%', padding: '0.5rem', border: '1px solid #E5E7EB', display: 'flex' }}>
                    <svg viewBox="0 0 24 24" width="24" height="24">
                      <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" opacity="0" />
                      <path fill="#34A853" d="M12 9.548L5.455 4.64 3.927 3.493C2.309 2.279 0 3.434 0 5.457v13.909c0 .904.732 1.636 1.636 1.636h3.819V11.73L12 16.64V9.548z" />
                      <path fill="#4285F4" d="M12 9.548v7.092L18.545 11.73v9.273h3.819c.904 0 1.636-.732 1.636-1.636V5.457c0-2.023-2.309-3.178-3.927-1.964L18.545 4.64 12 9.548z" />
                      <path fill="#FBBC05" d="M0 5.457c0 1.05.441 2.056 1.227 2.768L12 16.64l10.773-8.415c.786-.712 1.227-1.718 1.227-2.768 0-2.023-2.309-3.178-3.927-1.964L12 9.548 3.927 3.493C2.309 2.279 0 3.434 0 5.457z" />
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Connect to Google</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280' }}>We only use your Google account to send campaign emails, never to read your inbox.</p>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#374151', marginBottom: '0.4rem', fontWeight: 500 }}>Email</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #C7D2FE', outline: 'none', background: '#EEF2FF', color: '#111827', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => setModalStep(1)} style={{ flex: 1, padding: '0.7rem', border: '1px solid #E5E7EB', background: 'transparent', borderRadius: '6px', fontWeight: 600, color: '#9CA3AF', cursor: 'pointer' }}>Back to provider</button>
                  <button onClick={() => setModalStep(3)} style={{ flex: 1, padding: '0.7rem', border: 'none', background: '#5C67ED', color: 'white', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Continue</button>
                </div>
              </div>
            )}

            {modalStep === 3 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Generate a Google App password</h3>

                <div style={{ background: '#F5F3FF', padding: '1rem', borderRadius: '8px', color: '#4C1D95', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Google requires an App password to connect securely. This keeps your main Gmail password private.
                </div>

                <div style={{ border: '1px solid #F3F4F6', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 600 }}>How to generate your app password:</h4>
                  <ol style={{ paddingLeft: '1.25rem', margin: 0, color: '#6B7280', fontSize: '0.875rem', lineHeight: 1.8 }}>
                    <li>Enable 2-Step Verification on your Google account</li>
                    <li>Open Google App Passwords</li>
                    <li>Log in and enter an app name of your choice (eg. TalentForce)</li>
                    <li>Copy the 16-character password</li>
                  </ol>
                </div>

                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <button style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.7rem', border: '1px solid #C7D2FE', background: '#fff', borderRadius: '6px', color: '#5C67ED', fontWeight: 600, marginBottom: '1.5rem', cursor: 'pointer' }}>
                    Open Google App Passwords <ExternalLink size={16} />
                  </button>
                </a>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#6B7280', marginBottom: '0.4rem', fontWeight: 500 }}>App password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      value={appPassword}
                      onChange={(e) => setAppPassword(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 2.5rem 0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #E5E7EB', outline: 'none', fontSize: '0.9rem' }}
                    />
                    <Eye size={18} color="#9CA3AF" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: '0.5rem 0 0 0', lineHeight: 1.4 }}>
                    Paste the 16-character password here. We never store your Gmail password
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => setModalStep(2)} style={{ flex: 1, padding: '0.7rem', border: '1px solid #E5E7EB', background: 'transparent', borderRadius: '6px', fontWeight: 600, color: '#9CA3AF', cursor: 'pointer' }}>Back</button>
                  <button onClick={handleConnect} style={{ flex: 1, padding: '0.7rem', border: 'none', background: '#A7B0F6', color: 'white', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Connect {provider === 'outlook' ? 'Outlook' : 'Gmail'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
