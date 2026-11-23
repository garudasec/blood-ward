import React from "react";

export default function Select({
  label,
  id,
  options = [],
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  placeholder = "Select an option",
  icon: Icon,
  className = "",
  ...props
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-[#1E293B] dark:text-zinc-200">
          {label} {required && <span className="text-[#A61B2B] font-bold">*</span>}
        </label>
      )}
      <div className="relative rounded-lg">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-theme-muted">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
        <select
          id={id}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`w-full text-xs font-medium rounded-lg border border-theme bg-theme-input text-theme-input py-2 transition-all duration-150 ease-out outline-none appearance-none ${
            Icon ? "pl-8 pr-8" : "px-3 pr-8"
          } ${
            error
              ? "border-[#A61B2B] ring-1 ring-[#A61B2B]/30"
              : "focus:border-[#315B83] focus:ring-1 focus:ring-[#315B83]/20"
          } disabled:bg-theme-subtle disabled:text-theme-muted disabled:cursor-not-allowed cursor-pointer`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="bg-white dark:bg-zinc-900 text-slate-400 dark:text-zinc-500">
              {placeholder}
            </option>
          )}
          {options.map((opt, index) => {
            const val = typeof opt === "object" && opt !== null ? opt.value : opt;
            const lbl = typeof opt === "object" && opt !== null ? (opt.label ?? opt.value) : opt;
            const key = typeof opt === "object" && opt !== null && opt.value !== undefined ? opt.value : `${val}-${index}`;
            return (
              <option
                key={key}
                value={val}
                className="bg-white dark:bg-zinc-900 text-[#1E293B] dark:text-zinc-100 font-medium py-1.5"
              >
                {lbl}
              </option>
            );
          })}
        </select>
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-theme-muted">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && <p className="text-[11px] text-[#A61B2B] dark:text-rose-400 font-medium">{error}</p>}
    </div>
  );
}
