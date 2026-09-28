const DONOR_FEATURES = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    title: "Create your donor profile",
    desc: "Set up your blood group, contact preferences, and service area.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    title: "Set your availability",
    desc: "Toggle your availability on or off anytime. You are always in control.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "Receive nearby requests",
    desc: "Get notified when someone nearby needs your blood group.",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Respond when you can",
    desc: "Accept or decline requests privately. No pressure, ever.",
  },
];

function DonorProfileMock() {
  return (
    <div className="relative animate-float" style={{ animationDuration: "7s" }} aria-hidden="true">
      {/* Profile card */}
      <div className="glass-strong rounded-3xl p-6 w-72 border border-white/10" style={{
        boxShadow: "0 40px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
      }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl gradient-crimson flex items-center justify-center glow-crimson-sm">
            <span className="font-display font-black text-lg text-white">A+</span>
          </div>
          <div>
            <div className="font-semibold text-white text-sm">Donor Profile</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-xs text-green-400 font-medium">Available</span>
            </div>
          </div>
          <div className="ml-auto">
            <div className="w-8 h-8 rounded-xl glass flex items-center justify-center border border-white/08">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { val: "A+", sub: "Blood Group" },
            { val: "3", sub: "Donations" },
            { val: "2.1km", sub: "Range" },
          ].map((s) => (
            <div key={s.sub} className="glass rounded-xl p-2.5 text-center border border-white/06">
              <div className="font-display font-bold text-base text-white">{s.val}</div>
              <div className="text-[10px] text-white/40 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Availability toggle */}
        <div className="glass rounded-xl p-3.5 flex items-center justify-between border border-white/06 mb-4">
          <span className="text-sm text-white/70 font-medium">Availability</span>
          <div className="w-12 h-6 rounded-full gradient-crimson flex items-center px-1 cursor-pointer">
            <div className="w-4 h-4 rounded-full bg-white shadow-md ml-auto" />
          </div>
        </div>

        {/* Recent request pill */}
        <div className="rounded-xl p-3.5 flex items-center gap-3" style={{
          background: "linear-gradient(135deg, rgba(192,57,43,0.12) 0%, rgba(192,57,43,0.05) 100%)",
          border: "1px solid rgba(192,57,43,0.2)",
        }}>
          <div className="w-2 h-2 rounded-full bg-[#e74c3c] animate-pulse flex-shrink-0" />
          <div>
            <div className="text-xs font-semibold text-white/80">New request nearby</div>
            <div className="text-[10px] text-white/40 mt-0.5">A+ needed · 1.8km away</div>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute -top-4 -right-4 glass rounded-2xl px-3 py-2 border border-[#c0392b]/25" style={{
        background: "linear-gradient(135deg, rgba(192,57,43,0.15) 0%, rgba(192,57,43,0.05) 100%)",
      }}>
        <div className="text-xs font-semibold text-[#e74c3c]">+3 requests</div>
        <div className="text-[10px] text-white/35">this week</div>
      </div>
    </div>
  );
}

export default function DonorSection() {
  return (
    <section
      id="donor"
      className="relative py-28 section-divider overflow-hidden"
      aria-labelledby="donor-section-heading"
    >
      {/* BG glow */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-[0.07]" style={{
        background: "radial-gradient(circle, #c0392b 0%, transparent 70%)",
        filter: "blur(80px)",
      }} aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — profile mock */}
          <div className="flex justify-center lg:justify-start" aria-hidden="true">
            <DonorProfileMock />
          </div>

          {/* Right — copy */}
          <div>
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6 border border-white/08">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c0392b]" aria-hidden="true" />
              <span className="text-xs font-medium text-white/50 uppercase tracking-widest">For Donors</span>
            </div>

            <h2
              id="donor-section-heading"
              className="font-display font-bold text-4xl md:text-5xl text-white mb-6 tracking-tight leading-tight"
            >
              Your availability<br />
              <span className="gradient-text">can make a difference.</span>
            </h2>

            <p className="text-white/50 text-lg mb-10 leading-relaxed">
              Donors are the heart of BloodWard. Register once, set your availability, and help people nearby when they need it most — entirely on your own schedule.
            </p>

            <ul className="space-y-5 mb-10" role="list">
              {DONOR_FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-4 group">
                  <div className="mt-0.5 w-9 h-9 rounded-xl glass flex items-center justify-center text-white/40 group-hover:text-[#e74c3c] group-hover:border-[#c0392b]/30 transition-all duration-300 flex-shrink-0 border border-white/08">
                    {f.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white/90 mb-0.5">{f.title}</div>
                    <div className="text-sm text-white/40">{f.desc}</div>
                  </div>
                </li>
              ))}
            </ul>

            <a
              href="#register"
              id="donor-register-cta"
              className="inline-flex items-center gap-3 px-7 py-4 font-semibold text-white rounded-2xl gradient-crimson glow-crimson-sm hover:glow-crimson transition-all duration-300 hover:scale-105"
              aria-label="Register as a blood donor"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M19 8v6M22 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Become a Donor
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
