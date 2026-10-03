import React, { useState, useEffect } from "react";
import Toast from "../../components/common/Toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { donorService } from "../../services/donorService";
import { requestService } from "../../services/requestService";
import { socketService } from "../../services/socketService";
import {
  User,
  History,
  Filter,
  RefreshCw,
  BellRing,
  Inbox,
  MapPin,
} from "lucide-react";
import BloodGroupBadge from "../../components/common/BloodGroupBadge";
import Button from "../../components/common/Button";
import DonorAvailabilityCard from "../../components/donor/DonorAvailabilityCard";
import DonorSummaryStats from "../../components/donor/DonorSummaryStats";
import DonorRequestCard from "../../components/donor/DonorRequestCard";

export default function DonorDashboardPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [selectedRadius, setSelectedRadius] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [toastMessage, setToastMessage] = useState("");

  const fetchAvailableRequests = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (selectedRadius) {
        params.radius = selectedRadius === 9999 ? "any" : selectedRadius;
      }
      const data = await requestService.getAvailableRequests(params);
      setRequests(data?.requests || data || []);
    } catch (err) {
      console.error("Failed to fetch available requests", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableRequests();
  }, [selectedRadius]);

  // Setup Socket.IO listener for live emergency request notifications
  useEffect(() => {
    socketService.connect();

    const handleNewBroadcast = () => {
      fetchAvailableRequests();
    };

    socketService.on("bloodRequest:new", handleNewBroadcast);
    socketService.on("bloodRequest:emergency", handleNewBroadcast);
    socketService.on("bloodRequest:cancelled", handleNewBroadcast);
    socketService.on("bloodRequest:expired", handleNewBroadcast);

    return () => {
      socketService.off("bloodRequest:new", handleNewBroadcast);
      socketService.off("bloodRequest:emergency", handleNewBroadcast);
      socketService.off("bloodRequest:cancelled", handleNewBroadcast);
      socketService.off("bloodRequest:expired", handleNewBroadcast);
    };
  }, []);

  const [isAvailable, setIsAvailable] = useState(user?.availability === "available");

  useEffect(() => {
    setIsAvailable(user?.availability === "available");
  }, [user?.availability]);

  const handleToggleAvailability = async () => {
    const previousState = isAvailable;
    const previousAvailability = user?.availability;
    const nextState = !isAvailable;
    const nextAvailability = nextState ? "available" : "not_available";

    setIsAvailable(nextState);
    updateUser({ availability: nextAvailability });
    try {
      await donorService.updateAvailability(nextAvailability);
      fetchAvailableRequests();
    } catch (err) {
      console.error("Failed to update availability:", err);
      setIsAvailable(previousState);
      updateUser({ availability: previousAvailability });
      setToastMessage(err.message || "Failed to update availability.");
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const res = await requestService.accept(requestId);
      if (res && res.request) {
        setAcceptedCount((prev) => prev + 1);
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
      }
    } catch (err) {
      alert(err.message || "Failed to accept request.");
      fetchAvailableRequests();
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      await requestService.reject(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      alert(err.message || "Failed to decline request.");
      fetchAvailableRequests();
    }
  };

  const handleRefresh = () => {
    fetchAvailableRequests();
  };

  const filteredRequests = requests;

  return (
    <div className="space-y-8 pb-12">
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      {/* 1. WELCOME HEADER */}
      <div className="bg-slate-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome back, {user?.fullName || "Blood Donor"}
              </h1>
              {user?.bloodGroup && <BloodGroupBadge group={user.bloodGroup} size="md" />}
            </div>
            <p className="text-slate-300 text-xs sm:text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-400 shrink-0" />
              <span>Registered Location: <strong className="text-white">{user?.city || "City Not Set"}</strong></span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-semibold">Location Privacy Protected</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/donor/profile")}
              className="bg-slate-900 border-slate-700 text-white hover:bg-slate-800"
            >
              <User className="w-4 h-4 mr-1 text-slate-400" /> Edit Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/donor/history")}
              className="bg-slate-900 border-slate-700 text-white hover:bg-slate-800"
            >
              <History className="w-4 h-4 mr-1 text-slate-400" /> History
            </Button>
          </div>
        </div>
      </div>

      {/* 2. AVAILABILITY TOGGLE CARD */}
      <DonorAvailabilityCard
        isAvailable={isAvailable}
        onToggle={handleToggleAvailability}
      />

      {/* 3. SUMMARY STATS GRID */}
      <DonorSummaryStats
        stats={{
          totalDonations: 0,
          livesSaved: 0,
          nearbyActiveCount: isAvailable ? filteredRequests.length : 0,
          acceptedCount: acceptedCount,
        }}
      />

      {/* 4. RELEVANT BLOOD REQUESTS PREVIEW SECTION */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-theme">
          <div className="space-y-0.5">
            <h2 className="text-xl font-extrabold text-theme-primary tracking-tight flex items-center gap-2">
              <BellRing className="w-5 h-5 text-red-600" /> Nearby Emergency Blood Requests
            </h2>
            <p className="text-xs text-theme-muted">
              Active blood requests matching your blood group ({user?.bloodGroup || "O+"})
            </p>
          </div>

          {/* Distance Filter & Refresh Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-theme-card px-3 py-1.5 rounded-xl border border-theme text-xs">
              <Filter className="w-3.5 h-3.5 text-theme-muted" />
              <span className="text-theme-muted hidden sm:inline">Radius:</span>
              <select
                value={selectedRadius}
                onChange={(e) => setSelectedRadius(Number(e.target.value))}
                className="font-bold text-theme-primary bg-transparent outline-none cursor-pointer"
              >
                <option value={2} className="bg-theme-card text-theme-primary">Within 2 km</option>
                <option value={5} className="bg-theme-card text-theme-primary">Within 5 km</option>
                <option value={10} className="bg-theme-card text-theme-primary">Within 10 km</option>
                <option value={20} className="bg-theme-card text-theme-primary">Within 20 km</option>
                <option value={9999} className="bg-theme-card text-theme-primary">Any distance</option>
              </select>
            </div>

            <button
              onClick={handleRefresh}
              className="p-2 rounded-xl bg-theme-card border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle cursor-pointer"
              title="Refresh requests"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Requests List vs Empty State */}
        {!isAvailable ? (
          <div className="bg-theme-card p-8 rounded-3xl border border-theme text-center space-y-3">
            <Inbox className="w-10 h-10 text-theme-muted mx-auto" />
            <h3 className="font-extrabold text-theme-primary text-base">
              You are currently marked as NOT AVAILABLE
            </h3>
            <p className="text-xs text-theme-muted max-w-md mx-auto">
              Emergency request notifications and donor discovery are paused for your profile. Switch your availability toggle to "AVAILABLE NOW" to view active requests nearby.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={handleToggleAvailability}
              className="mt-2"
            >
              Switch to Available Now
            </Button>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-theme-card p-8 rounded-3xl border border-theme text-center space-y-3">
            <Inbox className="w-10 h-10 text-theme-muted mx-auto" />
            <h3 className="font-extrabold text-theme-primary text-base">
              No matching blood requests in this radius
            </h3>
            <p className="text-xs text-theme-muted max-w-md mx-auto">
              There are currently no active emergency blood requests within {selectedRadius} km matching blood group {user?.bloodGroup || "O+"}.
            </p>
            <button
              onClick={() => setSelectedRadius(20)}
              className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline inline-block pt-1 cursor-pointer"
            >
              Expand Search Radius to 20 km →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((req) => (
              <DonorRequestCard
                key={req.id}
                request={req}
                onAccept={handleAcceptRequest}
                onDecline={handleDeclineRequest}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
