import React, { useState } from "react";
import {
  X,
  Building2,
  Calendar,
  CheckCircle2,
  Phone,
  Users,
  Check,
  Ban,
} from "lucide-react";
import BloodGroupBadge from "../common/BloodGroupBadge";
import StatusBadge from "../common/StatusBadge";
import Button from "../common/Button";
import { REQUEST_STATUS } from "../../constants/theme";
import { requestService } from "../../services/requestService";

export default function RecipientRequestTrackingModal({ request, isOpen, onClose, onUpdateStatus }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  if (!isOpen || !request) return null;

  // Lifecycle steps array
  const steps = [
    { label: "Created", key: REQUEST_STATUS.CREATED },
    { label: "Active Broadcast", key: REQUEST_STATUS.ACTIVE },
    { label: "Donor Accepted", key: REQUEST_STATUS.DONOR_ACCEPTED },
    { label: "In Progress", key: REQUEST_STATUS.IN_PROGRESS },
    { label: "Fulfilled", key: REQUEST_STATUS.FULFILLED },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-theme-modal max-w-2xl w-full rounded-3xl border border-theme shadow-2xl overflow-hidden space-y-0">
        {/* Header */}
        <div className="p-6 bg-theme-modal-header text-theme-primary flex items-center justify-between border-b border-theme">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-500 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                REF #{request.id}
              </span>
              <StatusBadge status={request.status} urgency={request.urgency} />
            </div>
            <h3 className="font-extrabold text-lg text-theme-primary leading-snug">
              {request.hospitalName}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-theme-subtle hover:bg-theme-hover text-theme-secondary hover:text-theme-primary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* VISUAL REQUEST LIFECYCLE PROGRESS BAR */}
          {!isCancelled ? (
            <div className="space-y-2">
              <span className="text-xs font-bold text-theme-secondary uppercase tracking-wider block">
                Request Lifecycle Progress:
              </span>
              <div className="flex items-center justify-between relative py-2">
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-theme-subtle -translate-y-1/2 z-0" />
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
                            ? "bg-emerald-600 text-white shadow-md"
                            : "bg-theme-card text-theme-muted border-2 border-theme"
                        } ${isCurrent ? "ring-4 ring-emerald-500/20" : ""}`}
                      >
                        {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span
                        className={`text-[10px] font-bold text-center ${
                          isCurrent ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-theme-muted"
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
            <div className="p-3 bg-theme-subtle border border-theme text-theme-secondary rounded-2xl text-xs flex items-center gap-2 font-bold">
              <Ban className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Request Status: {request.status}</span>
            </div>
          )}

          {/* Key Parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-theme-card-elevated p-3 rounded-2xl border border-theme text-center">
              <span className="text-[10px] uppercase font-bold text-theme-muted block">Blood Group</span>
              <div className="mt-1">
                <BloodGroupBadge group={request.bloodGroup} size="sm" />
              </div>
            </div>

            <div className="bg-theme-card-elevated p-3 rounded-2xl border border-theme text-center">
              <span className="text-[10px] uppercase font-bold text-theme-muted block">Units Needed</span>
              <span className="font-extrabold text-theme-primary text-sm block mt-1">
                {request.unitsNeeded} Unit(s)
              </span>
            </div>

            <div className="bg-theme-card-elevated p-3 rounded-2xl border border-theme text-center">
              <span className="text-[10px] uppercase font-bold text-theme-muted block">Urgency</span>
              <span className="font-extrabold text-theme-primary text-sm block mt-1">
                {request.urgency}
              </span>
            </div>

            <div className="bg-theme-card-elevated p-3 rounded-2xl border border-theme text-center">
              <span className="text-[10px] uppercase font-bold text-theme-muted block">Donors Accepted</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm block mt-1">
                {request.acceptedDonorDetails ? 1 : 0} Donor(s)
              </span>
            </div>
          </div>

          {/* UNLOCKED DONOR CONTACT PANEL */}
          {request.acceptedDonorDetails ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Unlocked Donor Phone Contact
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded font-extrabold">
                  Authorized
                </span>
              </div>

              <div className="bg-theme-card p-3 rounded-xl border border-emerald-500/30 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
                <div>
                  <span className="font-bold text-theme-primary">{request.acceptedDonorDetails.fullName}</span>
                  <span className="text-theme-muted ml-1">
                    ({request.acceptedDonorDetails.bloodGroup}{request.acceptedDonorDetails.city ? `, ${request.acceptedDonorDetails.city}` : ""})
                  </span>
                </div>
                <a
                  href={`tel:${request.acceptedDonorDetails.phone}`}
                  className="font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" /> Call {request.acceptedDonorDetails.phone}
                </a>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-500 shrink-0" />
              <div>
                <span className="font-bold block text-blue-600 dark:text-blue-400">Awaiting Donor Acceptance</span>
                <span className="text-[11px] text-theme-muted">
                  Donor contact details unlock automatically when a matching donor accepts this request.
                </span>
              </div>
            </div>
          )}

          {/* Hospital & Location Details */}
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2.5 text-theme-secondary">
              <Building2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-theme-primary">Hospital Address:</span>
                <span className="text-theme-muted">{request.hospitalName}, {request.city}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-theme-secondary">
              <Calendar className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-theme-primary">Target Required Date:</span>
                <span className="text-theme-muted">{request.requiredDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-theme-modal-footer border-t border-theme flex items-center justify-between gap-3">
          {!isCancelled && request.status !== REQUEST_STATUS.FULFILLED && (
            <button
              disabled={isSubmitting}
              onClick={async () => {
                try {
                  setIsSubmitting(true);
                  await requestService.cancel(request.id);
                  onUpdateStatus(request.id, REQUEST_STATUS.CANCELLED);
                  onClose();
                } catch (err) {
                  alert(err.message || "Failed to cancel request");
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 px-3 py-2 rounded-xl hover:bg-rose-500/10 disabled:opacity-50 cursor-pointer"
            >
              Cancel Request
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            {request.status === REQUEST_STATUS.IN_PROGRESS && (
              <Button
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                onClick={async () => {
                  try {
                    setIsSubmitting(true);
                    await requestService.fulfill(request.id);
                    if (onUpdateStatus) onUpdateStatus(request.id, REQUEST_STATUS.FULFILLED);
                    onClose();
                  } catch (err) {
                    alert(err.message || "Failed to mark request as fulfilled");
                  } finally {
                    setIsSubmitting(false);
                  }
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
