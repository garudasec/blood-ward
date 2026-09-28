/**
 * AuthVisual
 * Decorative right-panel visual for auth pages.
 * Related to but distinct from the hero orb visual.
 * Uses abstract blood-cell / data-node composition.
 */
export default function AuthVisual({ mode = "login" }) {
  const accent =
    mode === "donor"
      ? "from-[#c0392b]/20 to-[#8b1a10]/10"
      : mode === "recipient"
      ? "from-[#8b1a10]/20 to-[#c0392b]/10"
      : "from-[#c0392b]/15 to-transparent";

  const taglines = {
    login: {
      heading: "Welcome back.",
      sub: "Your availability matters. Log in to stay connected with people who need your help.",
    },
    register: {
      heading: "Join BloodWard.",
      sub: "Choose your role and become part of a network that saves lives — one connection at a time.",
    },
    donor: {
      heading: "Become a Donor.",
      sub: "Your blood group, your schedule, your terms. Help people nearby when it matters most.",
    },
    recipient: {
      heading: "Find Blood Nearby.",
      sub: "Register as a recipient and discover available donors close to you, based on your blood group and location.",
    },
  };

  const { heading, sub } = taglines[mode] || taglines.login;

  return (
    <div className="relative flex flex-col justify-between h-full p-10 overflow-hidden">
      {/* Ambient glow */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${accent}`}
        aria-hidden="true"
      />
      <div
        className="absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, #c0392b 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -left-16 w-72 h-72 rounded-full opacity-10"
        style={{
          background: "radial-gradient(circle, #c0392b 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
        aria-hidden="true"
      />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
        aria-hidden="true"
      />

      {/* Top — logo */}
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-crimson flex items-center justify-center glow-crimson-sm">
            <svg width="16" height="18" viewBox="0 0 18 20" fill="none" aria-hidden="true">
              <path
                d="M9 0C9 0 0 7.5 0 12.5C0 17 4 20 9 20C14 20 18 17 18 12.5C18 7.5 9 0 9 0Z"
                fill="white"
                fillOpacity="0.95"
              />
            </svg>
          </div>
          <span className="font-display font-bold text-lg text-white">
            Blood<span className="text-[#c0392b]">Ward</span>
          </span>
        </div>
      </div>

      {/* Center — abstract orb visual */}
      <div className="relative z-10 flex-1 flex items-center justify-center py-10" aria-hidden="true">
        <div className="relative w-52 h-52">
          {/* Outer orbit */}
          <div
            className="absolute inset-0 rounded-full border border-[#c0392b]/12 animate-rotate-slow"
            style={{ boxShadow: "0 0 0 1px rgba(192,57,43,0.05)" }}
          >
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#c0392b]/70"
              style={{ boxShadow: "0 0 8px rgba(192,57,43,0.5)" }}
            />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>

          {/* Middle orbit */}
          <div className="absolute inset-8 rounded-full border border-white/05 animate-spin-slow-reverse">
            <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#c0392b]/50" />
          </div>

          {/* Core orb */}
          <div
            className="absolute inset-14 animate-auth-float"
            style={{
              background:
                "radial-gradient(ellipse at 35% 30%, rgba(231,76,60,0.9) 0%, rgba(150,40,27,0.95) 50%, rgba(80,15,5,1) 100%)",
              borderRadius: "60% 40% 55% 45% / 55% 45% 60% 40%",
              boxShadow:
                "0 0 40px rgba(192,57,43,0.45), 0 0 80px rgba(192,57,43,0.15), inset 0 -10px 20px rgba(0,0,0,0.4), inset 10px 10px 20px rgba(255,120,100,0.15)",
            }}
          >
            {/* Highlight */}
            <div
              style={{
                position: "absolute",
                top: "15%",
                left: "18%",
                width: "35%",
                height: "28%",
                background: "radial-gradient(ellipse, rgba(255,200,180,0.4) 0%, transparent 70%)",
                borderRadius: "50%",
                filter: "blur(3px)",
              }}
            />
          </div>

          {/* Floating nodes */}
          {[
            { x: "8%", y: "20%", label: "O+", delay: "0s" },
            { x: "75%", y: "15%", label: "A-", delay: "1s" },
            { x: "82%", y: "68%", label: "B+", delay: "0.5s" },
            { x: "5%", y: "70%", label: "AB+", delay: "1.5s" },
          ].map((node) => (
            <div
              key={node.label}
              className="absolute glass rounded-lg px-2 py-1 animate-float"
              style={{
                left: node.x,
                top: node.y,
                border: "1px solid rgba(192,57,43,0.25)",
                animationDelay: node.delay,
                animationDuration: `${5 + parseInt(node.delay) * 2}s`,
              }}
            >
              <span className="font-display font-bold text-xs text-[#e74c3c]">{node.label}</span>
            </div>
          ))}

          {/* Location ping */}
          <div
            className="absolute glass rounded-xl px-3 py-2 flex items-center gap-2 animate-float"
            style={{
              bottom: "-5%",
              right: "-10%",
              border: "1px solid rgba(255,255,255,0.1)",
              animationDelay: "0.8s",
              animationDuration: "7s",
            }}
          >
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-50" />
            </div>
            <span className="text-xs text-white/60 font-medium">2.1 km</span>
          </div>
        </div>
      </div>

      {/* Bottom — tagline */}
      <div className="relative z-10">
        <h2 className="font-display font-bold text-2xl text-white mb-3 tracking-tight">
          {heading}
        </h2>
        <p className="text-sm text-white/45 leading-relaxed max-w-xs">{sub}</p>

        {/* Mini trust indicators */}
        <div className="flex items-center gap-4 mt-6">
          {[
            { icon: "🔒", text: "Privacy-first" },
            { icon: "📍", text: "Location-aware" },
            { icon: "⚡", text: "Fast matching" },
          ].map((t) => (
            <div key={t.text} className="flex items-center gap-1.5 text-xs text-white/30">
              <span>{t.icon}</span>
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
