export default function FinalCTA() {
  return (
    <section
      className="relative py-32 section-divider overflow-hidden"
      aria-labelledby="final-cta-heading"
    >
      {/* Background */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(192,57,43,0.12) 0%, transparent 70%)",
      }} aria-hidden="true" />

      {/* Decorative large orbs */}
      <div className="absolute -left-32 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full animate-blob-morph" style={{
        background: "radial-gradient(circle, rgba(192,57,43,0.15) 0%, transparent 70%)",
        filter: "blur(40px)",
        animationDuration: "10s",
      }} aria-hidden="true" />
      <div className="absolute -right-32 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full animate-blob-morph" style={{
        background: "radial-gradient(circle, rgba(192,57,43,0.1) 0%, transparent 70%)",
        filter: "blur(40px)",
        animationDuration: "12s",
        animationDelay: "3s",
      }} aria-hidden="true" />

      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} aria-hidden="true" />

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-8" aria-hidden="true">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl gradient-crimson flex items-center justify-center glow-crimson animate-pulse-glow">
              <svg width="36" height="40" viewBox="0 0 18 20" fill="none">
                <path d="M9 0C9 0 0 7.5 0 12.5C0 17 4 20 9 20C14 20 18 17 18 12.5C18 7.5 9 0 9 0Z" fill="white" fillOpacity="0.95"/>
              </svg>
            </div>
            {/* Ping rings */}
            <div className="absolute inset-0 rounded-3xl border border-[#c0392b]/30 animate-ping" style={{ animationDuration: "2s" }} />
          </div>
        </div>

        <h2
          id="final-cta-heading"
          className="font-display font-extrabold text-5xl md:text-6xl text-white tracking-tight mb-6 leading-tight"
        >
          Someone nearby<br />
          <span className="gradient-text">may be able to help.</span>
        </h2>

        <p className="text-white/50 text-xl mb-12 leading-relaxed max-w-2xl mx-auto">
          Whether you need blood urgently or you want to make a difference as a donor — BloodWard connects people when it matters most.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="#recipient"
            id="final-find-blood-cta"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector("#recipient")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="group inline-flex items-center gap-3 px-9 py-5 font-semibold text-white text-lg rounded-2xl gradient-crimson glow-crimson hover:scale-105 transition-all duration-300"
            aria-label="Find a blood donor"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
            </svg>
            Find Blood
            <svg className="group-hover:translate-x-1 transition-transform" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>

          <a
            href="#donor"
            id="final-donor-cta"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector("#donor")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-3 px-9 py-5 font-semibold text-white/80 hover:text-white text-lg rounded-2xl glass border border-white/12 hover:border-white/25 hover:scale-105 transition-all duration-300"
            aria-label="Register as a blood donor"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M19 8v6M22 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Become a Donor
          </a>
        </div>

        {/* Trust micro line */}
        <p className="mt-10 text-xs text-white/25 font-medium tracking-wide">
          Free to use · Privacy-first · Location-aware
        </p>
      </div>
    </section>
  );
}
