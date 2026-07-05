import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const features = [
  { icon: '🚀', title: 'Instant Ranked Shortlist', desc: 'Upload 50,000+ resumes. Get a ranked shortlist with match % in minutes, not days.' },
  { icon: '🧠', title: 'AI-Ready Architecture', desc: 'Rule-based today. Swap in semantic AI scoring in Phase 3 — same UI, smarter engine.' },
  { icon: '📊', title: 'Skill Breakdown', desc: 'See exactly which required skills each candidate has — and which are missing.' },
  { icon: '📤', title: 'Bulk Resume Upload', desc: 'Drag-drop up to 100 PDFs/DOCXs at once. Auto-parsed and scored instantly.' },
  { icon: '🔄', title: 'Candidate Pipeline', desc: 'Move candidates through Applied → Shortlisted → Interview → Hired with one click.' },
  { icon: '📥', title: 'Export Shortlists', desc: 'Download ranked shortlists as CSV or branded PDF reports in seconds.' },
];

const stats = [
  { value: '50K+', label: 'Resumes Processed' },
  { value: '< 1min', label: 'Parse & Score Time' },
  { value: '99%', label: 'Uptime SLA' },
];

export default function Landing() {
  const { company } = useAuth();

  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-content fade-in">
          <div className="hero-eyebrow">
            <span>⚡</span> Built for modern recruiting teams
          </div>
          <h1>
            Hire Smarter,<br />
            <span className="gradient-text">Faster Than Ever</span>
          </h1>
          <p className="hero-desc">
            Post a role, upload bulk resumes, and get an AI-ready ranked shortlist with match scores — not a cluttered spreadsheet.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {company ? (
              <Link to="/dashboard" className="btn btn-primary btn-lg">
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg" id="hero-get-started">
                  Start Hiring Free →
                </Link>
                <Link to="/login" className="btn btn-secondary btn-lg">
                  Sign in
                </Link>
              </>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '3rem', justifyContent: 'center', marginTop: '3.5rem', flexWrap: 'wrap' }}>
            {stats.map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff, var(--accent-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {s.value}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '5rem 1.5rem', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2>Everything a recruiter needs.</h2>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Phase 1 — No AI yet. Just fast, accurate rule-based matching.</p>
        </div>
        <div className="features-grid">
          {features.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '5rem 1.5rem',
        textAlign: 'center',
        background: 'linear-gradient(180deg, transparent, rgba(59,130,246,0.05))',
      }}>
        <h2>Ready to cut your time-to-shortlist by 90%?</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem', marginBottom: '2rem' }}>
          No credit card. No setup. Just upload resumes and start ranking.
        </p>
        <Link to="/register" className="btn btn-primary btn-lg" id="cta-get-started">
          Create Free Account →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '2rem 1.5rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          © 2024 TalentForce JD — Recruiter Portal. Phase 1 MVP.
        </p>
      </footer>
    </div>
  );
}
