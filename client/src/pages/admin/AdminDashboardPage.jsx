import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Activity, Users, FileText } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-500" />
            <h1 className="text-2xl font-extrabold text-white">
              Admin Monitoring Console
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Platform governance & system metrics • Logged in as {user?.email}
          </p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
        <Activity className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="font-bold text-slate-900 text-lg">Admin Management Arriving in Phase 10</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          User account management, request oversight, audit logs, and security controls will be implemented in Phase 10.
        </p>
      </div>
    </div>
  );
}