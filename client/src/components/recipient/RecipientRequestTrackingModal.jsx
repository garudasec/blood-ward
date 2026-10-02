import React from 'react';
import {
  X,
  Building2,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Phone,
  ShieldCheck,
  Users,
  Check,
  Ban,
  Clock,
} from 'lucide-react';
import BloodGroupBadge from '../common/BloodGroupBadge';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';
import { REQUEST_STATUS } from '../../constants/theme';

export default function RecipientRequestTrackingModal({ request, isOpen, onClose, onUpdateStatus }) {
  if (!isOpen || !request) return null;

  // Lifecycle steps array
  const steps = [
    { label: 'Created', key: REQUEST_STATUS.CREATED },
    { label: 'Active Broadcast', key: REQUEST_STATUS.ACTIVE },
    { label: 'Donor Accepted', key: REQUEST_STATUS.DONOR_ACCEPTED },
    { label: 'In Progress', key: REQUEST_STATUS.IN_PROGRESS },
    { label: 'Fulfilled', key: REQUEST_STATUS.FULFILLED },
  ];

  const getStepIndex = (status) => {
    switch (status) {
      case REQUEST_STATUS.CREATED:
        return 0;
      case REQUEST_STATUS.ACTIVE:
        return 1;
      case REQUEST_STATUS.DONOR_ACCEPTED:
        return 2;
      case REQUEST_STATUS.IN_PROGRESS:
        return 3;
      case REQUEST_STATUS.FULFILLED:
      case REQUEST_STATUS.COMPLETED:
        return 4;
      default:
        return 1;
    }
  };

  const currentStep = getStepIndex(request.status);
  const isCancelled = request.status === REQUEST_STATUS.CANCELLED || request.status === REQUEST_STATUS.EXPIRED;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white max-w-2xl w-full rounded-3xl border border-slate-200 shadow-2xl overflow-hidden space-y-0">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                REF #{request.id}
              </span>
              <StatusBadge status={request.status} urgency={request.urgency} />
            </div>
            <h3 className="font-extrabold text-lg text-white leading-snug">
              {request.hospitalName}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* VISUAL REQUEST LIFECYCLE PROGRESS BAR */}
          {!isCancelled ? (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Request Lifecycle Progress:
              </span>
              <div className="flex items-center justify-between relative py-2">
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 z-0" />
                <div
                  className="absolute top-1/2 left-0 h-1 bg-emerald-500 -translate-y-1/2 z-0 transition-all duration-300"
                  style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                />

                {steps.map((step, idx) => {
                  const isDone = idx <= currentStep;
                  const isCurrent = idx === currentStep;
                  return (
                    <div key={step.key} className="relative z-10 flex flex-col items-center gap-1.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs transition-colors ${
                          isDone
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-white text-slate-400 border-2 border-slate-300'
                        } ${isCurrent ? 'ring-4 ring-emerald-100' : ''}`}
                      >
                        {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span
                        className={`text-[10px] font-bold text-center ${
                          isCurrent ? 'text-emerald-700 font-extrabold' : 'text-slate-500'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl text-xs flex items-center gap-2 font-bold">
              <Ban className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Request Status: {request.status}</span>
            </div>
          )}

          {/* Key Parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Blood Group</span>
              <div className="mt-1">
                <BloodGroupBadge group={request.bloodGroup} size="sm" />
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Units Needed</span>
              <span className="font-extrabold text-slate-900 text-sm block mt-1">
                {request.unitsNeeded} Unit(s)
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Urgency</span>
              <span className="font-extrabold text-slate-900 text-sm block mt-1">
                {request.urgency}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Donors Accepted</span>
              <span className="font-extrabold text-emerald-700 text-sm block mt-1">
                {request.acceptedDonors?.length || 0} Donor(s)
              </span>
            </div>
          </div>

          {/* UNLOCKED DONOR CONTACTS PANEL */}
          {request.acceptedDonors && request.acceptedDonors.length > 0 ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Unlocked Donor Phone Contacts ({request.acceptedDonors.length})
                </span>
                <span className="text-[10px] bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded font-extrabold">
                  Authorized
                </span>
              </div>

              <div className="space-y-2">
                {request.acceptedDonors.map((donor, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-3 rounded-xl border border-emerald-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{donor.name}</span>
                      <span className="text-slate-500 ml-1">({donor.bloodGroup}, ~{donor.distanceKm} km away)</span>
                    </div>
                    <a
                      href={`tel:${donor.phone}`}
                      className="font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call {donor.phone}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <span className="font-bold block">Awaiting Donor Acceptance</span>
                <span className="text-[11px] text-blue-800">
                  Donor contact details unlock automatically when a matching donor accepts this request.
                </span>
              </div>
            </div>
          )}

          {/* Hospital & Location Details */}
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2.5 text-slate-700">
              <Building2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-slate-900">Hospital Address:</span>
                <span className="text-slate-600">{request.hospitalName}, {request.city}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-slate-700">
              <Calendar className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-slate-900">Target Required Date:</span>
                <span className="text-slate-600">{request.requiredDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          {!isCancelled && request.status !== REQUEST_STATUS.FULFILLED && (
            <button
              onClick={() => {
                onUpdateStatus(request.id, REQUEST_STATUS.CANCELLED);
                onClose();
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 px-3 py-2 rounded-xl hover:bg-rose-50"
            >
              Cancel Request
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            {!isCancelled && request.status !== REQUEST_STATUS.FULFILLED && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onUpdateStatus(request.id, REQUEST_STATUS.FULFILLED);
                  onClose();
                }}
                className="font-bold bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" /> Mark as Fulfilled
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}