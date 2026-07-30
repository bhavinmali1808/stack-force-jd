import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { publicAPI } from './api';
import Navbar from './components/Navbar';
import HeroBanner from './components/HeroBanner';
import PopularSearches from './components/PopularSearches';
import FilterSidebar from './components/FilterSidebar';
import JobCard from './components/JobCard';
import JobDetailDrawer from './components/JobDetailDrawer';
import ApplyModal from './components/ApplyModal';
import { ArrowLeft, ArrowRight, SearchX, ServerCrash } from 'lucide-react';
import styles from './App.module.css';

const JOBS_PER_PAGE = 12;
const DEFAULT_FILTERS = { expLevels: [], workModes: [], dateFilter: null };

export default function App() {
  // Data
  const [jobs, setJobs]           = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  // UI state
  const [search, setSearch]                 = useState({ query: '', location: '' });
  const [selectedTag, setSelectedTag]       = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [filters, setFilters]               = useState(DEFAULT_FILTERS);
  const [sort, setSort]                     = useState('newest');
  const [page, setPage]                     = useState(1);
  const [selectedJob, setSelectedJob]       = useState(null);
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [applyOpen, setApplyOpen]           = useState(false);

  // ── Fetch data ──────────────────────────────────────────────────
  const refreshJobs = async () => {
    try {
      const [jobsRes, companiesRes] = await Promise.all([
        publicAPI.getJobs({ limit: 500 }),
        publicAPI.getCompanies(),
      ]);
      setJobs(jobsRes.data.jobs || []);
      setCompanies(companiesRes.data.companies || []);
    } catch (err) {
      setError('Could not connect to the server. Make sure the TalentForce backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshJobs();
  }, []);

  // Unique job titles for autocomplete
  const jobTitles = useMemo(() => {
    return Array.from(new Set(jobs.map(j => j.title))).filter(Boolean);
  }, [jobs]);

  // ── Filter + sort pipeline ──────────────────────────────────────
  const filteredJobs = useMemo(() => {
    let list = [...jobs];

    // Company filter (via CompanyStrip or Navbar Dropdown)
    const activeCompanyId = search.companyId || selectedCompany;
    if (activeCompanyId) {
      list = list.filter(j => j.company?._id === activeCompanyId);
    }

    // Search query or popular tag click
    const activeSearchQuery = selectedTag || search.query;
    if (activeSearchQuery) {
      const q = activeSearchQuery.toLowerCase();
      list = list.filter(j => {
        const hay = `${j.title} ${j.description || ''} ${(j.requiredSkills || []).join(' ')} ${j.company?.name || ''}`.toLowerCase();
        return hay.includes(q);
      });
    }

    // Location filter
    if (search.location) {
      const loc = search.location.toLowerCase();
      list = list.filter(j => (j.location || '').toLowerCase().includes(loc) || (j.workMode || '').toLowerCase().includes(loc));
    }

    // Pincode search
    if (search.pincode) {
      const pin = search.pincode.trim();
      list = list.filter(j => {
        const fullStr = `${j.location || ''} ${j.description || ''} ${j.title || ''}`;
        return fullStr.includes(pin);
      });
    }

    // Experience level
    if (filters.expLevels.length) {
      list = list.filter(j => filters.expLevels.includes(j.experienceLevel));
    }

    // Work mode
    if (filters.workModes.length) {
      list = list.filter(j => {
        const loc = (j.location || '').toLowerCase();
        const mode = (j.workMode || '').toLowerCase();
        return filters.workModes.some(m => loc.includes(m.toLowerCase()) || mode.includes(m.toLowerCase()));
      });
    }

    // Date filter
    if (filters.dateFilter) {
      const cutoffs = { Today: 1, 'Last 3 days': 3, 'Last week': 7, 'Last month': 30 };
      const days = cutoffs[filters.dateFilter] || 999;
      const cutoff = Date.now() - days * 86400000;
      list = list.filter(j => new Date(j.createdAt).getTime() >= cutoff);
    }

    // Sort
    if (sort === 'newest') list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sort === 'oldest') list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return list;
  }, [jobs, selectedCompany, search, filters, sort]);

  // ── Pagination ──────────────────────────────────────────────────
  const totalPages   = Math.max(1, Math.ceil(filteredJobs.length / JOBS_PER_PAGE));
  const pageSafe     = Math.min(page, totalPages);
  const pagedJobs    = filteredJobs.slice((pageSafe - 1) * JOBS_PER_PAGE, pageSafe * JOBS_PER_PAGE);

  const goPage = useCallback((n) => {
    setPage(n);
    window.scrollTo({ top: 380, behavior: 'smooth' });
  }, []);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [selectedCompany, search, filters, sort]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleSearch    = useCallback(vals => setSearch(vals), []);
  const openJob         = useCallback(job => { setSelectedJob(job); setDrawerOpen(true); }, []);
  const openApply       = useCallback(job => { if (job) setSelectedJob(job); setApplyOpen(true); }, []);
  const clearFilters    = () => { setFilters(DEFAULT_FILTERS); setSelectedCompany(null); setSearch({ query: '', location: '' }); };

  return (
    <div className={styles.app}>
      <Navbar 
        onSearch={handleSearch} 
        companies={companies} 
        jobTitles={jobTitles} 
      />

      <HeroBanner
        totalJobs={loading ? null : jobs.length}
        totalCompanies={loading ? null : companies.length}
      />

      <PopularSearches
        selectedTag={selectedTag}
        onSelectTag={(tag) => {
          setSelectedTag(tag);
          setSearch(s => ({ ...s, query: '' }));
        }}
      />

      <main className={styles.layout}>
        {/* Sidebar */}
        <FilterSidebar
          filters={filters}
          onChange={setFilters}
          onClear={clearFilters}
        />

        {/* Jobs column */}
        <section className={styles.jobs}>

          {/* Toolbar */}
          <div className={styles.toolbar}>
            <span className={styles.count}>
              {loading ? 'Loading jobs…' : (
                <>Showing <strong>{filteredJobs.length}</strong> {filteredJobs.length === 1 ? 'job' : 'jobs'}</>
              )}
            </span>
            <div className={styles.sortRow}>
              <label htmlFor="sort-select" className={styles.sortLabel}>Sort:</label>
              <select
                id="sort-select"
                className={styles.sortSelect}
                value={sort}
                onChange={e => setSort(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <SkeletonList />
          ) : error ? (
            <ErrorState message={error} />
          ) : filteredJobs.length === 0 ? (
            <EmptyState onClear={clearFilters} />
          ) : (
            <>
              <div className={styles.list}>
                {pagedJobs.map(job => (
                  <JobCard
                    key={job._id}
                    job={job}
                    onClick={() => openJob(job)}
                    onApply={() => openApply(job)}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <Pagination current={pageSafe} total={totalPages} onPage={goPage} />
              )}
            </>
          )}
        </section>
      </main>

      {/* Job detail drawer */}
      <JobDetailDrawer
        job={selectedJob}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onApply={() => { setDrawerOpen(false); setTimeout(() => openApply(null), 80); }}
      />

      {/* Apply modal */}
      <ApplyModal
        job={selectedJob}
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
      />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} className={styles.skeletonCard}>
          <div className={styles.skeletonRow}>
            <div className="skeleton" style={{ width: 52, height: 52, borderRadius: 11, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="skeleton" style={{ height: 18, width: '55%' }} />
              <div className="skeleton" style={{ height: 14, width: '35%' }} />
              <div className="skeleton" style={{ height: 12, width: '70%' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {[...Array(4)].map((_, j) => (
              <div key={j} className="skeleton" style={{ height: 24, width: 70, borderRadius: 5 }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onClear }) {
  return (
    <div className={styles.empty}>
      <SearchX size={48} strokeWidth={1.2} color="#94A3B8" />
      <h3>No jobs found</h3>
      <p>Try adjusting your search or filters to find more results.</p>
      <button className={styles.emptyBtn} onClick={onClear}>Clear all filters</button>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className={styles.empty}>
      <ServerCrash size={48} strokeWidth={1.2} color="#F87171" />
      <h3>Server not reachable</h3>
      <p>{message}</p>
    </div>
  );
}

function Pagination({ current, total, onPage }) {
  const pages = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 1) {
      pages.push(i);
    } else if (Math.abs(i - current) === 2 && !pages.includes('…')) {
      pages.push('…');
    }
  }

  return (
    <div className={styles.pagination}>
      <button
        className={styles.pageBtn}
        disabled={current === 1}
        onClick={() => onPage(current - 1)}
        aria-label="Previous page"
      >
        <ArrowLeft size={16} />
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className={styles.pageDots}>…</span>
        ) : (
          <button
            key={p}
            className={`${styles.pageBtn} ${p === current ? styles.pageActive : ''}`}
            onClick={() => onPage(p)}
          >
            {p}
          </button>
        )
      )}
      <button
        className={styles.pageBtn}
        disabled={current === total}
        onClick={() => onPage(current + 1)}
        aria-label="Next page"
      >
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
