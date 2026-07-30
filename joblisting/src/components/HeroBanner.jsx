import React from 'react';
import { Briefcase, Users, Zap, TrendingUp } from 'lucide-react';
import styles from './HeroBanner.module.css';

export default function HeroBanner({ totalJobs, totalCompanies }) {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.content}>
          <div className={styles.badge}>
            <Zap size={12} />
            Resuming.io · AI-Powered Hiring
          </div>
          <h1 className={styles.title}>
            Find your next<br />
            <span className={styles.gradient}>dream role</span>
          </h1>
          <p className={styles.sub}>
            Discover opportunities from top companies on Resuming.io — matched by AI, posted by real recruiters
          </p>
        </div>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg,#4F46E5,#818CF8)' }}>
              <Briefcase size={18} color="white" />
            </div>
            <div>
              <div className={styles.statNum}>{totalJobs ?? '—'}</div>
              <div className={styles.statLbl}>Active Jobs</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg,#0891B2,#22D3EE)' }}>
              <Users size={18} color="white" />
            </div>
            <div>
              <div className={styles.statNum}>{totalCompanies ?? '—'}</div>
              <div className={styles.statLbl}>Companies Hiring</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg,#059669,#34D399)' }}>
              <TrendingUp size={18} color="white" />
            </div>
            <div>
              <div className={styles.statNum}>AI</div>
              <div className={styles.statLbl}>Skill Matching</div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative blobs */}
      <div className={styles.blob1} />
      <div className={styles.blob2} />
    </section>
  );
}
