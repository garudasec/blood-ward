import React from "react";
import { MapPin, Clock, CheckCircle2, XCircle, Eye } from "lucide-react";
import BloodGroupBadge from "../common/BloodGroupBadge";
import Button from "../common/Button";

export default function RecipientDonorCard({ donor, onViewDetails }) {
  return (
    <div className="bg-theme-card p-5 rounded-2xl border border-theme shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
      {/* Top Row: Blood Group & Availability */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-extrabold text-theme-primary text-base leading-snug">
              {donor.name}
            </h4>
            <BloodGroupBadge group={donor.bloodGroup} size="sm" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-theme-muted">
            <MapPin className="w-3.5 h-3.5 text-theme-muted" />
            <span>{donor.city}</span>
          </div>
        </div>

        {donor.isAvailable ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> AVAILABLE
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-theme-subtle text-theme-muted border border-theme">
            <XCircle className="w-3 h-3" /> NOT AVAILABLE
          </span>
        )}
      </div>

      {/* Proximity & Activity Matrix */}
      <div className="grid grid-cols-2 gap-2 bg-theme-card-elevated p-2.5 rounded-xl text-xs text-theme-secondary border border-theme">
        <div>
          <span className="text-theme-muted block text-[10px] uppercase font-semibold">Proximity:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">~ {donor.distanceKm} km away</span>
        </div>
        <div>
          <span className="text-theme-muted block text-[10px] uppercase font-semibold">Activity:</span>
          <span className="font-semibold text-theme-primary flex items-center gap-1">
            <Clock className="w-3 h-3 text-theme-muted" /> {donor.lastActive}
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
        <Eye className="w-3.5 h-3.5 mr-1 text-theme-muted" /> View Profile & Match Info
      </Button>
    </div>
  );
}
