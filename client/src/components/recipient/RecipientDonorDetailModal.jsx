import React from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  PlusCircle,
  MapPin,
} from "lucide-react";
import BloodGroupBadge from "../common/BloodGroupBadge";
import Button from "../common/Button";
import { DONOR_COMPATIBILITY } from "../../constants/theme";

export default function RecipientDonorDetailModal({ donor, isOpen, onClose }) {
  const navigate = useNavigate();

  if (!isOpen || !donor) return null;

  const compatibleRecipients = DONOR_COMPATIBILITY[donor.bloodGroup] || [];

  const handleCreateRequest = () => {
    onClose();
    navigate(`/recipient/requests/create?bloodGroup=${encodeURIComponent(donor.bloodGroup)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 max-w-lg w-full rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden space-y-0">
        {/* Header */}
        <div className="p-5 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center font-bold text-base font-mono">
              {(donor.name || donor.fullName || "D").charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-zinc-950 dark:text-zinc-100">{donor.name || donor.fullName}</h3>
                <BloodGroupBadge group={donor.bloodGroup} size="sm" />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {donor.city}{donor.state ? `, ${donor.state}` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Availability Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-xs font-mono">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">Availability Status:</span>
            {donor.isAvailable ? (
              <span className="font-bold text-zinc-950 dark:text-zinc-100 bg-zinc-200 dark:bg-zinc-700 px-2.5 py-0.5 rounded-md flex items-center gap-1.5 border border-zinc-300 dark:border-zinc-600">
                <span className="w-2 h-2 rounded-full bg-zinc-950 dark:bg-emerald-400" /> Available to Donate
              </span>
            ) : (
              <span className="font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-md flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-700">
                <span className="w-2 h-2 rounded-full bg-zinc-400" /> Unavailable
              </span>
            )}
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Proximity</span>
              <span className="font-bold text-zinc-950 dark:text-zinc-100 text-xs block mt-1">
                {typeof donor.distanceKm === "number" ? `~ ${donor.distanceKm} KM` : "City Search"}
              </span>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Location Privacy</span>
              <span className="font-bold text-zinc-950 dark:text-zinc-100 text-xs block mt-1">
                ~500m Centroid Coarsened
              </span>
            </div>
          </div>

          {/* Compatibility List */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
              Recipients compatible with {donor.bloodGroup} donor blood:
            </span>
            <div className="flex flex-wrap gap-1.5 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
              {compatibleRecipients.map((bg) => (
                <BloodGroupBadge key={bg} group={bg} size="sm" />
              ))}
            </div>
          </div>

          {/* Privacy Disclaimer */}
          <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-zinc-950 dark:text-zinc-100">
              <ShieldCheck className="w-4 h-4 text-zinc-950 dark:text-zinc-100" /> Donor Privacy Protected
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
              Exact residential street address and contact phone number remain shielded until a blood request is created and accepted by this donor.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          <Button variant="primary" size="sm" onClick={handleCreateRequest} className="font-semibold">
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Request Blood for {donor.bloodGroup}
          </Button>
        </div>
      </div>
    </div>
  );
}
