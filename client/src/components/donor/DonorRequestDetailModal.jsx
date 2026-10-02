import React from 'react';
import {
  X,
  Building2,
  MapPin,
  Calendar,
  AlertTriangle,
  Check,
  ShieldCheck,
  Phone,
  UserCheck,
} from 'lucide-react';
import BloodGroupBadge from '../common/BloodGroupBadge';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';

export default function DonorRequestDetailModal({ request, isOpen, onClose, onAccept, onDecline }) {
  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white max-w-xl w-full rounded-3xl border border-slate-200 shadow-2xl overflow-hidden space-y-0">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                REF #{request.id}
              </span>
              <StatusBadge status={request.status} urgency={request.urgency} />
            </div>
            <h3 className="font-extrabold text-lg text-white leading-snug">
              {request.hospitalName}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Emergency Alert Banner */}
          {request.urgency === 'Emergency' && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>CRITICAL EMERGENCY: Immediate donor arrival required for procedure.</span>
            </div>
          )}

          {/* Key Parameters Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Blood Group</span>
              <div className="mt-1">
                <BloodGroupBadge group={request.bloodGroup} size="sm" />
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Units</span>
              <span className="font-extrabold text-slate-900 text-sm block mt-1">
                {request.unitsNeeded} Unit(s)
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Distance</span>
              <span className="font-extrabold text-emerald-700 text-sm block mt-1">
                ~ {request.distanceKm} km
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Urgency</span>
              <span className="font-extrabold text-slate-900 text-sm block mt-1">
                {request.urgency}
              </span>
            </div>
          </div>

          {/* Hospital & Time Details */}
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2.5 text-slate-700">
              <Building2 className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-slate-900">Hospital Address:</span>
                <span className="text-slate-600">{request.hospitalName}, {request.city}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-slate-700">
              <Calendar className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-slate-900">Required Timeline:</span>
                <span className="text-slate-600">{request.requiredDate}</span>
              </div>
            </div>
          </div>

          {/* Clinical Notes */}
          {request.additionalNotes && (
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-800">Additional Request Information:</span>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 italic">
                "{request.additionalNotes}"
              </p>
            </div>
          )}

          {/* Privacy Workflow Disclosure */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Secure Contact Exchange
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              When you click <strong>"Accept Request"</strong>, BloodWard securely discloses your contact phone number to the hospital blood coordinator to facilitate immediate donation routing.
            </p>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              if (onDecline) onDecline(request.id);
              onClose();
            }}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 px-3 py-2 rounded-xl hover:bg-rose-50"
          >
            Decline Request
          </button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (onAccept) onAccept(request.id);
                onClose();
              }}
              className="font-bold"
            >
              <Check className="w-4 h-4 mr-1" /> Accept & Unlock Contacts
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}