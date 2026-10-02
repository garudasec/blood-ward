import React, { useState } from 'react';
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

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRequestForDetail, setSelectedRequestForDetail] = useState(null);
  const [targetForCancel, setTargetForCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleConfirmCancel = () => {
    if (!targetForCancel) return;
    setIsCancelling(true);
    setTimeout(() => {
      setRequests((prev) =>
        prev.map((r) => (r.id === targetForCancel.id ? { ...r, status: REQUEST_STATUS.CANCELLED } : r))
      );
      setIsCancelling(false);
      setFeedback(`Blood Request #${targetForCancel.id} at ${targetForCancel.hospitalName} was cancelled by Admin and logged in security audit trail.`);
      setTargetForCancel(null);
      setTimeout(() => setFeedback(''), 4000);
    }, 400);
  };

  const filtered = requests.filter((req) => {
    const matchesSearch =
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.hospitalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUrgency = urgencyFilter === 'ALL' || req.urgency === urgencyFilter;
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    return matchesSearch && matchesUrgency && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
              <FileText className="w-5 h-5 fill-current" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Manage Blood Requests
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Monitor active blood broadcasts, review request legitimacy, and manage suspicious entries
          </p>
        </div>
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

      {/* Filter Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search REF #, recipient, hospital..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Urgency:</span>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer w-full"
            >
              <option value="ALL">All Urgencies</option>
              <option value="Emergency">Emergency</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer w-full"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Donor Accepted">Donor Accepted</option>
              <option value="Fulfilled">Fulfilled</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {(searchQuery || urgencyFilter !== 'ALL' || statusFilter !== 'ALL') && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-slate-500">
              Showing {filtered.length} matching blood requests
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setUrgencyFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="text-amber-600 font-bold hover:underline"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Table / Card View */}
      {filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-slate-800 text-base">No blood requests found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No blood requests match your selected search terms or status filters.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">REF #</th>
                  <th className="py-3.5 px-6">Recipient</th>
                  <th className="py-3.5 px-6">Hospital Facility</th>
                  <th className="py-3.5 px-6">Blood Group</th>
                  <th className="py-3.5 px-6">Urgency</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filtered.map((req) => (
                  <tr
                    key={req.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      req.urgency === 'Emergency' ? 'bg-red-50/20' : ''
                    }`}
                  >
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      #{req.id}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900">
                      {req.recipientName}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{req.hospitalName}</div>
                      <div className="text-[11px] text-slate-500">{req.city}</div>
                    </td>
                    <td className="py-4 px-6">
                      <BloodGroupBadge group={req.bloodGroup} size="sm" />
                      <span className="text-[11px] text-slate-500 block font-semibold pt-0.5">
                        {req.unitsNeeded} Unit(s)
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={req.status} urgency={req.urgency} />
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {req.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => setSelectedRequestForDetail(req)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors inline-flex items-center"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {req.status !== REQUEST_STATUS.CANCELLED && (
                        <button
                          onClick={() => setTargetForCancel(req)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 transition-colors"
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

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-slate-100">
            {filtered.map((req) => (
              <div key={req.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-900">
                    #{req.id}
                  </span>
                  <StatusBadge status={req.status} urgency={req.urgency} />
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{req.hospitalName}</h4>
                  <p className="text-xs text-slate-500">Recipient: {req.recipientName} • {req.city}</p>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <BloodGroupBadge group={req.bloodGroup} size="sm" />
                    <span className="font-semibold text-slate-700">{req.unitsNeeded} Unit(s)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedRequestForDetail(req)}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      View
                    </button>
                    {req.status !== REQUEST_STATUS.CANCELLED && (
                      <button
                        onClick={() => setTargetForCancel(req)}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {filtered.length} of {requests.length} blood requests</span>
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

      {/* Detail Modal */}
      <AdminRequestDetailModal
        request={selectedRequestForDetail}
        isOpen={!!selectedRequestForDetail}
        onClose={() => setSelectedRequestForDetail(null)}
        onCancelRequest={(r) => setTargetForCancel(r)}
      />

      {/* Cancellation Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!targetForCancel}
        title="Cancel & Flag Blood Request"
        message={`Are you sure you want to cancel Blood Request #${targetForCancel?.id} at "${targetForCancel?.hospitalName}"?`}
        confirmText="Cancel & Flag Request"
        isLoading={isCancelling}
        onConfirm={handleConfirmCancel}
        onClose={() => setTargetForCancel(null)}
      />
    </div>
  );
}