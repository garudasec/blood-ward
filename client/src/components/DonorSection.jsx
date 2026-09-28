import { Link } from "react-router-dom";

function DonorMockUI() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="glass-strong rounded-3xl p-6 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/08">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl gradient-crimson flex items-center justify-center font-display font-black text-white text-sm shadow-md">
              O-
            </div>
            <div>
              <div className="font-semibold text-white text-sm">Donor Status</div>
              <div className="text-xs text-white/40">Visible to nearby recipients</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Available
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-semibold text-white/50 uppercase tracking-wider">Incoming Request Match</div>
          <div className="glass rounded-xl p-4 border border-red-500/25 bg-red-950/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-red-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                Emergency Request
              </span>
              <span className="text-white/40 font-mono">1.8 km away</span>
            </div>
            <div className="text-sm font-semibold text-white">City General Hospital</div>
            <div className="text-xs text-white/50">Requires 2 Units of O- Blood for Urgent Procedure</div>
            <div className="flex items-center gap-2 pt-2">
              <button className="flex-1 py-2 rounded-lg gradient-crimson text-white text-xs font-bold shadow-md">
                Accept Alert
              </button>
              <button className="py-2 px-3 rounded-lg glass text-white/50 text-xs font-medium border border-white/08">
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DonorSection() {
  return (
    <section
      id="donor"
      className="scroll-mt-24 py-20 md:py-24 section-divider relative overflow-hidden"
      aria-labelledby="donor-section-heading"
    >
      <div className="bw-container relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Mock UI */}
          <div className="order-2 lg:order-1">
            <DonorMockUI />
          </div>

          {/* Right Copy */}
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6 border border-white/08">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c0392b]" aria-hidden="true" />
              <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">For Donors</span>
            </div>

            <h2
              id="donor-section-heading"
              className="font-display font-bold text-3xl md:text-5xl text-white mb-6 tracking-tight leading-tight"
            >
              Save lives on your terms.
            </h2>

            <p className="text-white/60 text-base md:text-lg mb-8 leading-relaxed">
              Toggle availability with one tap. Receive alerts when recipients near you match your blood group.
            </p>

            <ul className="space-y-3.5 mb-8" role="list">
              {[
                "Control your availability anytime",
                "Receive alerts only when you match",
                "Keep contact information private",
                "Track your donation history",
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
              to="/register/donor"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 font-semibold text-white rounded-xl gradient-crimson glow-crimson-sm hover:glow-crimson transition-all duration-200 hover:scale-[1.02] text-sm sm:text-base"
            >
              Register as Donor
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
