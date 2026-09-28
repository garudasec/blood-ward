const SECURITY_FEATURES = [
  {
    title: "Secure Authentication",
    desc: "Industry-standard authentication with session management and token-based security.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    title: "Role-based Access",
    desc: "Donors, recipients, and administrators each have distinct, scoped access to platform features.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: "Privacy-aware Profiles",
    desc: "Donor contact details are never publicly exposed. Communication flows through controlled, privacy-first channels.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: "Protected Personal Data",
    desc: "Personal and location information is handled with care. Minimal data is stored, and only what is necessary for the service.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <ellipse cx="12" cy="5" rx="9" ry="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
];

function SecurityVisual() {
  return (
    <div className="relative w-72 h-72 mx-auto" aria-hidden="true">
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border border-white/08 animate-rotate-slow" style={{
        boxShadow: "inset 0 0 40px rgba(255,255,255,0.02)",
      }}>
        {[0, 90, 180, 270].map((deg, i) => (
          <div
            key={i}
            className="absolute w-2.5 h-2.5 rounded-full bg-[#c0392b]/60"
            style={{
              top: "50%",
              left: "50%",
              transform: `rotate(${deg}deg) translateX(135px) translate(-50%, -50%)`,
            }}
          />
        ))}
      </div>

      {/* Middle ring */}
      <div className="absolute inset-10 rounded-full border border-[#c0392b]/12 animate-spin-slow-reverse" style={{
        boxShadow: "0 0 30px rgba(192,57,43,0.08)",
      }}>
        {[45, 135, 225, 315].map((deg, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-white/20"
            style={{
              top: "50%",
              left: "50%",
              transform: `rotate(${deg}deg) translateX(76px) translate(-50%, -50%)`,
            }}
          />
        ))}
      </div>

      {/* Center lock */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl glass-strong flex items-center justify-center border border-white/12" style={{
            boxShadow: "0 0 40px rgba(192,57,43,0.2), 0 0 80px rgba(192,57,43,0.08)",
            background: "linear-gradient(135deg, rgba(192,57,43,0.15) 0%, rgba(20,20,30,0.8) 100%)",
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="3" fill="rgba(192,57,43,0.3)" stroke="rgba(231,76,60,0.7)" strokeWidth="1.5"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="rgba(231,76,60,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="12" cy="16" r="2" fill="rgba(231,76,60,0.8)"/>
            </svg>
          </div>
          {/* Glow */}
          <div className="absolute inset-0 rounded-3xl animate-pulse-glow" style={{ border: "1px solid rgba(192,57,43,0.2)" }} />
        </div>
      </div>

      {/* Floating data node labels */}
      {[
        { label: "Auth", deg: 0, r: 108 },
        { label: "RBAC", deg: 90, r: 108 },
        { label: "Privacy", deg: 180, r: 108 },
        { label: "Data", deg: 270, r: 108 },
      ].map(({ label, deg, r }) => {
        const angle = (deg * Math.PI) / 180;
        const x = 50 + (r / 2.88) * Math.cos(angle);
        const y = 50 + (r / 2.88) * Math.sin(angle);
        return (
          <div
            key={label}
            className="absolute glass rounded-lg px-2 py-1 text-xs font-semibold text-white/50 border border-white/08"
            style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}

export default function SecuritySection() {
  return (
    <section
      id="about"
      className="relative py-28 section-divider overflow-hidden"
      aria-labelledby="security-section-heading"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-[0.05]" style={{
        background: "radial-gradient(circle, #c0392b 0%, transparent 70%)",
        filter: "blur(80px)",
      }} aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left — copy */}
          <div>
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6 border border-white/08">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c0392b]" aria-hidden="true" />
              <span className="text-xs font-medium text-white/50 uppercase tracking-widest">Security & Privacy</span>
            </div>

            <h2
              id="security-section-heading"
              className="font-display font-bold text-4xl md:text-5xl text-white mb-6 tracking-tight leading-tight"
            >
              Built with privacy<br />
              <span className="gradient-text">at its core.</span>
            </h2>

            <p className="text-white/50 text-lg mb-10 leading-relaxed">
              BloodWard handles sensitive personal and location information with care. Your data is used only to help you find or provide blood — nothing more.
            </p>

            <div className="space-y-6">
              {SECURITY_FEATURES.map((feature, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="w-11 h-11 rounded-xl glass flex items-center justify-center text-[#c0392b] border border-[#c0392b]/15 flex-shrink-0 group-hover:border-[#c0392b]/35 group-hover:glow-crimson-sm transition-all duration-300">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white/90 mb-1 text-sm">{feature.title}</h3>
                    <p className="text-sm text-white/40 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 p-4 rounded-2xl border border-[#c0392b]/15" style={{
              background: "linear-gradient(135deg, rgba(192,57,43,0.06) 0%, transparent 100%)",
            }}>
              <p className="text-xs text-white/35 leading-relaxed">
                BloodWard is committed to responsible data practices. We do not sell personal data. Location is used solely for donor discovery and is never stored beyond what is necessary for active sessions.
              </p>
            </div>
          </div>

          {/* Right — visual */}
          <div className="flex justify-center lg:justify-end" aria-hidden="true">
            <SecurityVisual />
          </div>
        </div>
      </div>
    </section>
  );
}
