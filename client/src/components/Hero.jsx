import { useEffect, useRef, useState } from "react";

/* ============================
   3D Blood Drop Orb — CSS-only
   ============================ */
function BloodOrbVisual() {
  const orbRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const x = ((e.clientX - centerX) / rect.width) * 20;
      const y = ((e.clientY - centerY) / rect.height) * 20;
      if (orbRef.current) {
        orbRef.current.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
      }
    };

    const handleMouseLeave = () => {
      if (orbRef.current) {
        orbRef.current.style.transform = "rotateY(0deg) rotateX(0deg)";
      }
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const bloodGroups = ["O+", "A+", "B+", "AB+", "O-", "A-"];
  const positions = [
    { top: "8%", left: "55%", delay: "0s" },
    { top: "18%", left: "80%", delay: "1.2s" },
    { top: "60%", left: "82%", delay: "0.6s" },
    { top: "78%", left: "62%", delay: "1.8s" },
    { top: "70%", left: "20%", delay: "0.9s" },
    { top: "20%", left: "12%", delay: "1.5s" },
  ];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center"
      style={{ perspective: "800px" }}
      aria-hidden="true"
    >
      {/* Ambient glow base */}
      <div className="absolute w-96 h-96 rounded-full" style={{
        background: "radial-gradient(circle, rgba(192,57,43,0.18) 0%, transparent 70%)",
        filter: "blur(40px)",
      }} />

      {/* Outer orbit ring */}
      <div className="absolute w-80 h-80 rounded-full border border-[#c0392b]/15 animate-rotate-slow" style={{
        boxShadow: "0 0 0 1px rgba(192,57,43,0.05)",
      }}>
        {/* Orbit node */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#c0392b] glow-crimson-sm" />
      </div>

      {/* Inner orbit ring */}
      <div className="absolute w-56 h-56 rounded-full border border-white/05 animate-spin-slow-reverse" style={{
        boxShadow: "inset 0 0 30px rgba(192,57,43,0.05)",
      }}>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/40" />
        <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/30" />
      </div>

      {/* Main 3D Orb */}
      <div
        ref={orbRef}
        className="relative w-56 h-64 animate-float"
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.3s ease-out",
        }}
      >
        {/* Drop shape */}
        <div
          className="absolute inset-0 animate-blob-morph"
          style={{
            background: "radial-gradient(ellipse at 35% 30%, rgba(231,76,60,0.9) 0%, rgba(150,40,27,0.95) 50%, rgba(96,20,10,1) 100%)",
            borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
            boxShadow: `
              0 0 60px rgba(192,57,43,0.5),
              0 0 120px rgba(192,57,43,0.2),
              inset 0 -20px 40px rgba(0,0,0,0.4),
              inset -20px -10px 30px rgba(0,0,0,0.3),
              inset 15px 15px 25px rgba(255,120,100,0.2)
            `,
            filter: "drop-shadow(0 20px 40px rgba(192,57,43,0.4))",
          }}
        >
          {/* Highlight reflection */}
          <div style={{
            position: "absolute",
            top: "12%",
            left: "18%",
            width: "35%",
            height: "28%",
            background: "radial-gradient(ellipse, rgba(255,200,180,0.45) 0%, transparent 70%)",
            borderRadius: "50%",
            transform: "rotate(-30deg)",
            filter: "blur(4px)",
          }} />
          {/* Secondary reflection */}
          <div style={{
            position: "absolute",
            top: "55%",
            right: "15%",
            width: "18%",
            height: "12%",
            background: "radial-gradient(ellipse, rgba(255,180,160,0.2) 0%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(3px)",
          }} />
        </div>

        {/* Pulsing glow ring */}
        <div
          className="absolute inset-0 animate-pulse-glow"
          style={{
            borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
            border: "1px solid rgba(231,76,60,0.3)",
          }}
        />
      </div>

      {/* Floating blood group badges */}
      {bloodGroups.map((group, i) => (
        <div
          key={group}
          className="absolute glass rounded-xl px-2.5 py-1.5 animate-float-delayed"
          style={{
            top: positions[i].top,
            left: positions[i].left,
            animationDelay: positions[i].delay,
            animationDuration: `${5 + i * 0.7}s`,
            border: "1px solid rgba(192,57,43,0.3)",
          }}
        >
          <span className="font-display font-bold text-sm text-[#e74c3c]">{group}</span>
        </div>
      ))}

      {/* Floating location pins */}
      <div className="absolute animate-float" style={{ top: "35%", left: "5%", animationDelay: "0.5s" }}>
        <div className="glass rounded-lg px-3 py-2 flex items-center gap-2" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-xs text-white/70 font-medium">2.1 km</span>
        </div>
      </div>

      <div className="absolute animate-float" style={{ top: "55%", right: "5%", animationDelay: "1.5s" }}>
        <div className="glass rounded-lg px-3 py-2 flex items-center gap-2" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-[#c0392b]" />
          <span className="text-xs text-white/70 font-medium">Available</span>
        </div>
      </div>

      {/* Subtle particles */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float"
          style={{
            width: `${2 + (i % 3)}px`,
            height: `${2 + (i % 3)}px`,
            background: `rgba(192,57,43,${0.3 + (i * 0.08)})`,
            top: `${10 + i * 11}%`,
            left: `${5 + i * 12}%`,
            animationDelay: `${i * 0.4}s`,
            animationDuration: `${4 + i * 0.5}s`,
            filter: "blur(0.5px)",
          }}
        />
      ))}
    </div>
  );
}

