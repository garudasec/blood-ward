import React, { useState, useEffect } from "react";
import { requestService } from "../../services/requestService";
import { socketService } from "../../services/socketService";
import { useAuth } from "../../context/AuthContext";
import {
  Search,
  Filter,
  RefreshCw,
  BellRing,
  Inbox,
  CheckCircle2,
  Building2,
  MapPin,
  Clock,
  Eye,
  X,
} from "lucide-react";
import StatusBadge from "../../components/common/StatusBadge";
import Button from "../../components/common/Button";
import DonorRequestCard from "../../components/donor/DonorRequestCard";
import DonorRequestDetailModal from "../../components/donor/DonorRequestDetailModal";

export default function DonorRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("ALL");
  const [radiusFilter, setRadiusFilter] = useState(20);
  const [selectedRequestForModal, setSelectedRequestForModal] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchAvailableRequests = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (user?.bloodGroup) params.bloodGroup = user.bloodGroup;
      if (radiusFilter === 9999) {
        params.radius = "any";
      } else {
        params.radius = radiusFilter;
      }
      const res = await requestService.getAvailableRequests(params);
      if (res && res.requests) {
        setRequests(res.requests);
      }
      const historyRes = await requestService.getDonorHistory();
      if (historyRes && historyRes.history) {
        const activeAccepted = historyRes.history.filter(
          (r) => r.status === "Donor Accepted" || r.status === "In Progress"
        );
        setAcceptedRequests(activeAccepted);
      }
    } catch (err) {
      console.error("Failed to fetch available requests for donor:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableRequests();
  }, [radiusFilter, user?.bloodGroup]);

  useEffect(() => {
    socketService.connect();
    socketService.on("bloodRequest:new", fetchAvailableRequests);
    socketService.on("bloodRequest:emergency", fetchAvailableRequests);
    socketService.on("bloodRequest:cancelled", fetchAvailableRequests);
    socketService.on("bloodRequest:expired", fetchAvailableRequests);
    socketService.on("bloodRequest:statusChanged", fetchAvailableRequests);
    socketService.on("bloodRequest:fulfilled", fetchAvailableRequests);
    return () => {
      socketService.off("bloodRequest:new", fetchAvailableRequests);
      socketService.off("bloodRequest:emergency", fetchAvailableRequests);
      socketService.off("bloodRequest:cancelled", fetchAvailableRequests);
      socketService.off("bloodRequest:expired", fetchAvailableRequests);
      socketService.off("bloodRequest:statusChanged", fetchAvailableRequests);
      socketService.off("bloodRequest:fulfilled", fetchAvailableRequests);
    };
  }, []);

  const isAvailable = user?.availability === "available" || user?.isAvailable;

  const handleMarkInProgress = async (requestId) => {
    try {
      const res = await requestService.markInProgress(requestId);
      if (res && res.request) {
        setFeedback("Request marked In Progress!");
        setTimeout(() => setFeedback(""), 5000);
        fetchAvailableRequests();
      }
    } catch (err) {
      alert(err.message || "Failed to mark in-progress.");
      fetchAvailableRequests();
    }
  };

  const handleFulfill = async (requestId) => {
    try {
      const res = await requestService.fulfill(requestId);
      if (res && res.request) {
        setFeedback("Request marked fulfilled successfully!");
        setTimeout(() => setFeedback(""), 5000);
        fetchAvailableRequests();
      }
    } catch (err) {
      alert(err.message || "Failed to fulfill request.");
      fetchAvailableRequests();
    }
  };

  const handleAccept = async (requestId) => {
    try {
      const res = await requestService.accept(requestId);
      if (res && res.request) {
        setFeedback("Successfully accepted blood request! Recipient contact unlocked.");
        setTimeout(() => setFeedback(""), 5000);
        fetchAvailableRequests();
      }
    } catch (err) {
      alert(err.message || "Failed to accept request.");
      fetchAvailableRequests();
    }
  };

  const handleDecline = async (requestId) => {
    try {
      await requestService.reject(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error("Failed to reject request:", err);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setUrgencyFilter("ALL");
    setRadiusFilter(20);
  };

  const filteredRequests = requests.filter((req) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchHospital = req.hospitalName?.toLowerCase().includes(q);
      const matchCity = req.city?.toLowerCase().includes(q);
      if (!matchHospital && !matchCity) return false;
    }
    if (urgencyFilter !== "ALL") {
      if (req.urgency !== urgencyFilter) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-theme-card p-6 sm:p-8 rounded-3xl border border-theme shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-theme-primary tracking-tight flex items-center gap-2">
            <BellRing className="w-7 h-7 text-red-600" /> Emergency Blood Requests
          </h1>
          <p className="text-xs text-theme-muted">
            Explore emergency blood requests matching group <strong>{user?.bloodGroup || "O+"}</strong> in your vicinity
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchAvailableRequests} className="shrink-0 font-bold">
          <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} /> Refresh List
        </Button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {feedback}
          </span>
          <button onClick={() => setFeedback("")} className="text-theme-muted hover:text-theme-primary cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Panel */}
      <div className="bg-theme-card p-4 sm:p-6 rounded-3xl border border-theme shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-theme-muted absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search hospital or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-theme-input bg-theme-input text-theme-input placeholder-theme-muted pl-9 pr-3 py-2.5 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          {/* Urgency Filter */}
          <div className="flex items-center gap-1.5 bg-theme-subtle px-3 py-2 rounded-xl border border-theme text-xs">
            <Filter className="w-3.5 h-3.5 text-theme-muted" />
            <span className="text-theme-muted">Urgency:</span>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="font-bold text-theme-primary bg-transparent outline-none cursor-pointer w-full"
            >
              <option value="ALL" className="bg-theme-card text-theme-primary">All Levels</option>
              <option value="Emergency" className="bg-theme-card text-theme-primary">Emergency Only</option>
              <option value="High" className="bg-theme-card text-theme-primary">High Urgency</option>
              <option value="Normal" className="bg-theme-card text-theme-primary">Normal</option>
            </select>
          </div>

          {/* Distance Filter */}
          <div className="flex items-center gap-1.5 bg-theme-subtle px-3 py-2 rounded-xl border border-theme text-xs">
            <MapPin className="w-3.5 h-3.5 text-theme-muted" />
            <span className="text-theme-muted">Distance:</span>
            <select
              value={radiusFilter}
              onChange={(e) => setRadiusFilter(Number(e.target.value))}
              className="font-bold text-theme-primary bg-transparent outline-none cursor-pointer w-full"
            >
              <option value={2} className="bg-theme-card text-theme-primary">Within 2 km</option>
              <option value={5} className="bg-theme-card text-theme-primary">Within 5 km</option>
              <option value={10} className="bg-theme-card text-theme-primary">Within 10 km</option>
              <option value={20} className="bg-theme-card text-theme-primary">Within 20 km</option>
              <option value={9999} className="bg-theme-card text-theme-primary">Any distance</option>
            </select>
          </div>
        </div>

        {(searchQuery || urgencyFilter !== "ALL" || radiusFilter !== 20) && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-theme">
            <span className="text-theme-muted">
              Showing {filteredRequests.length} matching requests
            </span>
            <button
              onClick={handleResetFilters}
              className="text-red-600 dark:text-red-400 font-semibold hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* ACCEPTED REQUESTS SECTION (If any) */}
      {acceptedRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-extrabold text-theme-primary tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Your Accepted Requests ({acceptedRequests.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {acceptedRequests.map((req) => (
              <div
                key={req.id}
                className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="font-extrabold text-theme-primary text-sm">{req.hospitalName}</h4>
                  </div>
                  <StatusBadge status="Donor Accepted" urgency={req.urgency} />
                </div>

                <div className="text-xs text-theme-secondary space-y-1">
                  <p><strong>Required:</strong> {req.unitsNeeded} Unit(s) {req.bloodGroup}</p>
                  <p><strong>Location:</strong> {req.city}</p>
                  <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Request accepted. Hospital & recipient location unlocked.
                  </p>
                </div>

                {req.status === "Donor Accepted" && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleMarkInProgress(req.id)}
                    className="w-full font-bold bg-blue-600 hover:bg-blue-700 shadow-xs"
                  >
                    <Clock className="w-4 h-4 mr-1" /> Mark In Progress
                  </Button>
                )}

                {req.status === "In Progress" && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleFulfill(req.id)}
                    className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Mark as Fulfilled
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTIVE REQUESTS LIST */}
      <div className="space-y-4">
        <h3 className="text-lg font-extrabold text-theme-primary tracking-tight flex items-center gap-2">
          <BellRing className="w-5 h-5 text-red-600" /> Available Requests ({filteredRequests.length})
        </h3>

        {!isAvailable ? (
          <div className="bg-theme-card p-8 rounded-3xl border border-theme text-center space-y-3">
            <Inbox className="w-10 h-10 text-theme-muted mx-auto" />
            <h3 className="font-extrabold text-theme-primary text-base">Donor Availability Paused</h3>
            <p className="text-xs text-theme-muted max-w-md mx-auto">
              You are currently marked as Not Available. Switch your status to Available in the header or availability tab to view emergency requests.
            </p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-theme-card p-8 rounded-3xl border border-theme text-center space-y-3">
            <Inbox className="w-10 h-10 text-theme-muted mx-auto" />
            <h3 className="font-extrabold text-theme-primary text-base">No requests found</h3>
            <p className="text-xs text-theme-muted max-w-md mx-auto">
              No active blood requests match your selected search criteria or distance radius.
            </p>
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((req) => (
              <div key={req.id} className="relative group">
                <DonorRequestCard
                  request={req}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                />
                <button
                  onClick={() => setSelectedRequestForModal(req)}
                  className="w-full mt-2 py-1.5 bg-theme-subtle hover:bg-theme-hover border border-theme rounded-xl text-xs font-semibold text-theme-secondary hover:text-theme-primary flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-theme-muted" /> View Full Request Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* REQUEST DETAIL MODAL */}
      <DonorRequestDetailModal
        request={selectedRequestForModal}
        isOpen={!!selectedRequestForModal}
        onClose={() => setSelectedRequestForModal(null)}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </div>
  );
}
