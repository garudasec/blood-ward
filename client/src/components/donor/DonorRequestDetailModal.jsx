import React from "react";
import {
  X,
  Building2,
  Calendar,
  AlertTriangle,
  Check,
  Clock,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import BloodGroupBadge from "../common/BloodGroupBadge";
import StatusBadge from "../common/StatusBadge";
import Button from "../common/Button";
import { requestService } from "../../services/requestService";

export default function DonorRequestDetailModal({ request, isOpen, onClose, onAccept, onDecline }) {
  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-theme-modal max-w-xl w-full rounded-3xl border border-theme shadow-2xl overflow-hidden space-y-0">
        {/* Header */}
        <div className="p-6 bg-theme-modal-header text-theme-primary flex items-center justify-between border-b border-theme">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-red-500 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
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

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Emergency Alert Banner */}
          {request.urgency === "Emergency" && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-xs flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>CRITICAL EMERGENCY: Immediate donor arrival required for procedure.</span>
            </div>
          )}

          {/* Key Parameters Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-theme-card-elevated p-3 rounded-2xl border border-theme text-center">
              <span className="text-[10px] uppercase font-bold text-theme-muted block">Blood Group</span>
              <div className="mt-1">
                <BloodGroupBadge group={request.bloodGroup} size="sm" />
              </div>
            </div>

            <div className="bg-theme-card-elevated p-3 rounded-2xl border border-theme text-center">
              <span className="text-[10px] uppercase font-bold text-theme-muted block">Units</span>
              <span className="font-extrabold text-theme-primary text-sm block mt-1">
                {request.unitsNeeded} Unit(s)
              </span>
            </div>

            <div className="bg-theme-card-elevated p-3 rounded-2xl border border-theme text-center">
              <span className="text-[10px] uppercase font-bold text-theme-muted block">Distance</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm block mt-1">
                ~ {request.distanceKm} km
              </span>
            </div>

            <div className="bg-theme-card-elevated p-3 rounded-2xl border border-theme text-center">
              <span className="text-[10px] uppercase font-bold text-theme-muted block">Urgency</span>
              <span className="font-extrabold text-theme-primary text-sm block mt-1">
                {request.urgency}
              </span>
            </div>
          </div>

          {/* Hospital & Time Details */}
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2.5 text-theme-secondary">
              <Building2 className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-theme-primary">Hospital Address:</span>
                <span className="text-theme-muted">{request.hospitalName}, {request.city}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-theme-secondary">
              <Calendar className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-theme-primary">Required Timeline:</span>
                <span className="text-theme-muted">{request.requiredDate}</span>
              </div>
            </div>
          </div>

          {/* Clinical Notes */}
          {request.additionalNotes && (
            <div className="space-y-1">
              <span className="text-xs font-bold text-theme-primary">Additional Request Information:</span>
              <p className="text-xs text-theme-secondary bg-theme-subtle p-3 rounded-2xl border border-theme italic">
                "{request.additionalNotes}"
              </p>
            </div>
          )}

          {/* Privacy Workflow Disclosure */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" /> Secure Contact Exchange
            </div>
            <p className="text-[11px] leading-relaxed">
              When you click <strong>"Accept Request"</strong>, BloodWard securely discloses your contact phone number to the hospital blood coordinator to facilitate immediate donation routing.
            </p>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-theme-modal-footer border-t border-theme flex items-center justify-between gap-3">
          <button
            onClick={() => {
              if (onDecline) onDecline(request.id);
              onClose();
            }}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 px-3 py-2 rounded-xl hover:bg-rose-500/10 cursor-pointer"
          >
            Decline Request
          </button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            {request.status === "Donor Accepted" ? (
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  try {
                    await requestService.markInProgress(request.id);
                    if (onAccept) onAccept(request.id);
                    onClose();
                  } catch (err) {
                    alert(err.message || "Failed to mark in progress");
                  }
                }}
                className="font-bold bg-blue-600 hover:bg-blue-700"
              >
                <Clock className="w-4 h-4 mr-1" /> Mark In Progress
              </Button>
            ) : request.status === "In Progress" ? (
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  try {
                    await requestService.fulfill(request.id);
                    if (onAccept) onAccept(request.id);
                    onClose();
                  } catch (err) {
                    alert(err.message || "Failed to fulfill request");
                  }
                }}
                className="font-bold bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" /> Mark as Fulfilled
              </Button>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
