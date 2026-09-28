// EmptyState.jsx
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center mb-4 text-white/25 border border-white/08" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="font-display font-semibold text-white/70 text-base mb-2">{title}</h3>
      {description && <p className="text-sm text-white/35 max-w-xs leading-relaxed mb-5">{description}</p>}
      {action}
    </div>
  );
}

// LoadingSkeleton.jsx
export function LoadingSkeleton({ rows = 3, className = "" }) {
  return (
    <div className={`space-y-3 ${className}`} aria-label="Loading..." aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="request-card space-y-3">
          <div className="flex items-center gap-3">
            <div className="skeleton w-11 h-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 rounded w-1/3" />
              <div className="skeleton h-3 rounded w-1/2" />
            </div>
            <div className="skeleton h-6 rounded-lg w-20" />
          </div>
          <div className="skeleton h-3 rounded w-3/4" />
          <div className="skeleton h-3 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

// PageHeader.jsx
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// AppButton.jsx
export function AppButton({ children, onClick, variant = "primary", size = "md", disabled = false, loading = false, type = "button", id, className = "" }) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus-ring disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "px-4 py-2 text-xs", md: "px-5 py-2.5 text-sm", lg: "px-7 py-3.5 text-base" };
  const variants = {
    primary:   "gradient-crimson text-white glow-crimson-sm hover:opacity-90 hover:scale-[1.01]",
    secondary: "glass border border-white/10 text-white/70 hover:text-white hover:border-white/20",
    danger:    "bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25",
    ghost:     "text-white/50 hover:text-white/80",
    success:   "bg-green-500/15 border border-green-500/25 text-green-400 hover:bg-green-500/25",
  };
  return (
    <button id={id} type={type} onClick={onClick} disabled={disabled || loading} aria-busy={loading} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {loading ? (
        <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity=".25"/><path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>Loading...</>
      ) : children}
    </button>
  );
}

// ConfirmDialog.jsx
export function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = "Confirm", confirmVariant = "danger", loading = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div className="relative glass-strong rounded-2xl p-6 w-full max-w-sm border border-white/10">
        <h2 id="confirm-title" className="font-display font-semibold text-white text-lg mb-2">{title}</h2>
        <p className="text-sm text-white/50 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <AppButton variant="secondary" size="sm" onClick={onCancel} disabled={loading}>Cancel</AppButton>
          <AppButton variant={confirmVariant} size="sm" onClick={onConfirm} loading={loading}>{confirmLabel}</AppButton>
        </div>
      </div>
    </div>
  );
}
