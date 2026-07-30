import React, { useState, useCallback, useRef } from 'react';
import { Search, MapPin, Building2, Hash, X } from 'lucide-react';
import styles from './Navbar.module.css';

const POPULAR_LOCATIONS = [
  'Bangalore',
  'Mumbai',
  'Gurgaon / Delhi NCR',
  'Hyderabad',
  'Pune',
  'Ahmedabad',
  'Chennai',
  'Remote'
];

export default function Navbar({ onSearch, companies = [], jobTitles = [] }) {
  const [job, setJob]            = useState('');
  const [companyId, setCompanyId] = useState('');
  const [loc, setLoc]            = useState('');
  const [pincode, setPincode]    = useState('');
  const jobRef = useRef(null);

  const handleSearch = useCallback(() => {
    onSearch({ 
      query: job.trim(), 
      companyId: companyId,
      location: loc.trim(),
      pincode: pincode.trim()
    });
  }, [job, companyId, loc, pincode, onSearch]);

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const clear = (setter) => () => { 
    setter(''); 
    setTimeout(() => handleSearch(), 0); 
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>

        {/* Logo */}
        <a href="/" className={styles.logo}>
          <ResumingLogo />
        </a>

        {/* Search bar */}
        <div className={styles.searchBar}>
          
          {/* 1. Job Title Dropdown / Search Input */}
          <div className={styles.searchSegment}>
            <Search size={15} color="#94A3B8" />
            <input
              ref={jobRef}
              className={styles.searchInput}
              type="text"
              list="job-titles-list"
              placeholder="Job title, skill..."
              value={job}
              onChange={e => setJob(e.target.value)}
              onKeyDown={handleKey}
            />
            <datalist id="job-titles-list">
              {jobTitles.map((t, idx) => (
                <option key={idx} value={t} />
              ))}
            </datalist>
            {job && (
              <button className={styles.clearBtn} onClick={clear(setJob)}>
                <X size={13} />
              </button>
            )}
          </div>

          <div className={styles.divider} />

          {/* 2. Company Select Dropdown */}
          <div className={styles.searchSegment}>
            <Building2 size={15} color="#94A3B8" />
            <select
              className={styles.selectInput}
              value={companyId}
              onChange={e => setCompanyId(e.target.value)}
            >
              <option value="">All Companies</option>
              {companies.map(comp => (
                <option key={comp._id} value={comp._id}>
                  {comp.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.divider} />

          {/* 3. Location Select / Input */}
          <div className={styles.searchSegment}>
            <MapPin size={14} color="#94A3B8" />
            <input
              className={styles.searchInput}
              type="text"
              list="locations-list"
              placeholder="City or Remote"
              value={loc}
              onChange={e => setLoc(e.target.value)}
              onKeyDown={handleKey}
            />
            <datalist id="locations-list">
              {POPULAR_LOCATIONS.map((l, idx) => (
                <option key={idx} value={l} />
              ))}
            </datalist>
            {loc && (
              <button className={styles.clearBtn} onClick={clear(setLoc)}>
                <X size={13} />
              </button>
            )}
          </div>

          <div className={styles.divider} />

          {/* 4. Pincode Search Input */}
          <div className={styles.searchSegmentPincode}>
            <Hash size={14} color="#94A3B8" />
            <input
              className={styles.searchInput}
              type="text"
              maxLength={6}
              placeholder="Pincode (e.g. 560001)"
              value={pincode}
              onChange={e => setPincode(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={handleKey}
            />
            {pincode && (
              <button className={styles.clearBtn} onClick={clear(setPincode)}>
                <X size={13} />
              </button>
            )}
          </div>

          <button className={styles.searchBtn} onClick={handleSearch}>
            Search
          </button>
        </div>

        {/* Right actions */}
        <div className={styles.right}>
          <a
            href="http://localhost:5174/login"
            target="_blank"
            rel="noreferrer"
            className={styles.btnOutline}
          >
            Recruiter Login
          </a>
          <a
            href="http://localhost:5174/register"
            target="_blank"
            rel="noreferrer"
            className={styles.btnPrimary}
          >
            Post a Job
          </a>
        </div>
      </div>
    </nav>
  );
}

function ResumingLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 72" height="38" aria-label="Resuming.io">
      <rect x="2" y="2" width="68" height="68" rx="14" fill="#4361EE"/>
      <rect x="10" y="22" width="34" height="28" rx="10" fill="none" stroke="white" strokeWidth="7.5"/>
      <rect x="30" y="22" width="34" height="28" rx="10" fill="none" stroke="white" strokeWidth="7.5"/>
      <rect x="42" y="26" width="14" height="20" fill="#4361EE"/>
      <path d="M64 31 Q64 22 55 22 Q46 22 44 31" fill="none" stroke="white" strokeWidth="7.5" strokeLinecap="round"/>
      <path d="M64 41 Q64 50 55 50 Q46 50 44 41" fill="none" stroke="white" strokeWidth="7.5" strokeLinecap="round"/>
      <text
        x="84"
        y="50"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Arial, sans-serif"
        fontSize="36"
        fontWeight="800"
        fill="#0A0A0A"
        letterSpacing="-0.5"
      >
        Resuming.io
      </text>
    </svg>
  );
}
