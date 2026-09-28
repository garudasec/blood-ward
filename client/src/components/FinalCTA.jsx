import { Link } from "react-router-dom";

export default function FinalCTA() {
  return (
    <section className="py-20 md:py-24 section-divider relative overflow-hidden" aria-labelledby="cta-heading">
      <div className="bw-container relative">
        <div className="glass-strong rounded-3xl p-8 sm:p-12 md:p-16 border border-white/12 text-center relative overflow-hidden bg-gradient-to-br from-[#181822] via-[#121217] to-red-950/20">
          <div className="max-w-2xl mx-auto space-y-6 relative z-10">
            <h2 id="cta-heading" className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight leading-tight">
              Ready to connect when <span className="gradient-text">every second counts?</span>
            </h2>
            <p className="text-white/60 text-base md:text-lg leading-relaxed">
              Join BloodWard today as a donor to save lives in your area, or register as a recipient to discover nearby blood matches.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link
                to="/register/recipient"
                className="px-7 py-4 font-semibold text-white rounded-xl gradient-crimson glow-crimson-sm hover:glow-crimson transition-all duration-200 hover:scale-[1.02] text-sm sm:text-base"
              >
                Find Blood Now
              </Link>
              <Link
                to="/register/donor"
                className="px-7 py-4 font-semibold text-white/90 hover:text-white rounded-xl glass border border-white/15 hover:border-white/30 transition-all duration-200 hover:scale-[1.02] text-sm sm:text-base"
              >
                Become a Donor
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
