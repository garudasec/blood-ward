const MOCK_DONORS = [
  { group: "O+", name: "Verified Donor", distance: "1.2 km", available: true, rating: 4 },
  { group: "O+", name: "Verified Donor", distance: "2.7 km", available: true, rating: 5 },
  { group: "O+", name: "Verified Donor", distance: "3.2 km", available: false, rating: 3 },
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function SearchMockUI() {
  return (
    <div className="relative w-full max-w-md mx-auto lg:mx-0 lg:ml-auto" aria-hidden="true">
      {/* Search panel */}
      <div className="glass-strong rounded-3xl p-6 border border-white/10" style={{
        boxShadow: "0 40px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
      }}>
        {/* Header */}
        <div className="mb-5">
          <div className="text-sm font-semibold text-white/60 mb-3">Search Parameters</div>

          {/* Blood group selector */}
          <div className="mb-4">
            <div className="text-xs text-white/40 mb-2 font-medium">Blood Group</div>
            <div className="grid grid-cols-4 gap-1.5">
              {BLOOD_GROUPS.map((g) => (
                <div
                  key={g}
                  className={`py-2 rounded-xl text-xs font-bold text-center cursor-pointer transition-all duration-200 ${
                    g === "O+"
                      ? "gradient-crimson text-white glow-crimson-sm"
                      : "glass text-white/40 border border-white/06 hover:border-white/15 hover:text-white/70"
                  }`}
                >
                  {g}
                </div>
              ))}
            </div>
          </div>

          {/* Location input mock */}
          <div className="glass rounded-xl px-4 py-3 flex items-center gap-3 border border-white/08 mb-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#c0392b] flex-shrink-0">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
            </svg>
            <span className="text-sm text-white/40">Using your current location</span>
            <div className="ml-auto w-2 h-2 rounded-full bg-green-400" />
          </div>

          {/* Search button */}
          <div className="w-full py-3 rounded-xl gradient-crimson text-center text-sm font-semibold text-white cursor-pointer glow-crimson-sm">
            Find Nearby Donors
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/07 mb-5" />

        {/* Results */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-white/50">Results</div>
            <div className="text-xs text-[#e74c3c] font-medium">3 found nearby</div>
          </div>

          <div className="space-y-2.5">
            {MOCK_DONORS.map((donor, i) => (
              <div
                key={i}
                className="glass rounded-xl p-3.5 flex items-center gap-3 border border-white/06 hover:border-white/12 transition-all duration-200 cursor-pointer group"
              >
                {/* Blood group badge */}
                <div className="w-11 h-11 rounded-xl gradient-crimson flex items-center justify-center flex-shrink-0 glow-crimson-sm">
                  <span className="font-display font-black text-sm text-white">{donor.group}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors">{donor.name}</div>
                  <div className="text-xs text-white/35 mt-0.5 flex items-center gap-2">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-white/30">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                    </svg>
                    {donor.distance}
                  </div>
                </div>

                {/* Availability */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg flex-shrink-0 ${
                  donor.available
                    ? "bg-green-400/10 text-green-400 border border-green-400/20"
                    : "bg-white/05 text-white/30 border border-white/08"
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${donor.available ? "bg-green-400" : "bg-white/30"}`} />
                  <span className="text-[10px] font-semibold">{donor.available ? "Available" : "Busy"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating distance badge */}
      <div className="absolute -bottom-5 -left-5 glass rounded-2xl px-4 py-2.5 border border-white/10 animate-float" style={{ animationDuration: "6s" }}>
        <div className="text-xs text-white/50 mb-0.5">Closest match</div>
        <div className="font-display font-bold text-lg text-white">1.2 <span className="text-sm font-normal text-white/40">km</span></div>
      </div>
    </div>
  );
}

export default function RecipientSection() {
  return (
    <section
      id="recipient"
      className="relative py-28 section-divider overflow-hidden"
      aria-labelledby="recipient-section-heading"
    >
      {/* BG glow */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-[0.07]" style={{
        background: "radial-gradient(circle, #c0392b 0%, transparent 70%)",
        filter: "blur(80px)",
      }} aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6 border border-white/08">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c0392b]" aria-hidden="true" />
              <span className="text-xs font-medium text-white/50 uppercase tracking-widest">For Recipients</span>
            </div>

            <h2
              id="recipient-section-heading"
              className="font-display font-bold text-4xl md:text-5xl text-white mb-6 tracking-tight leading-tight"
            >
              Find the right donor,<br />
              <span className="gradient-text">closer to you.</span>
            </h2>

            <p className="text-white/50 text-lg mb-8 leading-relaxed">
              BloodWard's location-aware search instantly surfaces compatible donors in your area. Filter by blood group, check real availability, and reach out securely.
            </p>

            <ul className="space-y-4 mb-10" role="list">
              {[
                "Select your required blood group",
                "Automatically use your current location",
                "See available donors sorted by distance",
                "Send a secure request with one tap",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-white/60">
                  <div className="w-5 h-5 rounded-full gradient-crimson flex items-center justify-center flex-shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {item}
                </li>
              ))}
            </ul>

            <a
              href="#register"
              id="recipient-find-blood-cta"
              className="inline-flex items-center gap-3 px-7 py-4 font-semibold text-white rounded-2xl gradient-crimson glow-crimson-sm hover:glow-crimson transition-all duration-300 hover:scale-105"
              aria-label="Start finding blood donors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
              </svg>
              Find Blood Now
            </a>
          </div>

          {/* Right — search UI mock */}
          <div className="flex justify-center lg:justify-end" aria-hidden="true">
            <SearchMockUI />
          </div>
        </div>
      </div>
    </section>
  );
}
