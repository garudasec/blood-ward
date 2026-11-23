import React, { useState } from 'react';
import { X, Mail, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function TestProviderModal({ isOpen, onClose, provider, onExecuteTest }) {
  const [testRecipient, setTestRecipient] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen || !provider) return null;

  const handleTest = async (e) => {
    e.preventDefault();
    setIsRunning(true);
    setResult(null);
    setError('');

    try {
      const res = await onExecuteTest(provider._id, {
        testRecipient: testRecipient.trim() || undefined,
      });
      setResult(res);
    } catch (err) {
      setError(err.message || 'Provider connection or delivery test failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setError('');
    setTestRecipient('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-[#181B20] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#121418]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/40 text-[#A61B2B] dark:text-rose-400 flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Test Provider: {provider.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Driver: <span className="font-mono">{provider.driver || 'smtp'}</span> (EMAIL)
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleTest} className="p-6 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Verify SMTP credentials and server responsiveness. Enter an optional recipient email address to dispatch an actual live test email, or leave blank to test SMTP server connectivity only.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Test Email Address (Optional)
            </label>
            <input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="e.g. admin@bloodward.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121418] text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#A61B2B]"
            />
          </div>

          {/* Test Outcomes */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
              <div>
                <div className="font-semibold text-red-800 dark:text-red-200">Test Failed</div>
                <div className="text-xs mt-0.5">{error}</div>
              </div>
            </div>
          )}

          {result && (
            <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
              result.data?.deliveryStatus === 'Delivery Confirmed' || result.data?.deliveryStatus === 'Connection Verified'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
            }`}>
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              <div className="space-y-1">
                <div className="font-semibold">{result.message}</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  Status: <strong>{result.data?.deliveryStatus}</strong>
                  {result.data?.messageId && (
                    <span className="block font-mono text-[10px] mt-0.5 text-slate-500">
                      Message ID: {result.data.messageId}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={isRunning}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isRunning}
              className="px-4 py-2 rounded-xl bg-[#A61B2B] hover:bg-[#8F1624] text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition disabled:opacity-50"
            >
              {isRunning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isRunning ? 'Testing Provider...' : testRecipient.trim() ? 'Send Test Email' : 'Verify Connectivity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
