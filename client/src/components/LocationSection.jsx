export default function LocationSection() {
  return (
    <section
      id="location"
      className="scroll-mt-24 py-20 md:py-24 section-divider relative overflow-hidden"
      aria-labelledby="location-section-heading"
    >
      <div className="bw-container relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Map Preview Container */}
          <div className="glass-strong rounded-3xl p-6 border border-white/10 relative overflow-hidden h-[380px] sm:h-[420px] flex flex-col justify-between bg-gradient-to-br from-[#12131a] to-[#0a0a0d]">
            <div className="flex items-center justify-between text-xs text-white/70 font-semibold z-10">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Radar Map Simulation
              </span>
              <span className="font-mono text-white/40">Distance Sorting</span>
            </div>

            {/* Radar Graphic */}
            <div className="relative flex-1 rounded-2xl bg-[#0e0f14] border border-white/06 my-3 overflow-hidden flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="absolute w-56 h-56 rounded-full border border-red-500/15 animate-ping opacity-30" />
              <div className="absolute w-36 h-36 rounded-full border border-red-500/25" />

              <div className="relative z-10 flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold text-[10px] flex items-center justify-center shadow-lg border-2 border-white">
                  You
                </div>
                <span className="text-[10px] text-white/70 font-semibold bg-black/60 px-2 py-0.5 rounded mt-1">Your Location</span>
              </div>

              {/* Sample Nearby Donor Pins */}
              <div className="absolute top-1/4 left-1/4 flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-red-600 text-white font-bold text-[10px] flex items-center justify-center shadow-md">O-</div>
                <span className="text-[9px] text-white/70 font-medium bg-black/60 px-1 py-0.5 rounded mt-0.5">1.2 km</span>
              </div>

              <div className="absolute bottom-1/4 right-1/4 flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-red-600 text-white font-bold text-[10px] flex items-center justify-center shadow-md">B+</div>
                <span className="text-[9px] text-white/70 font-medium bg-black/60 px-1 py-0.5 rounded mt-0.5">2.5 km</span>
              </div>
            </div>

            <div className="text-[11px] text-white/40 text-center font-medium">
              Exact residential street addresses are never exposed to public view.
            </div>
          </div>

          {/* Copy Column */}
          <div>
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6 border border-white/08">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c0392b]" aria-hidden="true" />
              <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">Location Technology</span>
            </div>

            <h2
              id="location-section-heading"
              className="font-display font-bold text-3xl md:text-5xl text-white mb-6 tracking-tight leading-tight"
            >
              Location-aware, privacy-protected discovery.
            </h2>

            <p className="text-white/60 text-base md:text-lg mb-8 leading-relaxed">
              BloodWard calculates proximity distance without broadcasting exact home addresses. You see nearby available donors within your chosen radius.
            </p>

            <div className="space-y-4">
              <div className="glass p-4 rounded-xl border border-white/06">
                <h3 className="font-semibold text-white text-sm mb-1">Proximity Sorting</h3>
                <p className="text-xs text-white/50 leading-relaxed">Results are sorted by geographical distance so urgent requests reach the closest donors first.</p>
              </div>

              <div className="glass p-4 rounded-xl border border-white/06">
                <h3 className="font-semibold text-white text-sm mb-1">Privacy Shielding</h3>
                <p className="text-xs text-white/50 leading-relaxed">Only general area neighborhood names are displayed prior to request acceptance.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
