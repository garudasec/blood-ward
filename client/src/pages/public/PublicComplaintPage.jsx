import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Building2,
  User,
  FileText,
  Mail,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Send,
  HelpCircle,
  Copy,
  Check,
  Search,
  Clock,
  ShieldCheck,
  RotateCw,
} from 'lucide-react';
import { complaintService } from '../../services/complaintService';

const COMPLAINT_CATEGORIES = [
  'Blood was not provided to the intended patient',
  'Hospital did not respond after donor acceptance',
  'Suspected diversion of donated blood',
  'Incorrect information was provided',
  'Other concern',
];

export default function PublicComplaintPage() {
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' | 'track'
  const [formData, setFormData] = useState({
    patientId: '',
    hospitalId: '',
    category: 'Other concern',
    description: '',
    contactEmail: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [submittedComplaint, setSubmittedComplaint] = useState(null);
  const [copied, setCopied] = useState(false);

  // Track tab state
  const [trackId, setTrackId] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [trackResult, setTrackResult] = useState(null);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));

    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: '' }));
    }
    if (serverError) setServerError('');
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.patientId.trim()) {
      newErrors.patientId = 'Patient ID is required (e.g., BW-PAT-000001).';
    }

    if (!formData.hospitalId.trim()) {
      newErrors.hospitalId = 'Hospital ID is required (e.g., BW-HSP-000001).';
    }

    const desc = formData.description.trim();
    if (!desc) {
      newErrors.description = 'Complaint description is required.';
    } else if (desc.length < 20) {
      newErrors.description = `Description must be at least 20 characters (currently ${desc.length}).`;
    } else if (desc.length > 2000) {
      newErrors.description = `Description cannot exceed 2000 characters (currently ${desc.length}).`;
    }

    if (formData.contactEmail.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(formData.contactEmail.trim())) {
        newErrors.contactEmail = 'Please enter a valid contact email address.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError('');

    try {
      const payload = {
        patientId: formData.patientId.trim(),
        hospitalId: formData.hospitalId.trim(),
        category: formData.category,
        description: formData.description.trim(),
        ...(formData.contactEmail.trim() ? { contactEmail: formData.contactEmail.trim() } : {}),
      };

      const res = await complaintService.submitPublicComplaint(payload);
      setSubmittedComplaint({
        complaintReferenceId: res.complaintReferenceId,
        status: res.status || 'Pending',
      });
    } catch (err) {
      setServerError(
        err.message || 'Unable to submit complaint. Please check your Patient and Hospital IDs.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    if (!trackId.trim()) {
      setTrackError('Please enter a Complaint Reference ID (e.g. BW-CMP-000001).');
      return;
    }

    setIsTracking(true);
    setTrackError('');
    setTrackResult(null);

    try {
      const res = await complaintService.trackPublicComplaint(trackId.trim());
      if (res && res.complaint) {
        setTrackResult(res.complaint);
      } else {
        setTrackError('No complaint found with this Reference ID. Please verify your reference number.');
      }
    } catch (err) {
      setTrackError(err.message || 'Complaint not found. Please verify your Reference ID.');
    } finally {
      setIsTracking(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setFormData({
      patientId: '',
      hospitalId: '',
      category: 'Other concern',
      description: '',
      contactEmail: '',
    });
    setErrors({});
    setServerError('');
    setSubmittedComplaint(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-[#A61B2B] dark:hover:text-rose-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>

        {/* Tab Selector */}
        {!submittedComplaint && (
          <div className="flex rounded-xl bg-slate-200/70 dark:bg-zinc-800/80 p-1 mb-6 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => { setActiveTab('submit'); setServerError(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'submit'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              Submit Misconduct Report
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('track'); setTrackError(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'track'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              Track Existing Complaint
            </button>
          </div>
        )}

        {/* Submission Success State */}
        {submittedComplaint ? (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                Complaint Submitted Successfully
              </h2>
              <p className="text-sm text-slate-600 dark:text-zinc-400 max-w-md mx-auto">
                Your report has been securely registered in the BloodWard investigation registry with initial status{' '}
                <span className="inline-block px-2 py-0.5 font-semibold text-xs rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                  {submittedComplaint.status}
                </span>.
              </p>
            </div>

            {/* Reference ID Card */}
            <div className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 rounded-xl p-5 max-w-md mx-auto">
              <span className="block text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-zinc-400 mb-1">
                Complaint Reference ID
              </span>
              <div className="flex items-center justify-center gap-3">
                <span className="text-xl sm:text-2xl font-mono font-bold text-[#A61B2B] dark:text-rose-400">
                  {submittedComplaint.complaintReferenceId}
                </span>
                <button
                  onClick={() => copyToClipboard(submittedComplaint.complaintReferenceId)}
                  className="p-2 rounded-lg bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 hover:bg-slate-100 dark:hover:bg-zinc-600 text-slate-600 dark:text-zinc-300 transition-colors"
                  title="Copy Reference ID"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-2">
                Please save this reference ID for future inquiries and case tracking.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  setTrackId(submittedComplaint.complaintReferenceId);
                  setSubmittedComplaint(null);
                  setActiveTab('track');
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-xs font-semibold text-[#A61B2B] dark:text-rose-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                Track This Complaint Now
              </button>
              <button
                onClick={handleReset}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                Submit Another
              </button>
              <Link
                to="/"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#A61B2B] hover:bg-[#8F1624] text-white text-xs font-semibold shadow-xs transition"
              >
                Return to Home
              </Link>
            </div>
          </div>
        ) : activeTab === 'track' ? (
          /* Track Complaint Card */
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-8 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/40">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center shadow-xs">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                    Track Complaint Status
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Real-time status tracking for registered hospital & clinical misconduct reports
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleTrackSubmit} className="p-6 sm:p-8 space-y-6">
              {trackError && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-red-900 dark:text-red-200">Tracking Error</span>
                    <p className="mt-0.5">{trackError}</p>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="trackId" className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Complaint Reference ID <span className="text-[#A61B2B]">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="trackId"
                    type="text"
                    placeholder="e.g. BW-CMP-000001"
                    value={trackId}
                    onChange={(e) => {
                      setTrackId(e.target.value);
                      if (trackError) setTrackError('');
                    }}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-xs text-slate-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#A61B2B]"
                  />
                  <button
                    type="submit"
                    disabled={isTracking}
                    className="px-5 py-2.5 rounded-xl bg-[#A61B2B] hover:bg-[#8F1624] text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
                  >
                    {isTracking ? (
                      <RotateCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    {isTracking ? 'Searching...' : 'Track'}
                  </button>
                </div>
              </div>

              {trackResult && (
                <div className="p-5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block font-mono">
                        Complaint Reference
                      </span>
                      <span className="font-mono font-bold text-base text-slate-900 dark:text-zinc-100">
                        {trackResult.complaintId}
                      </span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        trackResult.status === 'Resolved'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : trackResult.status === 'Dismissed'
                          ? 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'
                          : trackResult.status === 'Under Investigation'
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {trackResult.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200 dark:border-zinc-700">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Category</span>
                      <span className="font-medium text-slate-800 dark:text-zinc-200">{trackResult.category}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Submitted Date</span>
                      <span className="font-medium text-slate-800 dark:text-zinc-200">
                        {trackResult.createdAt ? new Date(trackResult.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {trackResult.resolvedAt && (
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-xs">
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300 block">
                        Case Resolution Details:
                      </span>
                      <p className="text-emerald-700 dark:text-emerald-400 mt-1">
                        {trackResult.resolutionReason || 'This investigation was reviewed and formally concluded by the platform administration.'}
                      </p>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-1 block">
                        Resolved on {new Date(trackResult.resolvedAt).toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 dark:text-zinc-500 flex items-center gap-1.5 pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Protected under clinical privacy and anti-enumeration governance.</span>
                  </div>
                </div>
              )}
            </form>
          </div>
        ) : (
          /* Complaint Submission Form */
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-8 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/40">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/50 text-[#A61B2B] dark:text-rose-400 flex items-center justify-center shadow-xs">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                    Public Complaint & Misconduct Reporting
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Confidential reporting of hospital, blood bank, or patient care misconduct
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-3 leading-relaxed">
                You do not need to register or log in to report hospital misconduct, improper blood allocation,
                or patient safety violations. Provide the Patient and Hospital IDs to ensure your report can be
                formally investigated by hospital authorities and platform administrators.
              </p>
            </div>

            {/* Error Notice */}
            {serverError && (
              <div className="mx-6 mt-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <span className="font-semibold block text-red-900 dark:text-red-200">Submission Error</span>
                  <p className="mt-0.5">{serverError}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              {/* Identifiers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Patient ID */}
                <div>
                  <label htmlFor="patientId" className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Patient ID <span className="text-[#A61B2B]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="patientId"
                      type="text"
                      placeholder="e.g. BW-PAT-000001"
                      value={formData.patientId}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-800/80 focus:outline-none focus:ring-2 uppercase ${
                        errors.patientId
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-slate-300 dark:border-zinc-700 focus:ring-[#A61B2B]'
                      }`}
                      required
                    />
                  </div>
                  {errors.patientId ? (
                    <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">{errors.patientId}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">Unique Patient ID assigned by BloodWard</p>
                  )}
                </div>

                {/* Hospital ID */}
                <div>
                  <label htmlFor="hospitalId" className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Hospital ID <span className="text-[#A61B2B]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      id="hospitalId"
                      type="text"
                      placeholder="e.g. BW-HSP-000001"
                      value={formData.hospitalId}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-800/80 focus:outline-none focus:ring-2 uppercase ${
                        errors.hospitalId
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-slate-300 dark:border-zinc-700 focus:ring-[#A61B2B]'
                      }`}
                      required
                    />
                  </div>
                  {errors.hospitalId ? (
                    <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">{errors.hospitalId}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">Hospital facility ID where care occurred</p>
                  )}
                </div>
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Complaint Category <span className="text-[#A61B2B]">*</span>
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-xs text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-800/80 focus:outline-none focus:ring-2 focus:ring-[#A61B2B]"
                >
                  {COMPLAINT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="description" className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Complaint Description <span className="text-[#A61B2B]">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                    {formData.description.trim().length}/2000 characters (min 20)
                  </span>
                </div>
                <textarea
                  id="description"
                  rows={5}
                  placeholder="Please provide detailed facts regarding what occurred, dates, involved departments, staff or physician interactions, and why you believe improper conduct occurred..."
                  value={formData.description}
                  onChange={handleChange}
                  className={`w-full p-3.5 rounded-xl border text-xs text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-800/80 focus:outline-none focus:ring-2 ${
                    errors.description
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-slate-300 dark:border-zinc-700 focus:ring-[#A61B2B]'
                  }`}
                  required
                />
                {errors.description && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">{errors.description}</p>
                )}
              </div>

              {/* Contact Email (Optional) */}
              <div>
                <label htmlFor="contactEmail" className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Contact Email <span className="text-slate-400 font-normal">(Optional — for investigation updates)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="contactEmail"
                    type="email"
                    placeholder="your-email@example.com"
                    value={formData.contactEmail}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-800/80 focus:outline-none focus:ring-2 ${
                      errors.contactEmail
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-slate-300 dark:border-zinc-700 focus:ring-[#A61B2B]'
                    }`}
                  />
                </div>
                {errors.contactEmail ? (
                  <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">{errors.contactEmail}</p>
                ) : (
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                    Leave blank to submit anonymously. If provided, case progress notifications will be sent to this email.
                  </p>
                )}
              </div>

              {/* Privacy Notice */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 text-[11px] text-slate-500 dark:text-zinc-400 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-zinc-300">
                  <HelpCircle className="w-3.5 h-3.5 text-[#A61B2B]" /> Anti-Enumeration & Privacy Protection
                </div>
                <p>
                  To protect patient privacy, BloodWard validates the hospital association before registering any complaint.
                  Unverified associations or mismatched records are rejected without disclosing patient medical information.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#A61B2B] hover:bg-[#8F1624] text-white text-xs font-semibold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Verifying & Submitting Complaint...' : 'Submit Complaint for Administrative Review'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
