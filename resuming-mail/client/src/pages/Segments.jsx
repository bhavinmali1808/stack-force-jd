import React, { useState, useEffect } from 'react';
import { GitBranch, Plus, Users, Trash2 } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Segments() {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSegments = async () => {
    try {
      const res = await api.get('/segments');
      if (res.data.success) setSegments(res.data.segments);
    } catch {
      toast.error('Failed to load segments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSegments(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete segment rule?')) return;
    try {
      await api.delete(`/segments/${id}`);
      toast.success('Segment deleted');
      fetchSegments();
    } catch {
      toast.error('Failed to delete segment');
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audience Segments</h1>
          <p className="page-subtitle">Dynamic AND/OR conditions for hyper-targeted email delivery</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-slate-500">Loading segments...</div>
        ) : segments.length === 0 ? (
          <div className="col-span-3 card text-center py-12 text-slate-500">
            No custom segments defined yet. Campaigns currently use built-in audience shortcuts (Premium, Free, Verified, etc.).
          </div>
        ) : (
          segments.map(s => (
            <div key={s._id} className="card space-y-3">
              <div className="flex items-center justify-between">
                <span className="badge badge-indigo">Dynamic</span>
                <button onClick={() => handleDelete(s._id)} className="p-1 rounded hover:bg-red-500/20 text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
              <h3 className="font-bold text-lg text-slate-100">{s.name}</h3>
              <p className="text-xs text-slate-400">{s.description || 'No description provided'}</p>
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Matching Users:</span>
                <span className="font-bold text-indigo-400">{s.userCount?.toLocaleString() || 0}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
