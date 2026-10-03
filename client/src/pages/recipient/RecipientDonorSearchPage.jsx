import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Search,
  Filter,
  MapPin,
  RefreshCw,
  Inbox,
  ArrowUpDown,
  CheckCircle2,
  ShieldCheck,
  Map as MapIcon,
  LayoutGrid,
  AlertCircle,
} from "lucide-react";
import BloodGroupBadge from "../../components/common/BloodGroupBadge";
import Button from "../../components/common/Button";
import RecipientDonorCard from "../../components/recipient/RecipientDonorCard";
import RecipientDonorDetailModal from "../../components/recipient/RecipientDonorDetailModal";
import DonorSearchMap from "../../components/maps/DonorSearchMap";
import { BLOOD_GROUPS } from "../../constants/theme";
import { getCityCoordinates } from "../../constants/indiaLocations";
import api from "../../services/api";

export default function RecipientDonorSearchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [donors, setDonors] = useState([]);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [distanceRadius, setDistanceRadius] = useState(20);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [sortBy, setSortBy] = useState("NEAREST");
  const [viewMode, setViewMode] = useState("GRID");
  const [selectedDonorForModal, setSelectedDonorForModal] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const recipientLocation = getCityCoordinates(user?.state, user?.city);
  const hasProfileLocation = !!(user?.city && recipientLocation);

  const fetchDonors = async () => {
    if (distanceRadius !== "any" && !hasProfileLocation) {
      setDonors([]);
      setSearchError(null);
      return;
    }

    setIsLoading(true);
    setSearchError(null);

    try {
      const params = {};
      if (selectedBloodGroup !== "ALL") params.bloodGroup = selectedBloodGroup;

      if (distanceRadius === "any") {
        params.radius = "any";
      } else {
        params.radius = distanceRadius;
        params.latitude = recipientLocation.lat;
        params.longitude = recipientLocation.lng;
      }

      if (sortBy === "NEAREST") params.sort = "nearest";
      if (sortBy === "FARTHEST") params.sort = "farthest";
      if (sortBy === "RECENT") params.sort = "recently_active";

      const res = await api.get("/donors/search", { params });
      if (res && res.data && Array.isArray(res.data.donors)) {
        const mapped = res.data.donors.map((d) => {
          const donorCoords = getCityCoordinates(d.state, d.city);
          return {
            id: d.id || d._id,
            name: d.fullName,
            fullName: d.fullName,
            bloodGroup: d.bloodGroup,
            city: d.city || "",
            state: d.state || "",
            distanceKm: d.distanceKm,
            isAvailable: d.availability === "available",
            availability: d.availability,
            lastActiveAt: d.lastActiveAt,
            lat: donorCoords ? donorCoords.lat : null,
            lng: donorCoords ? donorCoords.lng : null,
          };
        });
        setDonors(mapped);
      }
    } catch (err) {
      console.error("Donor search API failed:", err);
      const message = err.response?.data?.message || err.message || "Search request failed. Please try again.";
      setSearchError(message);
      setDonors([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, [selectedBloodGroup, distanceRadius, sortBy, user?.state, user?.city]);

  const handleReset = () => {
    setSelectedBloodGroup("ALL");
    setSearchQuery("");
    setDistanceRadius(20);
    setAvailableOnly(true);
    setSortBy("NEAREST");
    setSearchError(null);
  };

  const handleRefresh = () => {
    fetchDonors();
  };

  const filteredDonors = donors.filter((d) => {
    if (availableOnly && !d.isAvailable) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = d.name?.toLowerCase().includes(q);
      const matchCity = d.city?.toLowerCase().includes(q);
      if (!matchName && !matchCity) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-theme-card p-6 sm:p-8 rounded-3xl border border-theme shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-theme-primary tracking-tight flex items-center gap-2">
            <Search className="w-7 h-7 text-blue-500" /> Find Nearby Blood Donors
          </h1>
          <p className="text-xs text-theme-muted">
            Search voluntary blood donors by blood group, radius distance, and active availability
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="bg-theme-subtle p-1 rounded-xl flex items-center border border-theme">
            <button
              onClick={() => setViewMode("GRID")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === "GRID"
                  ? "bg-theme-card text-theme-primary shadow-xs"
                  : "text-theme-muted hover:text-theme-primary"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Grid View
            </button>
            <button
              onClick={() => setViewMode("MAP")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === "MAP"
                  ? "bg-theme-card text-theme-primary shadow-xs"
                  : "text-theme-muted hover:text-theme-primary"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" /> Map View
            </button>
          </div>

          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl bg-theme-card border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle cursor-pointer"
            title="Refresh search"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* SEARCH CONTROL BAR */}
      <div className="bg-theme-card p-4 sm:p-6 rounded-3xl border border-theme shadow-sm space-y-4">
        {/* Blood Group Filter Chips */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-theme-secondary uppercase tracking-wider block">
            Select Blood Group Filter:
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedBloodGroup("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                selectedBloodGroup === "ALL"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-theme-subtle text-theme-secondary hover:bg-theme-hover border border-theme"
              }`}
            >
              All Blood Groups
            </button>
            {BLOOD_GROUPS.map((bg) => (
              <button
                key={bg}
                onClick={() => setSelectedBloodGroup(bg)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  selectedBloodGroup === bg
                    ? "bg-red-600 text-white shadow-md"
                    : "bg-theme-subtle text-theme-secondary hover:bg-theme-hover border border-theme"
                }`}
              >
                🩸 {bg}
              </button>
            ))}
          </div>
        </div>

        {/* Input Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-theme-muted absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Filter by name or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-theme-input bg-theme-input text-theme-input placeholder-theme-muted pl-9 pr-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Distance Radius */}
          <div className="flex items-center gap-1.5 bg-theme-subtle px-3 py-2 rounded-xl border border-theme text-xs">
            <MapPin className="w-3.5 h-3.5 text-theme-muted" />
            <span className="text-theme-muted">Radius:</span>
            <select
              value={distanceRadius}
              onChange={(e) => setDistanceRadius(e.target.value === "any" ? "any" : Number(e.target.value))}
              className="font-bold text-theme-primary bg-transparent outline-none cursor-pointer w-full"
            >
              <option value={2} className="bg-theme-card text-theme-primary">Within 2 km</option>
              <option value={5} className="bg-theme-card text-theme-primary">Within 5 km</option>
              <option value={10} className="bg-theme-card text-theme-primary">Within 10 km</option>
              <option value={20} className="bg-theme-card text-theme-primary">Within 20 km</option>
              <option value="any" className="bg-theme-card text-theme-primary">Any distance (All cities)</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 bg-theme-subtle px-3 py-2 rounded-xl border border-theme text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-theme-muted" />
            <span className="text-theme-muted">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="font-bold text-theme-primary bg-transparent outline-none cursor-pointer w-full"
            >
              <option value="NEAREST" className="bg-theme-card text-theme-primary">Nearest Proximity</option>
              <option value="FARTHEST" className="bg-theme-card text-theme-primary">Farthest First</option>
              <option value="RECENT" className="bg-theme-card text-theme-primary">Recently Active</option>
            </select>
          </div>

          {/* Available Only Checkbox */}
          <label className="flex items-center justify-between bg-theme-subtle px-3.5 py-2 rounded-xl border border-theme text-xs font-semibold text-theme-primary cursor-pointer">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Available Only
            </span>
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
            />
          </label>
        </div>

        {/* Applied Filters Reset Bar */}
        {(selectedBloodGroup !== "ALL" || searchQuery || distanceRadius !== 20 || !availableOnly || sortBy !== "NEAREST") && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-theme">
            <span className="text-theme-muted">
              Showing {filteredDonors.length} matching donors
            </span>
            <button
              onClick={handleReset}
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Location Required Banner */}
      {!hasProfileLocation && distanceRadius !== "any" && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <span className="font-bold block text-theme-primary">Location Coordinates Required for Radius Search</span>
              <span className="text-theme-muted">
                Your recipient profile does not have a recognized state/city set. Set your profile location or switch to "Any distance".
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => navigate("/recipient/profile")}>
              Update Profile Location
            </Button>
            <Button variant="primary" size="sm" onClick={() => setDistanceRadius("any")}>
              Search Any Distance
            </Button>
          </div>
        </div>
      )}

      {/* Search Error Banner */}
      {searchError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-500" /> {searchError}
          </span>
          <Button variant="outline" size="sm" onClick={fetchDonors}>
            Try Again
          </Button>
        </div>
      )}

      {/* VIEW MODES */}
      {viewMode === "MAP" ? (
        <div className="space-y-3">
          <DonorSearchMap
            donors={filteredDonors}
            radiusKm={distanceRadius === "any" ? 9999 : distanceRadius}
            onSelectDonor={(d) => setSelectedDonorForModal(d)}
            center={recipientLocation ? [recipientLocation.lat, recipientLocation.lng] : [28.6139, 77.2090]}
          />
        </div>
      ) : isLoading ? (
        <div className="bg-theme-card p-12 rounded-3xl border border-theme text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-500 mx-auto animate-spin" />
          <p className="text-xs font-semibold text-theme-muted">Searching nearby donors...</p>
        </div>
      ) : filteredDonors.length === 0 ? (
        <div className="bg-theme-card p-12 rounded-3xl border border-theme text-center space-y-3">
          <Inbox className="w-10 h-10 text-theme-muted mx-auto" />
          <h3 className="font-extrabold text-theme-primary text-base">No matching donors found</h3>
          <p className="text-xs text-theme-muted max-w-md mx-auto">
            Try expanding your search radius, selecting all blood groups, or checking "Any distance".
          </p>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset Search Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDonors.map((donor) => (
            <RecipientDonorCard
              key={donor.id}
              donor={donor}
              onViewDetails={(d) => setSelectedDonorForModal(d)}
            />
          ))}
        </div>
      )}

      {/* DONOR DETAIL MODAL */}
      <RecipientDonorDetailModal
        donor={selectedDonorForModal}
        isOpen={!!selectedDonorForModal}
        onClose={() => setSelectedDonorForModal(null)}
      />
    </div>
  );
}
