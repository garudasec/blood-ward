import React, { useState, useEffect } from "react";
import { requestService } from "../../services/requestService";
import { useAuth } from "../../context/AuthContext";
import {
  History,
  Search,
  Filter,
  RefreshCw,
  Inbox,
  AlertTriangle,
} from "lucide-react";
import BloodGroupBadge from "../../components/common/BloodGroupBadge";
import StatusBadge from "../../components/common/StatusBadge";
import Button from "../../components/common/Button";

export default function DonorHistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDonorHistory = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await requestService.getDonorHistory();
      if (res && res.requests) {
        setHistory(res.requests);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error("Failed to fetch donor history:", err);
      setError(err.message || "Failed to load donation history log.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDonorHistory();
  }, []);

  const filteredHistory = history.filter((item) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchHospital = item.hospitalName?.toLowerCase().includes(q);
      const matchCity = item.city?.toLowerCase().includes(q);
      const matchId = String(item.id).includes(q);
      if (!matchHospital && !matchCity && !matchId) return false;
    }

    if (statusFilter !== "ALL") {
      if (statusFilter === "Fulfilled" && item.status !== "Fulfilled" && item.status !== "Completed") {
        return false;
      }
      if (statusFilter === "Accepted" && item.status !== "Donor Accepted" && item.status !== "In Progress") {
        return false;
      }
      if (statusFilter === "Cancelled" && item.status !== "Cancelled") {
        return false;
      }
    }

    return true;
  });

  const getHistoryCounts = () => {
    const fulfilled = history.filter((h) => h.status === "Fulfilled" || h.status === "Completed").length;
    const accepted = history.filter((h) => h.status === "Donor Accepted" || h.status === "In Progress").length;
    return { fulfilled, accepted, total: history.length };
  };

  const counts = getHistoryCounts();

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-theme-card p-6 sm:p-8 rounded-3xl border border-theme shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-theme-primary tracking-tight">
                Donation Response History
              </h1>
              <p className="text-xs text-theme-muted">
                Complete record of requests you responded to or accepted for blood group {user?.bloodGroup}
              </p>
            </div>
          </div>
        </div>

        {/* Header Stats */}
        <div className="flex items-center gap-2 text-xs font-bold shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            {counts.fulfilled} Fulfilled
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            {counts.accepted} Active
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-theme-subtle text-theme-secondary border border-theme">
            {counts.total} Total Logged
          </span>
          <button
            onClick={fetchDonorHistory}
            className="p-2 rounded-xl bg-theme-subtle hover:bg-theme-hover text-theme-secondary hover:text-theme-primary transition-colors cursor-pointer border border-theme"
            title="Refresh History"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-theme-card p-4 sm:p-6 rounded-3xl border border-theme shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-theme-muted absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search reference # or hospital..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-theme-input bg-theme-input text-theme-input placeholder-theme-muted pl-9 pr-3 py-2.5 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
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
              <option value="Fulfilled" className="bg-theme-card text-theme-primary">Fulfilled / Completed</option>
              <option value="Accepted" className="bg-theme-card text-theme-primary">Accepted / Active</option>
              <option value="Cancelled" className="bg-theme-card text-theme-primary">Cancelled</option>
            </select>
          </div>
        </div>

        {(searchQuery || statusFilter !== "ALL") && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-theme">
            <span className="text-theme-muted">
              Showing {filteredHistory.length} matching history entries
            </span>
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
              }}
              className="text-red-600 dark:text-red-400 font-semibold hover:underline cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-theme-card p-12 rounded-3xl border border-theme text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-red-500 mx-auto animate-spin" />
          <p className="text-xs font-semibold text-theme-muted">Loading donation history...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-500/10 p-8 rounded-3xl border border-rose-500/20 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="font-extrabold text-rose-600 dark:text-rose-400 text-base">Error Loading History</h3>
          <p className="text-xs text-theme-secondary max-w-md mx-auto">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchDonorHistory}>
            Try Again
          </Button>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="bg-theme-card p-12 rounded-3xl border border-theme text-center space-y-3">
          <Inbox className="w-10 h-10 text-theme-muted mx-auto" />
          <h3 className="font-extrabold text-theme-primary text-base">No history logs found</h3>
          <p className="text-xs text-theme-muted max-w-md mx-auto">
            No donation history matches your current search or status filter.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("ALL");
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="bg-theme-card rounded-3xl border border-theme shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-theme-table-header border-b border-theme text-[11px] font-bold uppercase tracking-wider text-theme-muted">
                  <th className="py-3.5 px-6">Reference ID</th>
                  <th className="py-3.5 px-6">Hospital & Location</th>
                  <th className="py-3.5 px-6">Blood Info</th>
                  <th className="py-3.5 px-6">Required Date</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Notes / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme text-xs text-theme-secondary">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-theme-subtle transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-theme-primary">
                      #{item.id}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-theme-primary">{item.hospitalName}</div>
                      <div className="text-[11px] text-theme-muted">{item.city}</div>
                    </td>
                    <td className="py-4 px-6 space-y-1">
                      <BloodGroupBadge group={item.bloodGroup} size="sm" />
                      <div className="text-[11px] text-theme-muted">{item.unitsNeeded} Unit(s)</div>
                    </td>
                    <td className="py-4 px-6 font-medium text-theme-secondary">
                      {item.requiredDate}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={item.status} urgency={item.urgency} />
                    </td>
                    <td className="py-4 px-6 text-theme-muted max-w-xs text-[11px]">
                      {item.additionalNotes || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-theme">
            {filteredHistory.map((item) => (
              <div key={item.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-theme-primary bg-theme-subtle px-2 py-0.5 rounded border border-theme">
                    #{item.id}
                  </span>
                  <StatusBadge status={item.status} urgency={item.urgency} />
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-theme-primary text-sm">{item.hospitalName}</h4>
                  <p className="text-xs text-theme-muted">{item.city}</p>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    <BloodGroupBadge group={item.bloodGroup} size="sm" />
                    <span className="text-theme-secondary font-medium">{item.unitsNeeded} Unit(s)</span>
                  </div>
                  <span className="text-theme-muted text-[11px]">{item.requiredDate}</span>
                </div>

                {item.additionalNotes && (
                  <p className="text-[11px] text-theme-muted italic bg-theme-subtle p-2 rounded-lg border border-theme">
                    "{item.additionalNotes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
