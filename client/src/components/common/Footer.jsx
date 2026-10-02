import React from 'react';
import { Link } from 'react-router-dom';
import { Droplet, ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white">
                <Droplet className="w-5 h-5 fill-current" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Blood<span className="text-red-500">Ward</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed">
              A secure, location-aware blood donor discovery and emergency blood request platform connecting recipients with nearby donors.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/register/donor" className="hover:text-white transition-colors">
                  Become a Donor
                </Link>
              </li>
              <li>
                <Link to="/register/recipient" className="hover:text-white transition-colors">
                  Request Blood
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Account Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Roles */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Access Roles
            </h4>
            <ul className="space-y-2.5 text-sm">
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
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Privacy & Security
            </h4>
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 text-xs leading-relaxed space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Privacy First</span>
              </div>
              <p>
                Exact home addresses and contact details are shielded until donor request acceptance.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 text-xs text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} BloodWard. Full-stack College Project.</p>
          <p className="flex items-center gap-1">
            Designed for emergency speed & privacy <Heart className="w-3.5 h-3.5 text-red-500 fill-current inline" />
          </p>
        </div>
      </div>
    </footer>
  );
}