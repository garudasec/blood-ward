import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function BloodOrbVisual() {
  return (
    <div className="relative w-full h-full min-h-[360px] sm:min-h-[420px] lg:min-h-[480px] flex items-center justify-center">
      {/* Atmospheric Glow */}
      <div
        className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full opacity-60 blur-3xl animate-pulse-glow"
        style={{
          background: "radial-gradient(circle, rgba(231,76,60,0.38) 0%, rgba(192,57,43,0.15) 50%, transparent 70%)",
        }}
      />

      {/* Concentric Orbit Rings */}
      <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-white/08 animate-auth-orbit" />
      <div className="absolute w-80 h-80 sm:w-[420px] sm:h-[420px] rounded-full border border-[#c0392b]/15 animate-auth-orbit-reverse" />

      {/* 3D Glass Sphere Core */}
      <div className="relative w-52 h-52 sm:w-72 sm:h-72 rounded-full flex items-center justify-center animate-auth-float shadow-2xl">
        {/* Deep Core Glow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 35%, #e74c3c 0%, #c0392b 40%, #5c1008 80%, #1e0503 100%)",
            boxShadow: "0 0 50px rgba(192,57,43,0.6), inset 0 0 40px rgba(255,255,255,0.2)",
          }}
        />

        {/* Specular Highlight Shell */}
        <div
          className="absolute inset-2 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 30%, transparent 60%)",
          }}
        />

        {/* Blood Drop Center Icon */}
        <div className="relative z-10 text-white opacity-95 filter drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]">
          <svg width="56" height="64" viewBox="0 0 18 20" fill="none">
            <path
              d="M9 0C9 0 0 7.5 0 12.5C0 17 4 20 9 20C14 20 18 17 18 12.5C18 7.5 9 0 9 0Z"
              fill="white"
              fillOpacity="0.95"
            />
          </svg>
        </div>
      </div>

      {/* Positioned Floating Blood Group Badges */}
      <div className="absolute top-[10%] left-[6%] sm:left-[10%] animate-auth-float" style={{ animationDelay: "0s" }}>
        <div className="glass rounded-xl px-3 py-2 border border-white/12 flex items-center gap-2.5 shadow-xl bg-[#121217]/85 backdrop-blur-md">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-600 to-rose-900 text-white font-bold text-xs flex items-center justify-center shadow-md">
            O-
          </div>
          <span className="text-xs font-semibold text-white/90">Universal Donor</span>
        </div>
      </div>

      <div className="absolute bottom-[16%] left-[4%] sm:left-[8%] animate-auth-float" style={{ animationDelay: "1.2s" }}>
        <div className="glass rounded-xl px-3 py-2 border border-white/12 flex items-center gap-2.5 shadow-xl bg-[#121217]/85 backdrop-blur-md">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-600 to-rose-900 text-white font-bold text-xs flex items-center justify-center shadow-md">
            A+
          </div>
          <span className="text-xs font-semibold text-white/90">Matched 1.8km away</span>
        </div>
      </div>

      <div className="absolute top-[18%] right-[4%] sm:right-[8%] animate-auth-float" style={{ animationDelay: "2.1s" }}>
        <div className="glass rounded-xl px-3 py-2 border border-emerald-500/25 flex items-center gap-2 shadow-xl bg-[#121217]/85 backdrop-blur-md">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-300">Ready to Donate</span>
        </div>
      </div>

      <div className="absolute bottom-[20%] right-[6%] sm:right-[12%] animate-auth-float" style={{ animationDelay: "0.8s" }}>
        <div className="glass rounded-xl px-3 py-2 border border-white/12 flex items-center gap-2.5 shadow-xl bg-[#121217]/85 backdrop-blur-md">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-600 to-rose-900 text-white font-bold text-xs flex items-center justify-center shadow-md">
            B+
          </div>
          <span className="text-xs font-semibold text-white/90">Emergency Match</span>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      id="home"
      className="relative min-h-[88vh] flex items-center overflow-hidden pt-28 pb-16"
      aria-labelledby="hero-heading"
    >
      {/* Background Gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(192,57,43,0.18) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="bw-container relative w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-8 items-center">
          {/* Left Column — Content Block */}
          <div className={"transition-all duration-700 " + (isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6")}>
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6 border border-[#c0392b]/25 bg-red-950/20">
              <div className="relative flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <div className="absolute w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-60" />
              </div>
              <span className="text-xs font-semibold text-white/80 tracking-wide">
                Location-Aware Emergency Blood Discovery
              </span>
            </div>

            <h1
              id="hero-heading"
              className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight mb-5 leading-[1.1]"
            >
              <span className="gradient-text-subtle">Find Blood </span>
              <span className="text-white">When It </span>
              <span className="gradient-text">Matters Most.</span>
            </h1>

            <p className="text-white/70 text-base sm:text-lg leading-relaxed max-w-xl mb-8 font-normal">
              BloodWard connects recipients with nearby available blood donors based on blood type and real-time location radius — fast, secure, and privacy-shielded.
            </p>

            {/* CTA Buttons Row — Flex Row on SM+, Stack on Mobile */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-8">
              <Link
                to="/register/recipient"
                className="group inline-flex items-center justify-center gap-2.5 h-12 sm:h-13 px-7 font-semibold text-white rounded-xl gradient-crimson glow-crimson-sm hover:glow-crimson transition-all duration-200 hover:scale-[1.02] text-sm sm:text-base flex-shrink-0"
                aria-label="Find a blood donor near you"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
                </svg>
                Find Blood
                <svg className="group-hover:translate-x-1 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>

              <Link
                to="/register/donor"
                className="group inline-flex items-center justify-center gap-2.5 h-12 sm:h-13 px-7 font-semibold text-white/90 hover:text-white rounded-xl glass border border-white/12 hover:border-white/25 transition-all duration-200 hover:scale-[1.02] text-sm sm:text-base flex-shrink-0"
                aria-label="Register as a blood donor"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
                </svg>
                Become a Donor
              </Link>
            </div>

            {/* Trust Indicators Row */}
            <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm text-white/50 border-t border-white/08 pt-6">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Verified Donors</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Privacy Protection</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Real-Time Radar</span>
              </div>
            </div>
          </div>

          {/* Right Column — 3D Visual */}
          <div className={"relative transition-all duration-700 delay-200 " + (isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6")}>
            <BloodOrbVisual />
          </div>
        </div>
      </div>
    </section>
  );
}
