import React from "react";
import { Link } from "react-router-dom";
import { Droplet, ShieldCheck, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-theme-surface text-theme-muted py-12 border-t border-theme transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white">
                <Droplet className="w-5 h-5 fill-current" />
              </div>
              <span className="text-lg font-bold text-theme-primary tracking-tight">
                Blood<span className="text-red-500">Ward</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-theme-muted">
              A secure, location-aware blood donor discovery and emergency blood request platform connecting recipients with nearby donors.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-theme-primary uppercase tracking-wider mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm text-theme-secondary">
              <li>
                <Link to="/register/donor" className="hover:text-red-500 transition-colors">
                  Become a Donor
                </Link>
              </li>
              <li>
                <Link to="/register/recipient" className="hover:text-red-500 transition-colors">
                  Request Blood
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-red-500 transition-colors">
                  Account Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Roles */}
          <div>
            <h4 className="text-sm font-semibold text-theme-primary uppercase tracking-wider mb-4">
              Access Roles
            </h4>
            <ul className="space-y-2.5 text-sm text-theme-secondary">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                <span>Donor Portal</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span>Recipient Portal</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Admin Monitor</span>
              </li>
            </ul>
          </div>

          {/* Privacy & Security */}
          <div>
            <h4 className="text-sm font-semibold text-theme-primary uppercase tracking-wider mb-4">
              Privacy & Security
            </h4>
            <div className="bg-theme-card p-3.5 rounded-xl border border-theme text-xs leading-relaxed space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-500 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Privacy First</span>
              </div>
              <p className="text-theme-muted">
                Exact home addresses and contact details are shielded until donor request acceptance.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-theme text-xs text-center flex flex-col sm:flex-row items-center justify-between gap-4 text-theme-muted">
          <p>© {new Date().getFullYear()} BloodWard. All Right Reserved</p>
          <p className="flex items-center gap-1">
            Designed for emergency speed & privacy <Heart className="w-3.5 h-3.5 text-red-500 fill-current inline" />
          </p>
        </div>
      </div>
    </footer>
  );
}
