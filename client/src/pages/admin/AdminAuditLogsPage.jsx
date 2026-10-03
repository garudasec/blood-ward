import React, { useState, useEffect } from 'react';
import {
  Activity,
  Search,
  Filter,
  ShieldAlert,
  Clock,
  Terminal,
  Eye,
  Inbox,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import Button from '../../components/common/Button';
import AdminAuditDetailModal from '../../components/admin/AdminAuditDetailModal';
import { adminService } from '../../services/adminService';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedLogForModal, setSelectedLogForModal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      const res = await adminService.getAuditLogs(params);
      if (res && res.logs) {
        setLogs(res.logs);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [categoryFilter]);

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const actorStr = (log.actorName || log.actor?.fullName || '').toLowerCase();
    const actionStr = (log.action || '').toLowerCase();
    const targetStr = (log.target || '').toLowerCase();
    const ipStr = (log.ipAddress || '').toLowerCase();
    return actorStr.includes(q) || actionStr.includes(q) || targetStr.includes(q) || ipStr.includes(q);
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-theme-card text-theme-primary p-6 sm:p-8 rounded-3xl border border-theme shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
              <Activity className="w-5 h-5 fill-current" />
            </div>
            <h1 className="text-2xl font-extrabold text-theme-primary tracking-tight">
              Security & Platform Audit Logs
            </h1>
          </div>
          <p className="text-xs text-theme-secondary">
            Immutable security event logging, administrative actions, and user authentication trail
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2.5 rounded-xl bg-theme-surface border border-theme hover:bg-theme-subtle text-theme-secondary hover:text-theme-primary transition-colors"
          title="Refresh audit logs"
        >
          <RefreshCw className={"w-4 h-4 " + (isLoading ? "animate-spin" : "")} />
        </button>
      </div>

      <div className="bg-theme-card p-4 sm:p-6 rounded-3xl border border-theme shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-theme-muted absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search action, actor, target, IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-theme bg-theme-surface text-theme-primary pl-9 pr-3 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-theme-surface px-3 py-2 rounded-xl border border-theme text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Event Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="font-bold text-theme-primary bg-transparent outline-none cursor-pointer w-full"
            >
              <option className="bg-theme-card text-theme-primary" value="ALL">All Categories</option>
              <option className="bg-theme-card text-theme-primary" value="AUTH">AUTH</option>
              <option className="bg-theme-card text-theme-primary" value="ADMIN_ACTION">ADMIN_ACTION</option>
              <option className="bg-theme-card text-theme-primary" value="DONOR_ACTION">DONOR_ACTION</option>
              <option className="bg-theme-card text-theme-primary" value="RECIPIENT_ACTION">RECIPIENT_ACTION</option>
              <option className="bg-theme-card text-theme-primary" value="REQUEST_MGMT">REQUEST_MGMT</option>
              <option className="bg-theme-card text-theme-primary" value="SECURITY">SECURITY</option>
              <option className="bg-theme-card text-theme-primary" value="SYSTEM">SYSTEM</option>
            </select>
          </div>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="bg-theme-card p-12 rounded-3xl border border-theme text-center space-y-3">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-theme-primary text-base">No audit logs recorded</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No system audit logs match your search criteria.
          </p>
        </div>
      ) : (
        <div className="bg-theme-card rounded-3xl border border-theme shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-theme-table-header border-b border-theme text-[11px] font-bold uppercase tracking-wider text-theme-secondary">
                  <th className="py-3.5 px-6">Timestamp & Event Action</th>
                  <th className="py-3.5 px-6">Category & Severity</th>
                  <th className="py-3.5 px-6">Initiator (Actor)</th>
                  <th className="py-3.5 px-6">Target & IP</th>
                  <th className="py-3.5 px-6 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme text-xs text-theme-secondary">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-theme-surface/80 transition-colors font-mono">
                    <td className="py-4 px-6">
                      <div className="font-bold text-theme-primary">{log.action}</div>
                      <div className="text-[11px] text-theme-muted pt-0.5">{new Date(log.createdAt).toLocaleString()}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-theme-subtle text-theme-primary border border-theme">
                        {log.category}
                      </span>
                      <span
                        className={"ml-2 px-2 py-0.5 rounded text-[10px] font-bold " + (log.severity === "HIGH" ? "bg-rose-100 text-rose-800" : "bg-blue-100 text-blue-800")}
                      >
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-sans">
                      <div className="font-bold text-theme-primary">{log.actorName || log.actor?.fullName || "System"}</div>
                      <div className="text-[11px] text-theme-muted">{log.actor?.email || "N/A"}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-theme-primary">{log.target || "N/A"}</div>
                      <div className="text-[11px] text-theme-muted">IP: {log.ipAddress || "N/A"}</div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedLogForModal(log)}
                        className="p-1.5 rounded-lg text-theme-secondary hover:bg-theme-surface transition-colors inline-flex items-center"
                        title="Inspect Event Log"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AdminAuditDetailModal
        log={selectedLogForModal}
        isOpen={!!selectedLogForModal}
        onClose={() => setSelectedLogForModal(null)}
      />
    </div>
  );
}
