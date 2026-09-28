import { Link } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";

const ROLES = [
  {
    id: "donor",
    emoji: "🩸",
    title: "Become a Donor",
    subtitle: "Register as a blood donor",
    description:
      "Create a donor profile with your blood group and location. Set your availability, and help people nearby when they need it most.",
    perks: [
      "Select your blood group",
      "Set your availability anytime",
      "Receive matching blood requests",
      "Make a real difference nearby",
    ],
    href: "/register/donor",
    accent: true,
    cta: "Register as Donor",
    ctaId: "register-role-donor-btn",
  },
  {
    id: "recipient",
    emoji: "🚨",
    title: "Find Blood",
    subtitle: "Register as a recipient",
    description:
      "Create a recipient account to search for available donors by blood group and location, and send emergency blood requests.",
    perks: [
      "Search donors by blood group",
      "Location-based discovery",
      "Send blood requests quickly",
      "Get matched fast in emergencies",
    ],
    href: "/register/recipient",
    accent: false,
    cta: "Register as Recipient",
    ctaId: "register-role-recipient-btn",
  },
];

export default function RegisterPage() {
  return (
    <AuthLayout visualMode="register">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 glass rounded-full px-3.5 py-1.5 mb-5 border border-white/08">
          <div className="w-1.5 h-1.5 rounded-full bg-[#c0392b]" aria-hidden="true" />
          <span className="text-xs font-medium text-white/50 uppercase tracking-widest">Join BloodWard</span>
        </div>
        <h1 className="font-display font-bold text-3xl text-white tracking-tight mb-2">
          Choose your role.
        </h1>
        <p className="text-white/45 text-sm leading-relaxed">
          BloodWard connects donors and recipients. Tell us who you are to get started.
        </p>
      </div>

      {/* Role cards */}
      <div className="space-y-4">
        {ROLES.map((role) => (
          <div
            key={role.id}
            className="group glass rounded-2xl p-6 border transition-all duration-300 cursor-pointer hover:translate-y-[-2px]"
            style={{
              borderColor: role.accent
                ? "rgba(192,57,43,0.2)"
                : "rgba(255,255,255,0.07)",
              background: role.accent
                ? "linear-gradient(135deg, rgba(192,57,43,0.07) 0%, rgba(255,255,255,0.02) 100%)"
                : "rgba(255,255,255,0.03)",
            }}
          >
            <div className="flex items-start gap-4 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{
                  background: role.accent
                    ? "linear-gradient(135deg, rgba(192,57,43,0.2) 0%, rgba(192,57,43,0.08) 100%)"
                    : "rgba(255,255,255,0.05)",
                  border: role.accent
                    ? "1px solid rgba(192,57,43,0.3)"
                    : "1px solid rgba(255,255,255,0.08)",
                }}
                aria-hidden="true"
              >
                {role.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display font-bold text-lg text-white mb-0.5">{role.title}</h2>
                <p className="text-xs text-white/40 font-medium">{role.subtitle}</p>
              </div>
              {role.accent && (
                <span className="flex-shrink-0 text-[10px] font-bold text-[#e74c3c] uppercase tracking-wider px-2 py-1 rounded-lg" style={{ background: "rgba(192,57,43,0.12)", border: "1px solid rgba(192,57,43,0.2)" }}>
                  Popular
                </span>
              )}
            </div>

            <p className="text-sm text-white/45 leading-relaxed mb-4">{role.description}</p>

            <ul className="space-y-1.5 mb-5" role="list">
              {role.perks.map((perk) => (
                <li key={perk} className="flex items-center gap-2.5 text-xs text-white/55">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: role.accent ? "rgba(192,57,43,0.2)" : "rgba(255,255,255,0.06)",
                    }}
                    aria-hidden="true"
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke={role.accent ? "#e74c3c" : "rgba(255,255,255,0.5)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {perk}
                </li>
              ))}
            </ul>

            <Link
              to={role.href}
              id={role.ctaId}
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 focus-ring ${
                role.accent
                  ? "gradient-crimson text-white glow-crimson-sm hover:opacity-90"
                  : "glass border border-white/10 text-white/70 hover:text-white hover:border-white/20"
              }`}
              aria-label={role.cta}
            >
              {role.cta}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        ))}
      </div>

      {/* Already have account */}
      <p className="text-xs text-center text-white/30 mt-6">
        Already have an account?{" "}
        <Link
          to="/login"
          id="register-goto-login"
          className="text-white/50 hover:text-white/80 transition-colors underline underline-offset-2"
        >
          Sign in
        </Link>
      </p>

      {/* Admin note */}
      <p className="text-[11px] text-center text-white/18 mt-3">
        Admin accounts are pre-configured. Admins sign in via the standard login page.
      </p>
    </AuthLayout>
  );
}
