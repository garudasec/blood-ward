const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function BloodGroupSelector({ value, onChange, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-white/70">
        Blood Group <span className="text-[#e74c3c]" aria-hidden="true">*</span>
      </span>
      <div
        role="radiogroup"
        aria-label="Select blood group"
        aria-required="true"
        className="grid grid-cols-4 gap-2"
      >
        {GROUPS.map((group) => (
          <button
            key={group}
            type="button"
            role="radio"
            aria-checked={value === group}
            onClick={() => onChange(group)}
            className={`blood-group-btn focus-ring ${value === group ? "selected" : ""}`}
          >
            {group}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-400 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
