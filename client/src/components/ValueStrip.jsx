const STATS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
      </svg>
    ),
    label: "Location-based Search",
    sublabel: "Find donors near you",
    accent: true,
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
      </svg>
    ),
    label: "Nearby Donors",
    sublabel: "Matched by distance",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2L2 7v5c0 5.55 3.84 10.74 10 12 6.16-1.26 10-6.45 10-12V7l-10-5zM11 17H9v-2h2v2zm0-4H9V7h2v6z" fill="currentColor"/>
      </svg>
    ),
    label: "8 Blood Groups",
    sublabel: "All types supported",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="currentColor"/>
      </svg>
    ),
    label: "Emergency Requests",
    sublabel: "Alert nearby donors",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    label: "Real-time Alerts",
    sublabel: "Instant notifications",
  },
];

export default function ValueStrip() {
  return (
    <section
      className="relative py-10 section-divider"
      aria-label="Platform capabilities"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="glass-strong rounded-2xl px-6 py-6 border border-white/07"
          style={{
            background: "linear-gradient(135deg, rgba(192,57,43,0.05) 0%, rgba(255,255,255,0.02) 100%)",
          }}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-0 md:divide-x divide-white/07">
            {STATS.map((stat, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center px-4 py-3 group cursor-default"
              >
                <div
                  className={`mb-2.5 p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110 ${
                    stat.accent
                      ? "text-[#e74c3c] bg-[#c0392b]/15"
                      : "text-white/50 bg-white/05 group-hover:text-white/80"
                  }`}
                >
                  {stat.icon}
                </div>
                <span className={`text-sm font-semibold tracking-tight mb-0.5 transition-colors duration-300 ${stat.accent ? "text-white" : "text-white/80 group-hover:text-white"}`}>
                  {stat.label}
                </span>
                <span className="text-xs text-white/35 font-medium">{stat.sublabel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
