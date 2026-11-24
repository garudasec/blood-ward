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
        setSelectedRequestForModal((prev) => {
          if (!prev) return null;
          return res.requests.find((r) => r.id === prev.id) || prev;
        });
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
    const handleReconnect = () => {
      fetchRequests();
    };

    socketService.on("bloodRequest:accepted", fetchRequests);
    socketService.on("bloodRequest:statusChanged", fetchRequests);
    socketService.on("bloodRequest:fulfilled", fetchRequests);
    socketService.on("bloodRequest:cancelled", fetchRequests);
    window.addEventListener("bloodward:reconnect", handleReconnect);

    return () => {
      socketService.off("bloodRequest:accepted", fetchRequests);
      socketService.off("bloodRequest:statusChanged", fetchRequests);
      socketService.off("bloodRequest:fulfilled", fetchRequests);
      socketService.off("bloodRequest:cancelled", fetchRequests);
      window.removeEventListener("bloodward:reconnect", handleReconnect);
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
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Manage & Track Blood Requests
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            View real-time donor responses, track request lifecycles, and access unlocked donor contacts within your bounded radius
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer shadow-xs transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate("/recipient/requests/create")}
            className="font-medium shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Create Request
          </Button>
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" /> {errorMsg}
          </span>
          <Button variant="outline" size="sm" onClick={fetchRequests}>
            Try Again
          </Button>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5 transition-colors">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search reference # or hospital..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 pl-9 pr-3 py-2 outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:focus:border-zinc-200 dark:focus:ring-zinc-200"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="font-medium text-slate-800 dark:text-slate-200 bg-transparent outline-none cursor-pointer w-full text-xs"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">All Statuses</option>
              <option value={REQUEST_STATUS.CREATED} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Created</option>
              <option value={REQUEST_STATUS.ACTIVE} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Active Broadcast</option>
              <option value={REQUEST_STATUS.DONOR_ACCEPTED} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Donor Accepted</option>
              <option value={REQUEST_STATUS.IN_PROGRESS} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">In Progress</option>
              <option value={REQUEST_STATUS.FULFILLED} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Fulfilled</option>
              <option value={REQUEST_STATUS.CANCELLED} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Cancelled</option>
            </select>
          </div>

          {/* Urgency Filter */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Urgency:</span>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="font-medium text-slate-800 dark:text-slate-200 bg-transparent outline-none cursor-pointer w-full text-xs"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">All Levels</option>
              <option value="Emergency" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Emergency Only</option>
              <option value="High" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">High Urgency</option>
              <option value="Normal" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Normal</option>
            </select>
          </div>
        </div>

        {(searchQuery || statusFilter !== "ALL" || urgencyFilter !== "ALL") && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">
              Showing {filteredRequests.length} matching requests
            </span>
            <button
              onClick={handleReset}
              className="text-zinc-900 dark:text-zinc-100 font-semibold hover:underline cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* REQUEST CARDS LIST */}
      {isLoading ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-xs">
          <RefreshCw className="w-6 h-6 text-slate-400 mx-auto animate-spin" />
          <p className="text-xs font-medium text-slate-500">Loading your blood requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Inbox className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white text-base">No requests found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            You currently have no blood requests matching your filter parameters.
          </p>
          <Button variant="primary" size="sm" onClick={() => navigate("/recipient/requests/create")}>
            Create Blood Request
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
