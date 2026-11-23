import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HeartHandshake,
  Droplet,
  Search,
  Activity,
  Building2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Users,
} from "lucide-react";
import Button from "../../components/common/Button";

/**
 * Dedicated Role Selection Page (/register, /get-started)
 * Clean, balanced onboarding interface inspired by modern medical service design.
 * Offers clear entry gateways to Voluntary Donor or Recipient registration.
 */
export default function RegisterRoleSelectPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-theme-main transition-colors">
      <div className="max-w-3xl w-full space-y-8 animate-in fade-in duration-300">
        {/* Header Section */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-rose-950/40 border border-red-200/80 dark:border-rose-900/60 text-[#A61B2B] dark:text-rose-300 text-xs font-semibold shadow-2xs">
            <Droplet className="w-3.5 h-3.5 fill-current" />
            <span>Clinical Blood Network &bull; 100% Voluntary</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1E293B] dark:text-white">
            Join Blood<span className="text-[#A61B2B]">Ward</span>
          </h1>

          <p className="text-xs sm:text-sm text-[#475569] dark:text-zinc-400 max-w-md mx-auto">
            How would you like to participate? Choose an account type to start your verified registration.
          </p>
        </div>

        {/* Two-Column Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {/* CARD 1 — DONATE BLOOD */}
          <div
            onClick={() => navigate("/register/donor")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/register/donor");
              }
            }}
            tabIndex={0}
            role="button"
            className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E2E8F0] dark:border-zinc-800 hover:border-[#A61B2B] dark:hover:border-rose-500/80 hover:shadow-lg dark:hover:shadow-rose-950/20 hover:-translate-y-1 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#A61B2B] select-none"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-rose-950/50 border border-red-100 dark:border-rose-900/50 flex items-center justify-center text-[#A61B2B] dark:text-rose-400 group-hover:scale-105 transition-transform duration-200">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100/70 dark:bg-rose-900/40 text-[#A61B2B] dark:text-rose-300">
                  Voluntary Donor
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#1E293B] dark:text-white group-hover:text-[#A61B2B] dark:group-hover:text-rose-400 transition-colors">
                  Donate Blood
                </h3>
                <p className="text-xs text-[#475569] dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Register as a voluntary donor and help patients in urgent need. Get notified when compatible requests arise in your area.
                </p>
              </div>

              <div className="pt-2 border-t border-[#F1F5F9] dark:border-zinc-800/80 space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-[#475569] dark:text-zinc-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Coarsened coordinates for residential privacy</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#475569] dark:text-zinc-300">
                  <Droplet className="w-3.5 h-3.5 text-[#A61B2B] dark:text-rose-400 shrink-0" />
                  <span>Direct emergency requisitions matching your blood type</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#475569] dark:text-zinc-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Instant availability toggle — donate on your schedule</span>
                </div>
              </div>
            </div>

            <div className="pt-5 mt-4">
              <Button
                variant="primary"
                size="md"
                className="w-full justify-center text-xs font-semibold group-hover:bg-[#8E1724]"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/register/donor");
                }}
              >
                <span>Register as Donor</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>

          {/* CARD 2 — RECIPIENT */}
          <div
            onClick={() => navigate("/register/recipient")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/register/recipient");
              }
            }}
            tabIndex={0}
            role="button"
            className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E2E8F0] dark:border-zinc-800 hover:border-[#315B83] dark:hover:border-sky-500/80 hover:shadow-lg dark:hover:shadow-blue-950/20 hover:-translate-y-1 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#315B83] select-none"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-[#315B83] dark:text-sky-400 group-hover:scale-105 transition-transform duration-200">
                  <Activity className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100/70 dark:bg-blue-900/40 text-[#315B83] dark:text-sky-300">
                  Patient & Hospital
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#1E293B] dark:text-white group-hover:text-[#315B83] dark:group-hover:text-sky-400 transition-colors">
                  Recipient
                </h3>
                <p className="text-xs text-[#475569] dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Register to request blood for a patient. Search verified local voluntary donors and coordinate urgent clinical requisitions.
                </p>
              </div>

              <div className="pt-2 border-t border-[#F1F5F9] dark:border-zinc-800/80 space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-[#475569] dark:text-zinc-300">
                  <Search className="w-3.5 h-3.5 text-[#315B83] dark:text-sky-400 shrink-0" />
                  <span>Live donor radius search & compatibility mapping</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#475569] dark:text-zinc-300">
                  <Building2 className="w-3.5 h-3.5 text-[#315B83] dark:text-sky-400 shrink-0" />
                  <span>Supports Individual & Hospital Coordinator accounts</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#475569] dark:text-zinc-300">
                  <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Emergency broadcast with date-aware radius expansion</span>
                </div>
              </div>
            </div>

            <div className="pt-5 mt-4">
              <Button
                variant="secondary"
                size="md"
                className="w-full justify-center text-xs font-semibold group-hover:bg-[#264666]"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/register/recipient");
                }}
              >
                <span>Register as Recipient</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>

        {/* Existing Account Footer Link */}
        <div className="text-center pt-2 text-xs text-[#64748B] dark:text-zinc-400">
          Already have a verified account?{" "}
          <Link
            to="/login"
            className="font-semibold text-[#A61B2B] dark:text-rose-400 hover:underline transition-colors"
          >
            Sign in here &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
