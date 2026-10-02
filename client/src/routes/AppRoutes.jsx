import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES } from '../constants/theme';
import PublicLayout from '../layouts/PublicLayout';
import DonorLayout from '../layouts/DonorLayout';
import RecipientLayout from '../layouts/RecipientLayout';
import AdminLayout from '../layouts/AdminLayout';

import LandingPage from '../pages/common/LandingPage';
import LoginPage from '../pages/auth/LoginPage';
import DonorRegisterPage from '../pages/auth/DonorRegisterPage';
import RecipientRegisterPage from '../pages/auth/RecipientRegisterPage';

import DonorDashboardPage from '../pages/donor/DonorDashboardPage';
import DonorProfilePage from '../pages/donor/DonorProfilePage';
import DonorAvailabilityPage from '../pages/donor/DonorAvailabilityPage';
import DonorRequestsPage from '../pages/donor/DonorRequestsPage';
import DonorHistoryPage from '../pages/donor/DonorHistoryPage';

import RecipientDashboardPage from '../pages/recipient/RecipientDashboardPage';
import RecipientProfilePage from '../pages/recipient/RecipientProfilePage';
import RecipientDonorSearchPage from '../pages/recipient/RecipientDonorSearchPage';
import CreateBloodRequestPage from '../pages/recipient/CreateBloodRequestPage';
import RecipientRequestsPage from '../pages/recipient/RecipientRequestsPage';

import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminDonorsPage from '../pages/admin/AdminDonorsPage';
import AdminRecipientsPage from '../pages/admin/AdminRecipientsPage';

import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';

// Demo Role Toolbar Component for testing and viva demonstration
function DemoRoleToolbar() {
  const { user, role, setDemoUser } = useAuth();

  return (
    <div className="bg-slate-950 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
      <div className="flex items-center gap-2">
        <span className="font-mono text-slate-400">⚡ VIVA DEMO TOOLBAR:</span>
        <span className="font-semibold text-slate-300">Current Role:</span>
        <span className="px-2 py-0.5 rounded font-extrabold bg-slate-800 text-amber-400 border border-slate-700 uppercase">
          {role || 'GUEST (Unauthenticated)'}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-slate-400">Switch Role:</span>
        <button
          onClick={() => setDemoUser(null)}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
            !role ? 'bg-slate-700 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          Guest
        </button>
        <button
          onClick={() => setDemoUser(USER_ROLES.DONOR)}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
            role === USER_ROLES.DONOR
              ? 'bg-red-600 text-white font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          Donor
        </button>
        <button
          onClick={() => setDemoUser(USER_ROLES.RECIPIENT)}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
            role === USER_ROLES.RECIPIENT
              ? 'bg-blue-600 text-white font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          Recipient
        </button>
        <button
          onClick={() => setDemoUser(USER_ROLES.ADMIN)}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
            role === USER_ROLES.ADMIN
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          Admin
        </button>
      </div>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <div className="min-h-screen flex flex-col">
      <DemoRoleToolbar />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="about" element={<LandingPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register/donor" element={<DonorRegisterPage />} />
          <Route path="register/recipient" element={<RecipientRegisterPage />} />
        </Route>

        {/* Protected Donor Routes */}
        <Route
          path="/donor"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={[USER_ROLES.DONOR]}>
                <DonorLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<DonorDashboardPage />} />
          <Route path="profile" element={<DonorProfilePage />} />
          <Route path="availability" element={<DonorAvailabilityPage />} />
          <Route path="requests" element={<DonorRequestsPage />} />
          <Route path="history" element={<DonorHistoryPage />} />
        </Route>

        {/* Protected Recipient Routes */}
        <Route
          path="/recipient"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={[USER_ROLES.RECIPIENT]}>
                <RecipientLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<RecipientDashboardPage />} />
          <Route path="donors" element={<RecipientDonorSearchPage />} />
          <Route path="requests/create" element={<CreateBloodRequestPage />} />
          <Route path="requests" element={<RecipientRequestsPage />} />
          <Route path="profile" element={<RecipientProfilePage />} />
        </Route>

        {/* Protected Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <AdminLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="donors" element={<AdminDonorsPage />} />
          <Route path="recipients" element={<AdminRecipientsPage />} />
          <Route path="requests" element={<AdminDashboardPage />} />
          <Route path="audit-logs" element={<AdminDashboardPage />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}