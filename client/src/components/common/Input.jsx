import React from "react";

export default function Input({
  label,
  id,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  icon: Icon,
  className = "",
  ...props
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-theme-secondary">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative rounded-xl shadow-xs">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-theme-muted">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`w-full text-sm rounded-xl border bg-theme-input text-theme-input placeholder-theme-muted py-2.5 transition-all outline-none ${
            Icon ? "pl-10 pr-3.5" : "px-3.5"
          } ${
            error
              ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
              : "border-theme-input focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
          } disabled:bg-theme-subtle disabled:text-theme-muted`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-600 font-medium pl-1">{error}</p>}
    </div>
  );
}
