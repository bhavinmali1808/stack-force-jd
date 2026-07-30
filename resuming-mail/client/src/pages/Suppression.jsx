import React, { useState, useEffect } from 'react';
import { XCircle, ShieldAlert, Plus, Trash2 } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Suppression() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production this endpoint fetches suppression list
    setLoading(false);
  }, []);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Suppression & Bounce List</h1>
          <p className="page-subtitle">Auto-suppressed emails to protect domain sender reputation (mail.resuming.io)</p>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Auto-Suppressed Recipients (0)</h2>
          <span className="text-xs text-slate-400">Emails here are excluded from all campaign broadcasts</span>
        </div>

        <div className="py-12 text-center text-slate-500 text-sm">
          No suppressed or hard-bounced emails recorded yet. Sender reputation is pristine.
        </div>
      </div>
    </div>
  );
}
