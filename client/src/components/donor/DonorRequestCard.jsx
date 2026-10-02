import React, { useState } from 'react';
import { MapPin, Clock, AlertTriangle, Check, X, Building2, Calendar } from 'lucide-react';
import BloodGroupBadge from '../common/BloodGroupBadge';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';

export default function DonorRequestCard({ request, onAccept, onDecline }) {
  const [isResponding, setIsResponding] = useState(false);
  const [responseState, setResponseState] = useState(null); // 'ACCEPTED' | 'DECLINED'

  const handleAcceptClick = () => {
    setIsResponding(true);
    setTimeout(() => {
      setIsResponding(false);
      setResponseState('ACCEPTED');
      if (onAccept) onAccept(request.id);
    }, 400);
  };

  const handleDeclineClick = () => {
    setIsResponding(true);
    setTimeout(() => {
      setIsResponding(false);
      setResponseState('DECLINED');
      if (onDecline) onDecline(request.id);
    }, 300);
  };

  if (responseState === 'DECLINED') {
    return null; // Remove declined card from active view
  }

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
        request.urgency === 'Emergency'
          ? 'border-red-300 shadow-md ring-1 ring-red-200'
          : 'border-slate-200 shadow-xs hover:shadow-md'
      }`}
    >
      {/* Emergency Header Bar if Emergency */}
      {request.urgency === 'Emergency' && (
        <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-4 py-1.5 text-xs font-bold flex items-center justify-between">
          <span className="flex items-center gap-1.5 animate-pulse">
            <AlertTriangle className="w-4 h-4 fill-current" /> URGENT EMERGENCY REQUIREMENT
          </span>
          <span className="text-[10px] uppercase font-extrabold bg-white/20 px-2 py-0.5 rounded">
            Priority Alert
          </span>
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Request Top Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
              <h4 className="font-extrabold text-slate-900 text-base leading-snug">
                {request.hospitalName}
              </h4>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 pl-6">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{request.city}</span>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ~ {request.distanceKm} km away
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <BloodGroupBadge group={request.bloodGroup} size="md" />
            <StatusBadge status={request.status} urgency={request.urgency} />
          </div>
        </div>

        {/* Requirements Detail Bar */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-xs text-slate-700 border border-slate-100">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Units Required:
            </span>
            <span className="font-bold text-slate-900">{request.unitsNeeded} Unit(s)</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Needed By:
            </span>
            <span className="font-bold text-slate-900 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-red-500" /> {request.requiredDate}
            </span>
          </div>
        </div>

        {/* Additional Notes */}
        {request.additionalNotes && (
          <p className="text-xs text-slate-600 italic bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
            "{request.additionalNotes}"
          </p>
        )}

        {/* Response Action State */}
        {responseState === 'ACCEPTED' ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between font-semibold">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" /> You accepted this blood request!
            </span>
            <span className="text-[11px] underline cursor-pointer hover:text-emerald-950">
              View Hospital Contacts
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              onClick={handleDeclineClick}
              disabled={isResponding}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Decline
            </button>

            <Button
              variant={request.urgency === 'Emergency' ? 'primary' : 'secondary'}
              size="sm"
              isLoading={isResponding}
              onClick={handleAcceptClick}
              className="font-bold shadow-sm"
            >
              <Check className="w-4 h-4 mr-1" /> Respond & Accept Request
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}