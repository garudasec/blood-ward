const STEPS = [
  {
    number: "01",
    title: "Create an Account",
    description: "Register as a donor or recipient in seconds. Scoped account management keeps your experience focused and secure.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M20 8v6M23 11h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    number: "02",
    title: "Set Your Location",
    description: "BloodWard uses your location to connect you with people nearby — no manual city browsing required.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    number: "03",
    title: "Find or Offer Blood",
    description: "Recipients search for matching blood groups nearby. Donors toggle availability whenever they are ready to help.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 0C9 0 0 7.5 0 12.5C0 17 4 20 9 20C14 20 18 17 18 12.5C18 7.5 9 0 9 0Z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    number: "04",
    title: "Coordinate Safely",
    description: "Receive instant notifications when a match occurs. Contact information remains protected until both parties align.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 py-20 md:py-24 section-divider relative overflow-hidden"
      aria-labelledby="how-it-works-heading"
    >
      <div className="bw-container relative">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-4 border border-white/08">
            <div className="w-1.5 h-1.5 rounded-full bg-[#c0392b]" aria-hidden="true" />
            <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">Simple & Fast</span>
          </div>
          <h2
            id="how-it-works-heading"
            className="font-display font-bold text-3xl md:text-5xl text-white tracking-tight mb-4"
          >
            How BloodWard Works
          </h2>
          <p className="text-white/50 text-base md:text-lg leading-relaxed">
            Four clear steps designed to remove friction when every second matters.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step, i) => (
            <div key={i} className="relative group">
              <div
                className="glass rounded-2xl p-6 md:p-7 h-full border border-white/08 hover:border-[#c0392b]/30 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(192,57,43,0.02) 100%)",
                }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center glass border border-white/08 group-hover:border-[#c0392b]/40 transition-colors"
                    style={{ background: "rgba(192,57,43,0.08)" }}
                  >
                    <div className="text-[#e74c3c]">
                      {step.icon}
                    </div>
                  </div>
                  <span className="font-display font-black text-3xl text-white/10 select-none">
                    {step.number}
                  </span>
                </div>

                <h3 className="font-display font-semibold text-base md:text-lg text-white mb-2 leading-snug">
                  {step.title}
                </h3>
                <p className="text-xs md:text-sm text-white/50 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
