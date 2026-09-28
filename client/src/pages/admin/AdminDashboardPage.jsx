import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { PageHeader, LoadingSkeleton, AppButton } from '../../components/app/UI';
import { BloodGroupBadge } from '../../components/app/Badges';
import { getAdminStats } from '../../services/adminService';

function StatMetricCard({ title, value, subtext, icon, trend, highlight = false }) {
  return (
    <div className={"glass rounded-2xl p-5 border transition-all duration-200 " + (
      highlight 
        ? "border-red-500/30 bg-gradient-to-br from-red-950/40 via-red-950/10 to-transparent shadow-lg shadow-red-950/20" 
        : "border-white/08 hover:border-white/15"
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">{title}</span>
        {icon && (
          <div className={"w-9 h-9 rounded-xl flex items-center justify-center " + (
            highlight ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-white/05 text-white/50"
          )}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-baseline justify-between">
        <div className={"font-display font-bold text-3xl " + (highlight ? "text-red-400" : "text-white")}>
          {value}
        </div>
        {trend && (
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            {trend}
          </span>
        )}
      </div>
      {subtext && <p className="text-xs text-white/35 mt-2 font-medium">{subtext}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminStats();
      setStats(res.stats || res);
    } catch {
      // handled by service mock fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const s = stats || {};
  const distribution = s.bloodGroupDistribution || [];
  const activity = s.recentActivity || [];

  return (
    <AdminLayout>
      <PageHeader
        title="System Overview"
        subtitle="Real-time operational metrics and discovery management"
        action={
          <div className="flex items-center gap-3">
            <AppButton variant="secondary" size="sm" onClick={fetchStats}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mr-1"><path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              Refresh
            </AppButton>
            <Link to="/admin/audit-logs">
              <AppButton variant="primary" size="sm">
                Audit Logs
              </AppButton>
            </Link>
          </div>
        }
      />

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <div className="space-y-8">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatMetricCard
              title="Total Donors"
              value={s.totalDonors ?? 0}
              subtext={(s.activeDonors ?? 0) + " currently available"}
              trend={s.donorGrowthRate}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/></svg>}
            />
            <StatMetricCard
              title="Total Recipients"
              value={s.totalRecipients ?? 0}
              subtext="Registered accounts"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/></svg>}
            />
            <StatMetricCard
              title="Active Requests"
              value={s.activeBloodRequests ?? 0}
              subtext="Awaiting fulfillment"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2"/></svg>}
            />
            <StatMetricCard
              title="Emergency"
              value={s.emergencyRequests ?? 0}
              subtext="Critical priority"
              highlight={true}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
            />
            <StatMetricCard
              title="Fulfilled Rate"
              value={s.fulfilledRate || "94%"}
              subtext={(s.totalDonationsFulfilled ?? 0) + " completed"}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2"/><polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2"/></svg>}
            />
          </div>

          {/* Quick Action Navigation Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/admin/donors" className="glass p-4 rounded-2xl border border-white/08 hover:border-red-500/30 hover:bg-white/04 transition-all flex items-center justify-between group">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/><circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"/></svg>
                </div>
                <div>
                  <h3 className="font-display font-semibold text-white text-sm group-hover:text-red-400 transition-colors">Manage Donors</h3>
                  <p className="text-xs text-white/40">Search, verify & block accounts</p>
                </div>
              </div>
              <span className="text-white/30 group-hover:text-white transition-colors">→</span>
            </Link>

            <Link to="/admin/recipients" className="glass p-4 rounded-2xl border border-white/08 hover:border-red-500/30 hover:bg-white/04 transition-all flex items-center justify-between group">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/></svg>
                </div>
                <div>
                  <h3 className="font-display font-semibold text-white text-sm group-hover:text-blue-400 transition-colors">Manage Recipients</h3>
                  <p className="text-xs text-white/40">View profiles & compliance</p>
                </div>
              </div>
              <span className="text-white/30 group-hover:text-white transition-colors">→</span>
            </Link>

            <Link to="/admin/requests" className="glass p-4 rounded-2xl border border-white/08 hover:border-red-500/30 hover:bg-white/04 transition-all flex items-center justify-between group">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2"/><path d="M14 2v6h6M9 13h6" stroke="currentColor" strokeWidth="2"/></svg>
                </div>
                <div>
                  <h3 className="font-display font-semibold text-white text-sm group-hover:text-amber-400 transition-colors">Blood Request Controls</h3>
                  <p className="text-xs text-white/40">Monitor & resolve emergencies</p>
                </div>
              </div>
              <span className="text-white/30 group-hover:text-white transition-colors">→</span>
            </Link>
          </div>

          {/* Visualizations Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Blood Group Distribution Chart */}
            <div className="lg:col-span-2 glass rounded-2xl p-6 border border-white/08">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display font-semibold text-white text-base mb-1">Donor Blood Group Inventory</h2>
                  <p className="text-xs text-white/40">Distribution of registered active donors by blood type</p>
                </div>
                <span className="text-xs text-white/40 bg-white/05 px-3 py-1 rounded-full border border-white/08 font-medium">
                  8 Groups Tracked
                </span>
              </div>

              <div className="space-y-4">
                {distribution.map((item) => (
                  <div key={item.group} className="flex items-center gap-4">
                    <div className="w-12">
                      <BloodGroupBadge group={item.group} size="sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-white/70 font-medium">{item.count} Donors</span>
                        <span className="text-white/40 font-mono">{item.percentage}%</span>
                      </div>
                      <div className="h-2.5 w-full bg-white/06 rounded-full overflow-hidden p-0.5 border border-white/06">
                        <div
                          className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full transition-all duration-500"
                          style={{ width: item.percentage + "%" }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity Timeline */}
            <div className="glass rounded-2xl p-6 border border-white/08 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-display font-semibold text-white text-base">Recent Activity</h2>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                    Live Updates
                  </span>
                </div>

                <div className="space-y-4">
                  {activity.map((act) => (
                    <div key={act.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/02 border border-white/05 hover:border-white/10 transition-colors">
                      <div className={"w-2 h-2 rounded-full mt-2 flex-shrink-0 " + (
                        act.type === "emergency" ? "bg-red-500 animate-pulse" :
                        act.type === "donor" ? "bg-emerald-400" :
                        act.type === "admin" ? "bg-purple-400" : "bg-blue-400"
                      )} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-xs font-semibold text-white/90 truncate">{act.title}</p>
                          <span className="text-[10px] text-white/35 flex-shrink-0">{act.time}</span>
                        </div>
                        <p className="text-xs text-white/45 truncate">{act.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/08 text-center">
                <Link to="/admin/audit-logs" className="text-xs text-red-400 hover:text-red-300 font-medium inline-flex items-center gap-1 transition-colors">
                  View complete system audit log →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
