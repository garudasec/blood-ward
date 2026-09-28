import { Link } from "react-router-dom";

export default function Footer() {
  const handleNavClick = (e, href) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const year = new Date().getFullYear();

  return (
    <footer className="relative section-divider pt-16 pb-10 overflow-hidden" aria-label="Site footer">
      <div className="bw-container relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <a
              href="#home"
              onClick={(e) => handleNavClick(e, "#home")}
              className="flex items-center gap-3 group"
              aria-label="BloodWard home"
            >
              <div className="w-8 h-8 rounded-xl gradient-crimson flex items-center justify-center glow-crimson-sm group-hover:scale-105 transition-transform">
                <svg width="16" height="18" viewBox="0 0 18 20" fill="none" aria-hidden="true">
                  <path d="M9 0C9 0 0 7.5 0 12.5C0 17 4 20 9 20C14 20 18 17 18 12.5C18 7.5 9 0 9 0Z" fill="white" fillOpacity="0.95"/>
                </svg>
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-white">
                Blood<span className="text-[#c0392b]">Ward</span>
              </span>
            </a>

            <p className="text-xs text-white/50 leading-relaxed max-w-xs">
              Modern, location-aware blood donor discovery and emergency request platform. Connecting people securely when every second counts.
            </p>
          </div>

          {/* Platform Column */}
          <div>
            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-4">Platform Overview</h3>
            <ul className="space-y-2.5 text-xs text-white/50" role="list">
              <li><a href="#recipient" onClick={(e) => handleNavClick(e, "#recipient")} className="hover:text-white transition-colors">Find Blood Donors</a></li>
              <li><a href="#donor" onClick={(e) => handleNavClick(e, "#donor")} className="hover:text-white transition-colors">Become a Donor</a></li>
              <li><a href="#how-it-works" onClick={(e) => handleNavClick(e, "#how-it-works")} className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#location" onClick={(e) => handleNavClick(e, "#location")} className="hover:text-white transition-colors">Location Technology</a></li>
            </ul>
          </div>

          {/* Access & Portals Column */}
          <div>
            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-4">Account & Portals</h3>
            <ul className="space-y-2.5 text-xs text-white/50" role="list">
              <li><Link to="/login" className="hover:text-white transition-colors">Log In</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Register Account</Link></li>
              <li><Link to="/donor/dashboard" className="hover:text-white transition-colors">Donor Portal</Link></li>
              <li><Link to="/recipient/dashboard" className="hover:text-white transition-colors">Recipient Portal</Link></li>
              <li><Link to="/admin/dashboard" className="hover:text-white transition-colors">System Admin Portal</Link></li>
            </ul>
          </div>

          {/* Trust & Security Column */}
          <div>
            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-4">Trust & Security</h3>
            <ul className="space-y-2.5 text-xs text-white/50" role="list">
              <li><a href="#about" onClick={(e) => handleNavClick(e, "#about")} className="hover:text-white transition-colors">Privacy Architecture</a></li>
              <li><a href="#about" onClick={(e) => handleNavClick(e, "#about")} className="hover:text-white transition-colors">HttpOnly Auth Security</a></li>
              <li><a href="#about" onClick={(e) => handleNavClick(e, "#about")} className="hover:text-white transition-colors">Role-Based Access</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/08 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <p>&copy; {year} BloodWard. All rights reserved.</p>
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>BloodWard Platform v1.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
