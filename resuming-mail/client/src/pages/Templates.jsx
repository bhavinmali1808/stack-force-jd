import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit3, Copy, Trash2, Eye, Layout } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/templates');
      if (res.data.success) setTemplates(res.data.templates);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleDuplicate = async (id) => {
    try {
      await api.post(`/templates/${id}/duplicate`);
      toast.success('Template duplicated');
      fetchTemplates();
    } catch {
      toast.error('Failed to duplicate');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete custom template?')) return;
    try {
      await api.delete(`/templates/${id}`);
      toast.success('Template deleted');
      fetchTemplates();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Email Templates</h1>
          <p className="page-subtitle">Pre-built transactional templates and custom drag-and-drop designs</p>
        </div>
        <Link to="/templates/new/builder" className="btn-primary">
          <Plus size={16} /> Open Drag & Drop Builder
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-slate-500">Loading template gallery...</div>
        ) : (
          templates.map(t => (
            <div key={t._id} className="card hover:border-indigo-500/50 transition-all flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="badge badge-violet capitalize">{t.category}</span>
                  {t.isSystem && <span className="badge badge-gray">System</span>}
                </div>
                <h3 className="font-bold text-lg text-slate-100">{t.name}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{t.subject || 'No default subject set'}</p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button onClick={() => navigate(`/templates/${t._id}/builder`)} className="btn-ghost text-xs py-1.5 px-3">
                  <Edit3 size={14} /> Edit
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDuplicate(t._id)} className="p-1.5 rounded hover:bg-slate-700 text-slate-400" title="Duplicate">
                    <Copy size={14} />
                  </button>
                  {!t.isSystem && (
                    <button onClick={() => handleDelete(t._id)} className="p-1.5 rounded hover:bg-red-500/20 text-red-400" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
