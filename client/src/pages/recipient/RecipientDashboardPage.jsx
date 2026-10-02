import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  PlusCircle,
  AlertTriangle,
  FileText,
  MapPin,
  Clock,
  HeartHandshake,
  ArrowRight,
  Inbox,
  User,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import Button from '../../components/common/Button';
import RecipientSummaryStats from '../../components/recipient/RecipientSummaryStats';
import RecipientRequestSummaryCard from '../../components/recipient/RecipientRequestSummaryCard';
import { MOCK_RECIPIENT_REQUESTS, MOCK_RECIPIENT_STATS } from '../../constants/mockData';

export default function RecipientDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeRequests, setActiveRequests] = useState(MOCK_RECIPIENT_REQUESTS);

  return (
    <div className="space-y-8 pb-12">
      {/* 1. WELCOME HEADER */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {user?.fullName || 'Recipient'}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Registered Search Location: <strong className="text-white">{user?.city || 'New York'}</strong></span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/recipient/donors')}
              className="font-bold shadow-md shadow-red-600/20"
            >
              <Search className="w-4 h-4 mr-1" /> Search Donors
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/recipient/requests/create')}
              className="bg-slate-800/80 border-slate-700 text-white hover:bg-slate-700"
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
          onClick={() => navigate('/recipient/requests/create?emergency=true')}
          className="shrink-0 font-extrabold bg-slate-950 hover:bg-slate-900 text-white border-0 shadow-xl"
        >
          Create Emergency Request 🚨
        </Button>
      </div>

      {/* 3. RECIPIENT SUMMARY STATS */}
      <RecipientSummaryStats stats={MOCK_RECIPIENT_STATS} />

      {/* 4. ACTIVE BLOOD REQUESTS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="space-y-0.5">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" /> Your Active Requests
            </h2>
            <p className="text-xs text-slate-500">
              Track donor acceptances, unlocked contacts, and request statuses
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/recipient/requests')}
          >
            View All Requests →
          </Button>
        </div>

        {activeRequests.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-extrabold text-slate-800 text-base">No active blood requests</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              You do not have any active blood requests. Search available donors or create a new request when needed.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/recipient/requests/create')}
            >
              Create Request Now
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeRequests.map((req) => (
              <RecipientRequestSummaryCard
                key={req.id}
                request={req}
                onViewDetails={() => navigate('/recipient/requests')}
              />
            ))}
          </div>
        )}
      </div>

      {/* 5. RECENT ACTIVITY TIMELINE SNIPPET */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" /> Recent Request Activity
        </h3>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900">
                Donor David Miller (A+) accepted Emergency Request #req-301
              </p>
              <p className="text-slate-500 text-[11px]">Phone contact unlocked • 20 mins ago</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shrink-0">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900">
                Created High Urgency Request #req-302 at Memorial Trauma Center
              </p>
              <p className="text-slate-500 text-[11px]">Broadcast active to 4 donors in radius • 2 hours ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}