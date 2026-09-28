import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { PageHeader, LoadingSkeleton, AppButton, EmptyState } from '../../components/app/UI';
import { getAuditLogs } from '../../services/adminService';

function SeverityBadge({ severity }) {
  const MAP = {
    critical: { label: 'CRITICAL', bg: 'bg-red-500/20 text-red-400 border-red-500/30 font-bold' },
    high:     { label: 'HIGH',     bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    warning:  { label: 'WARNING',  bg: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
    info:     { label: 'INFO',     bg: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  };
  const conf = MAP[severity] || MAP.info;
  return (
    <span className={"inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border " + conf.bg}>
      {conf.label}
    </span>
  );
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAuditLogs({ search, severity: severityFilter });
      setLogs(res.logs || []);
    } catch {
      // service mock fallback
    } finally {
      setLoading(false);
    }
  }, [search, severityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <AdminLayout>
      <PageHeader
        title="System Audit Logs"
        subtitle="Immutable security log history tracking system actions, role modifications, and critical events"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white/50 glass px-3 py-1.5 rounded-xl border border-white/08">
              Logged Events: {logs.length}
            </span>
          </div>
        }
      />

      {/* Security Banner */}
      <div className="glass p-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2"/></svg>
          </div>
          <div>
            <h3 className="font-display font-semibold text-white text-sm">Privacy & Credential Protection</h3>
            <p className="text-xs text-white/45">Passwords, JWT secrets, and private credentials are automatically sanitized and never stored in audit traces.</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass p-4 rounded-2xl border border-white/08 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <input
            type="text"
            placeholder="Filter by actor name, action code, or target resource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/04 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-red-500/50"
          />
        </div>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2.5 bg-white/04 border border-white/10 rounded-xl text-xs text-white/80 focus:outline-none focus:border-red-500/50 w-full md:w-auto"
        >
          <option value="" className="bg-[#111116]">All Severities</option>
          <option value="critical" className="bg-[#111116]">Critical</option>
          <option value="high" className="bg-[#111116]">High</option>
          <option value="warning" className="bg-[#111116]">Warning</option>
          <option value="info" className="bg-[#111116]">Info</option>
        </select>
      </div>

      {/* Logs Table */}
      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : logs.length === 0 ? (
        <EmptyState
          title="No Audit Events Found"
          description="No security audit events match your search term."
          action={
            <AppButton size="sm" variant="secondary" onClick={() => { setSearch(''); setSeverityFilter(''); }}>
              Clear Filters
            </AppButton>
          }
        />
      ) : (
        <div className="glass rounded-2xl border border-white/08 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/08 bg-white/02 text-[11px] font-bold text-white/40 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4">Action Event</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Target Resource</th>
                  <th className="py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/06 text-xs text-white/80">
                {logs.map(log => (
                  <tr key={log._id} className="hover:bg-white/03 transition-colors">
                    <td className="py-4 px-4">
                      <SeverityBadge severity={log.severity} />
                    </td>
                    <td className="py-4 px-4 font-mono font-semibold text-white text-xs">
                      {log.action}
                      {log.metadata && (
                        <div className="text-[10px] font-sans text-white/40 font-normal mt-0.5 max-w-xs truncate">
                          {JSON.stringify(log.metadata)}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-white font-medium">{log.actor?.name || 'Unknown'}</div>
                      <div className="text-white/40 text-[11px] font-mono">{log.actor?.email} ({log.actor?.role})</div>
                    </td>
                    <td className="py-4 px-4 text-white/70 font-mono text-xs">
                      {log.targetResource}
                    </td>
                    <td className="py-4 px-4 text-white/40 font-mono text-xs">
                      {log.ipAddress || '—'}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-white/40 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
