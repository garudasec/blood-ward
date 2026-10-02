import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { HeartHandshake, CheckCircle2, XCircle, Droplet } from 'lucide-react';
import BloodGroupBadge from '../../components/common/BloodGroupBadge';

export default function DonorDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900">
              Welcome back, {user?.fullName || 'Donor'}!
            </h1>
            {user?.bloodGroup && <BloodGroupBadge group={user.bloodGroup} size="sm" />}
          </div>
          <p className="text-xs text-slate-500">
            Donor Dashboard & Overview • {user?.city || 'Location set'}
          </p>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs font-semibold">
          <span>Current Availability:</span>
          {user?.isAvailable ? (
            <span className="text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> AVAILABLE
            </span>
          ) : (
            <span className="text-slate-600 bg-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold">
              <XCircle className="w-3.5 h-3.5" /> NOT AVAILABLE
            </span>
          )}
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
        <Droplet className="w-10 h-10 text-red-500 mx-auto" />
        <h3 className="font-bold text-slate-900 text-lg">Donor Features Arriving in Phase 6</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Nearby blood request alerts, request acceptance/rejection, profile editing, and donation history will be implemented in Phase 6.
        </p>
      </div>
    </div>
  );
}