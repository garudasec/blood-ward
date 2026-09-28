import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import DonorLayout from "../../layouts/DonorLayout";
import { BloodGroupBadge, AvailabilityBadge, UrgencyBadge } from "../../components/app/Badges";
import { LoadingSkeleton, AppButton } from "../../components/app/UI";
import { getDonorStats, getDonorRequests } from "../../services/donorService";
import { useAuth } from "../../context/AuthContext";

// Mock data shown when API not yet connected
const MOCK_STATS = { bloodGroup: "O+", available: true, nearbyRequests: 3, activeResponses: 1, totalDonations: 2 };
const MOCK_REQUESTS = [
  { _id: "1", bloodGroup: "O+", units: 2, hospital: "City General Hospital", location: "Andheri, Mumbai", distance: 1.8, urgency: "emergency", requiredDate: new Date(Date.now()+86400000).toISOString(), status: "active" },
  { _id: "2", bloodGroup: "O+", units: 1, hospital: "Apollo Clinic",        location: "Bandra, Mumbai",  distance: 3.2, urgency: "high",      requiredDate: new Date(Date.now()+172800000).toISOString(), status: "active" },
  { _id: "3", bloodGroup: "O+", units: 3, hospital: "Lilavati Hospital",    location: "Khar, Mumbai",    distance: 4.5, urgency: "normal",    requiredDate: new Date(Date.now()+259200000).toISOString(), status: "active" },
];

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`stat-card ${accent ? "border-[#c0392b]/20" : ""}`} style={accent ? { background: "linear-gradient(135deg,rgba(192,57,43,.07) 0%,rgba(255,255,255,.02) 100%)" } : {}}>
      <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">{label}</p>
      <p className={`font-display font-bold text-3xl mb-1 ${accent ? "gradient-text" : "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-white/40">{sub}</p>}
    </div>
  );
}

export default function DonorDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([getDonorStats(), getDonorRequests({ limit: 3 })]);
      setStats(s?.stats || MOCK_STATS);
      setRequests(r?.requests || MOCK_REQUESTS);
    } catch {
      setStats(MOCK_STATS);
      setRequests(MOCK_REQUESTS);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const s = stats || MOCK_STATS;

  return (
    <DonorLayout>
      {/* Welcome */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="page-title">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {user?.name?.split(" ")[0] || "Donor"} 👋</h1>
          <p className="page-subtitle">Here's what's happening around you.</p>
        </div>
        <Link to="/donor/availability">
          <AvailabilityBadge available={s.available} />
        </Link>
      </div>

      {loading ? <LoadingSkeleton rows={2} /> : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Blood Group" value={<BloodGroupBadge group={s.bloodGroup || user?.bloodGroup || "—"} size="lg" />} accent />
            <StatCard label="Nearby Requests" value={s.nearbyRequests ?? "—"} sub="matching your group" />
            <StatCard label="Active Response" value={s.activeResponses ?? "—"} sub="awaiting action" />
            <StatCard label="Total Donations" value={s.totalDonations ?? "—"} sub="all time" />
          </div>

          {/* Quick action */}
          <div className="glass rounded-2xl p-5 border border-white/07 mb-8 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-white/80 mb-1">Your Availability Status</p>
              <p className="text-xs text-white/40">Only available donors appear in search results.</p>
            </div>
            <div className="flex items-center gap-3">
              <AvailabilityBadge available={s.available} />
              <Link to="/donor/availability">
                <AppButton size="sm" variant="secondary">Change</AppButton>
              </Link>
            </div>
          </div>

          {/* Nearby requests */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-white text-base">Nearby Blood Requests</h2>
              <Link to="/donor/requests" className="text-xs text-[#e74c3c] hover:text-[#c0392b] transition-colors">View all →</Link>
            </div>
            <div className="space-y-3">
              {(requests.length ? requests : MOCK_REQUESTS).map(req => (
                <div key={req._id} className={`request-card ${req.urgency === "emergency" ? "emergency" : ""}`}>
                  <div className="flex items-start gap-3">
                    <BloodGroupBadge group={req.bloodGroup} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-white/90">{req.hospital}</span>
                        <UrgencyBadge urgency={req.urgency} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/40">
                        <span>📍 {req.location}</span>
                        <span>· {req.distance} km away</span>
                        <span>· {req.units} unit{req.units > 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <Link to={`/donor/requests/${req._id}`}>
                      <AppButton size="sm" variant={req.urgency === "emergency" ? "primary" : "secondary"}>View</AppButton>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </DonorLayout>
  );
}
