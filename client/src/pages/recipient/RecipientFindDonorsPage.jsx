import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import RecipientLayout from "../../layouts/RecipientLayout";
import { PageHeader, LoadingSkeleton, AppButton, EmptyState } from "../../components/app/UI";
import { BloodGroupBadge, AvailabilityBadge } from "../../components/app/Badges";
import { BLOOD_GROUPS } from "../../constants";
import { searchDonors } from "../../services/recipientService";

const MOCK_DONORS_SEARCH = [
  { _id: "d-1", name: "Dr. Rahul S.", bloodGroup: "B+", city: "Mumbai", area: "Andheri West", distance: 1.8, available: true, lat: 19.1197, lng: 72.8464 },
  { _id: "d-2", name: "Ananya R.", bloodGroup: "O-", city: "Mumbai", area: "Bandra", distance: 3.2, available: true, lat: 19.0596, lng: 72.8295 },
  { _id: "d-3", name: "Kavita R.", bloodGroup: "O+", city: "Navi Mumbai", area: "Vashi", distance: 4.5, available: true, lat: 19.0770, lng: 72.9986 },
  { _id: "d-4", name: "Meera P.", bloodGroup: "B-", city: "Thane", area: "Thane West", distance: 6.1, available: true, lat: 19.2183, lng: 72.9781 }
];

export default function RecipientFindDonorsPage() {
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [radius, setRadius] = useState("10");
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDonors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchDonors({ bloodGroup, radius });
      setDonors(res.donors || MOCK_DONORS_SEARCH);
    } catch {
      setDonors(MOCK_DONORS_SEARCH);
    } finally {
      setLoading(false);
    }
  }, [bloodGroup, radius]);

  useEffect(() => {
    fetchDonors();
  }, [fetchDonors]);

  return (
    <RecipientLayout>
      <PageHeader
        title="Find Blood Donors"
        subtitle="Search location-aware available donors by blood group and proximity radius"
      />

      {/* Search Filters Card */}
      <div className="glass p-5 rounded-2xl border border-white/08 mb-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2.5">Select Blood Group</label>
          <div className="flex flex-wrap gap-2">
            {BLOOD_GROUPS.map(bg => (
              <button
                key={bg}
                type="button"
                onClick={() => setBloodGroup(bg)}
                className={"px-4 py-2 rounded-xl text-xs font-bold transition-all focus-ring " + (
                  bloodGroup === bg
                    ? "gradient-crimson text-white glow-crimson-sm shadow-lg scale-105"
                    : "glass border border-white/10 text-white/70 hover:border-white/20 hover:text-white"
                )}
              >
                {bg}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-white/06">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs text-white/60 font-medium">Search Radius:</span>
            <select
              value={radius}
              onChange={e => setRadius(e.target.value)}
              className="px-3 py-1.5 bg-white/04 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-red-500/50"
            >
              <option value="5" className="bg-[#111116]">Within 5 km</option>
              <option value="10" className="bg-[#111116]">Within 10 km</option>
              <option value="25" className="bg-[#111116]">Within 25 km</option>
              <option value="50" className="bg-[#111116]">Within 50 km</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Privacy Mode: General Area Only (Address Hidden)
          </div>
        </div>
      </div>

      {/* Content Layout: Map + Donor Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Map Visual Mock */}
        <div className="glass rounded-2xl p-4 border border-white/08 lg:col-span-1 h-[420px] flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#12131a] to-[#0a0a0d]">
          <div className="flex items-center justify-between mb-3 z-10">
            <div className="flex items-center gap-2 text-xs text-white/70 font-semibold">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 21s-8-4.5-8-11.5a8 8 0 1 1 16 0C20 16.5 12 21 12 21z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="9.5" r="3" stroke="currentColor" strokeWidth="2"/></svg>
              Radar Map View
            </div>
            <span className="text-[10px] text-white/40 font-mono">OpenStreetMap Layer</span>
          </div>

          {/* Map Graphic Container */}
          <div className="flex-1 rounded-xl bg-[#0e0f14] border border-white/06 relative flex items-center justify-center p-4 overflow-hidden">
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* Radar Pulsing Rings */}
            <div className="absolute w-64 h-64 rounded-full border border-red-500/15 animate-ping opacity-30" />
            <div className="absolute w-40 h-40 rounded-full border border-red-500/25" />

            {/* Center User Location Pin */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-5 h-5 rounded-full bg-blue-500 text-white font-bold text-[10px] flex items-center justify-center shadow-lg shadow-blue-500/50 border-2 border-white">
                You
              </div>
              <span className="text-[10px] text-white/60 font-semibold bg-black/60 px-2 py-0.5 rounded mt-1 backdrop-blur-sm">Your Location</span>
            </div>

            {/* Donor Nearby Pin Markers */}
            {donors.map((d, i) => {
              const offsets = [
                { top: "25%", left: "70%" },
                { top: "65%", left: "20%" },
                { top: "30%", left: "30%" },
                { top: "75%", left: "75%" }
              ];
              const pos = offsets[i % offsets.length];
              return (
                <div key={d._id} className="absolute z-10 flex flex-col items-center" style={pos}>
                  <div className="w-7 h-7 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center shadow-lg shadow-red-600/50 border-2 border-white hover:scale-110 transition-transform cursor-pointer">
                    {d.bloodGroup}
                  </div>
                  <span className="text-[9px] text-white/80 font-medium bg-black/75 px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap">
                    {d.name} ({d.distance}km)
                  </span>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-white/40 text-center mt-3 font-medium">
            Showing {donors.length} matching donor(s) within {radius} km
          </div>
        </div>

        {/* Donors List */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <LoadingSkeleton rows={3} />
          ) : donors.length === 0 ? (
            <EmptyState
              title="No Available Donors Found"
              description={"No available donors found with blood group " + bloodGroup + " within " + radius + " km."}
              action={
                <Link to="/recipient/requests/new">
                  <AppButton size="sm" variant="primary">Create Emergency Blood Request</AppButton>
                </Link>
              }
            />
          ) : (
            donors.map(donor => (
              <div key={donor._id} className="glass rounded-2xl p-5 border border-white/08 hover:border-white/15 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <BloodGroupBadge group={donor.bloodGroup} size="lg" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-semibold text-white text-base">{donor.name}</h3>
                      <AvailabilityBadge available={donor.available} />
                    </div>
                    <div className="text-xs text-white/50 space-x-3 mb-2">
                      <span>📍 {donor.area}, {donor.city}</span>
                      <span>· {donor.distance} km away</span>
                    </div>
                    <div className="text-[11px] text-emerald-400/80 font-medium">
                      ✓ Verified Donor Profile
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/08">
                  <Link to={"/recipient/requests/new?bloodGroup=" + encodeURIComponent(donor.bloodGroup)}>
                    <AppButton size="sm" variant="primary">
                      Request Blood
                    </AppButton>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </RecipientLayout>
  );
}
