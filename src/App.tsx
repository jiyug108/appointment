import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import FormPage from './pages/FormPage';
import SuccessPage from './pages/SuccessPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-natural-bg flex flex-col items-center py-0 sm:py-12 px-0 sm:px-6">
      <div className="w-full max-w-lg bg-white min-h-screen sm:min-h-0 sm:rounded-[40px] shadow-2xl shadow-stone-200/50 relative overflow-hidden flex flex-col border border-stone-100">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* User Facing H5 Pages */}
        <Route path="/" element={<UserLayout><Home /></UserLayout>} />
        <Route path="/form" element={<UserLayout><FormPage /></UserLayout>} />
        <Route path="/success" element={<UserLayout><SuccessPage /></UserLayout>} />
        
        {/* Admin Login - Centered Box */}
        <Route path="/admin-login" element={
          <div className="min-h-screen bg-natural-bg flex items-center justify-center p-6">
            <AdminLogin />
          </div>
        } />
        
        {/* Admin Dashboard - Wide Layout */}
        <Route path="/admin" element={
          <div className="min-h-screen bg-[#F9F9F6]">
            <AdminDashboard />
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}
