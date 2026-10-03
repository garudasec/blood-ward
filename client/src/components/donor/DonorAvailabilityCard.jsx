import React, { useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck, Power } from "lucide-react";
import Button from "../common/Button";

export default function DonorAvailabilityCard({ isAvailable, onToggle }) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleClick = async () => {
    setIsUpdating(true);
    try {
      await onToggle();
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-theme-card p-6 sm:p-8 rounded-3xl border border-theme shadow-sm relative overflow-hidden space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-theme-primary text-lg">Donation Availability</h3>
            {isAvailable ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> AVAILABLE NOW
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-theme-subtle text-theme-muted border border-theme">
                <XCircle className="w-3.5 h-3.5" /> NOT AVAILABLE
              </span>
            )}
          </div>
          <p className="text-xs text-theme-secondary max-w-xl">
            {isAvailable
              ? "You are active in emergency donor searches for nearby recipients requiring your blood group."
              : "You are currently hidden from active donor search results. Toggle on whenever you are ready to donate."}
          </p>
        </div>

        <Button
          variant={isAvailable ? "secondary" : "primary"}
          size="md"
          isLoading={isUpdating}
          onClick={handleToggleClick}
          className="shrink-0 font-bold"
        >
          <Power className="w-4 h-4 mr-1.5" />
          {isAvailable ? "Set to Not Available" : "Switch to Available"}
        </Button>
      </div>

      <div className="pt-3 border-t border-theme flex items-center justify-between text-[11px] text-theme-muted">
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Location Privacy Active: Exact home address remains protected</span>
        </div>
        <span className="hidden md:inline text-theme-muted">Instant Socket.io alerts enabled</span>
      </div>
    </div>
  );
}
