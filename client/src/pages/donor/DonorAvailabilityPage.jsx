import api from "../../services/api";
import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  CheckCircle2,
  XCircle,
  Bell,
  ShieldCheck,
  Info,
  X,
  Power,
  Zap,
} from "lucide-react";
import DonorAvailabilityCard from "../../components/donor/DonorAvailabilityCard";

export default function DonorAvailabilityPage() {
  const { user, updateUser } = useAuth();
  const [feedback, setFeedback] = useState(null);

  const isAvailable = user?.availability === "available" || user?.isAvailable;

  const handleToggle = async () => {
    const nextState = !isAvailable;
    const nextAvailability = nextState ? "available" : "not_available";
    updateUser({ availability: nextAvailability, isAvailable: nextState });
    try {
      await api.patch("/donors/me/availability", { availability: nextAvailability });
    } catch (err) {
      console.error("Failed to update availability:", err);
    }
    setFeedback(
      nextState
        ? "Status updated to AVAILABLE. You are now active in emergency donor search."
        : "Status updated to NOT AVAILABLE. Emergency alerts and search visibility paused."
    );
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-theme-card p-6 sm:p-8 rounded-3xl border border-theme shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <Power className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-theme-primary tracking-tight">
              Donation Availability Control
            </h1>
            <p className="text-xs text-theme-muted">
              Control your visibility in emergency blood discovery and real-time alert dispatch
            </p>
          </div>
        </div>
      </div>

      {/* Instant Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs transition-all ${
            isAvailable
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300"
          }`}
        >
          <span className="flex items-center gap-2">
            {isAvailable ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            {feedback}
          </span>
          <button onClick={() => setFeedback(null)} className="text-theme-muted hover:text-theme-primary cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Reused Donor Availability Card */}
      <DonorAvailabilityCard isAvailable={isAvailable} onToggle={handleToggle} />

      {/* Impact Explanation Section */}
      <div className="bg-theme-card p-6 sm:p-8 rounded-3xl border border-theme shadow-sm space-y-6">
        <h2 className="text-lg font-extrabold text-theme-primary tracking-tight border-b border-theme pb-3">
          How Availability Status Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AVAILABLE MODE EFFECT */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              isAvailable
                ? "bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20"
                : "bg-theme-card-elevated border-theme opacity-75"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> AVAILABLE MODE
              </span>
              <span className="text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">
                Active
              </span>
            </div>
            <ul className="space-y-2 text-xs text-theme-secondary">
              <li className="flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>You appear in active donor search queries for blood group <strong>{user?.bloodGroup || "O+"}</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <Bell className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>You receive push notifications for emergency blood requests within your city/radius.</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Only approximate distance is shown until you explicitly accept a request.</span>
              </li>
            </ul>
          </div>

          {/* NOT AVAILABLE MODE EFFECT */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              !isAvailable
                ? "bg-theme-subtle border-theme ring-1 ring-theme"
                : "bg-theme-card-elevated border-theme opacity-75"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-extrabold text-sm text-theme-primary flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-theme-muted" /> NOT AVAILABLE MODE
              </span>
              <span className="text-[10px] font-bold uppercase bg-theme-subtle text-theme-muted px-2 py-0.5 rounded border border-theme">
                Paused
              </span>
            </div>
            <ul className="space-y-2 text-xs text-theme-muted">
              <li className="flex items-start gap-2">
                <X className="w-3.5 h-3.5 text-theme-muted shrink-0 mt-0.5" />
                <span>Your profile is hidden from recipient donor searches.</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="w-3.5 h-3.5 text-theme-muted shrink-0 mt-0.5" />
                <span>Emergency request notifications are temporarily paused.</span>
              </li>
              <li className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-theme-muted shrink-0 mt-0.5" />
                <span>Use this status when traveling, unwell, or temporarily unable to donate blood.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
