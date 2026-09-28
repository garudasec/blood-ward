import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import RecipientLayout from "../../layouts/RecipientLayout";
import { PageHeader, LoadingSkeleton, AppButton, ConfirmDialog, EmptyState } from "../../components/app/UI";
import { BloodGroupBadge, UrgencyBadge, StatusBadge } from "../../components/app/Badges";
import { getMyRequests, cancelRequest } from "../../services/recipientService";

const MOCK_RECIPIENT_REQUESTS = [
  { _id: "my-1", requestId: "REQ-9401", bloodGroup: "O-", units: 2, hospital: "Lilavati Hospital", location: "Bandra, Mumbai", urgency: "emergency", requiredDate: "2026-09-29T18:00:00.000Z", status: "active", createdAt: "2026-09-28T19:30:00.000Z", responses: [{ donorName: "Ananya R.", status: "accepted", phone: "+91 98123 99887" }] },
  { _id: "my-2", requestId: "REQ-9210", bloodGroup: "O+", units: 1, hospital: "Nanavati Hospital", location: "Vile Parle, Mumbai", urgency: "normal", requiredDate: "2026-09-20T10:00:00.000Z", status: "fulfilled", createdAt: "2026-09-18T14:20:00.000Z", responses: [] }
];

export default function RecipientRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState({ open: false, req: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyRequests();
      setRequests(res.requests || MOCK_RECIPIENT_REQUESTS);
    } catch {
      setRequests(MOCK_RECIPIENT_REQUESTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleCancelRequest = async (req) => {
    setActionLoading(true);
    try {
      await cancelRequest(req._id);
      setRequests(prev => prev.map(r => r._id === req._id ? { ...r, status: "cancelled" } : r));
      setToast({ msg: "Blood request cancelled successfully.", type: "success" });
    } catch (err) {
      setToast({ msg: err.message || "Failed to cancel request.", type: "error" });
    } finally {
      setActionLoading(false);
      setCancelModal({ open: false, req: null });
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <RecipientLayout>
      <PageHeader
        title="My Blood Requests"
        subtitle="Track status and donor responses for your broadcast blood requirements"
        action={
          <Link to="/recipient/requests/new">
            <AppButton size="sm" variant="primary">
              + New Request
            </AppButton>
          </Link>
        }
      />

      {toast && (
        <div className={"mb-6 p-4 rounded-xl border text-sm flex items-center justify-between " + (
          toast.type === "error" ? "bg-red-500/15 border-red-500/30 text-red-300" : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
        )}>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="text-white/40 hover:text-white">✕</button>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton rows={3} />
      ) : requests.length === 0 ? (
        <EmptyState
          title="No Requests Created"
          description="You haven't created any blood requests yet."
          action={
            <Link to="/recipient/requests/new">
              <AppButton size="sm" variant="primary">Create Blood Request</AppButton>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req._id} className="glass rounded-2xl p-6 border border-white/08 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/08 pb-4">
                <div className="flex items-center gap-3">
                  <BloodGroupBadge group={req.bloodGroup} size="lg" />
                  <div>
                    <h3 className="font-mono font-bold text-white text-base">{req.requestId || "REQ-" + req._id}</h3>
                    <p className="text-xs text-white/40">Created {new Date(req.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <UrgencyBadge urgency={req.urgency} />
                  <StatusBadge status={req.status} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-white/40 block mb-1">Hospital</span>
                  <span className="font-semibold text-white">{req.hospital}</span>
                </div>
                <div>
                  <span className="text-white/40 block mb-1">Location</span>
                  <span className="text-white/80">📍 {req.location}</span>
                </div>
                <div>
                  <span className="text-white/40 block mb-1">Units & Deadline</span>
                  <span className="text-white/80 font-mono">{req.units} Unit(s) by {new Date(req.requiredDate).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Authorized Contact Information / Donor Responses */}
              {req.responses && req.responses.length > 0 && (
                <div className="glass p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/10 space-y-2">
                  <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Responding Donors ({req.responses.length}) — Contact Authorized
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {req.responses.map((resp, i) => (
                      <div key={i} className="flex items-center justify-between text-white/90">
                        <span className="font-medium">{resp.donorName}</span>
                        <span className="font-mono text-emerald-300 font-semibold">{resp.phone || "Contact shared in notifications"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {req.status === "active" && (
                <div className="flex justify-end pt-2">
                  <AppButton size="sm" variant="danger" onClick={() => setCancelModal({ open: true, req })}>
                    Cancel Request
                  </AppButton>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={cancelModal.open}
        title="Cancel Blood Request"
        message="Are you sure you want to cancel this request? Responding donors will be notified."
        confirmLabel="Cancel Request"
        confirmVariant="danger"
        loading={actionLoading}
        onConfirm={() => handleCancelRequest(cancelModal.req)}
        onCancel={() => setCancelModal({ open: false, req: null })}
      />
    </RecipientLayout>
  );
}
