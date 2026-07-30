import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Upload, Filter, Search, Trash2 } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Audience() {
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  const fetchContacts = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        api.get(`/audience?search=${search}&plan=${planFilter}`),
        api.get('/audience/stats'),
      ]);
      if (cRes.data.success) setContacts(cRes.data.contacts);
      if (sRes.data.success) setStats(sRes.data.stats);
    } catch {
      toast.error('Failed to load audience data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContacts(); }, [search, planFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete and suppress contact?')) return;
    try {
      await api.delete(`/audience/${id}`);
      toast.success('Contact removed');
      fetchContacts();
    } catch {
      toast.error('Failed to remove contact');
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audience Management</h1>
          <p className="page-subtitle">Track, filter, and segment your Resuming.io subscriber base</p>
        </div>
      </div>

      {/* Top Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="text-xs text-slate-400 mb-1">Total Subscribers</div>
            <div className="text-2xl font-black text-indigo-400">{stats.total.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="text-xs text-slate-400 mb-1">Premium Users</div>
            <div className="text-2xl font-black text-emerald-400">{stats.premium.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="text-xs text-slate-400 mb-1">Free Tier</div>
            <div className="text-2xl font-black text-purple-400">{stats.free.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="text-xs text-slate-400 mb-1">Verified Emails</div>
            <div className="text-2xl font-black text-cyan-400">{stats.verified.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-9" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select w-48" value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="trial">Trial</option>
          <option value="premium">Premium</option>
        </select>
      </div>

      {/* Contact Table */}
      <div className="card p-0 overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Contact</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Resume Title</th>
              <th>Joined Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center py-8">Loading subscribers...</td></tr>
            ) : contacts.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-8 text-slate-500">No subscribers found matching filter criteria.</td></tr>
            ) : (
              contacts.map(c => (
                <tr key={c._id}>
                  <td>
                    <div className="font-semibold text-slate-200">{c.firstName} {c.lastName}</div>
                    <div className="text-xs text-slate-400">{c.email}</div>
                  </td>
                  <td>
                    <span className={`badge ${c.plan === 'premium' ? 'badge-green' : 'badge-gray'} capitalize`}>
                      {c.plan}
                    </span>
                  </td>
                  <td>
                    {c.isVerified ? (
                      <span className="badge badge-blue">Verified</span>
                    ) : (
                      <span className="badge badge-gray">Unverified</span>
                    )}
                  </td>
                  <td className="text-xs text-slate-300">{c.resumeTitle || 'N/A'}</td>
                  <td className="text-xs text-slate-400">{new Date(c.joinedAt || c.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleDelete(c._id)} className="p-1.5 rounded hover:bg-red-500/20 text-red-400" title="Delete Contact">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
