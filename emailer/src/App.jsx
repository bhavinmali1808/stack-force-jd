import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Mail,
  Users,
  CheckSquare,
  Square,
  Sparkles,
  LayoutDashboard,
  Send,
  FileText,
  Settings,
  Briefcase,
  Layers,
  ChevronDown,
} from 'lucide-react';
import api from './api';
import ComposeModal from './components/ComposeModal';
import styles from './App.module.css';

const App = () => {
  const [activeNav, setActiveNav] = useState('Leads');
  const [contacts, setContacts] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [quota, setQuota] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchContacts();
    fetchQuota();
    fetchTemplates();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await api.get('/emailer/contacts');
      if (res.data.success) {
        setContacts(res.data.contacts);
      }
    } catch (err) {
      // Mock default fallback contacts if backend auth token is not present
      setContacts([
        { id: '1', name: 'Daniel Smith', email: 'dsmith@company.com', company: 'Visionary Tech', experience: '4 yrs', skills: ['React', 'Node.js'] },
        { id: '2', name: 'Olivia Taylor', email: 'otaylor@github.com', company: 'Github', experience: '5 yrs', skills: ['Python', 'Go'] },
        { id: '3', name: 'Alice Johnson', email: 'alice@figma.com', company: 'Figma', experience: '3 yrs', skills: ['UI/UX', 'Figma'] },
        { id: '4', name: 'Mark Peterson', email: 'mark@acme.com', company: 'Acme Corp', experience: '6 yrs', skills: ['Java', 'Spring'] },
        { id: '5', name: 'Emma Williams', email: 'emma@bright.com', company: 'Bright Solutions', experience: '2 yrs', skills: ['TypeScript', 'Vue'] },
        { id: '6', name: 'Sophia Davis', email: 'sophia@digital.com', company: 'Digital Spark', experience: '4 yrs', skills: ['AWS', 'DevOps'] },
      ]);
    }
  };

  const fetchQuota = async () => {
    try {
      const res = await api.get('/emailer/quota');
      if (res.data.success) setQuota(res.data);
    } catch (err) {
      setQuota({ sentCount: 2, dailyLimit: 10, remaining: 8 });
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/emailer/templates');
      if (res.data.success) setTemplates(res.data.templates);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map((c) => c.id)));
    }
  };

  const toggleSelectOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedContactList = contacts.filter((c) => selectedIds.has(c.id));

  const handleSendEmails = async (payload) => {
    try {
      const res = await api.post('/emailer/send', payload);
      if (res.data.success) {
        setNotification({ type: 'success', text: `Sent successfully to ${res.data.successfulCount} recipients!` });
        setIsComposeOpen(false);
        setSelectedIds(new Set());
        fetchQuota();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send emails';
      setNotification({ type: 'error', text: msg });
    }
  };

  return (
    <div className={styles.appLayout}>
      {/* Sidebar matching mockup */}
      <aside className={styles.sidebar}>
        <div className={styles.projectHeader}>
          <div className={styles.projectLogo}>M</div>
          <div className={styles.projectInfo}>
            <span className={styles.projectName}>My project</span>
            <span className={styles.projectPlan}>Free Plan</span>
          </div>
          <ChevronDown size={14} className={styles.chevron} />
        </div>

        <nav className={styles.navSection}>
          <button className={styles.navItem}>
            <Search size={16} /> Search
          </button>
          <button className={styles.navItem}>
            <Sparkles size={16} /> Notification
          </button>
          <button className={styles.navItem}>
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button className={styles.navItem}>
            <FileText size={16} /> Tasks
          </button>
          <button className={styles.navItem}>
            <Mail size={16} /> Emails
          </button>
        </nav>

        <div className={styles.workspaceHeader}>
          <span>Workspaces</span>
          <button className={styles.addBtn}>+</button>
        </div>

        <nav className={styles.navSection}>
          <button
            className={`${styles.navItem} ${activeNav === 'People' ? styles.active : ''}`}
            onClick={() => setActiveNav('People')}
          >
            <Users size={16} /> People
          </button>
          <button
            className={`${styles.navItem} ${activeNav === 'Partners' ? styles.active : ''}`}
            onClick={() => setActiveNav('Partners')}
          >
            <Briefcase size={16} /> Partners
          </button>
          <button
            className={`${styles.navItem} ${activeNav === 'Deals' ? styles.active : ''}`}
            onClick={() => setActiveNav('Deals')}
          >
            <Layers size={16} /> Deals
          </button>
          <button
            className={`${styles.navItem} ${activeNav === 'Leads' ? styles.active : ''}`}
            onClick={() => setActiveNav('Leads')}
          >
            <Users size={16} /> Leads
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.navItem}>
            <Settings size={16} /> Settings
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.main}>
        {/* Top Header */}
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>leads</h1>
          <div className={styles.topActions}>
            {quota && (
              <div className={styles.quotaPill}>
                <Mail size={14} />
                <span>
                  Quota: <strong>{quota.remaining}</strong>/10 remaining today
                </span>
              </div>
            )}
            <button
              className={styles.newEmailBtn}
              onClick={() => {
                if (selectedIds.size === 0) {
                  alert('Please select at least one contact from the table below');
                  return;
                }
                setIsComposeOpen(true);
              }}
            >
              <Send size={14} /> New email ({selectedIds.size})
            </button>
          </div>
        </header>

        {/* Toolbar Filter */}
        <div className={styles.toolbar}>
          <div className={styles.viewToggle}>
            <button className={`${styles.viewBtn} ${styles.active}`}>
              <Layers size={14} /> Table
            </button>
            <button className={styles.viewBtn}>Pipeline</button>
          </div>

          <div className={styles.filterGroup}>
            <div className={styles.searchBox}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <button className={styles.filterBtn}>
              <Filter size={14} /> Filter <span className={styles.badge}>2</span>
            </button>
            <button className={styles.filterBtn}>
              <ArrowUpDown size={14} /> Sort
            </button>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className={`${styles.toast} ${styles[notification.type]}`}>
            {notification.text}
            <button onClick={() => setNotification(null)}>×</button>
          </div>
        )}

        {/* Leads Table */}
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <button className={styles.checkBtn} onClick={toggleSelectAll}>
                    {selectedIds.size > 0 && selectedIds.size === filteredContacts.length ? (
                      <CheckSquare size={16} className={styles.checked} />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                <th>Company</th>
                <th>Contact person</th>
                <th>Email address</th>
                <th>Experience</th>
                <th>Skills</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((c) => {
                const isSelected = selectedIds.has(c.id);
                return (
                  <tr key={c.id} className={isSelected ? styles.selectedRow : ''}>
                    <td>
                      <button className={styles.checkBtn} onClick={() => toggleSelectOne(c.id)}>
                        {isSelected ? <CheckSquare size={16} className={styles.checked} /> : <Square size={16} />}
                      </button>
                    </td>
                    <td>
                      <div className={styles.companyCell}>
                        <div className={styles.companyLogo}>{(c.company || c.name)[0]}</div>
                        <span className={styles.companyName}>{c.company || 'Direct Candidate'}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.personCell}>
                        <div className={styles.avatar}>{c.name[0]}</div>
                        <span>{c.name}</span>
                      </div>
                    </td>
                    <td className={styles.emailCell}>{c.email}</td>
                    <td>{c.experience || 'N/A'}</td>
                    <td>
                      <div className={styles.skillTags}>
                        {(c.skills || []).slice(0, 2).map((s, i) => (
                          <span key={i} className={styles.skillTag}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {/* Compose Overlay Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        selectedContacts={selectedContactList}
        quota={quota}
        templates={templates}
        onSend={handleSendEmails}
      />
    </div>
  );
};

export default App;
