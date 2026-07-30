import React, { useState, useEffect } from 'react';
import { publicAPI } from '../api';
import { 
  Layers, Code, MessageSquare, CheckCircle, AlertCircle, RefreshCw, 
  Trash2, Plus, Lock, LogOut, ShieldCheck, Database, Radio, Search, Filter
} from 'lucide-react';
import styles from './AdminPortal.module.css';

const SAMPLE_JSON = `[
  {
    "jobId": "NAUKRI-000101",
    "title": "Senior Software Engineer - Backend",
    "company": {
      "name": "TechCorp Innovations Pvt Ltd",
      "rating": 4.3,
      "reviewsCount": 450
    },
    "location": {
      "city": "Ahmedabad",
      "area": "SG Highway",
      "workMode": "Hybrid"
    },
    "experience": {
      "min": 3,
      "max": 6
    },
    "salary": {
      "min": 800000,
      "max": 1400000,
      "currency": "INR",
      "period": "per annum",
      "disclosed": true
    },
    "skills": ["Node.js", "PostgreSQL", "AWS", "System Design"],
    "education": {
      "ug": "B.Tech/B.E. in Computer Science",
      "pg": "Any Postgraduate (optional)"
    },
    "industry": "IT Services & Consulting",
    "department": "Engineering - Software & QA",
    "roleCategory": "Software Development",
    "role": "Backend Developer",
    "employmentType": "Full Time",
    "employerType": "Company",
    "jobDescription": "We are looking for a Senior Backend Developer to join our core architecture team. Responsibilities include building scalable REST/gRPC APIs, query optimization, and deploying cloud microservices.",
    "postedDate": "2026-07-28",
    "applyUrl": "https://resuming.io/apply/000101",
    "vacancies": 3
  }
]`;

const SAMPLE_WHATSAPP = `*Hiring Alert: Lead React & Node.js Architect*
*Company:* Resuming.io Enterprise Client
*Location:* Bangalore / Remote
*Experience:* 8+ years
*CTC:* 35 - 50 LPA
*Skills Required:* React, Node.js, GraphQL, PostgreSQL, Microservices

*Job Description:*
Seeking a veteran software architect to drive enterprise client solutions. Must have experience scaling node microservices. Send resumes directly!`;

