import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Send, Eye } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function CampaignBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    subject: '',
    previewText: '',
    senderName: 'Resuming.io',
    senderEmail: 'no-reply@resuming.io',
    replyTo: 'teams@resuming.io',
    templateId: '',
    audienceType: 'all',
  });

  useEffect(() => {
    api.get('/templates').then(res => {
      if (res.data.success) setTemplates(res.data.templates);
    });

    if (id) {
      api.get(`/campaigns/${id}`).then(res => {
        if (res.data.success) setForm(res.data.campaign);
      });
    }
  }, [id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (id) {
        await api.put(`/campaigns/${id}`, form);
        toast.success('Campaign updated');
      } else {
        await api.post('/campaigns', form);
        toast.success('Campaign created');
      }
      navigate('/campaigns');
    } catch (err) {
      toast.error(err.message || 'Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/campaigns')} className="btn-ghost">
          <ArrowLeft size={16} /> Back to Campaigns
        </button>
        <h1 className="text-xl font-bold">{id ? 'Edit Campaign' : 'New Campaign Wizard'}</h1>
      </div>

      <form onSubmit={handleSave} className="card space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-slate-300">Campaign Name</label>
            <input className="input" placeholder="e.g. Summer Resume Boost 2026" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-slate-300">Subject Line</label>
            <input className="input" placeholder="e.g. Unlock 50+ New Resume Templates 🚀" value={form.subject} onChange={e => setForm(p => ({...p, subject: e.target.value}))} required />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1 text-slate-300">Preview Text</label>
          <input className="input" placeholder="Snippet visible in inbox preview" value={form.previewText} onChange={e => setForm(p => ({...p, previewText: e.target.value}))} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-slate-300">Sender Name</label>
            <input className="input" value={form.senderName} onChange={e => setForm(p => ({...p, senderName: e.target.value}))} required />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-slate-300">Sender Email</label>
            <select className="select" value={form.senderEmail} onChange={e => setForm(p => ({...p, senderEmail: e.target.value}))} required>
              <option value="no-reply@resuming.io">no-reply@resuming.io (Broadcast / System / Automated)</option>
              <option value="teams@resuming.io">teams@resuming.io (Support / Team / Internal)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-slate-300">Reply-To Address</label>
            <select className="select" value={form.replyTo} onChange={e => setForm(p => ({...p, replyTo: e.target.value}))}>
              <option value="teams@resuming.io">teams@resuming.io (Customer Support & Team Inbox)</option>
              <option value="no-reply@resuming.io">no-reply@resuming.io (No Replies Accepted)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-xs font-semibold mb-1 text-slate-300">Select Template</label>
            <select className="select" value={form.templateId?._id || form.templateId || ''} onChange={e => setForm(p => ({...p, templateId: e.target.value}))} required>
              <option value="">-- Choose Template --</option>
              {templates.map(t => (
                <option key={t._id} value={t._id}>{t.name} ({t.category})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-slate-300">Target Audience</label>
            <select className="select" value={form.audienceType} onChange={e => setForm(p => ({...p, audienceType: e.target.value}))}>
              <option value="all">All Contacts</option>
              <option value="premium">Premium Users</option>
              <option value="free">Free Users</option>
              <option value="trial">Trial Users</option>
              <option value="verified">Verified Users</option>
              <option value="unverified">Unverified Users</option>
              <option value="has_resume">Users with Resume</option>
              <option value="no_resume">Users without Resume</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={() => navigate('/campaigns')} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            <Save size={16} /> Save Campaign
          </button>
        </div>
      </form>
    </div>
  );
}
