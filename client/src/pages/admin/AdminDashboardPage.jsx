import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
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
  Inbox,
} from 'lucide-react';
import AdminSummaryStats from '../../components/admin/AdminSummaryStats';

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [dashboardStats, setDashboardStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const dashboardRes = await adminService.getDashboard();
        if (dashboardRes && dashboardRes.stats) {
          setDashboardStats({
            totalDonors: dashboardRes.stats.totalDonors || 0,
            activeAvailableDonors: dashboardRes.stats.availableDonors || 0,
            totalRecipients: dashboardRes.stats.totalRecipients || 0,
            emergencyRequests: dashboardRes.stats.emergencyRequests || 0,
            activeRequests: dashboardRes.stats.activeRequests || 0,
            fulfilledRequests: dashboardRes.stats.fulfilledRequests || 0,
            totalUsers: dashboardRes.stats.totalUsers || 0,
            blockedUsers: dashboardRes.stats.blockedUsers || 0,
            totalRequests: dashboardRes.stats.totalRequests || 0,
            cancelledRequests: dashboardRes.stats.cancelledRequests || 0,
            donorAcceptedRequests: dashboardRes.stats.donorAcceptedRequests || 0,
            inProgressRequests: dashboardRes.stats.inProgressRequests || 0,
          });
        }

        const auditRes = await adminService.getAuditLogs({ limit: 10 });
        if (auditRes && auditRes.logs) {
          setRecentLogs(auditRes.logs);
        }
      } catch (err) {
        console.error('Failed to load admin dashboard:', err);
        setError(err.message || 'Failed to load dashboard data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white p-8 rounded-3xl border border-rose-200 shadow-sm text-center space-y-4 max-w-md">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-lg font-extrabold text-slate-900">Dashboard Error</h3>
          <p className="text-sm text-slate-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
                <p className="text-xs text-theme-muted">
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
      <AdminSummaryStats stats={dashboardStats} />

      {/* 3. QUICK NAVIGATION CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/admin/donors')}
          className="bg-theme-card p-5 rounded-2xl border border-theme shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-red-50 text-red-600 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-colors" />
          </div>
          <div>
            <h4 className="font-extrabold text-theme-primary text-sm">Manage Donors</h4>
            <p className="text-[11px] text-theme-secondary">View & audit donor accounts</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/admin/recipients')}
          className="bg-theme-card p-5 rounded-2xl border border-theme shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <div>
            <h4 className="font-extrabold text-theme-primary text-sm">Manage Recipients</h4>
            <p className="text-[11px] text-theme-secondary">View recipient accounts</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/admin/requests')}
          className="bg-theme-card p-5 rounded-2xl border border-theme shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
          </div>
          <div>
            <h4 className="font-extrabold text-theme-primary text-sm">Blood Requests</h4>
            <p className="text-[11px] text-theme-secondary">Monitor active broadcasts</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/admin/audit-logs')}
          className="bg-theme-card p-5 rounded-2xl border border-theme shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-theme-subtle text-theme-secondary group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-theme-primary transition-colors" />
          </div>
          <div>
            <h4 className="font-extrabold text-theme-primary text-sm">Security Audit Logs</h4>
            <p className="text-[11px] text-theme-secondary">System activity trail</p>
          </div>
        </div>
      </div>

      {/* 4. RECENT PLATFORM ACTIVITY TIMELINE & SECURITY STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Timeline (2 Cols) */}
        <div className="lg:col-span-2 bg-theme-card p-6 sm:p-8 rounded-3xl border border-theme shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-theme pb-3">
            <h3 className="text-base font-extrabold text-theme-primary tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Recent Platform Activity
            </h3>
            <span className="text-xs text-theme-muted">Live feed</span>
          </div>

          <div className="space-y-3">
            {recentLogs.length === 0 ? (
              <div className="p-6 text-center">
                <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-semibold">No recent activity recorded yet.</p>
              </div>
            ) : recentLogs.map((act) => (
              <div
                key={act.id}
                className="p-3.5 bg-theme-surface rounded-2xl border border-theme text-xs flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <span className="font-bold text-theme-primary">{act.action}</span>
                  <p className="text-[11px] text-theme-secondary">Initiated by {act.actorName || act.actor?.fullName || "System"}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 font-medium">{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Security Status Panel (1 Col) */}
        <div className="bg-theme-card text-theme-primary p-6 sm:p-8 rounded-3xl border border-theme shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-theme pb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">Security & Privacy Guard</h3>
          </div>

          <div className="space-y-3 text-xs text-theme-secondary">
            <div className="p-3 rounded-xl bg-theme-surface border border-theme space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-theme-primary">
                <Lock className="w-3.5 h-3.5 text-emerald-400" /> Cookie Authentication
              </div>
              <p className="text-[11px] text-theme-muted">
                JWT tokens stored in HttpOnly cookies (Zero localStorage exposure).
              </p>
            </div>

            <div className="p-3 rounded-xl bg-theme-surface border border-theme space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-theme-primary">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Location Privacy
              </div>
              <p className="text-[11px] text-theme-muted">
                Donor exact residential addresses shielded from public search.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-theme-surface border border-theme space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-theme-primary">
                <Activity className="w-3.5 h-3.5 text-amber-400" /> Audit Logging
              </div>
              <p className="text-[11px] text-theme-muted">
                All administrative actions recorded in security audit trail.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}