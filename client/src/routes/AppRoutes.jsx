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
import AdminRequestsPage from '../pages/admin/AdminRequestsPage';
import AdminAuditLogsPage from '../pages/admin/AdminAuditLogsPage';

import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';


export default function AppRoutes() {
  return (
    <div className="min-h-screen flex flex-col">
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
          <Route path="requests" element={<AdminRequestsPage />} />
          <Route path="audit-logs" element={<AdminAuditLogsPage />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}