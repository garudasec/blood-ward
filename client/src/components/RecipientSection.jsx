import { Link } from "react-router-dom";

function SearchMockUI() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="glass-strong rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
        <div className="text-xs font-semibold text-white/50 uppercase tracking-wider">Search Parameters</div>

        {/* Group selector pills */}
        <div className="grid grid-cols-4 gap-2">
          {["A+", "B+", "O+", "O-"].map((g) => (
            <div
              key={g}
              className={"py-2 rounded-xl text-xs font-bold text-center cursor-pointer transition-all " + (
                g === "O-"
                  ? "gradient-crimson text-white glow-crimson-sm shadow-md"
                  : "glass text-white/40 border border-white/06"
              )}
            >
              {g}
            </div>
          ))}
        </div>

        {/* Location input mock */}
        <div className="glass rounded-xl px-4 py-3 flex items-center justify-between border border-white/08 text-xs text-white/70">
          <span>📍 Current Location (Mumbai, MH)</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
        </div>

        {/* Search Results */}
        <div className="pt-2 border-t border-white/08 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-white/50">Matching Donors</span>
            <span className="text-emerald-400 font-semibold">3 Donors Available</span>
          </div>

          <div className="glass rounded-xl p-3 flex items-center justify-between border border-white/06">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl gradient-crimson text-white font-bold text-xs flex items-center justify-center">O-</div>
              <div>
                <div className="text-xs font-semibold text-white">Ananya R.</div>
                <div className="text-[10px] text-white/40">1.8 km away · Bandra</div>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Available</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecipientSection() {
  return (
    <section
      id="recipient"
      className="scroll-mt-24 py-20 md:py-24 section-divider relative overflow-hidden"
      aria-labelledby="recipient-section-heading"
    >
      <div className="bw-container relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Copy */}
          <div>
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6 border border-white/08">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c0392b]" aria-hidden="true" />
              <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">For Recipients</span>
            </div>

            <h2
              id="recipient-section-heading"
              className="font-display font-bold text-3xl md:text-5xl text-white mb-6 tracking-tight leading-tight"
            >
              Find the right donor, closer to you.
            </h2>

            <p className="text-white/60 text-base md:text-lg mb-8 leading-relaxed">
              BloodWard's location-aware discovery engine surfaces compatible blood donors in your vicinity within seconds.
            </p>

            <ul className="space-y-3.5 mb-8" role="list">
              {[
                "Select required blood group with one tap",
                "Automatic proximity distance sorting",
                "Check verified donor availability state",
                "Privacy-shielded request coordination",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-white/70">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0 text-emerald-400 font-bold text-xs">
                    ✓
                  </div>
                  {item}
                </li>
              ))}
            </ul>

            <Link
              to="/register/recipient"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 font-semibold text-white rounded-xl gradient-crimson glow-crimson-sm hover:glow-crimson transition-all duration-200 hover:scale-[1.02] text-sm sm:text-base"
            >
              Find Blood Now
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </div>

          {/* Right Mock UI */}
          <div>
            <SearchMockUI />
          </div>
        </div>
      </div>
    </section>
  );
}
