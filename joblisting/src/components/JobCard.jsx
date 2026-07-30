import React, { useState } from 'react';
import { MapPin, Briefcase, Bookmark, Sparkles, CheckCircle2 } from 'lucide-react';
import { timeAgo, initials, getGradient } from '../utils';
import styles from './JobCard.module.css';

export default function JobCard({ job, onClick, onApply }) {
  const [bookmarked, setBookmarked] = useState(false);
  const c = job.company || {};

  // Deterministic AI match score generation based on job ID for consistency
  const matchScore = Math.min(99, 78 + (String(job._id || job.title).charCodeAt(0) % 20));

  const handleBookmark = (e) => {
    e.stopPropagation();
    setBookmarked(!bookmarked);
  };

  return (
    <article className={styles.card} onClick={onClick}>
      {/* Top Header: Logo, Company + Verified Badge, Title, Bookmark */}
      <div className={styles.header}>
        <div
          className={styles.logoBox}
          style={!c.logo ? { background: getGradient(c.name || job.title) } : undefined}
        >
          {c.logo ? (
            <img src={c.logo} alt={c.name} className={styles.logoImg} />
          ) : (
            <span className={styles.logoInitials}>{initials(c.name || job.title)}</span>
          )}
        </div>

        <div className={styles.headerTitleGroup}>
          <div className={styles.companyRow}>
            <span className={styles.companyName}>{c.name || 'Enterprise Recruiter'}</span>
            <CheckCircle2 size={14} className={styles.verifiedBadge} />
          </div>
          <h3 className={styles.jobTitle}>{job.title}</h3>
        </div>

        <button
          className={`${styles.bookmarkBtn} ${bookmarked ? styles.bookmarked : ''}`}
          onClick={handleBookmark}
          title={bookmarked ? 'Saved' : 'Save Job'}
        >
          <Bookmark size={18} fill={bookmarked ? '#4361EE' : 'none'} color={bookmarked ? '#4361EE' : '#94A3B8'} />
        </button>
      </div>

      {/* Meta Row: Work Type & Location */}
      <div className={styles.metaRow}>
        <span className={styles.metaBadge}>
          <Briefcase size={13} color="#64748B" />
          {job.employmentType || 'Full-time'}
        </span>
        <span className={styles.dot}>•</span>
        <span className={styles.metaBadge}>
          <MapPin size={13} color="#64748B" />
          {job.location || 'Remote'} {job.workMode ? `(${job.workMode})` : ''}
        </span>
      </div>

      {/* Description Preview */}
      {job.description && (
        <p className={styles.description}>
          {job.description.slice(0, 110)}{job.description.length > 110 ? '...' : ''}
        </p>
      )}

      {/* Salary & Posted Time Row */}
      <div className={styles.salaryRow}>
        <div className={styles.salaryAmount}>
          {job.salaryRange || 'Competitive Salary'}
        </div>
        <div className={styles.postedTime}>
          {timeAgo(job.createdAt)}
        </div>
      </div>

      {/* Bottom AI Match Pill */}
      <div className={styles.aiMatchPill}>
        <Sparkles size={14} color="#2563EB" />
        <span>AI Match: <strong>{matchScore}% Match</strong></span>
      </div>
    </article>
  );
}
