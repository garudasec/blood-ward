/**
 * AlertMessage
 * Inline feedback for success, error, warning, info states.
 */
export default function AlertMessage({ type = "error", message, onDismiss }) {
  if (!message) return null;

  const config = {
    error: {
      bg: "rgba(239,68,68,0.08)",
      border: "rgba(239,68,68,0.25)",
      text: "#f87171",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    success: {
      bg: "rgba(34,197,94,0.08)",
      border: "rgba(34,197,94,0.25)",
      text: "#4ade80",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    warning: {
      bg: "rgba(234,179,8,0.08)",
      border: "rgba(234,179,8,0.25)",
      text: "#facc15",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
  };

  const c = config[type] || config.error;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="toast-animate rounded-xl px-4 py-3.5 flex items-start gap-3"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <span className="flex-shrink-0 mt-0.5" style={{ color: c.text }}>{c.icon}</span>
      <p className="text-sm leading-relaxed flex-1" style={{ color: c.text }}>{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 mt-0.5 opacity-50 hover:opacity-100 transition-opacity focus-ring rounded"
          aria-label="Dismiss"
          style={{ color: c.text }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}
