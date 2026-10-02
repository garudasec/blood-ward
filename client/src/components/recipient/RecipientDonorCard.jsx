import React from 'react';
import { MapPin, Clock, CheckCircle2, XCircle, ShieldCheck, HeartHandshake, Eye } from 'lucide-react';
import BloodGroupBadge from '../common/BloodGroupBadge';
import Button from '../common/Button';

export default function RecipientDonorCard({ donor, onViewDetails }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
      {/* Top Row: Blood Group & Availability */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-extrabold text-slate-900 text-base leading-snug">
              {donor.name}
            </h4>
            <BloodGroupBadge group={donor.bloodGroup} size="sm" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{donor.city}</span>
          </div>
        </div>

        {donor.isAvailable ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> AVAILABLE
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle className="w-3 h-3" /> NOT AVAILABLE
          </span>
        )}
      </div>

      {/* Proximity & Activity Matrix */}
      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs text-slate-700 border border-slate-100">
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Proximity:</span>
          <span className="font-bold text-emerald-700">~ {donor.distanceKm} km away</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Activity:</span>
          <span className="font-semibold text-slate-800 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" /> {donor.lastActive}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onViewDetails && onViewDetails(donor)}
        className="w-full justify-center font-bold text-xs"
      >
        <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" /> View Profile & Match Info
      </Button>
    </div>
  );
}