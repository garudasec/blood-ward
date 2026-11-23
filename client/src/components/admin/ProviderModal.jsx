import React, { useState, useEffect } from 'react';
import { X, Mail, Check, AlertCircle } from 'lucide-react';

export default function ProviderModal({ isOpen, onClose, onSave, editingProvider }) {
  const [name, setName] = useState('');
  const [priority, setPriority] = useState(1);
  const [dailyLimit, setDailyLimit] = useState(500);
  const [isEnabled, setIsEnabled] = useState(true);

  // SMTP Email fields
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(587);
  const [secure, setSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderName, setSenderName] = useState('BloodWard Network');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingProvider) {
      setName(editingProvider.name || '');
      setPriority(editingProvider.priority || 1);
      setDailyLimit(editingProvider.dailyLimit || 500);
      setIsEnabled(editingProvider.isEnabled !== undefined ? editingProvider.isEnabled : true);

      setSmtpHost(editingProvider.configSummary?.smtpHost || 'smtp.gmail.com');
      setSmtpPort(editingProvider.configSummary?.smtpPort || 587);
      setSecure(Boolean(editingProvider.configSummary?.secure));
      setSmtpUser(''); // Never prefill masked user; leave blank to keep existing
      setSmtpPass(''); // Do not display raw password; leave blank to keep existing
      setSenderAddress(editingProvider.configSummary?.senderAddress || '');
      setSenderName(editingProvider.configSummary?.senderName || 'BloodWard Network');
    } else {
      setName('');
      setPriority(1);
      setDailyLimit(500);
      setIsEnabled(true);
      setSmtpHost('smtp.gmail.com');
      setSmtpPort(587);
      setSecure(false);
      setSmtpUser('');
      setSmtpPass('');
      setSenderAddress('');
      setSenderName('BloodWard Network');
    }
    setError('');
  }, [editingProvider, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Provider name is required.');
      return;
    }

    if (!smtpHost.trim()) {
      setError('SMTP Host is required.');
      return;
    }

    if (!editingProvider && (!smtpUser.trim() || !smtpPass.trim())) {
      setError('SMTP User and App Password are required for new providers.');
      return;
    }

    setIsSubmitting(true);

    try {
      const credentials = {};

      if (smtpHost.trim()) credentials.smtpHost = smtpHost.trim();
      if (smtpPort) credentials.smtpPort = Number(smtpPort);
      credentials.secure = Boolean(secure);

      if (smtpUser.trim()) credentials.smtpUser = smtpUser.trim();
      if (smtpPass.trim()) credentials.smtpPass = smtpPass.trim();
      if (senderAddress.trim()) credentials.senderAddress = senderAddress.trim();
      if (senderName.trim()) credentials.senderName = senderName.trim();

      const payload = {
        name: name.trim(),
        providerType: 'email',
        driver: 'smtp',
        priority: Number(priority) || 1,
        dailyLimit: Number(dailyLimit) >= 0 ? Number(dailyLimit) : 500,
        isEnabled,
        credentials,
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save provider.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-[#181B20] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#121418]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/40 text-[#A61B2B] dark:text-rose-400 flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingProvider ? 'Edit Email Notification Provider' : 'Add Email Notification Provider'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure SMTP email credentials and delivery priority
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Provider Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Provider Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Primary Gmail SMTP"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121418] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A61B2B]"
              required
            />
          </div>

          {/* Priority & Daily Limit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Priority (1 = Highest)
              </label>
              <input
                type="number"
                min="1"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121418] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A61B2B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Daily Message Limit
              </label>
              <input
                type="number"
                min="0"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(parseInt(e.target.value, 10) || 500)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121418] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A61B2B]"
              />
            </div>
          </div>

          {/* SMTP Server Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                SMTP Host *
              </label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121418] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A61B2B]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                SMTP Port *
              </label>
              <input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(parseInt(e.target.value, 10) || 587)}
                placeholder="587"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121418] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A61B2B]"
                required
              />
            </div>
          </div>

          {/* SMTP Credentials */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                SMTP Username / Email *
              </label>
              <input
                type="text"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder={editingProvider ? 'Leave blank to keep existing' : 'e.g. notifications@bloodward.com'}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121418] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A61B2B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                SMTP App Password *
              </label>
              <input
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder={editingProvider ? 'Leave blank to keep existing' : '••••••••••••'}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121418] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A61B2B]"
              />
            </div>
          </div>

          {/* Sender Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Sender Email (From)
              </label>
              <input
                type="email"
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
                placeholder="no-reply@bloodward.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121418] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A61B2B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Sender Name
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="BloodWard Network"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121418] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A61B2B]"
              />
            </div>
          </div>

          {/* SSL/TLS and Status */}
          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={secure}
                onChange={(e) => setSecure(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-[#A61B2B] focus:ring-[#A61B2B]"
              />
              Use SSL/TLS (Port 465)
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-[#A61B2B] focus:ring-[#A61B2B]"
              />
              Enable Provider
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-[#A61B2B] hover:bg-[#8F1624] text-white text-xs font-semibold transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingProvider ? 'Update Provider' : 'Create Provider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
