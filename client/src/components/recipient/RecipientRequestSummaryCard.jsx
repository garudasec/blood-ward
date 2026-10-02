import React from 'react';
import { Building2, MapPin, Calendar, Users, Phone, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';
import BloodGroupBadge from '../common/BloodGroupBadge';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';

export default function RecipientRequestSummaryCard({ request, onViewDetails }) {
  return (
    <div
      className={`bg-white rounded-2xl border overflow-hidden transition-all duration-200 ${
        request.urgency === 'Emergency'
          ? 'border-red-300 shadow-md ring-1 ring-red-200'
          : 'border-slate-200 shadow-xs hover:shadow-md'
      }`}
    >
      {/* Emergency Header */}
      {request.urgency === 'Emergency' && (
        <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-4 py-1.5 text-xs font-bold flex items-center justify-between">
          <span className="flex items-center gap-1.5 animate-pulse">
            <AlertTriangle className="w-4 h-4 fill-current" /> URGENT EMERGENCY REQUEST BROADCAST
          </span>
          <span className="text-[10px] uppercase font-extrabold bg-white/20 px-2 py-0.5 rounded">
            Live Alert
          </span>
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Top Info */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
              <h4 className="font-extrabold text-slate-900 text-base leading-snug">
                {request.hospitalName}
              </h4>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 pl-6">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{request.city}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-400">Created {request.createdAt}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <BloodGroupBadge group={request.bloodGroup} size="md" />
            <StatusBadge status={request.status} urgency={request.urgency} />
          </div>
        </div>

        {/* Requirements Summary Bar */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-xs text-slate-700 border border-slate-100">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Units Required:
            </span>
            <span className="font-bold text-slate-900">{request.unitsNeeded} Unit(s)</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Target Date:
            </span>
            <span className="font-bold text-slate-900 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-500" /> {request.requiredDate}
            </span>
          </div>
        </div>

        {/* Donor Response Section */}
        {request.acceptedDonors && request.acceptedDonors.length > 0 ? (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl space-y-2">
            <div className="flex items-center justify-between font-bold text-emerald-800">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {request.acceptedDonors.length} Donor(s) Accepted Request!
              </span>
              <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-extrabold">
                Contacts Unlocked
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              {request.acceptedDonors.map((donor, idx) => (
                <div
                  key={idx}
                  className="bg-white p-2 rounded-lg border border-emerald-200 text-[11px] flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900">{donor.name}</span>
                    <span className="text-slate-500 ml-1">({donor.bloodGroup}, ~{donor.distanceKm}km)</span>
                  </div>
                  <a
                    href={`tel:${donor.phone}`}
                    className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3 text-emerald-600" /> {donor.phone}
                  </a>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-blue-50/70 border border-blue-200 text-blue-800 text-xs rounded-xl flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <Users className="w-4 h-4 text-blue-600" /> Broadcast active to nearby available donors
            </span>
            <span className="text-[11px] font-bold text-blue-600 animate-pulse">
              Awaiting Donors...
            </span>
          </div>
        )}

        {/* Action Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails && onViewDetails(request.id)}
          className="w-full justify-center text-xs font-semibold"
        >
          <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" /> Track & Manage Request Details
        </Button>
      </div>
    </div>
  );
}