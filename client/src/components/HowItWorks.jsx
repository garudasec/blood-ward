const STEPS = [
  {
    number: "01",
    title: "Create a Blood Request",
    description: "Specify your required blood group, location, and urgency level. BloodWard securely broadcasts your request to nearby available donors.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 2v6h6M12 18v-6M9 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    number: "02",
    title: "Discover Nearby Donors",
    description: "BloodWard instantly finds compatible donors within your area, filtered by blood group, availability, and distance from your location.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/>
        <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M11 8v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    number: "03",
    title: "Receive Donor Response",
    description: "Available donors who match your request are alerted and can respond directly. You'll receive notifications as donors confirm their availability.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 10h6M9 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    number: "04",
    title: "Coordinate the Donation",
    description: "Connect with your matched donor to arrange the donation. BloodWard provides a secure, private channel for coordination.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative py-28 section-divider overflow-hidden"
      aria-labelledby="how-it-works-heading"
    >
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] opacity-[0.06]" style={{
        background: "radial-gradient(ellipse, #c0392b 0%, transparent 70%)",
        filter: "blur(60px)",
      }} aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-5 border border-white/08">
            <div className="w-1.5 h-1.5 rounded-full bg-[#c0392b]" aria-hidden="true" />
            <span className="text-xs font-medium text-white/50 uppercase tracking-widest">How It Works</span>
          </div>
          <h2
            id="how-it-works-heading"
            className="font-display font-bold text-4xl md:text-5xl text-white mb-5 tracking-tight"
          >
            Simple. Fast. <span className="gradient-text">Life-saving.</span>
          </h2>
          <p className="text-white/45 text-lg max-w-xl mx-auto leading-relaxed">
            From request to donation in four clear steps. Designed to work when urgency is highest.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection line — desktop */}
          <div className="absolute top-8 left-[calc(12.5%+2rem)] right-[calc(12.5%+2rem)] h-px hidden lg:block" style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(192,57,43,0.4) 20%, rgba(192,57,43,0.4) 80%, transparent 100%)",
          }} aria-hidden="true" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
            {STEPS.map((step, i) => (
              <div key={i} className="relative group">
                {/* Step card */}
                <div className="glass rounded-2xl p-7 h-full border border-white/07 hover:border-[#c0392b]/25 transition-all duration-400 hover:translate-y-[-4px] hover:shadow-2xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(192,57,43,0.02) 100%)",
                  }}
                >
                  {/* Number + connector dot */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center glass border border-white/08 group-hover:border-[#c0392b]/30 transition-all duration-400"
                        style={{ background: "rgba(192,57,43,0.08)" }}
                      >
                        <div className="text-[#e74c3c] group-hover:scale-110 transition-transform duration-300">
                          {step.icon}
                        </div>
                      </div>
                      {/* Dot on the connector line */}
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-[#c0392b] bg-[#0d0d0f] hidden lg:block group-hover:bg-[#c0392b] transition-colors duration-300" aria-hidden="true" />
                    </div>
                    <span className="font-display font-black text-4xl text-white/08 leading-none select-none">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="font-display font-semibold text-lg text-white mb-3 leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-sm text-white/45 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
