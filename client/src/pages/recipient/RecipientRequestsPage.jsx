import React, { useState, useEffect } from "react";
import { requestService } from "../../services/requestService";
import { socketService } from "../../services/socketService";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  PlusCircle,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Inbox,
  AlertTriangle,
} from "lucide-react";
import Button from "../../components/common/Button";
import RecipientRequestTrackingModal from "../../components/recipient/RecipientRequestTrackingModal";
import RecipientRequestSummaryCard from "../../components/recipient/RecipientRequestSummaryCard";
import { REQUEST_STATUS } from "../../constants/theme";

export default function RecipientRequestsPage() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [urgencyFilter, setUrgencyFilter] = useState("ALL");
  const [selectedRequestForModal, setSelectedRequestForModal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchRequests = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const params = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      const res = await requestService.getMyRequests(params);
      if (res && res.requests) {
        setRequests(res.requests);
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to load recipient blood requests.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  useEffect(() => {
    socketService.connect();
    socketService.on("bloodRequest:accepted", fetchRequests);
    socketService.on("bloodRequest:statusChanged", fetchRequests);
    socketService.on("bloodRequest:fulfilled", fetchRequests);
    socketService.on("bloodRequest:cancelled", fetchRequests);
    return () => {
      socketService.off("bloodRequest:accepted", fetchRequests);
      socketService.off("bloodRequest:statusChanged", fetchRequests);
      socketService.off("bloodRequest:fulfilled", fetchRequests);
      socketService.off("bloodRequest:cancelled", fetchRequests);
    };
  }, []);

  const handleUpdateStatus = (requestId, newStatus) => {
    fetchRequests();
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r))
    );
  };

  const handleReset = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setUrgencyFilter("ALL");
  };

  const handleRefresh = () => {
    fetchRequests();
  };

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.hospitalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || req.status === statusFilter;
    const matchesUrgency = urgencyFilter === "ALL" || req.urgency === urgencyFilter;
    return matchesSearch && matchesStatus && matchesUrgency;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-theme-card p-6 sm:p-8 rounded-3xl border border-theme shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600 text-white">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-theme-primary tracking-tight">
              Manage & Track Blood Requests
            </h1>
          </div>
          <p className="text-xs text-theme-muted">
            View real-time donor responses, track request lifecycles, and access unlocked donor contacts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl bg-theme-card border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate("/recipient/requests/create")}
            className="font-bold shrink-0"
          >
            <PlusCircle className="w-4 h-4 mr-1" /> Create Request
          </Button>
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" /> {errorMsg}
          </span>
          <Button variant="outline" size="sm" onClick={fetchRequests}>
            Try Again
          </Button>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="bg-theme-card p-4 sm:p-6 rounded-3xl border border-theme shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-theme-muted absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search reference # or hospital..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-theme-input bg-theme-input text-theme-input placeholder-theme-muted pl-9 pr-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-theme-subtle px-3 py-2 rounded-xl border border-theme text-xs">
            <Filter className="w-3.5 h-3.5 text-theme-muted" />
            <span className="text-theme-muted">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="font-bold text-theme-primary bg-transparent outline-none cursor-pointer w-full"
            >
              <option value="ALL" className="bg-theme-card text-theme-primary">All Statuses</option>
              <option value={REQUEST_STATUS.CREATED} className="bg-theme-card text-theme-primary">Created</option>
              <option value={REQUEST_STATUS.ACTIVE} className="bg-theme-card text-theme-primary">Active Broadcast</option>
              <option value={REQUEST_STATUS.DONOR_ACCEPTED} className="bg-theme-card text-theme-primary">Donor Accepted</option>
              <option value={REQUEST_STATUS.IN_PROGRESS} className="bg-theme-card text-theme-primary">In Progress</option>
              <option value={REQUEST_STATUS.FULFILLED} className="bg-theme-card text-theme-primary">Fulfilled</option>
              <option value={REQUEST_STATUS.CANCELLED} className="bg-theme-card text-theme-primary">Cancelled</option>
            </select>
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
        </div>

        {(searchQuery || statusFilter !== "ALL" || urgencyFilter !== "ALL") && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-theme">
            <span className="text-theme-muted">
              Showing {filteredRequests.length} matching requests
            </span>
            <button
              onClick={handleReset}
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* REQUEST CARDS LIST */}
      {isLoading ? (
        <div className="bg-theme-card p-12 rounded-3xl border border-theme text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-500 mx-auto animate-spin" />
          <p className="text-xs font-semibold text-theme-muted">Loading your blood requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-theme-card p-12 rounded-3xl border border-theme text-center space-y-3">
          <Inbox className="w-10 h-10 text-theme-muted mx-auto" />
          <h3 className="font-extrabold text-theme-primary text-base">No requests found</h3>
          <p className="text-xs text-theme-muted max-w-md mx-auto">
            You currently have no blood requests matching your filter parameters.
          </p>
          <Button variant="primary" size="sm" onClick={() => navigate("/recipient/requests/create")}>
            Create Blood Request
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRequests.map((req) => {
            const targetReq = requests.find((r) => r.id === req.id) || req;
            return (
              <RecipientRequestSummaryCard
                key={req.id}
                request={targetReq}
                onViewDetails={() => setSelectedRequestForModal(targetReq)}
              />
            );
          })}
        </div>
      )}

      {/* TRACKING MODAL */}
      <RecipientRequestTrackingModal
        request={selectedRequestForModal}
        isOpen={!!selectedRequestForModal}
        onClose={() => setSelectedRequestForModal(null)}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
