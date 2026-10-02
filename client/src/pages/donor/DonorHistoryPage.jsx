import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  History,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  Clock,
  Inbox,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import BloodGroupBadge from '../../components/common/BloodGroupBadge';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';

export default function DonorHistoryPage() {
  const { user } = useAuth();
  const [historyItems, setHistoryItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredHistory = historyItems.filter((item) => {
    const matchesSearch =
      item.hospitalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    total: historyItems.length,
    completed: historyItems.filter((i) => i.status === 'Completed').length,
    accepted: historyItems.filter((i) => i.status === 'Accepted').length,
    declined: historyItems.filter((i) => i.status === 'Declined').length,
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-900 text-white">
              <History className="w-5 h-5 text-red-500" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Donation History & Activity Log
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Track your past responses, completed blood donations, and request interactions
          </p>
        </div>

        {/* Quick Metrics */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            {counts.completed} Completed
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
            {counts.accepted} Active
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
            {counts.total} Total Logged
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search reference # or hospital..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer w-full"
            >
              <option value="ALL">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Accepted">Accepted</option>
              <option value="Declined">Declined</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {(searchQuery || statusFilter !== 'ALL') && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-slate-500">
              Showing {filteredHistory.length} matching history entries
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="text-red-600 font-semibold hover:underline"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* History List Table / Cards */}
      {filteredHistory.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-slate-800 text-base">No history logs found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No donation history matches your current search or status filter.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Reference ID</th>
                  <th className="py-3.5 px-6">Hospital & Location</th>
                  <th className="py-3.5 px-6">Blood Info</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Notes / Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      #{item.id}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{item.hospitalName}</div>
                      <div className="text-[11px] text-slate-500">{item.city}</div>
                    </td>
                    <td className="py-4 px-6 space-y-1">
                      <BloodGroupBadge group={item.bloodGroup} size="sm" />
                      <div className="text-[11px] text-slate-500">{item.unitsNeeded} Unit(s)</div>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-600">
                      {item.responseDate}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={item.status} urgency={item.urgency} />
                    </td>
                    <td className="py-4 px-6 text-slate-500 max-w-xs text-[11px]">
                      {item.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredHistory.map((item) => (
              <div key={item.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    #{item.id}
                  </span>
                  <StatusBadge status={item.status} urgency={item.urgency} />
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">{item.hospitalName}</h4>
                  <p className="text-xs text-slate-500">{item.city}</p>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    <BloodGroupBadge group={item.bloodGroup} size="sm" />
                    <span className="text-slate-600 font-medium">{item.unitsNeeded} Unit(s)</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">{item.responseDate}</span>
                </div>

                {item.notes && (
                  <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                    "{item.notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}