import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6" style={{ background: "#0d0d0f" }}>
      <div className="text-center">
        <div className="font-display font-black text-[120px] leading-none text-white/05 select-none" aria-hidden="true">404</div>
        <h1 className="font-display font-bold text-3xl text-white -mt-4 mb-3">Page not found.</h1>
        <p className="text-white/40 text-sm max-w-sm">The page you are looking for does not exist or has been moved.</p>
      </div>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-6 py-3 font-semibold text-sm text-white rounded-xl gradient-crimson glow-crimson-sm hover:opacity-90 transition-all duration-200 focus-ring"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Go to Home
      </Link>
    </div>
  );
}
