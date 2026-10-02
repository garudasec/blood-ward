import React, { useState } from 'react';
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
} from 'lucide-react';
import Button from '../../components/common/Button';
import AdminAuditDetailModal from '../../components/admin/AdminAuditDetailModal';
import { MOCK_AUDIT_LOGS_FULL } from '../../constants/mockData';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState(MOCK_AUDIT_LOGS_FULL);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedLogForModal, setSelectedLogForModal] = useState(null);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.includes(searchQuery);
    const matchesCategory = categoryFilter === 'ALL' || log.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-950 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
              <Activity className="w-5 h-5 fill-current" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Security & Platform Audit Logs
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Immutable security event logging, administrative actions, and user authentication trail
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-emerald-400 font-mono flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" /> Audit Collection Immutable
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search actor, action, target, IP address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer w-full"
            >
              <option value="ALL">All Categories</option>
              <option value="SECURITY">Security Critical</option>
              <option value="USER_MGMT">User Management</option>
              <option value="REQUEST_MGMT">Request Oversight</option>
              <option value="SYSTEM">System Audits</option>
            </select>
          </div>
        </div>

        {(searchQuery || categoryFilter !== 'ALL') && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-slate-500">
              Showing {filteredLogs.length} matching audit logs
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('ALL');
              }}
              className="text-amber-600 font-bold hover:underline"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Audit Log Table / Cards */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-slate-800 text-base">No audit entries found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No security audit entries match your current search query or category filter.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Timestamp</th>
                  <th className="py-3.5 px-6">Action & Category</th>
                  <th className="py-3.5 px-6">Actor</th>
                  <th className="py-3.5 px-6">Target Entity</th>
                  <th className="py-3.5 px-6">IP Address</th>
                  <th className="py-3.5 px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      log.severity === 'HIGH' ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    <td className="py-4 px-6 font-mono text-slate-600 font-medium whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{log.action}</div>
                      <span className="inline-block text-[10px] font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase mt-0.5">
                        {log.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-800 max-w-xs truncate">
                      {log.actor}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900 max-w-xs truncate">
                      {log.target}
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-500">
                      {log.ipAddress}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedLogForModal(log)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors inline-flex items-center gap-1 font-bold text-xs"
                      >
                        <Eye className="w-4 h-4 text-slate-500" /> Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Fallback */}
          <div className="lg:hidden divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-500">{log.timestamp}</span>
                  <span className="text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                    {log.category}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-900 text-sm">{log.action}</h4>
                  <p className="text-xs text-slate-600">Actor: {log.actor}</p>
                  <p className="text-xs text-slate-600">Target: {log.target}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="font-mono text-slate-400">{log.ipAddress}</span>
                  <button
                    onClick={() => setSelectedLogForModal(log)}
                    className="font-bold text-amber-600 hover:underline"
                  >
                    Inspect Audit Log
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {filteredLogs.length} of {logs.length} security audit events</span>
            <div className="flex items-center gap-2">
              <button disabled className="px-3 py-1 rounded bg-slate-200 text-slate-400 font-semibold cursor-not-allowed">
                Prev
              </button>
              <button disabled className="px-3 py-1 rounded bg-slate-200 text-slate-400 font-semibold cursor-not-allowed">
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Detail Modal */}
      <AdminAuditDetailModal
        log={selectedLogForModal}
        isOpen={!!selectedLogForModal}
        onClose={() => setSelectedLogForModal(null)}
      />
    </div>
  );
}