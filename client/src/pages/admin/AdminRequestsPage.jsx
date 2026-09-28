import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { PageHeader, LoadingSkeleton, AppButton, ConfirmDialog, EmptyState } from '../../components/app/UI';
import { BloodGroupBadge, UrgencyBadge, StatusBadge } from '../../components/app/Badges';
import { getAdminRequests, updateRequestStatus, deleteRequest } from '../../services/adminService';
import { BLOOD_GROUPS, URGENCY_LEVELS, REQUEST_STATUSES } from '../../constants';

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, req: null });
  const [toast, setToast] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminRequests({ search, urgency: urgencyFilter, status: statusFilter });
      setRequests(res.requests || []);
    } catch {
      // service mock fallback
    } finally {
      setLoading(false);
    }
  }, [search, urgencyFilter, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleUpdateStatus = async (reqId, newStatus) => {
    setActionLoading(true);
    try {
      await updateRequestStatus(reqId, newStatus);
      setRequests(prev => prev.map(r => r._id === reqId ? { ...r, status: newStatus } : r));
      if (selectedRequest && selectedRequest._id === reqId) {
        setSelectedRequest(prev => ({ ...prev, status: newStatus }));
      }
      showToast("Request status updated to " + newStatus + ".");
    } catch (err) {
      showToast(err.message || 'Failed to update request status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRequest = async (req) => {
    setActionLoading(true);
    try {
      await deleteRequest(req._id);
      setRequests(prev => prev.filter(r => r._id !== req._id));
      showToast("Blood request " + req.requestId + " removed from platform.");
      if (selectedRequest?._id === req._id) setSelectedRequest(null);
    } catch (err) {
      showToast(err.message || 'Failed to remove request', 'error');
    } finally {
      setActionLoading(false);
      setDeleteConfirm({ open: false, req: null });
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Blood Request Controls"
        subtitle="Oversee and manage active emergency and standard blood requests across the system"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white/50 glass px-3 py-1.5 rounded-xl border border-white/08">
              Total Requests: {requests.length}
            </span>
          </div>
        }
      />

      {toast && (
        <div className={"mb-6 p-4 rounded-xl border text-sm flex items-center justify-between " + (
          toast.type === 'error' ? 'bg-red-500/15 border-red-500/30 text-red-300' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
        )}>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="text-white/40 hover:text-white">✕</button>
        </div>
      )}

      {/* Search & Filter bar */}
      <div className="glass p-4 rounded-2xl border border-white/08 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <input
            type="text"
            placeholder="Search by Request ID, hospital, or requester name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/04 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-red-500/50"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="px-3 py-2.5 bg-white/04 border border-white/10 rounded-xl text-xs text-white/80 focus:outline-none focus:border-red-500/50"
          >
            <option value="" className="bg-[#111116]">All Urgency Levels</option>
            {URGENCY_LEVELS.map(u => (
              <option key={u.id} value={u.id} className="bg-[#111116]">{u.label}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-white/04 border border-white/10 rounded-xl text-xs text-white/80 focus:outline-none focus:border-red-500/50"
          >
            <option value="" className="bg-[#111116]">All Statuses</option>
            {REQUEST_STATUSES.map(s => (
              <option key={s.id} value={s.id} className="bg-[#111116]">{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Requests Table */}
      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : requests.length === 0 ? (
        <EmptyState
          title="No Blood Requests Found"
          description="No blood request records match your search query or criteria."
          action={
            <AppButton size="sm" variant="secondary" onClick={() => { setSearch(''); setUrgencyFilter(''); setStatusFilter(''); }}>
              Reset Filters
            </AppButton>
          }
        />
      ) : (
        <div className="glass rounded-2xl border border-white/08 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/08 bg-white/02 text-[11px] font-bold text-white/40 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Request & Blood Group</th>
                  <th className="py-3.5 px-4">Requester</th>
                  <th className="py-3.5 px-4">Hospital / Location</th>
                  <th className="py-3.5 px-4">Urgency</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Required By</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/06 text-xs text-white/80">
                {requests.map(req => {
                  const isEmergency = req.urgency === 'emergency';
                  return (
                    <tr
                      key={req._id}
                      className={"hover:bg-white/03 transition-colors " + (
                        isEmergency ? 'bg-red-950/20 border-l-4 border-l-red-500' : ''
                      )}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <BloodGroupBadge group={req.bloodGroup} size="sm" />
                          <div>
                            <div className="font-mono font-bold text-white text-sm flex items-center gap-1.5">
                              {req.requestId}
                              {isEmergency && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/20 border border-red-500/40 px-1.5 py-0.2 rounded animate-pulse">
                                  CRITICAL
                                </span>
                              )}
                            </div>
                            <div className="text-white/40 text-[11px]">{req.units} Unit(s) Needed</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-white font-medium">{req.requesterName}</div>
                        <div className="text-white/40 text-[11px] capitalize">{req.requesterRole || 'recipient'}</div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-white/90 font-medium">{req.hospital}</div>
                        <div className="text-white/40 text-[11px]">📍 {req.location}</div>
                      </td>

                      <td className="py-4 px-4">
                        <UrgencyBadge urgency={req.urgency} />
                      </td>

                      <td className="py-4 px-4">
                        <StatusBadge status={req.status} />
                      </td>

                      <td className="py-4 px-4 text-white/40 font-mono text-[11px]">
                        {new Date(req.requiredDate).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-4 text-right space-x-2">
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/05 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          Details
                        </button>

                        {req.status === 'active' && (
                          <button
                            onClick={() => handleUpdateStatus(req._id, 'closed')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors"
                          >
                            Close
                          </button>
                        )}

                        <button
                          onClick={() => setDeleteConfirm({ open: true, req })}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedRequest(null)} />
          <div className="relative glass-strong rounded-2xl p-6 w-full max-w-lg border border-white/10 space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-white/08 pb-4">
              <div className="flex items-center gap-3">
                <BloodGroupBadge group={selectedRequest.bloodGroup} />
                <div>
                  <h2 className="font-mono font-bold text-white text-lg">{selectedRequest.requestId}</h2>
                  <p className="text-xs text-white/40">Created on {new Date(selectedRequest.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="text-white/40 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="glass p-3 rounded-xl border border-white/06">
                <span className="text-white/40 block mb-1">Urgency</span>
                <UrgencyBadge urgency={selectedRequest.urgency} />
              </div>
              <div className="glass p-3 rounded-xl border border-white/06">
                <span className="text-white/40 block mb-1">Status</span>
                <StatusBadge status={selectedRequest.status} />
              </div>
              <div className="glass p-3 rounded-xl border border-white/06">
                <span className="text-white/40 block mb-1">Units Required</span>
                <span className="font-bold text-white text-sm">{selectedRequest.units} Unit(s)</span>
              </div>
              <div className="glass p-3 rounded-xl border border-white/06">
                <span className="text-white/40 block mb-1">Requester</span>
                <span className="font-semibold text-white">{selectedRequest.requesterName}</span>
              </div>
            </div>

            <div className="glass p-3.5 rounded-xl border border-white/06 space-y-1 text-xs">
              <div className="text-white/40 font-semibold uppercase tracking-wider text-[10px]">Hospital & Location</div>
              <div className="text-white font-medium text-sm">{selectedRequest.hospital}</div>
              <div className="text-white/60">📍 {selectedRequest.location}</div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/08">
              <div className="flex items-center gap-2">
                {selectedRequest.status !== 'fulfilled' && (
                  <AppButton size="sm" variant="success" onClick={() => handleUpdateStatus(selectedRequest._id, 'fulfilled')} loading={actionLoading}>
                    Mark Fulfilled
                  </AppButton>
                )}
                {selectedRequest.status !== 'closed' && (
                  <AppButton size="sm" variant="secondary" onClick={() => handleUpdateStatus(selectedRequest._id, 'closed')} loading={actionLoading}>
                    Close Request
                  </AppButton>
                )}
              </div>
              <AppButton size="sm" variant="ghost" onClick={() => setSelectedRequest(null)}>
                Close Window
              </AppButton>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Remove Suspicious Blood Request"
        message={"Are you sure you want to remove request " + deleteConfirm.req?.requestId + "? This will notify the requester and cancel any pending donor matches."}
        confirmLabel="Remove Request"
        confirmVariant="danger"
        loading={actionLoading}
        onConfirm={() => handleDeleteRequest(deleteConfirm.req)}
        onCancel={() => setDeleteConfirm({ open: false, req: null })}
      />
    </AdminLayout>
  );
}
