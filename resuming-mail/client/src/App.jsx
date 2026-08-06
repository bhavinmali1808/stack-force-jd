import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import CampaignBuilder from './pages/CampaignBuilder';
import Templates from './pages/Templates';
import EmailBuilder from './pages/EmailBuilder';
import Audience from './pages/Audience';
import Segments from './pages/Segments';
import Analytics from './pages/Analytics';
import Queue from './pages/Queue';
import Logs from './pages/Logs';
import Suppression from './pages/Suppression';
import SmtpHealth from './pages/SmtpHealth';
import Deliverability from './pages/Deliverability';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const { admin, isLoading } = useAuthStore();
  if (isLoading) return (
    <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <span style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading...</span>
      </div>
    </div>
  );
  return admin ? children : <Navigate to="/login" replace />;
};

export default function App() {
  const fetchMe = useAuthStore(s => s.fetchMe);
  useEffect(() => { fetchMe(); }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#141928', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)' },
          success: { iconTheme: { primary: '#10b981', secondary: '#141928' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#141928' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/unsubscribed" element={
          <div className="flex h-screen items-center justify-center flex-col gap-4">
            <div style={{ fontSize: 48 }}>✅</div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Unsubscribed</h1>
            <p style={{ color: 'var(--text-2)' }}>You've been removed from our mailing list.</p>
          </div>
        } />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="campaigns/new" element={<CampaignBuilder />} />
          <Route path="campaigns/:id/edit" element={<CampaignBuilder />} />
          <Route path="templates" element={<Templates />} />
          <Route path="templates/:id/builder" element={<EmailBuilder />} />
          <Route path="templates/new" element={<EmailBuilder />} />
          <Route path="audience" element={<Audience />} />
          <Route path="segments" element={<Segments />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="deliverability" element={<Deliverability />} />
          <Route path="queue" element={<Queue />} />
          <Route path="logs" element={<Logs />} />
          <Route path="suppression" element={<Suppression />} />
          <Route path="health" element={<SmtpHealth />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