export default function AdminPortal() {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('resuming_admin_token') || null);
  const [loginEmail, setLoginEmail] = useState('admin@resuming.io');
  const [loginPassword, setLoginPassword] = useState('ResumingAdmin2026!');
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('manage'); // 'manage' | 'json' | 'whatsapp'
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Bulk Ingestion state
  const [jsonInput, setJsonInput] = useState(SAMPLE_JSON);
  const [waText, setWaText] = useState(SAMPLE_WHATSAPP);
  const [parsedPreview, setParsedPreview] = useState(null);
  const [waConnected, setWaConnected] = useState(true);

  const fetchCurrentJobs = async () => {
    try {
      setLoading(true);
      const res = await publicAPI.getJobs({ limit: 500 });
      setJobs(res.data.jobs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchCurrentJobs();
      setStatusMsg(null);
    }
  }, [adminToken]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const res = await publicAPI.adminLogin({ email: loginEmail, password: loginPassword });
      const token = res.data.token;
      setAdminToken(token);
      localStorage.setItem('resuming_admin_token', token);
      setStatusMsg({ type: 'success', text: 'Authenticated as Resuming.io Super Admin.' });
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Invalid admin email or password.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('resuming_admin_token');
    setStatusMsg(null);
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await publicAPI.deleteJob(id, adminToken);
      setStatusMsg({ type: 'success', text: `Deleted "${title}" successfully.` });
      fetchCurrentJobs();
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      } else {
        setStatusMsg({ type: 'error', text: 'Failed to delete job listing.' });
      }
    }
  };

  const handleJsonImport = async () => {
    try {
      setStatusMsg(null);
      const parsed = JSON.parse(jsonInput);
      const res = await publicAPI.bulkImportJobs(parsed, adminToken);
      setStatusMsg({ type: 'success', text: res.data.message });
      fetchCurrentJobs();
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
      else setStatusMsg({ type: 'error', text: `Import Error: ${err.response?.data?.message || err.message}` });
    }
  };

  const handleParseWhatsApp = async () => {
    try {
      setStatusMsg(null);
      const res = await publicAPI.parseWhatsAppMessage(waText, adminToken);
      setParsedPreview(res.data.parsedJob);
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
      else setStatusMsg({ type: 'error', text: 'Failed to parse WhatsApp text format.' });
    }
  };

  const handleImportWhatsAppJob = async () => {
    if (!parsedPreview) return;
    try {
      const res = await publicAPI.bulkImportJobs([parsedPreview], adminToken);
      setStatusMsg({ type: 'success', text: 'WhatsApp job successfully added to Resuming.io!' });
      setParsedPreview(null);
      fetchCurrentJobs();
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
      else setStatusMsg({ type: 'error', text: 'Failed to import parsed WhatsApp job.' });
    }
  };

  const filteredJobs = jobs.filter(j => 
    j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (j.company?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (j.location || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // UNAUTHENTICATED LOGIN PAGE
  if (!adminToken) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <div className={styles.brandRow}>
            <img src="/resuming-logo.svg" alt="Resuming.io" className={styles.brandLogo} />
            <span className={styles.adminTag}>ENTERPRISE ADMIN PORTAL</span>
          </div>

          <div className={styles.lockHeader}>
            <div className={styles.lockBadge}>
              <ShieldCheck size={28} color="#4361EE" />
            </div>
            <h2>Super Admin Authentication</h2>
            <p>Access the isolated Resuming.io job ingestion & listing console.</p>
          </div>

          {loginError && (
            <div className={styles.errorBanner}>
              <AlertCircle size={16} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className={styles.form}>
            <div className={styles.field}>
              <label>Admin Work Email</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="admin@resuming.io"
              />
            </div>
            <div className={styles.field}>
              <label>Security Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </div>
            <button type="submit" className={styles.btnLogin} disabled={loginLoading}>
              {loginLoading ? 'Verifying Authorization...' : 'Sign In to Resuming.io Console'}
            </button>
          </form>

          <div className={styles.footerNote}>
            Protected Environment • Unauthorized Access Attempts Are Logged
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTICATED FULL-PAGE ENTERPRISE SAAS DASHBOARD
  return (
    <div className={styles.adminLayout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <img src="/resuming-logo.svg" alt="Resuming.io" className={styles.sidebarLogo} />
          <span className={styles.portalBadge}>ADMIN CONSOLE</span>
        </div>

        <nav className={styles.navMenu}>
          <button
            className={`${styles.navItem} ${activeTab === 'manage' ? styles.navActive : ''}`}
            onClick={() => setActiveTab('manage')}
          >
            <Layers size={18} />
            <span>Manage Job Postings</span>
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'json' ? styles.navActive : ''}`}
            onClick={() => setActiveTab('json')}
          >
            <Code size={18} />
            <span>JSON Bulk Ingestion</span>
          </button>

          <button
            className={`${styles.navItem} ${activeTab === 'whatsapp' ? styles.navActive : ''}`}
            onClick={() => setActiveTab('whatsapp')}
          >
            <MessageSquare size={18} />
            <span>WhatsApp Group Listener</span>
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.adminProfile}>
            <div className={styles.avatar}>SA</div>
            <div className={styles.adminDetails}>
              <strong>Super Admin</strong>
              <span>admin@resuming.io</span>
            </div>
          </div>
          <button className={styles.btnSignout} onClick={handleLogout} title="Log Out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {/* Top bar */}
        <header className={styles.topBar}>
          <div className={styles.pageTitle}>
            <h1>
              {activeTab === 'manage' && 'Active Job Postings'}
              {activeTab === 'json' && 'JSON Bulk Ingestion Engine'}
              {activeTab === 'whatsapp' && 'WhatsApp Group Listener & AI Parser'}
            </h1>
            <span className={styles.bread}>Resuming.io Administration System v2.4</span>
          </div>

          <div className={styles.topRightActions}>
            <a href="http://localhost:3001" target="_blank" rel="noreferrer" className={styles.btnPublicView}>
              View Live Public Board ↗
            </a>
          </div>
        </header>

        {/* Global Alert Notification */}
        {statusMsg && (
          <div className={`${styles.statusBanner} ${statusMsg.type === 'success' ? styles.statusSuccess : styles.statusError}`}>
            {statusMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Dynamic Metric Cards */}
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricIcon} style={{ background: '#eff6ff', color: '#3b82f6' }}>
              <Database size={20} />
            </div>
            <div>
              <span className={styles.metricLabel}>Total Live Jobs</span>
              <strong className={styles.metricVal}>{jobs.length}</strong>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricIcon} style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <Radio size={20} />
            </div>
            <div>
              <span className={styles.metricLabel}>WhatsApp Listener Driver</span>
              <strong className={styles.metricVal} style={{ color: '#16a34a' }}>ACTIVE (Listening)</strong>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricIcon} style={{ background: '#faf5ff', color: '#9333ea' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <span className={styles.metricLabel}>Session Access</span>
              <strong className={styles.metricVal}>Authenticated (JWT 12h)</strong>
            </div>
          </div>
        </div>

        {/* TAB 1: MANAGE JOBS */}
        {activeTab === 'manage' && (
          <div className={styles.cardContainer}>
            <div className={styles.tableHeader}>
              <div className={styles.searchBox}>
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Filter jobs by title, company, or location..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button className={styles.btnRefresh} onClick={fetchCurrentJobs}>
                <RefreshCw size={14} className={loading ? styles.spin : ''} />
                Reload Data
              </button>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.jobTable}>
                <thead>
                  <tr>
                    <th>Job Title</th>
                    <th>Company</th>
                    <th>Location</th>
                    <th>Experience</th>
                    <th>Skills</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className={styles.noResults}>
                        No matching jobs found.
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map(job => (
                      <tr key={job._id}>
                        <td><strong>{job.title}</strong></td>
                        <td>{job.company?.name || 'Direct Hiring'}</td>
                        <td>{job.location}</td>
                        <td><span className={styles.pillExp}>{job.experienceLevel}</span></td>
                        <td>
                          <div className={styles.skillTags}>
                            {(job.requiredSkills || []).slice(0, 3).map((s, idx) => (
                              <span key={idx} className={styles.tag}>{s}</span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <button
                            className={styles.btnDelete}
                            onClick={() => handleDelete(job._id, job.title)}
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: JSON BULK INGESTION */}
        {activeTab === 'json' && (
          <div className={styles.cardContainer}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Bulk JSON Ingestion Engine</h2>
                <p>Submit single job objects or JSON arrays to bulk import listings directly.</p>
              </div>
              <button className={styles.btnPrimary} onClick={handleJsonImport}>
                <Plus size={16} />
                Execute Bulk Import
              </button>
            </div>

            <textarea
              className={styles.codeArea}
              rows={16}
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
            />
          </div>
        )}

        {/* TAB 3: WHATSAPP LISTENER */}
        {activeTab === 'whatsapp' && (
          <div className={styles.cardContainer}>
            <div className={styles.waBanner}>
              <div className={styles.waDriverStatus}>
                <span className={styles.pulseDot} />
                <span>WhatsApp Connection Status: <strong>ONLINE & LISTENING TO GROUPS</strong></span>
              </div>
            </div>

            <div className={styles.waGrid}>
              <div className={styles.waInputColumn}>
                <label className={styles.fieldLabel}>WhatsApp Raw Message Text / OCR Stream</label>
                <textarea
                  className={styles.waArea}
                  rows={9}
                  value={waText}
                  onChange={e => setWaText(e.target.value)}
                />
                <button className={styles.btnDark} onClick={handleParseWhatsApp}>
                  Parse WhatsApp Text via AI / OCR
                </button>
              </div>

              <div className={styles.waOutputColumn}>
                <label className={styles.fieldLabel}>Parsed Resuming.io Job Format</label>
                {parsedPreview ? (
                  <div className={styles.parsedCard}>
                    <h3>{parsedPreview.title}</h3>
                    <p className={styles.parsedCompany}>🏢 {parsedPreview.companyName}</p>
                    <p className={styles.parsedDetails}>📍 {parsedPreview.location} | 💼 {parsedPreview.experienceLevel} | 💰 {parsedPreview.salaryRange}</p>
                    <div className={styles.parsedSkills}>
                      {parsedPreview.requiredSkills.map((sk, idx) => (
                        <span key={idx} className={styles.tag}>{sk}</span>
                      ))}
                    </div>
                    <button className={styles.btnPublish} onClick={handleImportWhatsAppJob}>
                      Publish to Resuming.io Board
                    </button>
                  </div>
                ) : (
                  <div className={styles.parsedEmpty}>
                    <p>Paste raw text and click "Parse WhatsApp Text" to generate a job preview.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
