import { useState, useEffect, useCallback } from "react";
import DonorLayout from "../../layouts/DonorLayout";
import { PageHeader, LoadingSkeleton, AppButton, EmptyState } from "../../components/app/UI";
import { BloodGroupBadge, UrgencyBadge, StatusBadge } from "../../components/app/Badges";
import { getDonorRequests, respondToRequest } from "../../services/donorService";

const MOCK_DONOR_REQUESTS = [
  { _id: "req-1", bloodGroup: "O+", units: 2, hospital: "City General Hospital", location: "Andheri West, Mumbai", distance: 1.8, urgency: "emergency", requiredDate: "2026-09-29T18:00:00.000Z", status: "active", requesterName: "Priya N.", notes: "Urgent surgery scheduled" },
  { _id: "req-2", bloodGroup: "O+", units: 1, hospital: "Apollo Clinic", location: "Bandra, Mumbai", distance: 3.2, urgency: "high", requiredDate: "2026-09-30T10:00:00.000Z", status: "active", requesterName: "Amit S.", notes: "Dengue platelet count dropped" },
  { _id: "req-3", bloodGroup: "O+", units: 3, hospital: "Lilavati Hospital", location: "Khar, Mumbai", distance: 4.5, urgency: "normal", requiredDate: "2026-10-01T12:00:00.000Z", status: "donor_accepted", requesterName: "Rahul M.", notes: "Scheduled procedure" }
];

export default function DonorRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDonorRequests();
      setRequests(res.requests || MOCK_DONOR_REQUESTS);
    } catch {
      setRequests(MOCK_DONOR_REQUESTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleRespond = async (reqId, action) => {
    setActionLoading(true);
    try {
      await respondToRequest(reqId, action);
      setRequests(prev => prev.map(r => r._id === reqId ? { ...r, status: action === "accept" ? "donor_accepted" : "declined" } : r));
      setToast({ msg: "Response recorded successfully.", type: "success" });
    } catch (err) {
      setToast({ msg: err.message || "Failed to respond", type: "error" });
    } finally {
      setActionLoading(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <DonorLayout>
      <PageHeader
        title="Blood Donation Requests"
        subtitle="Active emergency and medical blood requests matching your blood type"
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
          title="No Matching Requests"
          description="There are currently no active blood requests in your area matching your blood type."
        />
      ) : (
        <div className="space-y-4">
          {requests.map(req => {
            const isEmergency = req.urgency === "emergency";
            return (
              <div key={req._id} className={"glass rounded-2xl p-6 border transition-all " + (
                isEmergency ? "border-red-500/40 bg-gradient-to-r from-red-950/20 to-transparent shadow-lg shadow-red-950/20" : "border-white/08 hover:border-white/15"
              )}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <BloodGroupBadge group={req.bloodGroup} size="lg" />
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-semibold text-white text-base">{req.hospital}</h3>
                        <UrgencyBadge urgency={req.urgency} />
                        <StatusBadge status={req.status} />
                      </div>
                      <div className="text-xs text-white/50 space-x-3">
                        <span>📍 {req.location}</span>
                        <span>· {req.distance} km away</span>
                        <span>· {req.units} Unit(s) needed</span>
                      </div>
                      {req.notes && <p className="text-xs text-white/40 italic">"{req.notes}"</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-white/08">
                    {req.status === "active" && (
                      <>
                        <AppButton size="sm" variant="primary" onClick={() => handleRespond(req._id, "accept")} loading={actionLoading}>
                          Accept Request
                        </AppButton>
                        <AppButton size="sm" variant="secondary" onClick={() => handleRespond(req._id, "decline")} loading={actionLoading}>
                          Decline
                        </AppButton>
                      </>
                    )}
                    {req.status === "donor_accepted" && (
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                        ✓ Request Accepted — Coordinator Notified
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DonorLayout>
  );
}
