export default function AuthButton({
  children,
  type = "button",
  onClick,
  disabled = false,
  loading = false,
  variant = "primary",
  fullWidth = true,
  id,
}) {
  const base = `inline-flex items-center justify-center gap-2.5 font-semibold rounded-xl transition-all duration-200 focus-ring disabled:opacity-50 disabled:cursor-not-allowed ${fullWidth ? "w-full" : ""}`;

  const variants = {
    primary: "px-6 py-3.5 text-sm text-white gradient-crimson glow-crimson-sm hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]",
    secondary: "px-6 py-3.5 text-sm text-white/70 hover:text-white glass border border-white/10 hover:border-white/20",
    ghost: "px-4 py-2.5 text-sm text-white/50 hover:text-white/80",
  };

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`${base} ${variants[variant]}`}
    >
      {loading ? (
        <>
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
            <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <span>Processing...</span>
        </>
      ) : children}
    </button>
  );
}
