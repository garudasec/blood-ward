import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  PlusCircle,
  HeartHandshake,
  Droplet,
} from 'lucide-react';
import BloodGroupBadge from '../common/BloodGroupBadge';
import Button from '../common/Button';
import { DONOR_COMPATIBILITY } from '../../constants/theme';

export default function RecipientDonorDetailModal({ donor, isOpen, onClose }) {
  const navigate = useNavigate();

  if (!isOpen || !donor) return null;

  const compatibleRecipients = DONOR_COMPATIBILITY[donor.bloodGroup] || [];

  const handleCreateRequest = () => {
    onClose();
    navigate(`/recipient/requests/create?bloodGroup=${encodeURIComponent(donor.bloodGroup)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white max-w-lg w-full rounded-3xl border border-slate-200 shadow-2xl overflow-hidden space-y-0">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white font-black text-lg">
              {donor.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-white">{donor.name}</h3>
                <BloodGroupBadge group={donor.bloodGroup} size="sm" />
              </div>
              <p className="text-xs text-slate-400">{donor.city}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Availability Status */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-500 font-semibold">Availability Status:</span>
            {donor.isAvailable ? (
              <span className="font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Available to Donate
              </span>
            ) : (
              <span className="font-bold text-slate-600 bg-slate-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Not Available
              </span>
            )}
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Proximity</span>
              <span className="font-extrabold text-emerald-700 text-sm block mt-0.5">
                ~ {donor.distanceKm} km
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Donations</span>
              <span className="font-extrabold text-slate-900 text-sm block mt-0.5">
                {donor.donationsCompleted} Total
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Response Rate</span>
              <span className="font-extrabold text-blue-700 text-sm block mt-0.5">
                {donor.responseRate}
              </span>
            </div>
          </div>

          {/* Compatibility List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 block">
              Recipients compatible with {donor.bloodGroup} donor blood:
            </span>
            <div className="flex flex-wrap gap-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              {compatibleRecipients.map((bg) => (
                <BloodGroupBadge key={bg} group={bg} size="sm" />
              ))}
            </div>
          </div>

          {/* Privacy Disclaimer */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Donor Privacy Protected
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Exact residential address and contact phone number remain protected until a blood request is created and accepted by this donor.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          <Button variant="primary" size="sm" onClick={handleCreateRequest} className="font-bold">
            <PlusCircle className="w-4 h-4 mr-1" /> Request Blood for {donor.bloodGroup}
          </Button>
        </div>
      </div>
    </div>
  );
}