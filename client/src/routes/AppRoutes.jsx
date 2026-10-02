import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import LandingPage from '../pages/common/LandingPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="about" element={<LandingPage />} />
      </Route>

      {/* Auth Routes Placeholders (Phase 3) */}
      <Route
        path="/login"
        element={
          <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">Login Page</h2>
              <p className="text-slate-600 text-sm">Auth UI implementation arriving in Phase 3.</p>
              <a href="/" className="inline-block text-sm text-red-600 font-semibold hover:underline">
                ← Return to Home
              </a>
            </div>
          </div>
        }
      />
      <Route
        path="/register/donor"
        element={
          <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">Donor Registration</h2>
              <p className="text-slate-600 text-sm">Registration UI implementation arriving in Phase 3.</p>
              <a href="/" className="inline-block text-sm text-red-600 font-semibold hover:underline">
                ← Return to Home
              </a>
            </div>
          </div>
        }
      />
      <Route
        path="/register/recipient"
        element={
          <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">Recipient Registration</h2>
              <p className="text-slate-600 text-sm">Registration UI implementation arriving in Phase 3.</p>
              <a href="/" className="inline-block text-sm text-red-600 font-semibold hover:underline">
                ← Return to Home
              </a>
            </div>
          </div>
        }
      />

      {/* Catch-all redirect to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}