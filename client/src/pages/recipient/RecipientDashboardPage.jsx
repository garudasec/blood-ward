import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import RecipientLayout from "../../layouts/RecipientLayout";
import { PageHeader, LoadingSkeleton, AppButton } from "../../components/app/UI";
import { BloodGroupBadge, UrgencyBadge, StatusBadge } from "../../components/app/Badges";
import { getRecipientStats, getMyRequests } from "../../services/recipientService";
import { useAuth } from "../../context/AuthContext";

const MOCK_RECIPIENT_STATS = { activeRequests: 1, totalRequests: 3, nearbyDonors: 14, donorResponses: 2 };
const MOCK_ACTIVE_REQUESTS = [
  { _id: "my-1", requestId: "REQ-9401", bloodGroup: "O-", units: 2, hospital: "Lilavati Hospital", location: "Bandra, Mumbai", distance: 1.8, urgency: "emergency", requiredDate: new Date(Date.now() + 86400000).toISOString(), status: "active", responses: [{ donorName: "Ananya R." }] }
];

function StatCard({ label, value, sub, highlight }) {
  return (
    <div className={"glass rounded-2xl p-5 border transition-all " + (highlight ? "border-red-500/30 bg-red-950/10" : "border-white/08")}>
      <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">{label}</p>
      <p className={"font-display font-bold text-3xl mb-1 " + (highlight ? "text-red-400" : "text-white")}>{value}</p>
      {sub && <p className="text-xs text-white/40">{sub}</p>}
    </div>
  );
}

export default function RecipientDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([getRecipientStats(), getMyRequests({ status: "active", limit: 3 })]);
      setStats(s?.stats || MOCK_RECIPIENT_STATS);
      setRequests(r?.requests || MOCK_ACTIVE_REQUESTS);
    } catch {
      setStats(MOCK_RECIPIENT_STATS);
      setRequests(MOCK_ACTIVE_REQUESTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const s = stats || MOCK_RECIPIENT_STATS;

  return (
    <RecipientLayout>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="page-title">Welcome, {user?.name?.split(" ")[0] || "Recipient"} 👋</h1>
          <p className="page-subtitle">Find donors and manage your emergency blood discovery requests.</p>
        </div>
        <Link to="/recipient/requests/new">
          <AppButton variant="primary" size="sm">
            + Request Blood
          </AppButton>
        </Link>
      </div>

      {loading ? (
        <LoadingSkeleton rows={2} />
      ) : (
        <div className="space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Active Requests" value={s.activeRequests ?? 0} sub="Pending fulfillment" highlight={s.activeRequests > 0} />
            <StatCard label="Nearby Donors" value={s.nearbyDonors ?? 0} sub="Available in radius" />
            <StatCard label="Donor Responses" value={s.donorResponses ?? 0} sub="Contact authorized" />
            <StatCard label="Total Requests" value={s.totalRequests ?? 0} sub="All time" />
          </div>

          {/* Action Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass p-6 rounded-2xl border border-white/08 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs font-bold text-red-400 uppercase tracking-widest block mb-1">Search & Discover</span>
                <h3 className="font-display font-semibold text-white text-lg">Location-Aware Donor Radar</h3>
                <p className="text-xs text-white/50 leading-relaxed">Search nearby donors by blood group and distance radius with full privacy protection.</p>
              </div>
              <Link to="/recipient/find-donors">
                <AppButton variant="primary" size="md" className="w-full">
                  🔍 Find Donors Nearby
                </AppButton>
              </Link>
            </div>

            <div className="glass p-6 rounded-2xl border border-white/08 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">Emergency Alert</span>
                <h3 className="font-display font-semibold text-white text-lg">Broadcast Blood Requirement</h3>
                <p className="text-xs text-white/50 leading-relaxed">Create a high-priority blood request to send instant notifications to matching donors.</p>
              </div>
              <Link to="/recipient/requests/new">
                <AppButton variant="secondary" size="md" className="w-full">
                  🚨 Broadcast Emergency Request
                </AppButton>
              </Link>
            </div>
          </div>

          {/* Active Requests List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-white text-base">Your Active Blood Requests</h2>
              <Link to="/recipient/requests" className="text-xs text-red-400 hover:text-red-300 transition-colors">
                View all requests →
              </Link>
            </div>

            {requests.length === 0 ? (
              <div className="glass rounded-2xl p-8 border border-white/08 text-center space-y-3">
                <p className="text-sm text-white/50">You have no active blood requests right now.</p>
                <Link to="/recipient/requests/new">
                  <AppButton size="sm" variant="primary">Create Blood Request</AppButton>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map(req => (
                  <div key={req._id} className="glass rounded-2xl p-5 border border-white/08 hover:border-white/15 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <BloodGroupBadge group={req.bloodGroup} size="lg" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white text-base">{req.hospital}</h3>
                          <UrgencyBadge urgency={req.urgency} />
                          <StatusBadge status={req.status} />
                        </div>
                        <div className="text-xs text-white/50 space-x-3">
                          <span>📍 {req.location}</span>
                          <span>· {req.units} Unit(s) needed</span>
                        </div>
                      </div>
                    </div>

                    <Link to="/recipient/requests">
                      <AppButton size="sm" variant="secondary">View Details</AppButton>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </RecipientLayout>
  );
}
