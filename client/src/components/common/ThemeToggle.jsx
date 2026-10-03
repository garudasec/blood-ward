import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`p-2 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer ${
        isDark
          ? "bg-slate-800 text-amber-400 hover:bg-slate-700 hover:text-amber-300 border border-slate-700/60"
          : "bg-slate-200/80 text-slate-800 hover:bg-slate-300/80 hover:text-slate-950 border border-slate-300"
      } ${className}`}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 transition-transform duration-300 rotate-0 hover:-rotate-12" />
      )}
    </button>
  );
}
