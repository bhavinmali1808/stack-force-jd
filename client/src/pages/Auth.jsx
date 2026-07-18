import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Auth() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', industry: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        setError(err.response.data.errors[0].msg);
      } else {
        setError(err.response?.data?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" style={{ fontSize: '1.4rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff, var(--accent-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            TalentForce JD
          </Link>
          <p style={{ marginTop: '0.3rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {mode === 'login' ? 'Welcome back' : 'Create your company account'}
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label" htmlFor="company-name">Company Name *</label>
              <input
                id="company-name"
                type="text"
                className="form-input"
                placeholder="Acme Corp"
                value={form.name}
                onChange={set('name')}
                required
                autoFocus
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="auth-email">Work Email *</label>
            <input
              id="auth-email"
              type="email"
              className="form-input"
              placeholder="hr@company.com"
              value={form.email}
              onChange={set('email')}
              required
              autoFocus={mode === 'login'}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">Password *</label>
            <input
              id="auth-password"
              type="password"
              className="form-input"
              placeholder={mode === 'register' ? 'Min 8 chars, 1 number, 1 uppercase' : '••••••••'}
              value={form.password}
              onChange={set('password')}
              required
              minLength={6}
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label" htmlFor="industry">Industry</label>
              <input
                id="industry"
                type="text"
                className="form-input"
                placeholder="e.g. Technology, Finance, Healthcare"
                value={form.industry}
                onChange={set('industry')}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ justifyContent: 'center', marginTop: '0.5rem', padding: '0.875rem' }}
            id="auth-submit"
          >
            {loading ? (
              <><span className="spinner" style={{ width: 16, height: 16 }} /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}</>
            ) : (
              mode === 'login' ? 'Sign in →' : 'Create Account →'
            )}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button onClick={() => { setMode('register'); setError(''); }}>Sign up free</button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError(''); }}>Sign in</button>
            </>
          )}
        </div>

        {mode === 'login' && (
          <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.85rem' }}>
            <Link to="/forgot-password" style={{ color: 'var(--text-muted)' }}>Forgot your password?</Link>
          </div>
        )}
      </div>
    </div>
  );
}
