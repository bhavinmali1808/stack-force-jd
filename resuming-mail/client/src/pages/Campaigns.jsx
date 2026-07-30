import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Send, Play, Pause, Copy, Trash2, Eye, Filter } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    try {
      const res = await api.get('/campaigns');
      if (res.data.success) setCampaigns(res.data.campaigns);
    } catch {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const handleSend = async (id) => {
    if (!window.confirm('Queue this campaign for immediate delivery?')) return;
    try {
      const res = await api.post(`/campaigns/${id}/send`);
      toast.success(res.data.message);
      fetchCampaigns();
    } catch (err) {
      toast.error(err.message || 'Failed to queue campaign');
    }
  };

  const handlePause = async (id) => {
    try {
      await api.post(`/campaigns/${id}/pause`);
      toast.success('Campaign paused');
      fetchCampaigns();
    } catch (err) {
      toast.error(err.message || 'Failed to pause');
    }
  };

  const handleResume = async (id) => {
    try {
      await api.post(`/campaigns/${id}/resume`);
      toast.success('Campaign resumed');
      fetchCampaigns();
    } catch (err) {
      toast.error(err.message || 'Failed to resume');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await api.post(`/campaigns/${id}/duplicate`);
      toast.success('Campaign duplicated');
      fetchCampaigns();
    } catch {
      toast.error('Failed to duplicate');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete campaign?')) return;
    try {
      await api.delete(`/campaigns/${id}`);
      toast.success('Deleted');
      fetchCampaigns();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-subtitle">Manage, schedule, and execute bulk email broadcasts</p>
        </div>
        <Link to="/campaigns/new" className="btn-primary">
          <Plus size={16} /> Create Campaign
        </Link>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Status</th>
              <th>Audience</th>
              <th>Recipients</th>
              <th>Delivered / Open %</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center py-8">Loading campaigns...</td></tr>
            ) : campaigns.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-8 text-slate-500">No campaigns found. Create your first campaign above.</td></tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c._id}>
                  <td>
                    <div className="font-semibold text-slate-200">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.subject}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      c.status === 'sent' ? 'badge-green' :
                      c.status === 'sending' ? 'badge-blue' :
                      c.status === 'paused' ? 'badge-amber' : 'badge-gray'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="capitalize text-xs text-slate-400">{c.audienceType}</td>
                  <td>{c.stats?.total?.toLocaleString() || 0}</td>
                  <td>
                    <div className="text-xs font-semibold">{c.stats?.delivered || 0}</div>
                    <div className="text-xs text-slate-400">
                      {c.stats?.delivered ? ((c.stats.opened / c.stats.delivered) * 100).toFixed(1) : 0}% Open
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {c.status === 'draft' && (
                        <button onClick={() => handleSend(c._id)} className="p-1.5 rounded hover:bg-indigo-500/20 text-indigo-400" title="Send Now">
                          <Send size={15} />
                        </button>
                      )}
                      {c.status === 'sending' && (
                        <button onClick={() => handlePause(c._id)} className="p-1.5 rounded hover:bg-amber-500/20 text-amber-400" title="Pause">
                          <Pause size={15} />
                        </button>
                      )}
                      {c.status === 'paused' && (
                        <button onClick={() => handleResume(c._id)} className="p-1.5 rounded hover:bg-green-500/20 text-green-400" title="Resume">
                          <Play size={15} />
                        </button>
                      )}
                      <button onClick={() => handleDuplicate(c._id)} className="p-1.5 rounded hover:bg-slate-700 text-slate-400" title="Duplicate">
                        <Copy size={15} />
                      </button>
                      <button onClick={() => handleDelete(c._id)} className="p-1.5 rounded hover:bg-red-500/20 text-red-400" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
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
