const SECURITY_FEATURES = [
  {
    title: "HttpOnly Cookie Authentication",
    desc: "JWT authentication tokens are securely managed in HttpOnly cookies, eliminating XSS token theft vectors.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    title: "Role-Based Access Control (RBAC)",
    desc: "Strict client and server-side authorization guards keep Donor, Recipient, and Admin views isolated.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: "Privacy-Aware Profiles",
    desc: "Donor contact details are never exposed publicly. Communication channels are authorized on request acceptance.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function SecuritySection() {
  return (
    <section
      id="about"
      className="scroll-mt-24 py-20 md:py-24 section-divider relative overflow-hidden"
      aria-labelledby="security-section-heading"
    >
      <div className="bw-container relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Copy */}
          <div>
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6 border border-white/08">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c0392b]" aria-hidden="true" />
              <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">Security & Trust</span>
            </div>

            <h2
              id="security-section-heading"
              className="font-display font-bold text-3xl md:text-5xl text-white mb-6 tracking-tight leading-tight"
            >
              Built with privacy at its core.
            </h2>

            <p className="text-white/60 text-base md:text-lg mb-8 leading-relaxed">
              BloodWard handles personal contact details and location coordinates with care. Data is used strictly for emergency discovery and matching.
            </p>

            <div className="space-y-6">
              {SECURITY_FEATURES.map((feature, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="w-11 h-11 rounded-xl glass flex items-center justify-center text-[#c0392b] border border-[#c0392b]/15 flex-shrink-0 group-hover:border-[#c0392b]/35 transition-all">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white/90 mb-1 text-sm">{feature.title}</h3>
                    <p className="text-xs md:text-sm text-white/50 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Visual Shield Mock */}
          <div className="flex justify-center">
            <div className="glass-strong rounded-3xl p-8 border border-white/10 max-w-md w-full space-y-5 text-center bg-gradient-to-br from-red-950/20 via-[#121217] to-[#0a0a0d]">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto shadow-lg">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2"/></svg>
              </div>
              <h3 className="font-display font-bold text-xl text-white">Protected Platform Architecture</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Minimal data retention, encrypted HttpOnly session transport, and explicit administrative audit logging keep all users protected.
              </p>
              <div className="pt-3 border-t border-white/08 flex items-center justify-center gap-2 text-xs text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Zero Public Address Broadcasts
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
