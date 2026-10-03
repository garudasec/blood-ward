import React from "react";
import { X, ShieldAlert, Terminal } from "lucide-react";
import Button from "../common/Button";

export default function AdminAuditDetailModal({ log, isOpen, onClose }) {
  if (!isOpen || !log) return null;

  const isHighSeverity = log.severity === "HIGH";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-theme-modal max-w-xl w-full rounded-3xl border border-theme shadow-2xl overflow-hidden space-y-0">
        {/* Header */}
        <div className="p-6 bg-theme-modal-header text-theme-primary flex items-center justify-between border-b border-theme">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-500 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                AUDIT {log.id}
              </span>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                  isHighSeverity
                    ? "bg-rose-600 text-white"
                    : "bg-theme-subtle text-theme-secondary border border-theme"
                }`}
              >
                {log.severity} SEVERITY
              </span>
            </div>
            <h3 className="font-extrabold text-base text-theme-primary leading-snug">
              {log.action}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-theme-subtle hover:bg-theme-hover text-theme-secondary hover:text-theme-primary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          {isHighSeverity && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center gap-2 font-bold">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>SECURITY AUDIT ALERT: High-priority security-sensitive action recorded.</span>
            </div>
          )}

          {/* Matrix Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-theme-card-elevated p-3 rounded-2xl border border-theme">
              <span className="text-[10px] uppercase font-bold text-theme-muted block">Timestamp</span>
              <span className="font-bold text-theme-primary block mt-1">{log.timestamp}</span>
            </div>

            <div className="bg-theme-card-elevated p-3 rounded-2xl border border-theme">
              <span className="text-[10px] uppercase font-bold text-theme-muted block">Category</span>
              <span className="font-extrabold text-amber-500 block mt-1">{log.category}</span>
            </div>

            <div className="bg-theme-card-elevated p-3 rounded-2xl border border-theme">
              <span className="text-[10px] uppercase font-bold text-theme-muted block">Actor Identity</span>
              <span className="font-bold text-theme-primary block mt-1">{log.actor}</span>
            </div>

            <div className="bg-theme-card-elevated p-3 rounded-2xl border border-theme">
              <span className="text-[10px] uppercase font-bold text-theme-muted block">Client IP Address</span>
              <span className="font-mono font-bold text-theme-primary block mt-1">{log.ipAddress}</span>
            </div>
          </div>

          {/* Target */}
          <div className="space-y-1 bg-theme-card-elevated p-3.5 rounded-2xl border border-theme">
            <span className="text-[10px] uppercase font-bold text-theme-muted block">Target Entity</span>
            <span className="font-extrabold text-theme-primary text-xs">{log.target}</span>
          </div>

          {/* Details */}
          <div className="space-y-1">
            <span className="font-bold text-theme-primary">Event Context & Payload Notes:</span>
            <p className="text-theme-primary bg-theme-subtle p-3 rounded-2xl font-mono text-[11px] leading-relaxed border border-theme">
              {log.details}
            </p>
          </div>

          <div className="p-3 bg-theme-subtle rounded-2xl border border-theme text-theme-secondary flex items-center gap-2 text-[11px]">
            <Terminal className="w-4 h-4 text-theme-muted shrink-0" />
            <span>Audit record cryptographically timestamped and stored in security collection.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-theme-modal-footer border-t border-theme flex items-center justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Audit View
          </Button>
        </div>
      </div>
    </div>
  );
}
