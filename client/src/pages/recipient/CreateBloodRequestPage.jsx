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
} from "lucide-react";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import Button from "../../components/common/Button";
import BloodGroupBadge from "../../components/common/BloodGroupBadge";
import { BLOOD_GROUPS, URGENCY_LEVELS } from "../../constants/theme";
import { requestService } from "../../services/requestService";

export default function CreateBloodRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialBloodGroup = searchParams.get("bloodGroup") || "O+";
  const initialUrgency = searchParams.get("emergency") === "true" ? URGENCY_LEVELS.EMERGENCY : URGENCY_LEVELS.NORMAL;

  const [formData, setFormData] = useState({
    bloodGroup: initialBloodGroup,
    unitsNeeded: 1,
    hospitalName: "",
    city: "",
    requiredDate: new Date().toISOString().split("T")[0],
    urgency: initialUrgency,
    additionalNotes: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.bloodGroup) newErrors.bloodGroup = "Blood Group is required";
    if (!formData.unitsNeeded || formData.unitsNeeded < 1) newErrors.unitsNeeded = "Valid units count is required";
    if (!formData.hospitalName.trim()) newErrors.hospitalName = "Hospital Name is required";
    if (!formData.city.trim()) newErrors.city = "City / Location is required";
    if (!formData.requiredDate) newErrors.requiredDate = "Required date is required";

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
    try {
      await requestService.create({
        bloodGroup: formData.bloodGroup,
        unitsNeeded: Number(formData.unitsNeeded),
        hospitalName: formData.hospitalName,
        city: formData.city,
        requiredDate: formData.requiredDate,
        urgency: formData.urgency,
        additionalNotes: formData.additionalNotes,
      });
      navigate("/recipient/requests");
    } catch (err) {
      console.error("Failed to create blood request:", err);
      alert(err.message || "Failed to create request.");
    } finally {
      setIsSubmitting(false);
      setShowReview(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-theme-card p-6 sm:p-8 rounded-3xl border border-theme shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-theme-primary tracking-tight">
              Create Emergency Blood Request
            </h1>
            <p className="text-xs text-theme-muted">
              Broadcast urgent blood requirements to all active nearby matching donors instantly
            </p>
          </div>
        </div>
      </div>

      {/* Main Request Form Container */}
      <div className="bg-theme-card p-6 sm:p-8 rounded-3xl border border-theme shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-theme pb-3">
          <h2 className="text-base font-extrabold text-theme-primary tracking-tight">
            Request Information
          </h2>
          <span className="text-xs text-theme-muted">
            Step 1 of 2: Details Input
          </span>
        </div>

        {/* Emergency Alert Mode Banner if Urgency === Emergency */}
        {formData.urgency === URGENCY_LEVELS.EMERGENCY && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white space-y-1 shadow-md animate-pulse">
            <div className="flex items-center gap-2 font-black text-sm">
              <AlertTriangle className="w-5 h-5 fill-current" />
              CRITICAL EMERGENCY REQUEST MODE ENGAGED
            </div>
            <p className="text-xs text-red-100">
              Emergency requests receive top priority routing and real-time alert dispatch to all available matching donors within radius.
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
              placeholder="e.g. City Care Hospital"
              value={formData.hospitalName}
              onChange={handleChange}
              error={errors.hospitalName}
              icon={Building2}
              required
            />

            <Input
              label="Hospital City / General Location"
              id="city"
              placeholder="e.g. New York, Sector 14"
              value={formData.city}
              onChange={handleChange}
              error={errors.city}
              icon={MapPin}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Required Date"
              id="requiredDate"
              type="date"
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
                { label: "🚨 EMERGENCY (Immediate requirement)", value: URGENCY_LEVELS.EMERGENCY },
              ]}
              value={formData.urgency}
              onChange={handleChange}
              required
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <label htmlFor="additionalNotes" className="block text-xs font-semibold text-theme-secondary">
              Additional Information / Clinical Notes
            </label>
            <textarea
              id="additionalNotes"
              rows="3"
              value={formData.additionalNotes}
              onChange={handleChange}
              placeholder="Specify ICU wing, room number, or specific procedure details..."
              className="w-full text-xs rounded-xl border border-theme-input bg-theme-input text-theme-input placeholder-theme-muted p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Privacy & Security Disclaimer */}
          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Hospital coordinator contact numbers will be shared with donors who explicitly accept this request to facilitate donation logistics.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => navigate("/recipient")}
            >
              Cancel
            </Button>
            <Button
              variant={formData.urgency === URGENCY_LEVELS.EMERGENCY ? "primary" : "secondary"}
              type="submit"
              className="font-bold"
            >
              Review & Publish Request →
            </Button>
          </div>
        </form>
      </div>

      {/* REVIEW & CONFIRMATION MODAL */}
      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-theme-modal max-w-lg w-full rounded-3xl border border-theme shadow-2xl p-6 space-y-5">
            <div className="border-b border-theme pb-3">
              <h3 className="font-extrabold text-lg text-theme-primary">
                Confirm Blood Request Details
              </h3>
              <p className="text-xs text-theme-muted">
                Review information before broadcasting to nearby donors
              </p>
            </div>

            <div className="space-y-3 text-xs bg-theme-card-elevated p-4 rounded-2xl border border-theme">
              <div className="flex justify-between items-center">
                <span className="text-theme-muted">Target Blood Group:</span>
                <BloodGroupBadge group={formData.bloodGroup} size="sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-theme-muted">Units Required:</span>
                <span className="font-bold text-theme-primary">{formData.unitsNeeded} Unit(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-theme-muted">Hospital:</span>
                <span className="font-bold text-theme-primary">{formData.hospitalName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-theme-muted">Location:</span>
                <span className="font-bold text-theme-primary">{formData.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-theme-muted">Required Date:</span>
                <span className="font-bold text-theme-primary">{formData.requiredDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-theme-muted">Urgency Level:</span>
                <span className={`font-bold ${formData.urgency === "Emergency" ? "text-red-600 dark:text-red-400" : "text-theme-primary"}`}>
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
                className="font-bold"
              >
                <BellRing className="w-4 h-4 mr-1" /> Confirm & Publish Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
