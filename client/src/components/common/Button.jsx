import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-xs';

  const variantStyles = {
    primary:
      'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-red-500/20 shadow-md',
    secondary:
      'bg-slate-900 hover:bg-slate-800 text-white focus:ring-slate-700 shadow-slate-900/10',
    outline:
      'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 focus:ring-red-500',
    ghost:
      'text-slate-700 hover:bg-slate-100 shadow-none border-transparent focus:ring-slate-400',
    danger:
      'bg-rose-500 hover:bg-rose-600 text-white focus:ring-rose-500 shadow-rose-500/20',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base font-semibold gap-2.5',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant] || variantStyles.primary} ${
        sizeStyles[size] || sizeStyles.md
      } ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
      {children}
    </button>
  );
}