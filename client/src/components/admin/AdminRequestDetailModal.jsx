import React from "react";
import {
  X,
  Building2,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  Ban,
} from "lucide-react";
import BloodGroupBadge from "../common/BloodGroupBadge";
import StatusBadge from "../common/StatusBadge";
import Button from "../common/Button";

export default function AdminRequestDetailModal({ request, isOpen, onClose, onCancelRequest }) {
  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-theme-modal max-w-xl w-full rounded-3xl border border-theme shadow-2xl overflow-hidden space-y-0">
        {/* Header */}
        <div className="p-6 bg-theme-modal-header text-theme-primary flex items-center justify-between border-b border-theme">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-500 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                REF #{request.id}
              </span>
              <StatusBadge status={request.status} urgency={request.urgency} />
            </div>
            <h3 className="font-extrabold text-lg text-theme-primary leading-snug">
              {request.hospitalName}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-theme-subtle hover:bg-theme-hover text-theme-secondary hover:text-theme-primary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {request.urgency === "Emergency" && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-xs flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>LIVE EMERGENCY BROADCAST: High priority alert active for this request.</span>
            </div>
          )}

          {/* Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-theme-card-elevated p-3 rounded-2xl border border-theme">
              <span className="text-[10px] uppercase font-bold text-theme-muted block">Recipient</span>
              <span className="font-bold text-theme-primary text-xs block mt-1">
                {request.recipientName}
              </span>
            </div>

            <div className="bg-theme-card-elevated p-3 rounded-2xl border border-theme">
              <span className="text-[10px] uppercase font-bold text-theme-muted block">Blood Group</span>
              <div className="mt-1">
                <BloodGroupBadge group={request.bloodGroup} size="sm" />
              </div>
            </div>

            <div className="bg-theme-card-elevated p-3 rounded-2xl border border-theme">
              <span className="text-[10px] uppercase font-bold text-theme-muted block">Units</span>
              <span className="font-extrabold text-theme-primary text-xs block mt-1">
                {request.unitsNeeded} Unit(s)
              </span>
            </div>

            <div className="bg-theme-card-elevated p-3 rounded-2xl border border-theme">
              <span className="text-[10px] uppercase font-bold text-theme-muted block">Donors Accepted</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs block mt-1">
                {request.donorResponsesCount} Donor(s)
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2.5 text-theme-secondary">
              <Building2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-theme-primary">Hospital Facility:</span>
                <span className="text-theme-muted">{request.hospitalName}, {request.city}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-theme-secondary">
              <Calendar className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-theme-primary">Required Date:</span>
                <span className="text-theme-muted">{request.requiredDate}</span>
              </div>
            </div>
          </div>

          {/* Clinical notes */}
          {request.additionalNotes && (
            <div className="space-y-1">
              <span className="text-xs font-bold text-theme-primary">Clinical / Request Notes:</span>
              <p className="text-xs text-theme-secondary bg-theme-subtle p-3 rounded-2xl border border-theme italic">
                "{request.additionalNotes}"
              </p>
            </div>
          )}

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Administrative Governance: Flagging or cancelling suspicious requests prevents fraudulent broadcasts.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-theme-modal-footer border-t border-theme flex items-center justify-between gap-3">
          {request.status !== "Cancelled" && (
            <button
              onClick={() => {
                onCancelRequest(request);
                onClose();
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 px-3 py-2 rounded-xl hover:bg-rose-500/10 flex items-center gap-1 cursor-pointer"
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
