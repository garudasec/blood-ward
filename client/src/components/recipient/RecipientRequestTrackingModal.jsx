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
  Radar,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";
import BloodGroupBadge from "../common/BloodGroupBadge";
import StatusBadge from "../common/StatusBadge";
import Button from "../common/Button";
import { REQUEST_STATUS } from "../../constants/theme";
import { requestService } from "../../services/requestService";
import CreateComplaintModal from "../complaint/CreateComplaintModal";

const RADIUS_PRESETS = [5, 10, 20, 30, 50];

export default function RecipientRequestTrackingModal({ request, isOpen, onClose, onUpdateStatus }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [selectedExpandRadius, setSelectedExpandRadius] = useState(null);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);

  if (!isOpen || !request) return null;

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
  const currentRadius = request.radiusKm || 20;
  const higherRadiusPresets = RADIUS_PRESETS.filter((r) => r > currentRadius);
  const canExpandRadius = (request.status === REQUEST_STATUS.ACTIVE || request.status === REQUEST_STATUS.CREATED) && higherRadiusPresets.length > 0;

  const handleExpandRadius = async (newRadius) => {
    try {
      setIsSubmitting(true);
      setActionError("");
      setActionSuccess("");
      const res = await requestService.expandRadius(request.id, newRadius);
      setActionSuccess(`Search radius expanded to ${newRadius} KM. ${res.newlyNotifiedCount || 0} newly eligible donor(s) notified.`);
      if (onUpdateStatus) {
        onUpdateStatus(request.id, request.status, { radiusKm: newRadius });
      }
    } catch (err) {
      setActionError(err.message || "Failed to expand request radius");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 max-w-2xl w-full rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden space-y-0">
        {/* Header */}
        <div className="p-5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700">
                REF #{request.id}
              </span>
              <StatusBadge status={request.status} urgency={request.urgency} />
            </div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 leading-snug">
              {request.hospitalName}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {actionError && (
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-400 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 text-xs rounded-lg">
              {actionError}
            </div>
          )}

          {actionSuccess && (
            <div className="p-3 bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs rounded-lg font-medium">
              {actionSuccess}
            </div>
          )}

          {/* VISUAL REQUEST LIFECYCLE PROGRESS BAR */}
          {!isCancelled ? (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block font-mono">
                Request Lifecycle Progress
              </span>
              <div className="flex items-center justify-between relative py-2">
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-200 dark:bg-zinc-800 -translate-y-1/2 z-0" />
                <div
                  className="absolute top-1/2 left-0 h-0.5 bg-zinc-950 dark:bg-zinc-100 -translate-y-1/2 z-0 transition-all duration-300"
                  style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                />

                {steps.map((step, idx) => {
                  const isDone = idx <= currentStep;
                  const isCurrent = idx === currentStep;

                  return (
                    <div key={step.key} className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                          isDone
                            ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 border-zinc-950 dark:border-zinc-100"
                            : "bg-white dark:bg-zinc-900 text-zinc-400 border-zinc-300 dark:border-zinc-700"
                        } ${isCurrent ? "ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-2 dark:ring-offset-zinc-900" : ""}`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <span
                        className={`text-[10px] mt-1.5 font-medium whitespace-nowrap ${
                          isCurrent
                            ? "text-zinc-900 dark:text-zinc-100 font-bold"
                            : isDone
                            ? "text-zinc-700 dark:text-zinc-300"
                            : "text-zinc-400"
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
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800/60 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg flex items-center gap-2 text-xs text-zinc-500">
              <Ban className="w-4 h-4 text-zinc-500 shrink-0" />
              <span>
                This request was {request.status.toLowerCase()} and is no longer accepting donor responses.
              </span>
            </div>
          )}

          {/* Request Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-center">
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Blood Group</span>
              <div className="mt-1 flex justify-center">
                <BloodGroupBadge group={request.bloodGroup} size="sm" />
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-center">
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Units Needed</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm block mt-1">
                {request.unitsNeeded} Unit(s)
              </span>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-center">
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Search Radius</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm block mt-1">
                {currentRadius} KM
              </span>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-center">
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Donors Accepted</span>
              <span className="font-semibold text-zinc-950 dark:text-zinc-100 text-sm block mt-1">
                {request.acceptedDonorDetails ? 1 : 0} Donor
              </span>
            </div>
          </div>

          {/* RADIUS EXPANSION CONTROL FOR ACTIVE REQUESTS */}
          {canExpandRadius && (
            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Radar className="w-4 h-4 text-zinc-500" />
                  Expand Search Radius
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">
                  Current: <strong>{currentRadius} KM</strong>
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Need more donor coverage? Expand your request radius to notify additional compatible donors up to 50 KM. Previously notified donors will not receive duplicate alerts.
              </p>
              <div className="flex items-center gap-2 pt-1">
                {higherRadiusPresets.map((r) => (
                  <Button
                    key={r}
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => handleExpandRadius(r)}
                    className="font-mono text-xs"
                  >
                    <ArrowUpRight className="w-3 h-3 mr-1" /> Expand to {r} KM
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* UNLOCKED DONOR CONTACT PANEL */}
          {request.acceptedDonorDetails ? (
            <div className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
                  Unlocked Donor Contact
                </span>
                <span className="text-[10px] bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                  Authorized
                </span>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-3 rounded-md border border-zinc-200 dark:border-zinc-750 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
                <div>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{request.acceptedDonorDetails.fullName}</span>
                  <span className="text-zinc-400 ml-1">
                    ({request.acceptedDonorDetails.bloodGroup}{request.acceptedDonorDetails.city ? `, ${request.acceptedDonorDetails.city}` : ""})
                  </span>
                </div>
                <a
                  href={`tel:${request.acceptedDonorDetails.phone}`}
                  className="font-medium text-xs text-white bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" /> Call {request.acceptedDonorDetails.phone?.startsWith("+91") ? request.acceptedDonorDetails.phone : `+91 ${request.acceptedDonorDetails.phone}`}
                </a>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs flex items-center gap-3">
              <Users className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <span className="font-semibold block text-zinc-900 dark:text-zinc-100">Awaiting Donor Acceptance</span>
                <span className="text-[11px] text-zinc-500">
                  Donor contact details unlock automatically once a matching donor accepts this request within {currentRadius} KM.
                </span>
              </div>
            </div>
          )}

          {/* Hospital & Location Details */}
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2.5 text-zinc-600 dark:text-zinc-300">
              <Building2 className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-zinc-900 dark:text-zinc-100">Hospital Address:</span>
                <span className="text-zinc-500">{request.hospitalName}, {request.city}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-zinc-600 dark:text-zinc-300">
              <Calendar className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-zinc-900 dark:text-zinc-100">Target Required Date:</span>
                <span className="text-zinc-500">{request.requiredDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {!isCancelled && request.status !== REQUEST_STATUS.FULFILLED && (
              <button
                disabled={isSubmitting}
                onClick={async () => {
                  try {
                    setIsSubmitting(true);
                    setActionError("");
                    await requestService.cancel(request.id);
                    onUpdateStatus(request.id, REQUEST_STATUS.CANCELLED);
                    onClose();
                  } catch (err) {
                    setActionError(err.message || "Failed to cancel request");
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-100 px-3 py-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-50 cursor-pointer underline"
              >
                Cancel Request
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsComplaintModalOpen(true)}
              className="text-xs font-medium text-rose-700 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-300 px-2.5 py-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Report Issue / File Complaint
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* Misconduct / Grievance Complaint Modal */}
        <CreateComplaintModal
          isOpen={isComplaintModalOpen}
          onClose={() => setIsComplaintModalOpen(false)}
          bloodRequest={request}
          patient={request.patient}
          onComplaintSubmitted={() => {
            setActionSuccess("Complaint has been submitted and escalated to administrator review.");
          }}
        />
      </div>
    </div>
  );
}
