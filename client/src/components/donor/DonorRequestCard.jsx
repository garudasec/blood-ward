import React, { useState } from "react";
import { MapPin, AlertTriangle, Check, X, Building2, Calendar } from "lucide-react";
import BloodGroupBadge from "../common/BloodGroupBadge";
import StatusBadge from "../common/StatusBadge";
import Button from "../common/Button";

export default function DonorRequestCard({ request, onAccept, onDecline }) {
  const [isResponding, setIsResponding] = useState(false);
  const [responseState, setResponseState] = useState(null); // "ACCEPTED" | "DECLINED"

  const handleAcceptClick = () => {
    setIsResponding(true);
    setTimeout(() => {
      setIsResponding(false);
      setResponseState("ACCEPTED");
      if (onAccept) onAccept(request.id);
    }, 400);
  };

  const handleDeclineClick = () => {
    setIsResponding(true);
    setTimeout(() => {
      setIsResponding(false);
      setResponseState("DECLINED");
      if (onDecline) onDecline(request.id);
    }, 300);
  };

  if (responseState === "DECLINED") {
    return null;
  }

  return (
    <div
      className={`bg-theme-card rounded-2xl border transition-all duration-200 overflow-hidden ${
        request.urgency === "Emergency"
          ? "border-red-500/40 shadow-md ring-1 ring-red-500/30"
          : "border-theme shadow-xs hover:shadow-md"
      }`}
    >
      {/* Emergency Header Bar if Emergency */}
      {request.urgency === "Emergency" && (
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
              <Building2 className="w-4 h-4 text-theme-muted shrink-0" />
              <h4 className="font-extrabold text-theme-primary text-base leading-snug">
                {request.hospitalName}
              </h4>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-theme-muted pl-6">
              <MapPin className="w-3.5 h-3.5 text-theme-muted" />
              <span>{request.city}</span>
              <span className="text-theme-muted">•</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
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
        <div className="grid grid-cols-2 gap-2 bg-theme-card-elevated p-3 rounded-xl text-xs text-theme-secondary border border-theme">
          <div>
            <span className="text-theme-muted block text-[10px] uppercase font-semibold">
              Units Required:
            </span>
            <span className="font-bold text-theme-primary">{request.unitsNeeded} Unit(s)</span>
          </div>
          <div>
            <span className="text-theme-muted block text-[10px] uppercase font-semibold">
              Needed By:
            </span>
            <span className="font-bold text-theme-primary flex items-center gap-1">
              <Calendar className="w-3 h-3 text-red-500" /> {request.requiredDate}
            </span>
          </div>
        </div>

        {/* Additional Notes */}
        {request.additionalNotes && (
          <p className="text-xs text-theme-secondary italic bg-theme-subtle p-2.5 rounded-lg border border-theme">
            "{request.additionalNotes}"
          </p>
        )}

        {/* Response Action State */}
        {responseState === "ACCEPTED" ? (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl flex items-center justify-between font-semibold">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" /> You accepted this blood request!
            </span>
            <span className="text-[11px] underline cursor-pointer hover:text-emerald-800">
              View Hospital Contacts
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              onClick={handleDeclineClick}
              disabled={isResponding}
              className="text-xs font-semibold text-theme-muted hover:text-theme-primary px-3 py-2 rounded-xl hover:bg-theme-subtle transition-colors flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Decline
            </button>

            <Button
              variant={request.urgency === "Emergency" ? "primary" : "secondary"}
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
