import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  ShieldAlert,
  Ban,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Inbox,
  AlertTriangle,
  Eye,
  X,
  Building2,
  Calendar,
} from 'lucide-react';
import BloodGroupBadge from '../../components/common/BloodGroupBadge';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import AdminRequestDetailModal from '../../components/admin/AdminRequestDetailModal';
import { REQUEST_STATUS } from '../../constants/theme';
import { adminService } from '../../services/adminService';

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRequestForDetail, setSelectedRequestForDetail] = useState(null);
  const [targetForCancel, setTargetForCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (urgencyFilter !== 'ALL') params.urgency = urgencyFilter;
      if (searchQuery.trim()) params.city = searchQuery.trim();
      const res = await adminService.getRequests(params);
      if (res && res.requests) {
        setRequests(res.requests);
      }
    } catch (err) {
      console.error('Failed to fetch admin requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, urgencyFilter, searchQuery]);

  const handleConfirmCancel = async () => {
    if (!targetForCancel) return;
    setIsCancelling(true);
    try {
      await adminService.cancelRequest(targetForCancel.id);
      setFeedback(`Blood Request #${targetForCancel.id} cancelled by Admin and logged in security audit trail.`);
      setTargetForCancel(null);
      fetchRequests();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err) {
      alert(err.message || 'Cancellation failed.');
    } finally {
      setIsCancelling(false);
    }
  };

  const filtered = requests;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-theme-card p-6 sm:p-8 rounded-3xl border border-theme shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-theme-primary tracking-tight">
              System Blood Requests Overview
            </h1>
          </div>
          <p className="text-xs text-theme-secondary">
            Inspect active and historical emergency blood requests platform-wide
          </p>
        </div>

        <button
          onClick={fetchRequests}
          className="p-2.5 rounded-xl bg-theme-subtle hover:bg-theme-surface text-theme-secondary hover:text-theme-primary transition-colors"
          title="Refresh requests"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between shadow-xs">
          <span className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            {feedback}
          </span>
          <button onClick={() => setFeedback('')} className="text-amber-700 hover:text-amber-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-theme-card p-4 sm:p-6 rounded-3xl border border-theme shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-theme-muted absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Filter by city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-theme bg-theme-surface text-theme-primary pl-9 pr-3 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-theme-surface px-3 py-2 rounded-xl border border-theme text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Urgency:</span>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="font-bold text-theme-primary bg-transparent outline-none cursor-pointer w-full"
            >
              <option className="bg-theme-card text-theme-primary" value="ALL">All Urgencies</option>
              <option className="bg-theme-card text-theme-primary" value="Emergency">Emergency</option>
              <option className="bg-theme-card text-theme-primary" value="High">High</option>
              <option className="bg-theme-card text-theme-primary" value="Normal">Normal</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-theme-surface px-3 py-2 rounded-xl border border-theme text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="font-bold text-theme-primary bg-transparent outline-none cursor-pointer w-full"
            >
              <option className="bg-theme-card text-theme-primary" value="ALL">All Statuses</option>
              <option className="bg-theme-card text-theme-primary" value="Active">Active</option>
              <option className="bg-theme-card text-theme-primary" value="Donor Accepted">Donor Accepted</option>
              <option className="bg-theme-card text-theme-primary" value="In Progress">In Progress</option>
              <option className="bg-theme-card text-theme-primary" value="Fulfilled">Fulfilled</option>
              <option className="bg-theme-card text-theme-primary" value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      {filtered.length === 0 ? (
        <div className="bg-theme-card p-12 rounded-3xl border border-theme text-center space-y-3">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-theme-primary text-base">No blood requests found</h3>
          <p className="text-xs text-theme-secondary max-w-md mx-auto">
            No requests match your selected admin filters.
          </p>
        </div>
      ) : (
        <div className="bg-theme-card rounded-3xl border border-theme shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-theme-table-header border-b border-theme text-[11px] font-bold uppercase tracking-wider text-theme-secondary">
                  <th className="py-3.5 px-6">Ref & Recipient</th>
                  <th className="py-3.5 px-6">Group / Units</th>
                  <th className="py-3.5 px-6">Facility & Location</th>
                  <th className="py-3.5 px-6">Urgency & Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme text-xs text-theme-secondary">
                {filtered.map((req) => (
                  <tr key={req.id} className="hover:bg-theme-surface/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-mono font-bold text-slate-500 text-[11px]">#{req.id?.slice(-6) || req.id}</div>
                      <div className="font-bold text-theme-primary pt-0.5">{req.recipientName || "Recipient"}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <BloodGroupBadge group={req.bloodGroup} size="sm" />
                        <span className="font-bold text-theme-secondary">{req.unitsNeeded} Unit(s)</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-theme-primary">{req.hospitalName}</div>
                      <div className="text-[11px] text-theme-muted">{req.city}</div>
                    </td>
                    <td className="py-4 px-6 space-y-1">
                      <StatusBadge status={req.status} urgency={req.urgency} />
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => setSelectedRequestForDetail(req)}
                        className="p-1.5 rounded-lg text-theme-secondary hover:bg-theme-surface transition-colors inline-flex items-center"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {!["Fulfilled", "Cancelled", "Expired"].includes(req.status) && (
                        <button
                          onClick={() => setTargetForCancel(req)}
                          className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <AdminRequestDetailModal
        request={selectedRequestForDetail}
        isOpen={!!selectedRequestForDetail}
        onClose={() => setSelectedRequestForDetail(null)}
      />

      <ConfirmDialog
        isOpen={!!targetForCancel}
        title="Administrative Request Cancellation"
        message={`Are you sure you want to cancel blood request #${targetForCancel?.id} at ${targetForCancel?.hospitalName}?`}
        confirmText="Cancel Request"
        isLoading={isCancelling}
        onConfirm={handleConfirmCancel}
        onClose={() => setTargetForCancel(null)}
      />
    </div>
  );
}
