import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import LandingPage from '../pages/common/LandingPage';
import LoginPage from '../pages/auth/LoginPage';
import DonorRegisterPage from '../pages/auth/DonorRegisterPage';
import RecipientRegisterPage from '../pages/auth/RecipientRegisterPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes Wrapped in PublicLayout (with Navbar & Footer) */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="about" element={<LandingPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register/donor" element={<DonorRegisterPage />} />
        <Route path="register/recipient" element={<RecipientRegisterPage />} />
      </Route>

      {/* Catch-all redirect to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}