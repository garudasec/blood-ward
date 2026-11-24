import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  PlusCircle,
  Building2,
  MapPin,
  Calendar,
  AlertTriangle,
  Droplet,
  ShieldCheck,
  BellRing,
  AlertCircle,
  Radar,
  Clock,
  XCircle,
  User as UserIcon,
  Copy,
  Check,
} from "lucide-react";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import Button from "../../components/common/Button";
import BloodGroupBadge from "../../components/common/BloodGroupBadge";
import { BLOOD_GROUPS, URGENCY_LEVELS } from "../../constants/theme";
import { requestService } from "../../services/requestService";
import { useAuth } from "../../context/AuthContext";

const RADIUS_PRESETS = [5, 10, 20, 30, 50];

const getSuggestedRadius = (dateStr) => {
  if (!dateStr) return 20;
  const parts = String(dateStr).trim().split("-");
  if (parts.length !== 3) return 20;
  const target = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 20;
  if (diffDays === 1) return 30;
  return 50;
};

const getTodayDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function CreateBloodRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const isHospitalRep = user?.accountType === "hospital_rep";
  const verificationStatus = user?.verificationStatus || (isHospitalRep ? "pending" : "verified");

  const initialBloodGroup = searchParams.get("bloodGroup") || "O+";
  const initialUrgency = searchParams.get("emergency") === "true" ? URGENCY_LEVELS.EMERGENCY : URGENCY_LEVELS.NORMAL;

  const todayStr = React.useMemo(() => getTodayDateStr(), []);
  const initialRadius = getSuggestedRadius(todayStr);

  const [formData, setFormData] = useState({
    bloodGroup: initialBloodGroup,
    unitsNeeded: 1,
    hospitalName: user?.hospitalName || "",
    city: user?.city || "",
    requiredDate: todayStr,
    radiusKm: initialRadius,
    urgency: initialUrgency,
    additionalNotes: "",
    patientName: "",
    patientContactPhone: "",
    patientAge: "",
    patientGender: "",
    hospitalRegistrationNumber: "",
    wardDepartment: "",
  });

  const [isManualRadiusOverride, setIsManualRadiusOverride] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [claimCodeModal, setClaimCodeModal] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPatientId, setCopiedPatientId] = useState(false);

  const suggestedRadius = getSuggestedRadius(formData.requiredDate);

  const handleChange = (e) => {
    const { id, value } = e.target;
    if (id === "requiredDate") {
      const suggested = getSuggestedRadius(value);
      setFormData((prev) => ({
        ...prev,
        requiredDate: value,
        radiusKm: isManualRadiusOverride ? prev.radiusKm : suggested,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [id]: value,
      }));
    }

    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: "" }));
    }
    if (serverError) setServerError("");
  };

  const handleRadiusPresetClick = (presetKm) => {
    setIsManualRadiusOverride(true);
    setFormData((prev) => ({
      ...prev,
      radiusKm: presetKm,
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.bloodGroup) newErrors.bloodGroup = "Blood Group is required";
    if (!formData.unitsNeeded || formData.unitsNeeded < 1) newErrors.unitsNeeded = "Valid units count is required";
    if (!formData.hospitalName.trim()) newErrors.hospitalName = "Hospital Name is required";
    if (!formData.city.trim()) newErrors.city = "City / Location is required";
    if (!formData.requiredDate) newErrors.requiredDate = "Required date is required";
    if (!RADIUS_PRESETS.includes(Number(formData.radiusKm))) newErrors.radiusKm = "Valid radius preset is required";

    if (isHospitalRep && !formData.patientName.trim()) {
      newErrors.patientName = "Patient Name is required for hospital requisitions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReviewClick = (e) => {
    e.preventDefault();
    if (validate()) {
      setShowReview(true);
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setServerError("");
    try {
      const response = await requestService.create({
        bloodGroup: formData.bloodGroup,
        unitsNeeded: Number(formData.unitsNeeded),
        hospitalName: formData.hospitalName.trim(),
        city: formData.city.trim(),
        requiredDate: formData.requiredDate,
        radiusKm: Number(formData.radiusKm),
        urgency: formData.urgency,
        additionalNotes: formData.additionalNotes.trim(),
        patientName: formData.patientName.trim(),
        patientContactPhone: formData.patientContactPhone.trim(),
        patientAge: formData.patientAge ? Number(formData.patientAge) : undefined,
        patientGender: formData.patientGender,
        hospitalRegistrationNumber: formData.hospitalRegistrationNumber.trim(),
        wardDepartment: formData.wardDepartment.trim(),
      });

      if (response.claimCode) {
        setShowReview(false);
        setClaimCodeModal({
          claimCode: response.claimCode,
          patientId: response.patientId,
          patientName: formData.patientName || "Patient",
        });
      } else {
        navigate("/recipient/requests");
      }
    } catch (err) {
      console.error("Failed to create blood request:", err);
      setServerError(err.message || "Failed to create blood request.");
      setShowReview(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 p-6 sm:p-7 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center gap-3 transition-colors">
        <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700">
          <PlusCircle className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Create Blood Request
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Broadcast blood requirements to verified matching voluntary donors within {formData.radiusKm} KM
          </p>
        </div>
      </div>

      {serverError && (
        <div className="p-3.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-zinc-900 dark:text-zinc-100 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Verification Notice for Hospital Representatives */}
      {isHospitalRep && verificationStatus === "pending" && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-amber-950 dark:text-amber-100">
              Institutional Verification Pending
            </h4>
            <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
              Your hospital representative account is awaiting administrative verification. Any blood request created now will be placed in <em>Pending Verification</em> status and will not be dispatched or visible to voluntary donors until your hospital credentials are confirmed.
            </p>
          </div>
        </div>
      )}

      {isHospitalRep && verificationStatus === "rejected" && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-xs text-red-900 dark:text-red-200 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-red-950 dark:text-red-100">
              Institutional Verification Rejected
            </h4>
            <p className="text-red-800 dark:text-red-300 leading-relaxed">
              Reason: {user?.verificationRejectionReason || "Verification criteria not met."} Requests created under a rejected institutional profile will remain in <em>Pending Verification</em>.
            </p>
          </div>
        </div>
      )}

      {/* Main Request Form Container */}
      <div className="bg-white dark:bg-zinc-900 p-6 sm:p-7 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-6 transition-colors">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Request Information
          </h2>
          <span className="text-xs text-zinc-400">
            Step 1 of 2: Details Input
          </span>
        </div>

        {/* Emergency Alert Mode Banner if Urgency === Emergency */}
        {formData.urgency === URGENCY_LEVELS.EMERGENCY && (
          <div className="p-4 rounded-lg bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-white dark:text-zinc-950" />
              Critical Emergency Request Mode Active
            </div>
            <p className="text-xs text-zinc-300 dark:text-zinc-700">
              Emergency requests trigger immediate high-priority push routing to all available matching donors within {formData.radiusKm} KM.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleReviewClick} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Required Blood Group"
              id="bloodGroup"
              options={BLOOD_GROUPS}
              value={formData.bloodGroup}
              onChange={handleChange}
              error={errors.bloodGroup}
              icon={Droplet}
              required
            />

            <Input
              label="Units Needed"
              id="unitsNeeded"
              type="number"
              min="1"
              max="10"
              value={formData.unitsNeeded}
              onChange={handleChange}
              error={errors.unitsNeeded}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Hospital / Medical Facility"
              id="hospitalName"
              placeholder="e.g. Apollo Hospital / AIIMS"
              value={formData.hospitalName}
              onChange={handleChange}
              error={errors.hospitalName}
              icon={Building2}
              required
            />

            <Input
              label="Hospital City"
              id="city"
              placeholder="e.g. New Delhi / Mumbai / Bengaluru"
              value={formData.city}
              onChange={handleChange}
              error={errors.city}
              icon={MapPin}
              required
            />
          </div>

          {/* HOSPITAL PATIENT REQUISITION SECTION */}
          {isHospitalRep && (
            <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Patient Requisition Details
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Patient Full Name"
                  id="patientName"
                  placeholder="e.g. Sunil Verma"
                  value={formData.patientName}
                  onChange={handleChange}
                  error={errors.patientName}
                  required
                />

                <Input
                  label="Patient / Attendant Contact Number"
                  id="patientContactPhone"
                  placeholder="10-digit mobile number"
                  value={formData.patientContactPhone}
                  onChange={handleChange}
                  error={errors.patientContactPhone}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Hospital Registration / Admission No."
                  id="hospitalRegistrationNumber"
                  placeholder="e.g. IPD-89421 / MRD-10492"
                  value={formData.hospitalRegistrationNumber}
                  onChange={handleChange}
                />

                <Input
                  label="Ward / Bed / Department"
                  id="wardDepartment"
                  placeholder="e.g. Cardiology ICU Bed 8"
                  value={formData.wardDepartment}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Patient Age"
                  id="patientAge"
                  type="number"
                  min="0"
                  max="120"
                  placeholder="e.g. 52"
                  value={formData.patientAge}
                  onChange={handleChange}
                />

                <Select
                  label="Patient Gender"
                  id="patientGender"
                  options={[
                    { label: "Select Gender", value: "" },
                    { label: "Male", value: "Male" },
                    { label: "Female", value: "Female" },
                    { label: "Other", value: "Other" },
                  ]}
                  value={formData.patientGender}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Required Date"
              id="requiredDate"
              type="date"
              min={todayStr}
              value={formData.requiredDate}
              onChange={handleChange}
              error={errors.requiredDate}
              icon={Calendar}
              required
            />

            <Select
              label="Urgency Level"
              id="urgency"
              options={[
                { label: "Normal (Standard procedure)", value: URGENCY_LEVELS.NORMAL },
                { label: "High (Required within 24 hours)", value: URGENCY_LEVELS.HIGH },
                { label: "Emergency (Immediate broadcast)", value: URGENCY_LEVELS.EMERGENCY },
              ]}
              value={formData.urgency}
              onChange={handleChange}
              required
            />
          </div>

          {/* Dynamic Radius Selection Policy */}
          <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Radar className="w-3.5 h-3.5 text-zinc-500" />
                Notification & Acceptance Radius
              </label>
              <span className="text-[11px] text-zinc-500 font-mono">
                Selected: <strong className="text-zinc-900 dark:text-zinc-100">{formData.radiusKm} KM</strong>
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Only donors within this radius will be notified and permitted to accept this request.
            </p>

            <div className="grid grid-cols-5 gap-2 pt-1">
              {RADIUS_PRESETS.map((radius) => {
                const isSelected = Number(formData.radiusKm) === radius;
                const isSuggested = suggestedRadius === radius;

                return (
                  <button
                    key={radius}
                    type="button"
                    onClick={() => handleRadiusPresetClick(radius)}
                    className={`py-2 px-1 text-center rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                      isSelected
                        ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 border-zinc-950 dark:border-zinc-100 font-bold shadow-xs"
                        : "bg-zinc-50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <div>{radius} KM</div>
                    {isSuggested && (
                      <div className={`text-[9px] font-sans ${isSelected ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-400"}`}>
                        Default
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {isManualRadiusOverride && (
              <p className="text-[10px] text-zinc-400 italic">
                Manual radius override active. Date changes will not reset your selection.
              </p>
            )}
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <label htmlFor="additionalNotes" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Additional Information / Clinical Notes
            </label>
            <textarea
              id="additionalNotes"
              rows="3"
              value={formData.additionalNotes}
              onChange={handleChange}
              placeholder="Specify ICU ward, room number, or specific procedure details..."
              className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 p-3 outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 dark:focus:border-zinc-200 dark:focus:ring-zinc-200"
            />
          </div>

          {/* Privacy & Security Disclaimer */}
          <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Hospital coordinator contact details will be shared only with verified voluntary donors within {formData.radiusKm} KM who explicitly accept this request.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => navigate("/recipient")}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              className="font-semibold"
            >
              Review & Publish Request →
            </Button>
          </div>
        </form>
      </div>

      {/* REVIEW & CONFIRMATION MODAL */}
      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 max-w-lg w-full rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-6 space-y-5">
            <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                Confirm Blood Request Details
              </h3>
              <p className="text-xs text-zinc-500">
                Review information before broadcasting to verified donors within {formData.radiusKm} KM
              </p>
            </div>

            <div className="space-y-2.5 text-xs bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Target Blood Group:</span>
                <BloodGroupBadge group={formData.bloodGroup} size="sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Units Required:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formData.unitsNeeded} Unit(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Hospital:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formData.hospitalName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Location:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formData.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Required Date:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formData.requiredDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Broadcast Radius:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">{formData.radiusKm} KM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Urgency Level:</span>
                <span className={`font-semibold ${formData.urgency === "Emergency" ? "text-zinc-950 dark:text-zinc-100 underline" : "text-zinc-900 dark:text-zinc-100"}`}>
                  {formData.urgency}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReview(false)}
              >
                Back to Edit
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                onClick={handleFinalSubmit}
                className="font-semibold"
              >
                <BellRing className="w-3.5 h-3.5 mr-1.5" /> Confirm & Publish Request
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PATIENT CLAIM CODE MODAL FOR HOSPITAL COORDINATOR */}
      {claimCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 max-w-md w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-7 space-y-5 text-center">
            <div className="w-12 h-12 bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Blood Request Published!
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Hospital patient identifiers have been generated for {claimCodeModal.patientName}.
              </p>
            </div>

            {/* Identifiers Container */}
            <div className="space-y-3">
              {/* Patient ID */}
              {claimCodeModal.patientId && (
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Patient ID
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(claimCodeModal.patientId);
                        setCopiedPatientId(true);
                        setTimeout(() => setCopiedPatientId(false), 2000);
                      }}
                      className="p-1 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                      title="Copy Patient ID"
                    >
                      {copiedPatientId ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-lg font-mono font-bold text-zinc-900 dark:text-zinc-100 tracking-wider select-all">
                    {claimCodeModal.patientId}
                  </div>
                </div>
              )}

              {/* Claim Code */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Single-Use Claim Code
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(claimCodeModal.claimCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="p-1 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                    title="Copy Claim Code"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="text-xl font-mono font-extrabold text-[#A61B2B] dark:text-rose-400 tracking-wider select-all">
                  {claimCodeModal.claimCode}
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 text-left text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-semibold">How to Hand Over:</p>
              <p>
                Provide <strong>both the Patient ID and Claim Code</strong> to the patient or authorized family member. They can navigate to their Recipient Dashboard, click <strong>"Claim Hospital Patient Record"</strong>, and enter these credentials to link this requisition. The claim code is single-use and time-limited.
              </p>
            </div>

            <Button
              variant="primary"
              className="w-full text-xs font-semibold py-2.5"
              onClick={() => {
                setClaimCodeModal(null);
                navigate("/recipient/requests");
              }}
            >
              Go to Requests Dashboard →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
