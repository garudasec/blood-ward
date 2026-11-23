import React, { useState, useEffect } from "react";
import Toast from "../../components/common/Toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { donorService } from "../../services/donorService";
import { requestService } from "../../services/requestService";
import { matchService } from "../../services/matchService";
import { socketService } from "../../services/socketService";
import {
  User,
  History,
  Filter,
  RefreshCw,
  BellRing,
  Inbox,
  MapPin,
  ShieldCheck,
  Map as MapIcon,
  ArrowRight,
  AlertCircle,
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
  const [matches, setMatches] = useState([]);
  const [selectedRadius, setSelectedRadius] = useState(20);
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
      const [data, matchData] = await Promise.allSettled([
        requestService.getAvailableRequests(params),
        matchService.getMyMatches(),
      ]);

      if (data.status === "fulfilled") {
        const incoming = data.value?.requests || data.value || [];
        const seenIds = new Set();
        const uniqueRequests = incoming.filter((r) => {
          const id = r.id || r._id;
          if (!id || seenIds.has(id)) return false;
          seenIds.add(id);
          return true;
        });
        setRequests(uniqueRequests);
      }

      if (matchData.status === "fulfilled" && matchData.value?.matches) {
        setMatches(matchData.value.matches);
      }
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
    const handleNewBroadcast = () => {
      fetchAvailableRequests();
    };

    const handleUnavailable = (payload) => {
      const reqId = payload?.requestId || payload?.id;
      if (reqId) {
        setRequests((prev) => prev.filter((r) => (r.id || r._id) !== reqId));
      } else {
        fetchAvailableRequests();
      }
    };

    const handleReconnect = () => {
      fetchAvailableRequests();
    };

    socketService.on("bloodRequest:new", handleNewBroadcast);
    socketService.on("request:created", handleNewBroadcast);
    socketService.on("bloodRequest:emergency", handleNewBroadcast);
    socketService.on("bloodRequest:unavailable", handleUnavailable);
    socketService.on("request:unavailable", handleUnavailable);
    socketService.on("bloodRequest:cancelled", handleUnavailable);
    socketService.on("bloodRequest:expired", handleUnavailable);
    socketService.on("bloodRequest:fulfilled", handleUnavailable);
    window.addEventListener("bloodward:reconnect", handleReconnect);

    return () => {
      socketService.off("bloodRequest:new", handleNewBroadcast);
      socketService.off("request:created", handleNewBroadcast);
      socketService.off("bloodRequest:emergency", handleNewBroadcast);
      socketService.off("bloodRequest:unavailable", handleUnavailable);
      socketService.off("request:unavailable", handleUnavailable);
      socketService.off("bloodRequest:cancelled", handleUnavailable);
      socketService.off("bloodRequest:expired", handleUnavailable);
      socketService.off("bloodRequest:fulfilled", handleUnavailable);
      window.removeEventListener("bloodward:reconnect", handleReconnect);
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
        setToastMessage("Successfully accepted blood request! Recipient contact unlocked.");
      }
    } catch (err) {
      if (err?.code === "DISTANCE_LIMIT_EXCEEDED" || (typeof err?.distanceKm === "number" && err.distanceKm > (err.maxAllowedKm || 20))) {
        throw err;
      }
      if (err?.statusCode === 409 || err?.message?.includes("already been accepted") || err?.message?.includes("no longer active")) {
        setToastMessage("This request was just accepted by another donor or has expired.");
      } else if (err?.statusCode === 403 || err?.message?.includes("Unavailable")) {
        setToastMessage("Your donor status is set to Not Available. Please switch to Available Now.");
      } else {
        setToastMessage(err.message || "Failed to accept request.");
      }
      fetchAvailableRequests();
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      await requestService.reject(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      setToastMessage("Request declined.");
    } catch (err) {
      setToastMessage(err.message || "Failed to decline request.");
      fetchAvailableRequests();
    }
  };

  const handleRefresh = () => {
    fetchAvailableRequests();
  };

  const filteredRequests = requests;

  return (
    <div className="space-y-6 pb-12">
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />

      {/* Date of Birth Required Alert for Legacy Donors */}
      {!user?.dateOfBirth && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-bold block">Date of Birth Completion Required</span>
              <span className="text-amber-700 dark:text-amber-300">
                To receive and view active emergency blood requests, voluntary donors must verify that they are at least 18 years of age.
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/donor/profile")}
            className="shrink-0 text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40"
          >
            Complete Profile Now
          </Button>
        </div>
      )}

      {/* 1. WELCOME HEADER */}
      <div className="bg-white dark:bg-[#181B21] text-[#1E293B] dark:text-[#F1F5F9] p-6 sm:p-7 rounded-2xl border border-[#E2E8F0] dark:border-[#343B47] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E293B] dark:text-[#F1F5F9]">
              Welcome back, {user?.fullName || "Blood Donor"}
            </h1>
            {user?.bloodGroup && <BloodGroupBadge group={user.bloodGroup} size="md" />}
          </div>
          <p className="text-[#475569] dark:text-[#CBD5E1] text-xs sm:text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#A61B2B] shrink-0" />
            <span>Registered Location: <strong className="text-[#1E293B] dark:text-[#F1F5F9] font-semibold">{user?.city || "City Not Set"}</strong></span>
            <span className="text-[#CBD5E1] dark:text-[#343B47]">•</span>
            <span className="text-[#28734A] dark:text-emerald-400 text-xs inline-flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" /> Privacy Protected (~500m offset)
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate("/donor/requests")}
            className="font-bold text-xs"
          >
            <MapIcon className="w-3.5 h-3.5 mr-1.5" /> Open Dispatch Radar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/donor/profile")}
            className="text-xs"
          >
            <User className="w-3.5 h-3.5 mr-1.5 text-[#64748B] dark:text-[#94A3B8]" /> Profile & Health
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/donor/history")}
            className="text-xs"
          >
            <History className="w-3.5 h-3.5 mr-1.5 text-[#64748B] dark:text-[#94A3B8]" /> History
          </Button>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0] dark:border-[#343B47]">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight flex items-center gap-2">
              <BellRing className="w-4 h-4 text-[#A61B2B]" />
              Nearby Emergency Blood Requests
            </h2>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
              Active blood requests matching your blood group ({user?.bloodGroup || "O+"})
            </p>
          </div>

          {/* Distance Filter: strictly [5, 10, 20, 30, 50] */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#181B21] px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#343B47] text-xs shadow-xs">
              <Filter className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />
              <span className="text-[#64748B] dark:text-[#94A3B8] hidden sm:inline">Radius:</span>
              <select
                value={selectedRadius}
                onChange={(e) => setSelectedRadius(Number(e.target.value))}
                className="font-bold text-[#1E293B] dark:text-[#F1F5F9] bg-transparent dark:bg-[#181B21] outline-none cursor-pointer text-xs"
              >
                <option value={5} className="dark:bg-[#181B21]">Within 5 KM</option>
                <option value={10} className="dark:bg-[#181B21]">Within 10 KM</option>
                <option value={20} className="dark:bg-[#181B21]">Within 20 KM</option>
                <option value={30} className="dark:bg-[#181B21]">Within 30 KM</option>
                <option value={50} className="dark:bg-[#181B21]">Within 50 KM (Max Cap)</option>
                <option value={9999} className="dark:bg-[#181B21]">Any distance</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              className="p-2 rounded-lg bg-white dark:bg-[#181B21] border border-[#E2E8F0] dark:border-[#343B47] text-[#64748B] dark:text-[#CBD5E1] hover:text-[#1E293B] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#20242C] cursor-pointer shadow-xs transition-colors"
              title="Refresh requests"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Requests List vs Empty State */}
        {!isAvailable ? (
          <div className="bg-white dark:bg-[#181B21] p-8 rounded-2xl border border-[#E2E8F0] dark:border-[#343B47] text-center space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-[#F1F5F9] dark:bg-[#20242C] text-[#64748B] dark:text-[#94A3B8] flex items-center justify-center mx-auto">
              <Inbox className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#1E293B] dark:text-[#F1F5F9] text-base">
              You are currently marked as Unavailable
            </h3>
            <p className="text-xs text-[#475569] dark:text-[#CBD5E1] max-w-md mx-auto">
              Emergency request notifications and donor discovery are paused for your profile. Switch your availability toggle to "Available" to view active requests nearby.
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
          <div className="bg-white dark:bg-[#181B21] p-8 rounded-xl border border-[#E2E8F0] dark:border-[#343B47] text-center space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-[#F1F5F9] dark:bg-[#20242C] text-[#64748B] dark:text-[#94A3B8] flex items-center justify-center mx-auto">
              <Inbox className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#1E293B] dark:text-[#F1F5F9] text-base">
              No matching blood requests in this radius
            </h3>
            <p className="text-xs text-[#475569] dark:text-[#CBD5E1] max-w-md mx-auto">
              There are currently no active emergency blood requests within {selectedRadius === 9999 ? "any distance" : `${selectedRadius} KM`} matching blood group {user?.bloodGroup || "O+"}.
            </p>
            {selectedRadius < 20 && (
              <button
                type="button"
                onClick={() => setSelectedRadius(20)}
                className="text-xs font-bold text-[#1E293B] dark:text-[#F1F5F9] hover:underline inline-block pt-1 cursor-pointer"
              >
                Expand Search Radius to 20 KM →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Displaying {filteredRequests.length} actionable requisitions
              </span>
              <button
                type="button"
                onClick={() => navigate("/donor/requests")}
                className="text-xs font-bold text-[#1E293B] dark:text-[#F1F5F9] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Open Full Map & Split Console <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRequests.map((req) => (
                <DonorRequestCard
                  key={req.id}
                  request={req}
                  onAccept={handleAcceptRequest}
                  onDecline={handleDeclineRequest}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. MATCH ASSIGNMENTS & LIFECYCLE HISTORY */}
      {matches.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-[#E2E8F0] dark:border-[#343B47]">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight flex items-center gap-2">
                <History className="w-4 h-4 text-[#A61B2B]" />
                Your Match History & Lifecycle
              </h2>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                Persistent donor match assignments, response statuses, and completion records
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/donor/history")}
              className="text-xs"
            >
              Full Donation History →
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map((m) => (
              <div
                key={m._id || m.id}
                className="bg-white dark:bg-[#181B21] p-4 rounded-xl border border-[#E2E8F0] dark:border-[#343B47] shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40">
                      {m.bloodGroup}
                    </span>
                    <h4 className="font-bold text-[#1E293B] dark:text-[#F1F5F9] text-sm mt-1">
                      {m.hospitalName}
                    </h4>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                      {m.city}{m.state ? `, ${m.state}` : ""} • {m.unitsNeeded} unit(s)
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      m.status === "Accepted"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : m.status === "Completed"
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        : m.status === "Declined"
                        ? "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700"
                        : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
