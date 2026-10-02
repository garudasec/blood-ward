import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Building2,
  MapPin,
  Calendar,
  Users,
  Eye,
  RefreshCw,
  Inbox,
  AlertTriangle,
  Phone,
  Check,
} from 'lucide-react';
import BloodGroupBadge from '../../components/common/BloodGroupBadge';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import RecipientRequestTrackingModal from '../../components/recipient/RecipientRequestTrackingModal';
import { MOCK_RECIPIENT_REQUESTS } from '../../constants/mockData';
import { REQUEST_STATUS } from '../../constants/theme';

export default function RecipientRequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [requests, setRequests] = useState(MOCK_RECIPIENT_REQUESTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [selectedRequestForModal, setSelectedRequestForModal] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateStatus = (requestId, newStatus) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r))
    );
  };

  const handleReset = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setUrgencyFilter('ALL');
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setRequests([...MOCK_RECIPIENT_REQUESTS]);
      setIsLoading(false);
    }, 400);
  };

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.hospitalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    const matchesUrgency = urgencyFilter === 'ALL' || req.urgency === urgencyFilter;
    return matchesSearch && matchesStatus && matchesUrgency;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600 text-white">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Manage & Track Blood Requests
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            View real-time donor responses, track request lifecycles, and access unlocked donor contacts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
            title="Refresh requests"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/recipient/requests/create')}
            className="font-bold"
          >
            <PlusCircle className="w-4 h-4 mr-1" /> Create Request
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search hospital or REF #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer w-full"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active Broadcast</option>
              <option value="Donor Accepted">Donor Accepted</option>
              <option value="Fulfilled">Fulfilled</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Urgency:</span>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer w-full"
            >
              <option value="ALL">All Urgencies</option>
              <option value="Emergency">Emergency</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
            </select>
          </div>
        </div>

        {(searchQuery || statusFilter !== 'ALL' || urgencyFilter !== 'ALL') && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-slate-500">
              Showing {filteredRequests.length} matching requests
            </span>
            <button onClick={handleReset} className="text-blue-600 font-bold hover:underline">
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-slate-800 text-base">No blood requests found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You do not have any requests matching the selected filters.
          </p>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className={`bg-white rounded-2xl border overflow-hidden transition-all duration-200 shadow-xs hover:shadow-md ${
                req.urgency === 'Emergency' ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'
              }`}
            >
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        #{req.id}
                      </span>
                      <StatusBadge status={req.status} urgency={req.urgency} />
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-base">{req.hospitalName}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {req.city}
                    </p>
                  </div>

                  <BloodGroupBadge group={req.bloodGroup} size="md" />
                </div>

                {/* Donor Acceptance Panel */}
                {req.acceptedDonors && req.acceptedDonors.length > 0 ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl space-y-2">
                    <div className="flex items-center justify-between font-bold text-emerald-800">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {req.acceptedDonors.length} Donor(s) Accepted Request!
                      </span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded font-extrabold">
                        Contacts Unlocked
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-blue-50/70 border border-blue-200 text-blue-800 text-xs rounded-xl flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" /> Broadcast active to donors
                    </span>
                    <span className="text-[11px] font-bold text-blue-600">Awaiting Donors</span>
                  </div>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedRequestForModal(req)}
                  className="w-full justify-center font-bold text-xs"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> Track & Manage Request Lifecycle
                </Button>
              </div>
            </div>
          ))}
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