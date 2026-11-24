import React, { useState, useEffect } from 'react';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Inbox,
  Eye,
  Download,
} from 'lucide-react';
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

  const handleExportCSV = () => {
    if (!filteredLogs || filteredLogs.length === 0) return;

    // Sanitize string to prevent CSV formula injection (=, +, -, @)
    const sanitizeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      if (['=', '+', '-', '@'].includes(str.charAt(0))) {
        str = `'${str}`;
      }
      return `"${str}"`;
    };

    const headers = ['Timestamp', 'Action', 'Category', 'Severity', 'Actor Name', 'Actor Email', 'Target', 'IP Address', 'Details'];
    const rows = filteredLogs.map((log) => [
      sanitizeCSV(new Date(log.createdAt).toISOString()),
      sanitizeCSV(log.action),
      sanitizeCSV(log.category),
      sanitizeCSV(log.severity),
      sanitizeCSV(log.actorName || log.actor?.fullName || 'System'),
      sanitizeCSV(log.actor?.email || 'N/A'),
      sanitizeCSV(log.target || 'N/A'),
      sanitizeCSV(log.ipAddress || 'N/A'),
      sanitizeCSV(log.details || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bloodward-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold">
              <Activity className="w-5 h-5 fill-current" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Security & Platform Audit Logs
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Immutable security event logging, administrative actions, and user authentication trail
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export filtered logs as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchLogs}
            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer shadow-xs"
            title="Refresh audit logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5 transition-colors">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search action, actor, target, IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 pl-9 pr-3 py-2 outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:focus:border-zinc-200 dark:focus:ring-zinc-200"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Event Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="font-medium text-slate-800 dark:text-slate-200 bg-transparent outline-none cursor-pointer w-full text-xs"
            >
              <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="ALL">All Categories</option>
              <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="AUTH">AUTH</option>
              <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="ADMIN_ACTION">ADMIN_ACTION</option>
              <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="DONOR_ACTION">DONOR_ACTION</option>
              <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="RECIPIENT_ACTION">RECIPIENT_ACTION</option>
              <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="REQUEST_MGMT">REQUEST_MGMT</option>
              <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="SECURITY">SECURITY</option>
              <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200" value="SYSTEM">SYSTEM</option>
            </select>
          </div>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-xs">
          <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-slate-900 dark:text-white text-base">No audit logs recorded</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No system audit logs match your search criteria.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-5">Timestamp & Event Action</th>
                  <th className="py-3 px-5">Category & Severity</th>
                  <th className="py-3 px-5">Initiator (Actor)</th>
                  <th className="py-3 px-5">Target & IP</th>
                  <th className="py-3 px-5 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-600 dark:text-slate-300">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-900 dark:text-white">{log.action}</div>
                      <div className="text-[11px] text-slate-400 pt-0.5">{new Date(log.createdAt).toLocaleString()}</div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {log.category}
                      </span>
                      <span
                        className={`ml-2 px-2 py-0.5 rounded text-[10px] font-medium border ${
                          log.severity === "HIGH"
                            ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-900 dark:text-white">{log.actorName || log.actor?.fullName || "System"}</div>
                      <div className="text-[11px] text-slate-400">{log.actor?.email || "N/A"}</div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{log.target || "N/A"}</div>
                      <div className="text-[11px] text-slate-400 font-mono">IP: {log.ipAddress || "N/A"}</div>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => setSelectedLogForModal(log)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center cursor-pointer"
                        title="Inspect Event Log"
                      >
                        <Eye className="w-3.5 h-3.5" />
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
