import React from "react";
import { Link } from "react-router-dom";
import { Droplet, ShieldCheck, PhoneCall } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-[#181B21] text-[#475569] dark:text-[#CBD5E1] py-12 border-t border-[#E2E8F0] dark:border-[#343B47] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#A61B2B] flex items-center justify-center text-white">
                <Droplet className="w-4 h-4 fill-current" />
              </div>
              <span className="text-base font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">
                Blood<span className="text-[#A61B2B]">Ward</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
              Secure, location-aware emergency blood discovery network connecting accredited medical institutions with verified voluntary blood donors.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-[#A61B2B] dark:text-rose-400 font-semibold">
              <PhoneCall className="w-3.5 h-3.5" /> Emergency Dispatch Platform
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-[#1E293B] dark:text-[#F1F5F9] uppercase tracking-wider mb-3">
              Platform Links
            </h4>
            <ul className="space-y-2 text-xs text-[#475569] dark:text-[#CBD5E1]">
              <li>
                <Link to="/register/donor" className="hover:text-[#A61B2B] dark:hover:text-rose-400 transition-colors">
                  Register as Voluntary Donor
                </Link>
              </li>
              <li>
                <Link to="/register/recipient" className="hover:text-[#315B83] dark:hover:text-sky-400 transition-colors">
                  Issue Hospital Blood Requisition
                </Link>
              </li>
              <li>
                <Link to="/complaints" className="hover:text-[#A61B2B] dark:hover:text-rose-400 transition-colors font-medium">
                  Public Misconduct Complaints
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#1E293B] dark:hover:text-white transition-colors">
                  Sign In to Workspace
                </Link>
              </li>
            </ul>
          </div>

          {/* Workspaces */}
          <div>
            <h4 className="text-xs font-bold text-[#1E293B] dark:text-[#F1F5F9] uppercase tracking-wider mb-3">
              Clinical Workspaces
            </h4>
            <ul className="space-y-2 text-xs text-[#475569] dark:text-[#CBD5E1]">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A61B2B]"></span>
                <span className="font-medium">Donor Dispatch Workspace</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#315B83]"></span>
                <span className="font-medium">Recipient Requisition Portal</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1E293B] dark:bg-zinc-400"></span>
                <span className="font-medium">Governance & Administration</span>
              </li>
            </ul>
          </div>

          {/* Clinical Disclaimer */}
          <div>
            <h4 className="text-xs font-bold text-[#1E293B] dark:text-[#F1F5F9] uppercase tracking-wider mb-3">
              Clinical Disclaimer
            </h4>
            <div className="bg-[#F8FAFC] dark:bg-[#20242C] p-3 rounded-xl border border-[#E2E8F0] dark:border-[#343B47] text-xs leading-relaxed space-y-1.5">
              <div className="flex items-center gap-1.5 text-[#28734A] dark:text-emerald-400 font-semibold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Medical Safety Policy</span>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                BloodWard coordinates voluntary emergency discovery. Self-reported questionnaires do not constitute clinical clearance. Blood collection and compatibility testing must be conducted at licensed medical facilities.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-[#E2E8F0] dark:border-[#343B47] text-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-[#64748B] dark:text-[#94A3B8]">
          <p>© {new Date().getFullYear()} BloodWard Clinical Network. All rights reserved.</p>
          <p className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#28734A] dark:bg-emerald-500" /> Privacy-First Emergency Transfusion Architecture
          </p>
        </div>
      </div>
    </footer>
  );
}
