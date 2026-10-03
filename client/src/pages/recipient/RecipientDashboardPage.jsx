import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { requestService } from "../../services/requestService";
import { socketService } from "../../services/socketService";
import {
  Search,
  PlusCircle,
  AlertTriangle,
  Activity,
  Inbox,
  Clock,
  MapPin,
} from "lucide-react";
import Button from "../../components/common/Button";
import RecipientSummaryStats from "../../components/recipient/RecipientSummaryStats";
import RecipientRequestSummaryCard from "../../components/recipient/RecipientRequestSummaryCard";

export default function RecipientDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await requestService.getMyRequests();
      if (res && res.requests) {
        setRequests(res.requests);
      }
    } catch (err) {
      console.error("Failed to load recipient dashboard requests:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    socketService.connect();
    socketService.on("bloodRequest:accepted", fetchDashboardData);
    socketService.on("bloodRequest:statusChanged", fetchDashboardData);
    socketService.on("bloodRequest:fulfilled", fetchDashboardData);
    socketService.on("bloodRequest:cancelled", fetchDashboardData);
    return () => {
      socketService.off("bloodRequest:accepted", fetchDashboardData);
      socketService.off("bloodRequest:statusChanged", fetchDashboardData);
      socketService.off("bloodRequest:fulfilled", fetchDashboardData);
      socketService.off("bloodRequest:cancelled", fetchDashboardData);
    };
  }, []);

  const totalCount = requests.length;
  const activeList = requests.filter((r) => ["Active", "Donor Accepted", "In Progress"].includes(r.status));
  const activeCount = activeList.length;
  const responsesCount = requests.filter((r) => r.acceptedDonor || r.donorResponsesCount > 0).length;
  const fulfilledCount = requests.filter((r) => r.status === "Fulfilled").length;

  return (
    <div className="space-y-8 pb-12">
      {/* 1. WELCOME HEADER */}
      <div className="bg-slate-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {user?.fullName || "Recipient"}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Registered Search Location: <strong className="text-white">{user?.city ? (user?.state ? user.city + ", " + user.state : user.city) : (user?.state || "Not specified")}</strong></span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate("/recipient/donors")}
              className="font-bold shadow-md shadow-red-600/20"
            >
              <Search className="w-4 h-4 mr-1" /> Search Donors
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/recipient/requests/create")}
              className="bg-slate-900 border-slate-700 text-white hover:bg-slate-800"
            >
              <PlusCircle className="w-4 h-4 mr-1 text-blue-400" /> Create Blood Request
            </Button>
          </div>
        </div>
      </div>

      {/* 2. PROMINENT EMERGENCY REQUEST CTA */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse" /> Critical Emergency Alert
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Need Blood Urgently For A Medical Procedure?
          </h2>
          <p className="text-red-100 text-xs leading-relaxed">
            Create an Emergency Request to broadcast instant alerts to all nearby available donors matching your required blood group.
          </p>
        </div>

        <Button
          variant="secondary"
          size="lg"
          onClick={() => navigate("/recipient/requests/create?emergency=true")}
          className="shrink-0 font-extrabold bg-slate-950 hover:bg-slate-900 text-white border-0 shadow-xl"
        >
          Create Emergency Request 🚨
        </Button>
      </div>

      {/* 3. RECIPIENT SUMMARY STATS */}
      <RecipientSummaryStats stats={{ totalRequests: totalCount, activeRequests: activeCount, donorResponses: responsesCount, fulfilledRequests: fulfilledCount }} />

      {/* 4. ACTIVE BLOOD REQUESTS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-theme pb-3">
          <div className="space-y-0.5">
            <h2 className="text-xl font-extrabold text-theme-primary tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" /> Your Active Requests
            </h2>
            <p className="text-xs text-theme-muted">
              Track donor acceptances, unlocked contacts, and request statuses
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/recipient/requests")}
          >
            View All Requests →
          </Button>
        </div>

        {activeList.length === 0 ? (
          <div className="bg-theme-card p-8 rounded-3xl border border-theme text-center space-y-3">
            <Inbox className="w-10 h-10 text-theme-muted mx-auto" />
            <h3 className="font-extrabold text-theme-primary text-base">No active blood requests</h3>
            <p className="text-xs text-theme-muted max-w-md mx-auto">
              You do not have any active blood requests. Search available donors or create a new request when needed.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate("/recipient/requests/create")}
            >
              Create Request Now
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeList.map((req) => (
              <RecipientRequestSummaryCard
                key={req.id}
                request={req}
                onViewDetails={() => navigate("/recipient/requests")}
              />
            ))}
          </div>
        )}
      </div>

      {/* 5. RECENT ACTIVITY TIMELINE SNIPPET */}
      <div className="bg-theme-card p-6 sm:p-8 rounded-3xl border border-theme shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-theme-primary tracking-tight flex items-center gap-2">
          <Clock className="w-4 h-4 text-theme-muted" /> Recent Request Activity
        </h3>

        {activeList.length === 0 ? (
          <p className="text-xs text-theme-muted italic">No recent request activity recorded yet.</p>
        ) : (
          <div className="space-y-3 text-xs">
            {activeList.map((req) => (
              <div key={req.id} className="p-3 bg-theme-card-elevated rounded-2xl border border-theme flex items-start gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl shrink-0 border border-blue-500/20">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-theme-primary">
                    Request #{req.id?.slice(-6) || "--"} at {req.hospitalName || "Hospital"}
                  </p>
                  <p className="text-theme-muted text-[11px]">Status: {req.status} • {req.createdAt || "Recently"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
