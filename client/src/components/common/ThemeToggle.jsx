import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

/**
 * Universal Single Theme Toggle Control
 * - Exactly one unified button with dynamic icon (Sun when dark, Moon when light).
 * - Clicking switches between light and dark themes using existing ThemeContext.
 * - Smooth transition and rotation effect.
 * - Fully accessible with dynamic aria-label and tooltips.
 */
export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-full border border-[#E2E8F0] dark:border-zinc-700 bg-white/90 dark:bg-zinc-800/90 hover:bg-[#F1F5F9] dark:hover:bg-zinc-700 text-[#475569] dark:text-zinc-200 shadow-2xs transition-all duration-200 ease-out hover:rotate-12 active:scale-95 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[#A61B2B]/40 shrink-0 ${className}`}
      aria-label={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
      title={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20 transition-transform duration-200" />
      ) : (
        <Moon className="w-4 h-4 text-slate-600 transition-transform duration-200" />
      )}
    </button>
  );
}
