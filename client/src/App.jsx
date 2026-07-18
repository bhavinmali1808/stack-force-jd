import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import AppLayout from './components/AppLayout.jsx';

// Loaded eagerly — tiny, always needed on first paint
import Landing from './pages/Landing.jsx';
import Auth from './pages/Auth.jsx';

// All heavy pages are lazy — browser only fetches their chunk when the route is visited
const ForgotPassword  = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword   = lazy(() => import('./pages/ResetPassword.jsx'));
const Dashboard       = lazy(() => import('./pages/Dashboard.jsx'));
const RoleCreate      = lazy(() => import('./pages/RoleCreate.jsx'));
const RoleDetail      = lazy(() => import('./pages/RoleDetail.jsx'));
const RoleEdit        = lazy(() => import('./pages/RoleEdit.jsx'));
const Analytics       = lazy(() => import('./pages/Analytics.jsx'));
const CandidateDetail = lazy(() => import('./pages/CandidateDetail.jsx'));
const Upload          = lazy(() => import('./pages/Upload.jsx'));
const EmailAccounts   = lazy(() => import('./pages/EmailAccounts.jsx'));
const Projects        = lazy(() => import('./pages/Projects.jsx'));
const Explore         = lazy(() => import('./pages/Explore.jsx'));
const TalentPool      = lazy(() => import('./pages/TalentPool.jsx'));

// Thin spinner shown while a lazy page chunk is downloading
function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading...</p>
      </div>
    </div>
  );
}

// Guard — redirects to /login if not authenticated
function PrivateRoute({ children }) {
  const { company, loading } = useAuth();

  if (loading) return <PageLoader />;

  return company ? children : <Navigate to="/login" replace />;
}

// Guard — redirects authenticated users away from auth pages
function PublicOnlyRoute({ children }) {
  const { company, loading } = useAuth();
  if (loading) return null;
  return company ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<><Navbar /><Landing /></>} />
        <Route path="/login" element={<PublicOnlyRoute><><Navbar /><Auth /></></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><><Navbar /><Auth /></></PublicOnlyRoute>} />
        <Route path="/forgot-password" element={<PublicOnlyRoute><><Navbar /><ForgotPassword /></></PublicOnlyRoute>} />
        <Route path="/reset-password/:token" element={<PublicOnlyRoute><><Navbar /><ResetPassword /></></PublicOnlyRoute>} />

        {/* Protected Routes wrapped in Sidebar Layout */}
        <Route path="/dashboard" element={<PrivateRoute><AppLayout title="Dashboard"><Dashboard /></AppLayout></PrivateRoute>} />
        <Route path="/projects" element={<PrivateRoute><AppLayout title="Projects"><Projects /></AppLayout></PrivateRoute>} />
        <Route path="/explore" element={<PrivateRoute><AppLayout title="Global Pool"><Explore /></AppLayout></PrivateRoute>} />
        <Route path="/talent-pool" element={<PrivateRoute><AppLayout title="Talent Pool"><TalentPool /></AppLayout></PrivateRoute>} />
        <Route path="/email" element={<PrivateRoute><AppLayout title="Email Accounts"><EmailAccounts /></AppLayout></PrivateRoute>} />
        <Route path="/roles/new" element={<PrivateRoute><AppLayout title="Create Project"><RoleCreate /></AppLayout></PrivateRoute>} />
        <Route path="/roles/:id" element={<PrivateRoute><AppLayout title="Project Details"><RoleDetail /></AppLayout></PrivateRoute>} />
        <Route path="/roles/:id/edit" element={<PrivateRoute><AppLayout title="Edit Project"><RoleEdit /></AppLayout></PrivateRoute>} />
        <Route path="/roles/:id/analytics" element={<PrivateRoute><AppLayout title="Project Analytics"><Analytics /></AppLayout></PrivateRoute>} />
        <Route path="/roles/:id/upload" element={<PrivateRoute><AppLayout title="Upload Resumes"><Upload /></AppLayout></PrivateRoute>} />
        <Route path="/roles/:id/candidates/:cid" element={<PrivateRoute><AppLayout title="Candidate Profile"><CandidateDetail /></AppLayout></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
