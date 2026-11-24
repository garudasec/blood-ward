import React, { useState, useEffect } from 'react';
import { X, Mail, Check, AlertCircle } from 'lucide-react';

export default function ProviderModal({ isOpen, onClose, onSave, editingProvider }) {
  const [name, setName] = useState('');
  const [driver, setDriver] = useState('resend'); // 'resend' | 'smtp'
  const [priority, setPriority] = useState(1);
  const [dailyLimit, setDailyLimit] = useState(500);
  const [isEnabled, setIsEnabled] = useState(true);

  // Resend fields
  const [apiKey, setApiKey] = useState('');

  // SMTP Email fields
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(587);
  const [secure, setSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');

  // Shared sender metadata
  const [senderAddress, setSenderAddress] = useState('');
  const [senderName, setSenderName] = useState('BloodWard Network');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingProvider) {
      setName(editingProvider.name || '');
      setDriver(editingProvider.driver || 'resend');
      setPriority(editingProvider.priority || 1);
      setDailyLimit(editingProvider.dailyLimit || 500);
      setIsEnabled(editingProvider.isEnabled !== undefined ? editingProvider.isEnabled : true);

      // Resend
      setApiKey(''); // Do not display raw API key; blank keeps existing

      // SMTP
      setSmtpHost(editingProvider.configSummary?.smtpHost || 'smtp.gmail.com');
      setSmtpPort(editingProvider.configSummary?.smtpPort || 587);
      setSecure(Boolean(editingProvider.configSummary?.secure));
      setSmtpUser(''); // Never prefill masked user; blank keeps existing
      setSmtpPass(''); // Do not display raw password; blank keeps existing

      // Shared
      setSenderAddress(editingProvider.configSummary?.senderAddress || '');
      setSenderName(editingProvider.configSummary?.senderName || 'BloodWard Network');
    } else {
      setName('');
      setDriver('resend');
      setPriority(1);
      setDailyLimit(500);
      setIsEnabled(true);
      setApiKey('');
      setSmtpHost('smtp.gmail.com');
      setSmtpPort(587);
      setSecure(false);
      setSmtpUser('');
      setSmtpPass('');
      setSenderAddress('onboarding@resend.dev');
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

    if (driver === 'resend') {
      if (!editingProvider && !apiKey.trim()) {
        setError('Resend API key is required (e.g. re_xxxx...).');
        return;
      }
    } else if (driver === 'smtp') {
      if (!smtpHost.trim()) {
        setError('SMTP Host is required.');
        return;
      }

      if (!editingProvider && (!smtpUser.trim() || !smtpPass.trim())) {
        setError('SMTP User and App Password are required for new providers.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const credentials = {};

      if (driver === 'resend') {
        if (apiKey.trim()) credentials.apiKey = apiKey.trim();
        if (senderAddress.trim()) credentials.senderAddress = senderAddress.trim();
        if (senderName.trim()) credentials.senderName = senderName.trim();
      } else {
        if (smtpHost.trim()) credentials.smtpHost = smtpHost.trim();
        if (smtpPort) credentials.smtpPort = Number(smtpPort);
        credentials.secure = Boolean(secure);
        if (smtpUser.trim()) credentials.smtpUser = smtpUser.trim();
        if (smtpPass.trim()) credentials.smtpPass = smtpPass.trim();
        if (senderAddress.trim()) credentials.senderAddress = senderAddress.trim();
        if (senderName.trim()) credentials.senderName = senderName.trim();
      }

      const payload = {
        name: name.trim(),
        providerType: 'email',
        driver,
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
                Configure Resend HTTPS REST API or standard SMTP delivery
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

          {/* Provider Name & Driver Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Provider Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Primary Resend API"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121418] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A61B2B]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Delivery Driver *
              </label>
              <select
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
                disabled={Boolean(editingProvider)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121418] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A61B2B] disabled:opacity-60"
              >
                <option value="resend">Resend (HTTPS REST API — Recommended)</option>
                <option value="smtp">Standard SMTP / Gmail (Port 587/465)</option>
              </select>
            </div>
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

          {/* Conditional Driver Configuration */}
          {driver === 'resend' ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#121418] border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Resend HTTPS Configuration</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                  Outbound Port 443 (HTTPS)
                </span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Resend API Key *
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={editingProvider ? 'Leave blank to keep existing API key' : 're_xxxxxxxxxxxxxxxxxxxx'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181B20] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A61B2B] font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Obtained from resend.com/api-keys. Credentials are encrypted at rest with AES-256-GCM.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#121418] border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">SMTP Server Configuration</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                  Ports 587/465 (Blocked on Render Free)
                </span>
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181B20] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A61B2B]"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181B20] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A61B2B]"
                  />
                </div>
              </div>

              {/* SMTP Credentials */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    SMTP Username / Email *
                  </label>
                  <input
                    type="text"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder={editingProvider ? 'Leave blank to keep existing' : 'notifications@bloodward.com'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181B20] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A61B2B]"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181B20] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A61B2B]"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={secure}
                    onChange={(e) => setSecure(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-[#A61B2B] focus:ring-[#A61B2B]"
                  />
                  Use SSL/TLS (Port 465)
                </label>
              </div>
            </div>
          )}

          {/* Sender Metadata (Shared for both Resend and SMTP) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Sender Email (From Address)
              </label>
              <input
                type="text"
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
                placeholder={driver === 'resend' ? 'onboarding@resend.dev' : 'no-reply@bloodward.com'}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121418] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A61B2B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Sender Display Name
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

          {/* Enable Provider Toggle */}
          <div className="pt-2">
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
