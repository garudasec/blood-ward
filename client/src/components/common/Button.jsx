//Imports available from React and lucide-react library
import React from "react";
import { Loader2 } from "lucide-react";



export default function Button({

  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  type = "button",
  onClick,
  className = "",
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none";

  const variantStyles = {

    primary:
      "bg-[#A61B2B] hover:bg-[#8E1724] text-white focus:ring-[#A61B2B]/40 shadow-xs",
    secondary:
      "bg-[#315B83] hover:bg-[#264666] text-white focus:ring-[#315B83]/40 shadow-xs",
    navy:
      "bg-[#1E293B] hover:bg-[#0F172A] text-white focus:ring-[#1E293B]/40 shadow-xs",
    outline:
      "border border-[#E2E8F0] dark:border-[#343B47] bg-white dark:bg-[#20242C] hover:bg-[#F8FAFC] dark:hover:bg-[#252A33] hover:border-[#CBD5E1] dark:hover:border-[#343B47] text-[#1E293B] dark:text-[#F1F5F9] focus:ring-[#315B83]/20 shadow-2xs",
    ghost:
      "text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F1F5F9] dark:hover:bg-[#20242C] hover:text-[#1E293B] dark:hover:text-[#F1F5F9] shadow-none border-transparent focus:ring-[#315B83]/20",
    danger:
      "bg-[#A61B2B] hover:bg-[#8E1724] text-white focus:ring-[#A61B2B]/40 shadow-xs",
  };

  const sizeStyles = {

    sm: "px-2.5 py-1.5 text-xs font-medium gap-1.5",
    md: "px-3.5 py-2 text-xs font-semibold gap-2",
    lg: "px-5 py-2.5 text-sm font-semibold gap-2.5",
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
