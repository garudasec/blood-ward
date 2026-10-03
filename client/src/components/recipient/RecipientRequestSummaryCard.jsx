import React from "react";
import { Building2, MapPin, Calendar, Users, Phone, CheckCircle2, AlertTriangle, Eye } from "lucide-react";
import BloodGroupBadge from "../common/BloodGroupBadge";
import StatusBadge from "../common/StatusBadge";
import Button from "../common/Button";

export default function RecipientRequestSummaryCard({ request, onViewDetails }) {
  return (
    <div
      className={`bg-theme-card rounded-2xl border overflow-hidden transition-all duration-200 ${
        request.urgency === "Emergency"
          ? "border-red-500/40 shadow-md ring-1 ring-red-500/30"
          : "border-theme shadow-xs hover:shadow-md"
      }`}
    >
      {/* Emergency Header */}
      {request.urgency === "Emergency" && (
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
              <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
              <h4 className="font-extrabold text-theme-primary text-base leading-snug">
                {request.hospitalName}
              </h4>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-theme-muted pl-6">
              <MapPin className="w-3.5 h-3.5 text-theme-muted" />
              <span>{request.city}</span>
              <span className="text-theme-muted">•</span>
              <span className="text-theme-muted">Created {request.createdAt}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <BloodGroupBadge group={request.bloodGroup} size="md" />
            <StatusBadge status={request.status} urgency={request.urgency} />
          </div>
        </div>

        {/* Requirements Summary Bar */}
        <div className="grid grid-cols-2 gap-2 bg-theme-card-elevated p-3 rounded-xl text-xs text-theme-secondary border border-theme">
          <div>
            <span className="text-theme-muted block text-[10px] uppercase font-semibold">
              Units Required:
            </span>
            <span className="font-bold text-theme-primary">{request.unitsNeeded} Unit(s)</span>
          </div>
          <div>
            <span className="text-theme-muted block text-[10px] uppercase font-semibold">
              Target Date:
            </span>
            <span className="font-bold text-theme-primary flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-500" /> {request.requiredDate}
            </span>
          </div>
        </div>

        {/* Donor Response Section */}
        {request.acceptedDonorDetails ? (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl space-y-2">
            <div className="flex items-center justify-between font-bold text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Donor Accepted Request!
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded font-extrabold">
                Contact Unlocked
              </span>
            </div>

            <div className="bg-theme-card p-2 rounded-lg border border-emerald-500/30 text-[11px] flex items-center justify-between">
              <div>
                <span className="font-bold text-theme-primary">{request.acceptedDonorDetails.fullName}</span>
                <span className="text-theme-muted ml-1">
                  ({request.acceptedDonorDetails.bloodGroup}{request.acceptedDonorDetails.city ? `, ${request.acceptedDonorDetails.city}` : ""})
                </span>
              </div>
              <a
                href={`tel:${request.acceptedDonorDetails.phone}`}
                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Phone className="w-3 h-3 text-emerald-500" /> {request.acceptedDonorDetails.phone}
              </a>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs rounded-xl flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <Users className="w-4 h-4 text-blue-500" /> Broadcast active to nearby available donors
            </span>
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 animate-pulse">
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
          <Eye className="w-3.5 h-3.5 mr-1 text-theme-muted" /> Track & Manage Request Details
        </Button>
      </div>
    </div>
  );
}
