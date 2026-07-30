import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import AdminPortal from './pages/AdminPortal.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Candidate Public Job Portal */}
        <Route path="/" element={<App />} />

        {/* Isolated SaaS Enterprise Super Admin Console */}
        <Route path="/admin" element={<AdminPortal />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
