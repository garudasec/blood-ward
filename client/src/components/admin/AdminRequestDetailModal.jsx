import React from 'react';
import {
  X,
  Building2,
  MapPin,
  Calendar,
  AlertTriangle,
  Users,
  ShieldCheck,
  CheckCircle2,
  Ban,
  User,
} from 'lucide-react';
import BloodGroupBadge from '../common/BloodGroupBadge';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';

export default function AdminRequestDetailModal({ request, isOpen, onClose, onCancelRequest }) {
  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white max-w-xl w-full rounded-3xl border border-slate-200 shadow-2xl overflow-hidden space-y-0">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
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

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {request.urgency === 'Emergency' && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>LIVE EMERGENCY BROADCAST: High priority alert active for this request.</span>
            </div>
          )}

          {/* Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Recipient</span>
              <span className="font-bold text-slate-900 text-xs block mt-1">
                {request.recipientName}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Blood Group</span>
              <div className="mt-1">
                <BloodGroupBadge group={request.bloodGroup} size="sm" />
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Units</span>
              <span className="font-extrabold text-slate-900 text-xs block mt-1">
                {request.unitsNeeded} Unit(s)
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Donors Accepted</span>
              <span className="font-extrabold text-emerald-700 text-xs block mt-1">
                {request.donorResponsesCount} Donor(s)
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2.5 text-slate-700">
              <Building2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-slate-900">Hospital Facility:</span>
                <span className="text-slate-600">{request.hospitalName}, {request.city}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-slate-700">
              <Calendar className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-slate-900">Required Date:</span>
                <span className="text-slate-600">{request.requiredDate}</span>
              </div>
            </div>
          </div>

          {/* Clinical notes */}
          {request.additionalNotes && (
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-800">Clinical / Request Notes:</span>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200 italic">
                "{request.additionalNotes}"
              </p>
            </div>
          )}

          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Administrative Governance: Flagging or cancelling suspicious requests prevents fraudulent broadcasts.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          {request.status !== 'Cancelled' && (
            <button
              onClick={() => {
                onCancelRequest(request);
                onClose();
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 px-3 py-2 rounded-xl hover:bg-rose-50 flex items-center gap-1"
            >
              <Ban className="w-4 h-4" /> Cancel / Flag Request
            </button>
          )}

          <Button variant="outline" size="sm" onClick={onClose} className="ml-auto">
            Close Modal
          </Button>
        </div>
      </div>
    </div>
  );
}