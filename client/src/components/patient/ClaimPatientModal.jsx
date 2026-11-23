import React, { useState } from 'react';
import { X, KeyRound, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import Input from '../common/Input';
import Button from '../common/Button';
import { patientService } from '../../services/patientService';

export default function ClaimPatientModal({ isOpen, onClose, onClaimSuccess }) {
  const [patientId, setPatientId] = useState('');
  const [claimCode, setClaimCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!patientId.trim()) {
      setError('Patient ID is required (e.g. BW-PAT-000001).');
      return;
    }

    if (!claimCode.trim()) {
      setError('Claim code is required (e.g. BW-CLM-XXXXXX).');
      return;
    }

    setIsLoading(true);
    try {
      const response = await patientService.claimPatient(patientId.trim(), claimCode.trim());
      setSuccessMessage(response.message || 'Patient record successfully claimed!');
      setTimeout(() => {
        if (onClaimSuccess) onClaimSuccess(response.patient);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to claim patient record. Verify your code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 max-w-md w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2 font-bold text-base text-zinc-900 dark:text-zinc-100">
            <KeyRound className="w-5 h-5 text-[#A61B2B]" />
            Claim Hospital Patient Record
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Enter the unique Patient ID and single-use claim code provided by your hospital representative to link your patient profile.
        </p>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage ? (
          <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-xl text-center space-y-2">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto" />
            <div className="text-xs font-semibold text-green-800 dark:text-green-300">
              {successMessage}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Patient ID"
              id="patientId"
              placeholder="e.g. BW-PAT-000001"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value.toUpperCase())}
              required
            />

            <Input
              label="Single-Use Claim Code"
              id="claimCode"
              placeholder="e.g. BW-CLM-A1B2C3"
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
              required
            />

            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-start gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-zinc-600 dark:text-zinc-300 shrink-0 mt-0.5" />
              <span>Each code is cryptographically hashed, single-use, and expires automatically after use.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={isLoading}>
                Verify & Claim Record →
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
