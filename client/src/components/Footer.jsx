const FOOTER_LINKS = {
  Platform: [
    { label: "Find Blood", href: "#recipient" },
    { label: "Become a Donor", href: "#donor" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Location Search", href: "#location" },
  ],
  Company: [
    { label: "About", href: "#about" },
    { label: "Contact", href: "#contact" },
    { label: "Careers", href: "#careers" },
    { label: "Blog", href: "#blog" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#privacy" },
    { label: "Terms of Service", href: "#terms" },
    { label: "Data Policy", href: "#data" },
    { label: "Cookie Policy", href: "#cookies" },
  ],
};

export default function Footer() {
  const handleNavClick = (e, href) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  const year = new Date().getFullYear();

  return (
    <footer
      className="relative section-divider pt-20 pb-10 overflow-hidden"
      aria-label="Site footer"
    >
      {/* Subtle gradient top */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{
        background: "linear-gradient(90deg, transparent 0%, rgba(192,57,43,0.3) 50%, transparent 100%)",
      }} aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <a
              href="#home"
              onClick={(e) => handleNavClick(e, "#home")}
              className="flex items-center gap-3 mb-5 group"
              aria-label="BloodWard home"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-xl gradient-crimson flex items-center justify-center glow-crimson-sm group-hover:scale-110 transition-transform duration-300">
                  <svg width="16" height="18" viewBox="0 0 18 20" fill="none" aria-hidden="true">
                    <path d="M9 0C9 0 0 7.5 0 12.5C0 17 4 20 9 20C14 20 18 17 18 12.5C18 7.5 9 0 9 0Z" fill="white" fillOpacity="0.95"/>
                  </svg>
                </div>
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-white">
                Blood<span className="text-[#c0392b]">Ward</span>
              </span>
            </a>

            <p className="text-sm text-white/40 leading-relaxed max-w-xs mb-6">
              A modern, location-aware blood donor discovery and emergency blood request platform. Connecting people when it matters most.
            </p>

            {/* Social links (placeholder) */}
            <div className="flex gap-3" aria-label="Social media links">
              {[
                { label: "Twitter", path: "M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" },
                { label: "GitHub", path: "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" },
                { label: "LinkedIn", path: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" },
              ].map((social) => (
                <a
                  key={social.label}
                  href="#"
                  className="w-9 h-9 rounded-xl glass flex items-center justify-center text-white/30 hover:text-white/70 border border-white/06 hover:border-white/15 transition-all duration-200"
                  aria-label={social.label}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={social.path}/>
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-5">{group}</h3>
              <ul className="space-y-3" role="list">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={(e) => {
                        if (link.href.startsWith("#") && document.querySelector(link.href)) {
                          handleNavClick(e, link.href);
                        }
                      }}
                      className="text-sm text-white/35 hover:text-white/70 transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/06 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/25">
            &copy; {year} BloodWard. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-white/25">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400/60" aria-hidden="true" />
            <span>All systems operational</span>
          </div>
          <p className="text-xs text-white/20">
            Built for people. Designed with care.
          </p>
        </div>
      </div>
    </footer>
  );
}
