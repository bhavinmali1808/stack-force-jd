import React, { useEffect, useRef } from 'react';
import { X, MapPin, Briefcase, Building2, Globe, ExternalLink } from 'lucide-react';
import { initials, getGradient, expText, timeAgo, LEVEL_COLORS } from '../utils';
import styles from './JobDetailDrawer.module.css';

export default function JobDetailDrawer({ job, open, onClose, onApply }) {
  const drawerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!job) return null;

  const c     = job.company || {};
  const level = LEVEL_COLORS[job.experienceLevel] || LEVEL_COLORS.Any;
  const must  = (job.weightedSkills || []).filter(s => s.type === 'must-have');
  const nice  = (job.weightedSkills || []).filter(s => s.type === 'nice-to-have');

  return (
    <>
      {/* Overlay */}
      <div
        className={`${styles.overlay} ${open ? styles.overlayOpen : ''}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        ref={drawerRef}
        className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Job details"
      >
        {/* Close */}
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {/* Header */}
        <div className={styles.header}>
          <div
            className={styles.logo}
            style={!c.logo ? { background: getGradient(c.name) } : undefined}
          >
            {c.logo
              ? <img src={c.logo} alt={c.name} className={styles.logoImg} />
              : <span className={styles.logoInitials}>{initials(c.name)}</span>
            }
          </div>

          <div className={styles.headerInfo}>
            <h1 className={styles.title}>{job.title}</h1>
            <div className={styles.companyName}>{c.name}</div>
            <div className={styles.headerMeta}>
              <span className={styles.metaChip}>
                <MapPin size={13} />
                {job.location || 'Remote'}
              </span>
              <span className={styles.metaChip}>
                <Briefcase size={13} />
                {expText(job.minExperience, job.maxExperience)}
              </span>
              <span
                className={styles.levelBadge}
                style={{ background: level.bg, color: level.text }}
              >
                {job.experienceLevel}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className={styles.body}>

          {/* Skills */}
          {(must.length > 0 || nice.length > 0) && (
            <Section title="Skills Required">
              {must.length > 0 && (
                <div className={styles.skillGroup}>
                  <div className={styles.skillGroupLabel}>Must-have</div>
                  <div className={styles.skillGrid}>
                    {must.map(s => (
                      <span key={s.skill} className={`${styles.skill} ${styles.must}`}>
                        <span className={styles.skillDot} style={{ background: '#4F46E5' }} />
                        {s.skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {nice.length > 0 && (
                <div className={styles.skillGroup}>
                  <div className={styles.skillGroupLabel} style={{ color: '#059669' }}>Nice-to-have</div>
                  <div className={styles.skillGrid}>
                    {nice.map(s => (
                      <span key={s.skill} className={`${styles.skill} ${styles.nice}`}>
                        <span className={styles.skillDot} style={{ background: '#059669' }} />
                        {s.skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Description */}
          {job.description && (
            <Section title="Job Description">
              <p className={styles.description}>{job.description}</p>
            </Section>
          )}

          {/* Company */}
          {(c.description || c.industry || c.website) && (
            <Section title="About the Company">
              <div className={styles.companyCard}>
                <div
                  className={styles.companyCardLogo}
                  style={!c.logo ? { background: getGradient(c.name) } : undefined}
                >
                  {c.logo
                    ? <img src={c.logo} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                    : <span style={{ color: 'white', fontWeight: 800, fontSize: '1rem' }}>{initials(c.name)}</span>
                  }
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>{c.name}</div>
                  {c.industry && (
                    <div className={styles.companyMeta}>
                      <Building2 size={12} /> {c.industry}
                    </div>
                  )}
                  {c.website && (
                    <a href={c.website} target="_blank" rel="noreferrer" className={styles.companyLink}>
                      <Globe size={12} /> {c.website} <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
              {c.description && <p className={styles.description} style={{ marginTop: 12 }}>{c.description}</p>}
            </Section>
          )}

          <div className={styles.posted}>Posted {timeAgo(job.createdAt)}</div>
        </div>

        {/* Footer CTA */}
        <div className={styles.footer}>
          <button className={styles.btnApply} onClick={onApply}>
            Apply Now →
          </button>
          <button className={styles.btnSecondary} onClick={onClose}>
            Close
          </button>
        </div>
      </aside>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        fontSize: '0.75rem', fontWeight: 700, color: '#64748B',
        textTransform: 'uppercase', letterSpacing: '0.5px',
        marginBottom: '12px', paddingBottom: '8px',
        borderBottom: '2px solid #EEF2FF',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}
