import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Droplet,
  User,
  History,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  BellRing,
  Inbox,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import BloodGroupBadge from '../../components/common/BloodGroupBadge';
import Button from '../../components/common/Button';
import DonorAvailabilityCard from '../../components/donor/DonorAvailabilityCard';
import DonorSummaryStats from '../../components/donor/DonorSummaryStats';
import DonorRequestCard from '../../components/donor/DonorRequestCard';
import { MOCK_DONOR_REQUESTS, MOCK_DONOR_STATS } from '../../constants/mockData';

export default function DonorDashboardPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState(MOCK_DONOR_REQUESTS);
  const [selectedRadius, setSelectedRadius] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedCount, setAcceptedCount] = useState(1);

  const isAvailable = user?.isAvailable ?? true;

  const handleToggleAvailability = () => {
    updateUser({ isAvailable: !isAvailable });
  };

  const handleAcceptRequest = (requestId) => {
    setAcceptedCount((prev) => prev + 1);
  };

  const handleDeclineRequest = (requestId) => {
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setRequests(MOCK_DONOR_REQUESTS);
      setIsLoading(false);
    }, 500);
  };

  // Filter requests based on donor blood group compatibility preview & radius
  const filteredRequests = requests.filter(
    (req) => req.distanceKm <= selectedRadius
  );

  return (
    <div className="space-y-8 pb-12">
      {/* 1. WELCOME HEADER */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome back, {user?.fullName || 'Blood Donor'}
              </h1>
              {user?.bloodGroup && <BloodGroupBadge group={user.bloodGroup} size="md" />}
            </div>
            <p className="text-slate-300 text-xs sm:text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-400 shrink-0" />
              <span>Registered Location: <strong className="text-white">{user?.city || 'City Not Set'}</strong></span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-semibold">Location Privacy Protected</span>
            </p>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/donor/profile')}
              className="bg-slate-800/80 border-slate-700 text-white hover:bg-slate-700"
            >
              <User className="w-4 h-4 mr-1 text-slate-400" /> Edit Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/donor/history')}
              className="bg-slate-800/80 border-slate-700 text-white hover:bg-slate-700"
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
          ...MOCK_DONOR_STATS,
          nearbyActiveCount: isAvailable ? filteredRequests.length : 0,
          acceptedCount: acceptedCount,
        }}
      />

      {/* 4. RELEVANT BLOOD REQUESTS PREVIEW SECTION */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div className="space-y-0.5">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <BellRing className="w-5 h-5 text-red-600" /> Nearby Emergency Blood Requests
            </h2>
            <p className="text-xs text-slate-500">
              Active blood requests matching your blood group ({user?.bloodGroup || 'O+'})
            </p>
          </div>

          {/* Distance Filter & Refresh Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 hidden sm:inline">Radius:</span>
              <select
                value={selectedRadius}
                onChange={(e) => setSelectedRadius(Number(e.target.value))}
                className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
              >
                <option value={2}>Within 2 km</option>
                <option value={5}>Within 5 km</option>
                <option value={10}>Within 10 km</option>
                <option value={20}>Within 20 km</option>
                <option value={9999}>Any distance</option>
              </select>
            </div>

            <button
              onClick={handleRefresh}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              title="Refresh requests"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Requests List vs Empty State */}
        {!isAvailable ? (
          /* Donor Not Available Banner */
          <div className="bg-slate-100 p-8 rounded-3xl border border-slate-200 text-center space-y-3">
            <Inbox className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-extrabold text-slate-800 text-base">
              You are currently marked as NOT AVAILABLE
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
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
          /* No Requests Found Empty State */
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-extrabold text-slate-800 text-base">
              No matching blood requests in this radius
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              There are currently no active emergency blood requests within {selectedRadius} km matching blood group {user?.bloodGroup || 'O+'}.
            </p>
            <button
              onClick={() => setSelectedRadius(20)}
              className="text-xs font-bold text-red-600 hover:underline inline-block pt-1"
            >
              Expand Search Radius to 20 km →
            </button>
          </div>
        ) : (
          /* Request Cards Grid */
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