import React from "react";
import { AlertTriangle, X } from "lucide-react";
import Button from "./Button";

export default function ConfirmDialog({
  isOpen,
  title = "Confirm Security Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-theme-modal max-w-md w-full rounded-3xl border border-theme shadow-2xl overflow-hidden space-y-0">
        {/* Header */}
        <div className="p-5 bg-theme-modal-header text-theme-primary flex items-center justify-between border-b border-theme">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-base text-theme-primary">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-theme-subtle hover:bg-theme-hover text-theme-secondary hover:text-theme-primary cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3">
          <p className="text-xs text-theme-secondary leading-relaxed">{message}</p>
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] text-rose-600 dark:text-rose-400 font-medium">
            ⚠️ Administrative Audit Notice: This action will be logged in the system security audit trail.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-theme-modal-footer border-t border-theme flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant}
            size="sm"
            isLoading={isLoading}
            onClick={onConfirm}
            className="font-bold"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
