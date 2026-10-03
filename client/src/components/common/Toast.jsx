import React, { useEffect } from "react";
import { AlertCircle, X } from "lucide-react";

export default function Toast({ message, onClose, duration = 4000, type = "error" }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-5 right-5 z-50 max-w-sm sm:max-w-md w-full px-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-600 text-white shadow-2xl border border-rose-500/30">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-100" />
        <div className="flex-1 text-xs sm:text-sm font-semibold leading-snug">
          {message}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-rose-700/60 text-rose-100 transition-colors cursor-pointer shrink-0"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
