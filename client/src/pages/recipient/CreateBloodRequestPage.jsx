import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  PlusCircle,
  Building2,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Droplet,
  ShieldCheck,
  BellRing,
  Info,
} from 'lucide-react';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import BloodGroupBadge from '../../components/common/BloodGroupBadge';
import { BLOOD_GROUPS, URGENCY_LEVELS } from '../../constants/theme';
import { MOCK_RECIPIENT_REQUESTS } from '../../constants/mockData';

export default function CreateBloodRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const urlGroup = searchParams.get('bloodGroup') || '';
  const urlEmergency = searchParams.get('emergency') === 'true';

  const [formData, setFormData] = useState({
    bloodGroup: urlGroup || 'A+',
    unitsNeeded: 2,
    hospitalName: '',
    city: user?.city || 'New York',
    requiredDate: new Date().toISOString().split('T')[0],
    urgency: urlEmergency ? URGENCY_LEVELS.EMERGENCY : URGENCY_LEVELS.NORMAL,
    additionalNotes: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [createdRequest, setCreatedRequest] = useState(null);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.bloodGroup) newErrors.bloodGroup = 'Blood Group selection is required';
    if (!formData.unitsNeeded || formData.unitsNeeded < 1) {
      newErrors.unitsNeeded = 'At least 1 unit of blood is required';
    }
    if (!formData.hospitalName.trim()) newErrors.hospitalName = 'Hospital Name is required';
    if (!formData.city.trim()) newErrors.city = 'Hospital Location / City is required';
    if (!formData.requiredDate) newErrors.requiredDate = 'Required date is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReviewClick = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setShowReview(true);
    }
  };

  const handleFinalSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const newReq = {
        id: `req-${Math.floor(100 + Math.random() * 900)}`,
        hospitalName: formData.hospitalName,
        city: formData.city,
        bloodGroup: formData.bloodGroup,
        unitsNeeded: Number(formData.unitsNeeded),
        urgency: formData.urgency,
        status: 'Active',
        donorResponsesCount: 0,
        acceptedDonors: [],
        requiredDate: formData.requiredDate,
        createdAt: 'Just now',
        additionalNotes: formData.additionalNotes,
      };

      // Push to mock requests array so frontend flows demonstrate the active request
      MOCK_RECIPIENT_REQUESTS.unshift(newReq);

      setIsSubmitting(false);
      setShowReview(false);
      setCreatedRequest(newReq);
    }, 600);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Top Back Navigation */}
      <button
        onClick={() => navigate('/recipient')}
        className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 gap-1.5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      {/* Success Confirmation View */}
      {createdRequest ? (
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl text-center space-y-6 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Request Published: REF #{createdRequest.id}
            </span>
            <h2 className="text-2xl font-black text-slate-900">
              Blood Request Successfully Broadcasted!
            </h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Your request for <strong className="text-slate-900">{createdRequest.unitsNeeded} unit(s) of {createdRequest.bloodGroup}</strong> at <strong className="text-slate-900">{createdRequest.hospitalName}</strong> is now live. Matching available donors are receiving alerts.
            </p>
          </div>

          {/* Request Preview Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2 max-w-lg mx-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-800">{createdRequest.hospitalName}</span>
              <BloodGroupBadge group={createdRequest.bloodGroup} size="sm" />
            </div>
            <div className="text-slate-600 space-y-1">
              <p><strong>Urgency Level:</strong> {createdRequest.urgency}</p>
              <p><strong>Location:</strong> {createdRequest.city}</p>
              <p><strong>Status:</strong> <span className="text-blue-600 font-bold">Active Broadcast</span></p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              onClick={() => navigate('/recipient/requests')}
            >
              Track Active Requests →
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/recipient')}
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      ) : (
        /* MAIN FORM CREATION CONTAINER */
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-600 text-white">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Issue New Blood Request
                </h1>
              </div>
              <p className="text-xs text-slate-500">
                Fill in hospital details and urgency to broadcast to nearby matching blood donors
              </p>
            </div>
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
                  { label: 'Normal (Standard procedure)', value: URGENCY_LEVELS.NORMAL },
                  { label: 'High (Required within 24 hours)', value: URGENCY_LEVELS.HIGH },
                  { label: '🚨 EMERGENCY (Immediate requirement)', value: URGENCY_LEVELS.EMERGENCY },
                ]}
                value={formData.urgency}
                onChange={handleChange}
                required
              />
            </div>

            {/* Additional Notes */}
            <div className="space-y-1.5">
              <label htmlFor="additionalNotes" className="block text-xs font-semibold text-slate-700">
                Additional Information / Clinical Notes
              </label>
              <textarea
                id="additionalNotes"
                rows="3"
                value={formData.additionalNotes}
                onChange={handleChange}
                placeholder="Specify ICU wing, room number, or specific procedure details..."
                className="w-full text-xs rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Privacy & Security Disclaimer */}
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-900 text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Hospital coordinator contact numbers will be shared with donors who explicitly accept this request to facilitate donation logistics.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => navigate('/recipient')}
              >
                Cancel
              </Button>
              <Button
                variant={formData.urgency === URGENCY_LEVELS.EMERGENCY ? 'primary' : 'secondary'}
                type="submit"
                className="font-bold"
              >
                Review & Publish Request →
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* REVIEW & CONFIRMATION MODAL */}
      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white max-w-lg w-full rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5">
            <div className="border-b pb-3">
              <h3 className="font-extrabold text-lg text-slate-900">
                Confirm Blood Request Details
              </h3>
              <p className="text-xs text-slate-500">
                Review information before broadcasting to nearby donors
              </p>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Target Blood Group:</span>
                <BloodGroupBadge group={formData.bloodGroup} size="sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Units Required:</span>
                <span className="font-bold text-slate-900">{formData.unitsNeeded} Unit(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hospital:</span>
                <span className="font-bold text-slate-900">{formData.hospitalName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Location:</span>
                <span className="font-bold text-slate-900">{formData.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Required Date:</span>
                <span className="font-bold text-slate-900">{formData.requiredDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Urgency Level:</span>
                <span className={`font-bold ${formData.urgency === 'Emergency' ? 'text-red-600' : 'text-slate-900'}`}>
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