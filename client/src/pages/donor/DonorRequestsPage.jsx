import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Filter,
  RefreshCw,
  BellRing,
  Inbox,
  CheckCircle2,
  XCircle,
  Building2,
  MapPin,
  Calendar,
  Check,
  Eye,
  X,
} from 'lucide-react';
import BloodGroupBadge from '../../components/common/BloodGroupBadge';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import DonorRequestCard from '../../components/donor/DonorRequestCard';
import DonorRequestDetailModal from '../../components/donor/DonorRequestDetailModal';
import { MOCK_DONOR_REQUESTS } from '../../constants/mockData';

export default function DonorRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState(MOCK_DONOR_REQUESTS);
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [radiusFilter, setRadiusFilter] = useState(20);
  const [selectedRequestForModal, setSelectedRequestForModal] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isAvailable = user?.isAvailable ?? true;

  const handleAccept = (requestId) => {
    const target = requests.find((r) => r.id === requestId);
    if (target) {
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      setAcceptedRequests((prev) => [
        ...prev,
        { ...target, status: 'Donor Accepted', acceptedAt: 'Just now' },
      ]);
      setFeedback(`You accepted request #${target.id} at ${target.hospitalName}. Hospital contact details unlocked.`);
      setTimeout(() => setFeedback(''), 5000);
    }
  };

  const handleDecline = (requestId) => {
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setUrgencyFilter('ALL');
    setRadiusFilter(20);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setRequests(MOCK_DONOR_REQUESTS);
      setIsLoading(false);
    }, 400);
  };

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.hospitalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUrgency = urgencyFilter === 'ALL' || req.urgency === urgencyFilter;
    const matchesRadius = req.distanceKm <= radiusFilter;
    return matchesSearch && matchesUrgency && matchesRadius;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Relevant Blood Requests
            </h1>
            <BloodGroupBadge group={user?.bloodGroup || 'O+'} size="sm" />
          </div>
          <p className="text-xs text-slate-500">
            Matching urgent requests for blood group {user?.bloodGroup || 'O+'} within your area
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Requests
        </button>
      </div>

      {/* Action Feedback Banner */}
      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-xs">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {feedback}
          </span>
          <button onClick={() => setFeedback('')} className="text-emerald-700 hover:text-emerald-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Panel */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search hospital or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </div>

          {/* Urgency Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Urgency:</span>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer w-full"
            >
              <option value="ALL">All Levels</option>
              <option value="Emergency">Emergency Only</option>
              <option value="High">High Urgency</option>
              <option value="Normal">Normal</option>
            </select>
          </div>

          {/* Distance Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Distance:</span>
            <select
              value={radiusFilter}
              onChange={(e) => setRadiusFilter(Number(e.target.value))}
              className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer w-full"
            >
              <option value={2}>Within 2 km</option>
              <option value={5}>Within 5 km</option>
              <option value={10}>Within 10 km</option>
              <option value={20}>Within 20 km</option>
              <option value={9999}>Any distance</option>
            </select>
          </div>
        </div>

        {(searchQuery || urgencyFilter !== 'ALL' || radiusFilter !== 20) && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-slate-500">
              Showing {filteredRequests.length} matching requests
            </span>
            <button
              onClick={handleResetFilters}
              className="text-red-600 font-semibold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* ACCEPTED REQUESTS SECTION (If any) */}
      {acceptedRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Your Accepted Requests ({acceptedRequests.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {acceptedRequests.map((req) => (
              <div
                key={req.id}
                className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <h4 className="font-extrabold text-slate-900 text-sm">{req.hospitalName}</h4>
                  </div>
                  <StatusBadge status="Donor Accepted" urgency={req.urgency} />
                </div>

                <div className="text-xs text-slate-700 space-y-1">
                  <p><strong>Required:</strong> {req.unitsNeeded} Unit(s) {req.bloodGroup}</p>
                  <p><strong>Location:</strong> {req.city}</p>
                  <p className="text-emerald-800 font-semibold">
                    📞 Coordinator Contact: +1 (555) 999-4321 (Unlocked)
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTIVE REQUESTS LIST */}
      <div className="space-y-4">
        <h3 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <BellRing className="w-5 h-5 text-red-600" /> Available Requests ({filteredRequests.length})
        </h3>

        {!isAvailable ? (
          <div className="bg-slate-100 p-8 rounded-3xl border border-slate-200 text-center space-y-3">
            <Inbox className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-extrabold text-slate-800 text-base">Donor Availability Paused</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              You are currently marked as Not Available. Switch your status to Available in the header or availability tab to view emergency requests.
            </p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-extrabold text-slate-800 text-base">No requests found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
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
                  className="w-full mt-2 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" /> View Full Request Details
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