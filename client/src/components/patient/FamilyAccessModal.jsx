import React, { useState } from 'react';
import { X, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import Select from '../common/Select';
import Button from '../common/Button';
import { patientService } from '../../services/patientService';

const RELATIONSHIP_OPTIONS = [
  { label: 'Select Relationship', value: '' },
  { label: 'Spouse', value: 'Spouse' },
  { label: 'Parent', value: 'Parent' },
  { label: 'Child', value: 'Child' },
  { label: 'Sibling', value: 'Sibling' },
  { label: 'Legal Guardian', value: 'Legal Guardian' },
  { label: 'Other Relative', value: 'Other Relative' },
];

export default function FamilyAccessModal({ isOpen, onClose, patient, onSuccess }) {
  const [relationship, setRelationship] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen || !patient) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!relationship) {
      setError('Please select your relationship to the patient.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await patientService.requestFamilyAccess(patient.id || patient._id, relationship, notes);
      setSuccessMessage(response.message || 'Family access request submitted successfully.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to submit family access request.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 max-w-md w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2 font-bold text-base text-zinc-900 dark:text-zinc-100">
            <Users className="w-5 h-5 text-[#315B83]" />
            Request Family Access
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300">
          <div><span className="font-semibold">Patient:</span> {patient.name} ({patient.patientId})</div>
          <div><span className="font-semibold">Hospital:</span> {patient.hospital?.name || 'Associated Hospital'}</div>
        </div>

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
            <Select
              label="Relationship to Patient"
              id="relationship"
              options={RELATIONSHIP_OPTIONS}
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label htmlFor="notes" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Authorization Notes / Proof Context
              </label>
              <textarea
                id="notes"
                rows="3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Briefly state your relationship context for verification..."
                className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 p-2.5 outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-200"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={isLoading}>
                Submit Access Request
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
