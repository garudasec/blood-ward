import { useState, useEffect } from "react";

const MOCK_DONORS_MAP = [
  { id: 1, group: "O+", km: "1.2", x: 38, y: 42, available: true },
  { id: 2, group: "A+", km: "2.1", x: 62, y: 28, available: true },
  { id: 3, group: "B-", km: "3.4", x: 72, y: 60, available: false },
  { id: 4, group: "AB+", km: "4.0", x: 25, y: 65, available: true },
  { id: 5, group: "O-", km: "2.8", x: 50, y: 70, available: true },
];

function MapMockUI() {
  const [activeAlert, setActiveAlert] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setActiveAlert((v) => !v), 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-lg mx-auto" aria-hidden="true">
      {/* Map container */}
      <div className="relative glass-strong rounded-3xl overflow-hidden border border-white/10" style={{
        height: "400px",
        boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
        background: "linear-gradient(135deg, rgba(20,20,30,1) 0%, rgba(15,15,22,1) 100%)",
      }}>
        {/* Fake map grid */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        {/* Fake road lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 500 400">
          <line x1="0" y1="200" x2="500" y2="200" stroke="white" strokeWidth="1.5"/>
          <line x1="250" y1="0" x2="250" y2="400" stroke="white" strokeWidth="1.5"/>
          <line x1="0" y1="100" x2="500" y2="280" stroke="white" strokeWidth="1"/>
          <line x1="100" y1="0" x2="400" y2="400" stroke="white" strokeWidth="1"/>
        </svg>

        {/* Center user */}
        <div className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}>
          {/* Pulse rings */}
          <div className="absolute inset-0 rounded-full border border-[#c0392b]/20 animate-ping" style={{ width: "80px", height: "80px", transform: "translate(-50%,-50%) translate(12px,12px)" }} />
          <div className="absolute inset-0 rounded-full border border-[#c0392b]/10 animate-ping" style={{ width: "120px", height: "120px", transform: "translate(-50%,-50%) translate(12px,12px)", animationDelay: "0.5s" }} />
          <div className="w-6 h-6 rounded-full gradient-crimson glow-crimson flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
        </div>

        {/* Donor pins */}
        {MOCK_DONORS_MAP.map((donor) => (
          <div
            key={donor.id}
            className="absolute group cursor-pointer"
            style={{ left: `${donor.x}%`, top: `${donor.y}%`, transform: "translate(-50%,-50%)" }}
          >
            {/* Line to center */}
            <div className="absolute w-px opacity-10 bg-white/50" style={{
              height: `${Math.sqrt(Math.pow((50-donor.x)*4, 2) + Math.pow((50-donor.y)*3.5, 2))}px`,
              transformOrigin: "top center",
              transform: `rotate(${Math.atan2((50-donor.y),(50-donor.x)) * 180 / Math.PI - 90}deg)`,
            }} />
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-xs text-white transition-all duration-200 group-hover:scale-110 ${
              donor.available ? "gradient-crimson glow-crimson-sm" : "bg-white/10 border border-white/15"
            }`}>
              {donor.group}
            </div>
            {donor.available && (
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border border-[#0d0d0f]" />
            )}
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 glass rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/80 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10">
              {donor.km} km away
            </div>
          </div>
        ))}

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <div className="glass rounded-xl px-3 py-2 flex items-center gap-2 border border-white/08">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#c0392b">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            </svg>
            <span className="text-xs text-white/70 font-medium">Current Location</span>
          </div>
          <div className="glass rounded-xl px-3 py-2 flex items-center gap-2 border border-white/08">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-white/60">4 available</span>
          </div>
        </div>

        {/* Emergency alert overlay */}
        <div className={`absolute bottom-4 left-4 right-4 transition-all duration-700 ${activeAlert ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{
            background: "linear-gradient(135deg, rgba(192,57,43,0.2) 0%, rgba(150,40,27,0.15) 100%)",
            border: "1px solid rgba(192,57,43,0.35)",
            backdropFilter: "blur(12px)",
          }}>
            <div className="w-9 h-9 rounded-xl gradient-crimson flex items-center justify-center flex-shrink-0 glow-crimson-sm animate-pulse-glow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-[#e74c3c] uppercase tracking-wide mb-0.5">Emergency Request Nearby</div>
              <div className="text-sm font-semibold text-white">O+ required · 3.4 km away</div>
            </div>
            <div className="text-xs font-semibold text-white/80 glass rounded-lg px-3 py-1.5 border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
              Respond
            </div>
          </div>
        </div>
      </div>

      {/* Floating stat */}
      <div className="absolute -top-4 -right-4 glass rounded-2xl px-4 py-3 border border-white/10 animate-float-delayed">
        <div className="text-xs text-white/40 mb-0.5">Response time</div>
        <div className="font-display font-bold text-xl text-white">~12 <span className="text-sm font-normal text-white/40">min</span></div>
      </div>
    </div>
  );
}

export default function LocationSection() {
  return (
    <section
      id="location"
      className="relative py-28 section-divider overflow-hidden"
      aria-labelledby="location-section-heading"
    >
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(192,57,43,0.06) 0%, transparent 70%)",
      }} aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-5 border border-white/08">
            <div className="w-1.5 h-1.5 rounded-full bg-[#c0392b]" aria-hidden="true" />
            <span className="text-xs font-medium text-white/50 uppercase tracking-widest">Location + Alerts</span>
          </div>
          <h2
            id="location-section-heading"
            className="font-display font-bold text-4xl md:text-5xl text-white mb-5 tracking-tight"
          >
            Location-aware search.<br />
            <span className="gradient-text">Real-time emergency alerts.</span>
          </h2>
          <p className="text-white/45 text-lg max-w-2xl mx-auto leading-relaxed">
            BloodWard knows where donors are. When an emergency request is created, nearby compatible donors are alerted immediately — no searching required.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left — map mock */}
          <div>
            <MapMockUI />
          </div>

          {/* Right — feature list */}
          <div className="space-y-6">
            {[
              {
                title: "Proximity-based Discovery",
                desc: "Donors within your configurable radius are surfaced first, sorted by distance and availability.",
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="3" fill="currentColor"/>
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
                  </svg>
                ),
              },
              {
                title: "Emergency Broadcast Mode",
                desc: "Mark a request as urgent. BloodWard notifies all available matching donors in range simultaneously.",
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
              },
              {
                title: "Availability Intelligence",
                desc: "Only donors who are actively marked available appear in search results — no cold contacts.",
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
              },
              {
                title: "Respectful Notifications",
                desc: "Donors control their notification preferences. No spam, no unwanted pressure.",
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ),
              },
            ].map((feature, i) => (
              <div key={i} className="flex gap-5 group">
                <div className="w-11 h-11 rounded-xl glass flex items-center justify-center text-[#c0392b] border border-[#c0392b]/20 flex-shrink-0 group-hover:border-[#c0392b]/40 group-hover:glow-crimson-sm transition-all duration-300">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-white/90 mb-1.5 text-base">{feature.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
