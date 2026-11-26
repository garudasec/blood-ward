import React, { useState } from 'react';
import { X, ShieldAlert, AlertCircle, CheckCircle2, FileText, Link as LinkIcon } from 'lucide-react';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { complaintService } from '../../services/complaintService';

const COMPLAINT_CATEGORIES = [
  { label: 'Select Complaint Category', value: '' },
  { label: 'Blood was not provided to the intended patient', value: 'Blood was not provided to the intended patient' },
  { label: 'Hospital did not respond after donor acceptance', value: 'Hospital did not respond after donor acceptance' },
  { label: 'Suspected diversion of donated blood', value: 'Suspected diversion of donated blood' },
  { label: 'Incorrect information was provided', value: 'Incorrect information was provided' },
  { label: 'Other concern', value: 'Other concern' },
];

export default function CreateComplaintModal({
  isOpen,
  onClose,
  bloodRequest,
  patient,
  onComplaintSubmitted,
}) {
  const { user } = useAuth();
  const isDonor = user?.role === 'donor';
  const resolvedPatientId = patient?.id || patient?._id || bloodRequest?.patient || null;
  const resolvedHospitalId = bloodRequest?.hospital?._id || bloodRequest?.hospital || null;
  const hasLinkedPatient = Boolean(resolvedPatientId);

  const [category, setCategory] = useState(isDonor ? 'Hospital did not respond after donor acceptance' : '');
  const [complainantType, setComplainantType] = useState(
    isDonor ? 'donor' : hasLinkedPatient ? 'patient' : 'recipient'
  );
  const [familyRelationship, setFamilyRelationship] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [submittedComplaintId, setSubmittedComplaintId] = useState('');

  if (!isOpen || !bloodRequest) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!category) {
      setError('Please select a valid complaint category.');
      return;
    }

    if (!description || description.trim().length < 20) {
      setError('Please provide a detailed description of at least 20 characters.');
      return;
    }

    if (complainantType === 'family_member' && !familyRelationship.trim()) {
      setError('Please specify your family relationship to the patient.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        requestId: bloodRequest.id || bloodRequest._id,
        ...(resolvedPatientId ? { patientId: resolvedPatientId } : {}),
        ...(resolvedHospitalId ? { hospitalId: resolvedHospitalId } : {}),
        complainantType,
        familyRelationship: complainantType === 'family_member' ? familyRelationship.trim() : undefined,
        category,
        description: description.trim(),
        evidenceUrls: evidenceUrl.trim() ? [evidenceUrl.trim()] : [],
      };

      const response = await complaintService.submitComplaint(payload);
      const refId = response.complaintId || response.complaint?.complaintId || '';
      setSubmittedComplaintId(refId);
      setSuccessMessage(response.message || 'Complaint submitted successfully and logged for administrative investigation.');
      setTimeout(() => {
        if (onComplaintSubmitted) onComplaintSubmitted(response.complaint);
        onClose();
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to submit complaint. Verify your details and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 max-w-lg w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2 font-bold text-base text-zinc-900 dark:text-zinc-100">
            <ShieldAlert className="w-5 h-5 text-[#A61B2B]" />
            Report Issue / File Complaint
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 space-y-1">
          <div><span className="font-semibold">Hospital:</span> {bloodRequest.hospitalName || 'Associated Medical Center'}</div>
          <div><span className="font-semibold">Requisition:</span> {bloodRequest.bloodGroup} • {bloodRequest.unitsNeeded} unit(s)</div>
          {patient && <div><span className="font-semibold">Patient:</span> {patient.name} ({patient.patientId})</div>}
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage ? (
          <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-xl text-center space-y-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto" />
            <div className="text-xs font-semibold text-green-800 dark:text-green-300">
              {successMessage}
            </div>
            {submittedComplaintId && (
              <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-green-200 dark:border-green-800 text-xs">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Complaint Reference ID</span>
                <span className="font-mono font-bold text-[#A61B2B] dark:text-rose-400 text-sm">{submittedComplaintId}</span>
              </div>
            )}
            <p className="text-[11px] text-green-700 dark:text-green-400">
              An administrator will review the evidence and hospital response. Your complaint status is independent of the blood request status.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isDonor ? (
              <div className="p-2.5 rounded-xl border border-[#A61B2B] bg-red-50/50 dark:bg-red-950/20 text-[#A61B2B] dark:text-red-300 text-xs font-semibold text-center">
                Submitting as Voluntary Donor
              </div>
            ) : !hasLinkedPatient ? (
              <div className="p-2.5 rounded-xl border border-[#A61B2B] bg-red-50/50 dark:bg-red-950/20 text-[#A61B2B] dark:text-red-300 text-xs font-semibold text-center">
                Submitting as Request Owner / Recipient
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label
                  className={`p-2.5 rounded-xl border text-center font-medium cursor-pointer transition-colors ${
                    complainantType === 'patient'
                      ? 'border-[#A61B2B] bg-red-50/50 dark:bg-red-950/20 text-[#A61B2B] dark:text-red-300'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="complainantType"
                    value="patient"
                    checked={complainantType === 'patient'}
                    onChange={() => setComplainantType('patient')}
                    className="sr-only"
                  />
                  Primary Patient
                </label>

                <label
                  className={`p-2.5 rounded-xl border text-center font-medium cursor-pointer transition-colors ${
                    complainantType === 'family_member'
                      ? 'border-[#A61B2B] bg-red-50/50 dark:bg-red-950/20 text-[#A61B2B] dark:text-red-300'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="complainantType"
                    value="family_member"
                    checked={complainantType === 'family_member'}
                    onChange={() => setComplainantType('family_member')}
                    className="sr-only"
                  />
                  Authorized Family Member
                </label>
              </div>
            )}

            {complainantType === 'family_member' && (
              <Input
                label="Your Family Relationship"
                id="familyRelationship"
                placeholder="e.g. Daughter, Spouse, Son"
                value={familyRelationship}
                onChange={(e) => setFamilyRelationship(e.target.value)}
                required
              />
            )}

            <Select
              label="Complaint Category"
              id="category"
              options={COMPLAINT_CATEGORIES}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label htmlFor="description" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Detailed Incident Description (Min. 20 chars)
              </label>
              <textarea
                id="description"
                rows="4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain exactly what occurred, including dates, hospital staff interactions, or discrepancies..."
                className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 p-2.5 outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-200"
                required
              />
            </div>

            <Input
              label="Supporting Evidence Link (Optional)"
              id="evidenceUrl"
              placeholder="https://drive.google.com/... or document URL"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              icon={LinkIcon}
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={isLoading}>
                Submit Complaint For Investigation
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
