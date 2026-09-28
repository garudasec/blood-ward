import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Find Blood", href: "#recipient" },
  { label: "Become a Donor", href: "#donor" },
  { label: "About", href: "#about" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = useCallback((e, href) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      setMenuOpen(false);
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, []);

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className={"fixed top-0 left-0 right-0 z-50 transition-all duration-500 " + (
        scrolled
          ? "py-3 glass border-b border-white/10 shadow-2xl bg-[#0d0d0f]/90 backdrop-blur-xl"
          : "py-5 bg-transparent"
      )}
    >
      <div className="bw-container flex items-center justify-between">
        {/* Logo */}
        <a
          href="#home"
          onClick={(e) => handleNavClick(e, "#home")}
          className="flex items-center gap-3 group"
          aria-label="BloodWard home"
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-xl gradient-crimson flex items-center justify-center glow-crimson-sm group-hover:scale-105 transition-transform duration-300">
              <svg width="18" height="20" viewBox="0 0 18 20" fill="none" aria-hidden="true">
                <path d="M9 0C9 0 0 7.5 0 12.5C0 17 4 20 9 20C14 20 18 17 18 12.5C18 7.5 9 0 9 0Z" fill="white" fillOpacity="0.95"/>
              </svg>
            </div>
            <div className="absolute inset-0 rounded-xl gradient-crimson opacity-40 blur-md group-hover:opacity-70 transition-opacity duration-300" aria-hidden="true" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-white">
            Blood<span className="text-[#c0392b]">Ward</span>
          </span>
        </a>

        {/* Desktop Nav Links */}
        <ul className="hidden md:flex items-center gap-1" role="list">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-200"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors duration-200"
            aria-label="Log in to your account"
          >
            Log In
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 text-sm font-semibold text-white/90 hover:text-white rounded-xl border border-white/12 hover:border-white/25 glass transition-all duration-200"
            aria-label="Create a new account"
          >
            Register
          </Link>
          <a
            href="#recipient"
            onClick={(e) => handleNavClick(e, "#recipient")}
            id="nav-find-blood-cta"
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl gradient-crimson hover:opacity-90 transition-all duration-200 glow-crimson-sm hover:glow-crimson"
            aria-label="Find a blood donor"
          >
            Find Blood
          </a>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden relative w-10 h-10 flex items-center justify-center rounded-xl glass border border-white/10"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          <div className="flex flex-col gap-1.5" aria-hidden="true">
            <span className={"block h-0.5 bg-white transition-all duration-300 " + (menuOpen ? "w-5 rotate-45 translate-y-2" : "w-5")} />
            <span className={"block h-0.5 bg-white transition-all duration-300 " + (menuOpen ? "opacity-0 w-0" : "w-4")} />
            <span className={"block h-0.5 bg-white transition-all duration-300 " + (menuOpen ? "w-5 -rotate-45 -translate-y-2" : "w-5")} />
          </div>
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        id="mobile-menu"
        className={"md:hidden transition-all duration-300 overflow-hidden " + (menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0")}
        aria-hidden={!menuOpen}
      >
        <div className="bw-container pb-6 pt-2 flex flex-col gap-1 glass-strong border-t border-white/08 mt-2 bg-[#121217]">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="px-4 py-3 text-sm font-medium text-white/80 hover:text-white rounded-xl hover:bg-white/5 transition-all duration-200"
            >
              {link.label}
            </a>
          ))}
          <div className="flex gap-3 mt-3 pt-3 border-t border-white/08">
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="flex-1 py-2.5 text-center text-sm font-medium text-white/80 hover:text-white rounded-xl border border-white/10 glass transition-all duration-200"
            >
              Log In
            </Link>
            <Link
              to="/register"
              onClick={() => setMenuOpen(false)}
              className="flex-1 py-2.5 text-center text-sm font-semibold text-white rounded-xl gradient-crimson"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
