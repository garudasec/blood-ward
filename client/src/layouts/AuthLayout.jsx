import { Link } from "react-router-dom";
import AuthVisual from "../components/auth/AuthVisual";

/**
 * AuthLayout
 * Premium split-panel layout: form left, visual right.
 * On mobile: stacked — form only, visual hidden.
 */
export default function AuthLayout({ children, visualMode = "login" }) {
  return (
    <div className="min-h-screen flex" style={{ background: "#0d0d0f" }}>
      {/* Left — Form panel */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        {/* Top bar */}
        <div className="px-8 py-6 flex items-center justify-between flex-shrink-0">
          <Link
            to="/"
            className="flex items-center gap-3 group"
            aria-label="Back to BloodWard home"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-xl gradient-crimson flex items-center justify-center glow-crimson-sm group-hover:scale-110 transition-transform duration-300">
                <svg width="13" height="15" viewBox="0 0 18 20" fill="none" aria-hidden="true">
                  <path
                    d="M9 0C9 0 0 7.5 0 12.5C0 17 4 20 9 20C14 20 18 17 18 12.5C18 7.5 9 0 9 0Z"
                    fill="white"
                    fillOpacity="0.95"
                  />
                </svg>
              </div>
              <div
                className="absolute inset-0 rounded-xl gradient-crimson opacity-30 blur-md"
                aria-hidden="true"
              />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-white">
              Blood<span className="text-[#c0392b]">Ward</span>
            </span>
          </Link>

          <Link
            to="/"
            className="text-sm text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
            aria-label="Go back to home page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to home
          </Link>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>

        {/* Footer micro */}
        <div className="px-8 py-5 flex-shrink-0 border-t border-white/05">
          <p className="text-xs text-white/20 text-center">
            &copy; {new Date().getFullYear()} BloodWard · Privacy-first platform ·{" "}
            <Link to="/privacy" className="hover:text-white/40 transition-colors">Privacy Policy</Link>
          </p>
        </div>
      </div>

      {/* Right — Visual panel (desktop only) */}
      <div
        className="hidden lg:flex w-[42%] xl:w-[45%] flex-shrink-0 relative border-l border-white/05"
        style={{
          background: "linear-gradient(160deg, #121217 0%, #0d0d0f 100%)",
        }}
        aria-hidden="true"
      >
        <AuthVisual mode={visualMode} />
      </div>
    </div>
  );
}