export default function Hero() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Background gradient */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 80% 80% at 50% -10%, rgba(192,57,43,0.12) 0%, transparent 60%)",
      }} aria-hidden="true" />

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-6 w-full pt-28 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — Copy */}
          <div className={`transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-8 border border-[#c0392b]/20">
              <div className="relative flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <div className="absolute w-2 h-2 rounded-full bg-green-400 animate-ping opacity-60" />
              </div>
              <span className="text-xs font-medium text-white/70 tracking-wide">
                Connecting people with nearby available donors
              </span>
            </div>

            {/* Headline */}
            <h1
              id="hero-heading"
              className="font-display font-extrabold text-5xl md:text-6xl xl:text-7xl leading-[1.05] tracking-tight mb-6"
            >
              <span className="gradient-text-subtle">Find Blood</span>
              <br />
              <span className="text-white">When It</span>
              <br />
              <span className="gradient-text">Matters Most.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-white/55 text-lg md:text-xl leading-relaxed max-w-xl mb-10">
              BloodWard helps you discover nearby available blood donors based on your blood group and location — fast, secure, and when it counts.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 mb-12">
              <a
                href="#recipient"
                id="hero-find-blood-cta"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector("#recipient")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group relative inline-flex items-center gap-3 px-7 py-4 font-semibold text-white rounded-2xl gradient-crimson glow-crimson-sm hover:glow-crimson transition-all duration-300 hover:scale-105 text-base"
                aria-label="Find a blood donor near you"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
                </svg>
                Find Blood
                <svg className="group-hover:translate-x-1 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>

              <a
                href="#donor"
                id="hero-become-donor-cta"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector("#donor")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group inline-flex items-center gap-3 px-7 py-4 font-semibold text-white/80 hover:text-white rounded-2xl glass border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 text-base"
                aria-label="Register as a blood donor"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
                </svg>
                Become a Donor
              </a>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-white/40">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Verified donors</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Privacy-first</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="currentColor"/>
                </svg>
                <span>Location-aware</span>
              </div>
            </div>
          </div>

          {/* Right — 3D Visual */}
          <div
            className={`relative h-[520px] lg:h-[600px] transition-all duration-1000 delay-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            aria-hidden="true"
          >
            <BloodOrbVisual />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40" aria-hidden="true">
        <span className="text-xs font-medium text-white/60 tracking-widest uppercase">Scroll</span>
        <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center pt-1.5">
          <div className="w-1 h-2 rounded-full bg-white/60 animate-bounce" />
        </div>
      </div>
    </section>
  );
}
