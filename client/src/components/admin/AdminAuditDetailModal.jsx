import React from 'react';
import { X, ShieldAlert, Clock, User, ShieldCheck, Terminal, MapPin } from 'lucide-react';
import Button from '../common/Button';

export default function AdminAuditDetailModal({ log, isOpen, onClose }) {
  if (!isOpen || !log) return null;

  const isHighSeverity = log.severity === 'HIGH';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white max-w-xl w-full rounded-3xl border border-slate-200 shadow-2xl overflow-hidden space-y-0">
        {/* Header */}
        <div className="p-6 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                AUDIT {log.id}
              </span>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                  isHighSeverity
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {log.severity} SEVERITY
              </span>
            </div>
            <h3 className="font-extrabold text-base text-white leading-snug">
              {log.action}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          {isHighSeverity && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl flex items-center gap-2 font-bold">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>SECURITY AUDIT ALERT: High-priority security-sensitive action recorded.</span>
            </div>
          )}

          {/* Matrix Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Timestamp</span>
              <span className="font-bold text-slate-900 block mt-1">{log.timestamp}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Category</span>
              <span className="font-extrabold text-amber-600 block mt-1">{log.category}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Actor Identity</span>
              <span className="font-bold text-slate-900 block mt-1">{log.actor}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Client IP Address</span>
              <span className="font-mono font-bold text-slate-900 block mt-1">{log.ipAddress}</span>
            </div>
          </div>

          {/* Target */}
          <div className="space-y-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Entity</span>
            <span className="font-extrabold text-slate-900 text-xs">{log.target}</span>
          </div>

          {/* Details */}
          <div className="space-y-1">
            <span className="font-bold text-slate-800">Event Context & Payload Notes:</span>
            <p className="text-slate-600 bg-slate-900 text-slate-200 p-3 rounded-2xl font-mono text-[11px] leading-relaxed">
              {log.details}
            </p>
          </div>

          <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 text-slate-600 flex items-center gap-2 text-[11px]">
            <Terminal className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Audit record cryptographically timestamped and stored in security collection.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Audit View
          </Button>
        </div>
      </div>
    </div>
  );
}