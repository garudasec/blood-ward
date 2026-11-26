import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Building2,
  User,
  Heart,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  Send,
} from 'lucide-react';
import Button from '../common/Button';
import Select from '../common/Select';
import { complaintService } from '../../services/complaintService';

const STATUS_BADGES = {
  Submitted: 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900',
  'Under Review': 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900',
  Investigation: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900',
  Resolved: 'bg-green-50 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900',
  Rejected: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900',
};

export default function AdminComplaintDetailModal({
  isOpen,
  onClose,
  complaint,
  onStatusUpdated,
}) {
  const [activeTab, setActiveTab] = useState('dossier');
  const [investigationNote, setInvestigationNote] = useState('');
  const [targetStatus, setTargetStatus] = useState('Investigation');
  const [resolutionStatus, setResolutionStatus] = useState('Resolved');
  const [resolutionReason, setResolutionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  if (!isOpen || !complaint) return null;

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    setIsSubmitting(true);
    try {
      const response = await complaintService.updateComplaintStatus(
        complaint.id || complaint._id,
        targetStatus,
        investigationNote
      );
      setActionSuccess(`Complaint status updated to '${targetStatus}'.`);
      setInvestigationNote('');
      if (onStatusUpdated) onStatusUpdated(response.complaint);
    } catch (err) {
      setActionError(err.message || 'Failed to update complaint status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    if (!resolutionReason.trim()) {
      setActionError('A recorded resolution reason is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await complaintService.resolveComplaint(
        complaint.id || complaint._id,
        resolutionStatus,
        resolutionReason,
        investigationNote
      );
      setActionSuccess(`Complaint marked as ${resolutionStatus}.`);
      setResolutionReason('');
      setInvestigationNote('');
      if (onStatusUpdated) onStatusUpdated(response.complaint);
    } catch (err) {
      setActionError(err.message || 'Failed to record resolution.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isClosed = ['Resolved', 'Rejected'].includes(complaint.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#A61B2B]">
                {complaint.complaintId}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  STATUS_BADGES[complaint.status] || STATUS_BADGES.Submitted
                }`}
              >
                {complaint.status}
              </span>
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {complaint.category}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('dossier')}
            className={`py-2 px-4 font-semibold border-b-2 transition-colors ${
              activeTab === 'dossier'
                ? 'border-[#A61B2B] text-[#A61B2B]'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Investigation Dossier
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('actions')}
            className={`py-2 px-4 font-semibold border-b-2 transition-colors ${
              activeTab === 'actions'
                ? 'border-[#A61B2B] text-[#A61B2B]'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Actions & Resolution
          </button>
        </div>

        {actionError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {actionSuccess && (
          <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-xl text-xs text-green-700 dark:text-green-400 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {activeTab === 'dossier' ? (
          <div className="space-y-4 text-xs">
            {/* Description Narrative */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
                Complainant Narrative
              </span>
              <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {complaint.description}
              </p>
              {complaint.evidenceUrls && complaint.evidenceUrls.length > 0 && (
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <span className="font-semibold text-zinc-600 dark:text-zinc-400">Evidence Links:</span>
                  <div className="space-y-1 mt-1">
                    {complaint.evidenceUrls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#315B83] dark:text-blue-400 hover:underline block break-all font-mono"
                      >
                        {url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Entity Triangulation Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Complainant Card */}
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                  <User className="w-3.5 h-3.5 text-[#315B83]" />
                  Complainant
                </div>
                <div>{complaint.complainant?.fullName || 'Anonymous'}</div>
                <div className="text-zinc-500 font-mono">{complaint.complainant?.phone || complaint.complainant?.email}</div>
                <div className="text-[11px] text-[#A61B2B] font-medium">
                  {complaint.complainantType === 'family_member'
                    ? `Family Member (${complaint.familyRelationship || 'Relative'})`
                    : complaint.complainantType === 'donor'
                    ? 'Voluntary Donor'
                    : complaint.complainantType === 'recipient'
                    ? 'Recipient / Request Owner'
                    : complaint.complainantType === 'public'
                    ? 'Public Reporter'
                    : 'Primary Patient'}
                </div>
              </div>

              {/* Hospital Card */}
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                  <Building2 className="w-3.5 h-3.5 text-[#A61B2B]" />
                  Hospital
                </div>
                <div>{complaint.hospital?.name || complaint.bloodRequest?.hospitalName || 'Hospital Entity'}</div>
                <div className="text-zinc-500">{complaint.hospital?.city || complaint.bloodRequest?.city || 'Location N/A'}</div>
                <div className="text-[11px] font-mono text-zinc-400">
                  {complaint.hospital?.hospitalId ? `ID: ${complaint.hospital.hospitalId}` : 'Request-reported facility'}
                </div>
              </div>

              {/* Patient Card */}
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                  <Heart className="w-3.5 h-3.5 text-rose-600" />
                  Patient / Recipient Subject
                </div>
                <div>
                  {complaint.patient?.name || complaint.bloodRequest?.recipientName || 'Recipient'} ({complaint.patient?.bloodGroup || complaint.bloodRequest?.bloodGroup || 'N/A'})
                </div>
                <div className="text-zinc-500">
                  {complaint.patient
                    ? `Reg #: ${complaint.patient.hospitalRegistrationNumber || 'N/A'} • Ward: ${complaint.patient.wardDepartment || 'N/A'}`
                    : 'Direct Recipient Blood Request'}
                </div>
                <div className="text-[11px] font-mono text-zinc-400">
                  {complaint.patient?.patientId ? `ID: ${complaint.patient.patientId}` : 'No linked Patient ID'}
                </div>
              </div>

              {/* Blood Request Card */}
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  Associated Request
                </div>
                <div>{complaint.bloodRequest?.bloodGroup} • {complaint.bloodRequest?.unitsNeeded} units</div>
                <div className="text-zinc-500">
                  Status: <span className="font-semibold">{complaint.bloodRequest?.status}</span>
                </div>
                <div className="text-[11px] font-mono text-zinc-400">
                  Req ID: {complaint.bloodRequest?._id}
                </div>
              </div>
            </div>

            {/* Resolution Dossier if Closed */}
            {isClosed && (
              <div className={`p-4 rounded-xl border ${
                complaint.status === 'Resolved'
                  ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50 text-green-900 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-300'
              } space-y-1.5`}>
                <div className="font-bold flex items-center gap-1.5">
                  {complaint.status === 'Resolved' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                  Investigation Decision: {complaint.status}
                </div>
                <p className="text-xs leading-relaxed">{complaint.resolutionReason}</p>
                {complaint.resolvedAt && (
                  <div className="text-[10px] opacity-75 font-mono pt-1">
                    Recorded on {new Date(complaint.resolvedAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {/* Investigation Notes History */}
            <div className="space-y-2 pt-2">
              <span className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
                Investigation Audit Trail ({complaint.investigationNotes?.length || 0})
              </span>
              {complaint.investigationNotes && complaint.investigationNotes.length > 0 ? (
                <div className="space-y-2">
                  {complaint.investigationNotes.map((n, i) => (
                    <div
                      key={i}
                      className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1"
                    >
                      <p className="text-zinc-800 dark:text-zinc-200">{n.note}</p>
                      <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(n.addedAt).toLocaleString()}</span>
                        {n.addedBy && <span>• by {n.addedBy.fullName || 'Admin'}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-400 italic">No notes recorded yet.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Transition Status Form */}
            <form onSubmit={handleUpdateStatus} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-3">
              <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#315B83]" />
                Update Investigation Stage
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Target Stage"
                  id="targetStatus"
                  options={[
                    { label: 'Under Review', value: 'Under Review' },
                    { label: 'Active Investigation', value: 'Investigation' },
                  ]}
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Investigation Note (Optional)
                </label>
                <textarea
                  rows="2"
                  value={investigationNote}
                  onChange={(e) => setInvestigationNote(e.target.value)}
                  placeholder="Record hospital interview or patient follow-up findings..."
                  className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2.5 outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-200"
                />
              </div>

              <Button variant="secondary" size="sm" type="submit" isLoading={isSubmitting}>
                Save Stage & Add Note
              </Button>
            </form>

            {/* Resolve / Reject Form */}
            <form onSubmit={handleResolve} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-3">
              <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Final Complaint Resolution
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Final Outcome"
                  id="resolutionStatus"
                  options={[
                    { label: 'Mark as Resolved', value: 'Resolved' },
                    { label: 'Dismiss / Reject Complaint', value: 'Rejected' },
                  ]}
                  value={resolutionStatus}
                  onChange={(e) => setResolutionStatus(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Recorded Resolution Reason (Mandatory)
                </label>
                <textarea
                  rows="3"
                  value={resolutionReason}
                  onChange={(e) => setResolutionReason(e.target.value)}
                  placeholder="Detail official administrative conclusion and any disciplinary measures enacted..."
                  className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2.5 outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-200"
                  required
                />
              </div>

              <Button
                variant={resolutionStatus === 'Resolved' ? 'primary' : 'outline'}
                size="sm"
                type="submit"
                isLoading={isSubmitting}
              >
                Record Final {resolutionStatus} Decision
              </Button>
            </form>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Dossier
          </Button>
        </div>
      </div>
    </div>
  );
}
