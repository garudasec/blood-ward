import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  Users,
  FileText,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Lock,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import Button from '../../components/common/Button';
import AdminSummaryStats from '../../components/admin/AdminSummaryStats';
import { MOCK_ADMIN_STATS, MOCK_ADMIN_ACTIVITY } from '../../constants/mockData';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-8 pb-12">
      {/* 1. ADMIN OVERVIEW HEADER */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold shadow-lg">
                <Shield className="w-6 h-6 fill-current" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Admin Monitoring Console
                </h1>
                <p className="text-xs text-slate-400">
                  Platform governance, user management, and security audit log oversight
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> System Online & Guarded
            </span>
          </div>
        </div>
      </div>

      {/* 2. ADMIN SUMMARY STATS GRID */}
      <AdminSummaryStats stats={MOCK_ADMIN_STATS} />

      {/* 3. QUICK NAVIGATION CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/admin/donors')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-red-50 text-red-600 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-colors" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm">Manage Donors</h4>
            <p className="text-[11px] text-slate-500">View & audit donor accounts</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/admin/recipients')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm">Manage Recipients</h4>
            <p className="text-[11px] text-slate-500">View recipient accounts</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/admin/requests')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm">Blood Requests</h4>
            <p className="text-[11px] text-slate-500">Monitor active broadcasts</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/admin/audit-logs')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm">Security Audit Logs</h4>
            <p className="text-[11px] text-slate-500">System activity trail</p>
          </div>
        </div>
      </div>

      {/* 4. RECENT PLATFORM ACTIVITY TIMELINE & SECURITY STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Timeline (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Recent Platform Activity
            </h3>
            <span className="text-xs text-slate-400">Live feed</span>
          </div>

          <div className="space-y-3">
            {MOCK_ADMIN_ACTIVITY.map((act) => (
              <div
                key={act.id}
                className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-900">{act.action}</span>
                  <p className="text-[11px] text-slate-500">Initiated by {act.user}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 font-medium">{act.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Security Status Panel (1 Col) */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">Security & Privacy Guard</h3>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <Lock className="w-3.5 h-3.5 text-emerald-400" /> Cookie Authentication
              </div>
              <p className="text-[11px] text-slate-400">
                JWT tokens stored in HttpOnly cookies (Zero localStorage exposure).
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Location Privacy
              </div>
              <p className="text-[11px] text-slate-400">
                Donor exact residential addresses shielded from public search.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <Activity className="w-3.5 h-3.5 text-amber-400" /> Audit Logging
              </div>
              <p className="text-[11px] text-slate-400">
                All administrative actions recorded in security audit trail.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}