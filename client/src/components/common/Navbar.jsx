import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Droplet, Menu, X, LogIn, ArrowUpRight } from "lucide-react";
import Button from "./Button";
import ThemeToggle from "./ThemeToggle";

/**
 * Redesigned BloodWard Public Navbar
 * - Sizing: Compact, modern h-14 to h-15 layout.
 * - Actions (Right Side): ONLY ThemeToggle, Sign In, and Get Started.
 * - Removed separate Donate and Request Blood buttons.
 * - Seamless scroll backdrop blur & border elevation.
 * - Unified mobile drawer with Get Started and Sign In gateways.
 */
export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle scroll detection for subtle navbar background elevation
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile drawer on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent background page scrolling while mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileMenuOpen]);

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (location.pathname !== "/") {
      navigate(`/#${targetId}`);
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } else {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        isScrolled
          ? "bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-xs border-b border-[#E2E8F0] dark:border-zinc-800"
          : "bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-b border-[#E2E8F0]/80 dark:border-zinc-800/80"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-15">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group shrink-0 focus:outline-none">
            <div className="w-7 h-7 rounded-lg bg-[#A61B2B] flex items-center justify-center text-white shadow-2xs group-hover:scale-105 transition-transform duration-150">
              <Droplet className="w-3.5 h-3.5 fill-current" />
            </div>
            <div>
              <span className="text-sm sm:text-base font-bold text-[#1E293B] dark:text-zinc-100 tracking-tight leading-none block">
                Blood<span className="text-[#A61B2B]">Ward</span>
              </span>
              <span className="block text-[8.5px] font-semibold text-[#64748B] dark:text-zinc-400 tracking-wider uppercase font-sans mt-0.5">
                Clinical Network
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links (Large Screens lg+) */}
          <nav className="hidden lg:flex items-center gap-5 text-xs font-medium text-[#475569] dark:text-zinc-300">
            <a
              href="#home"
              onClick={(e) => handleNavClick(e, "home")}
              className="hover:text-[#1E293B] dark:hover:text-white transition-colors cursor-pointer py-1"
            >
              Home
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => handleNavClick(e, "how-it-works")}
              className="hover:text-[#1E293B] dark:hover:text-white transition-colors cursor-pointer py-1"
            >
              How It Works
            </a>
            <a
              href="#donation-process"
              onClick={(e) => handleNavClick(e, "donation-process")}
              className="hover:text-[#1E293B] dark:hover:text-white transition-colors cursor-pointer py-1"
            >
              Donation Process
            </a>
            <a
              href="#why-bloodward"
              onClick={(e) => handleNavClick(e, "why-bloodward")}
              className="hover:text-[#1E293B] dark:hover:text-white transition-colors cursor-pointer py-1"
            >
              Why BloodWard
            </a>
            <a
              href="#safety"
              onClick={(e) => handleNavClick(e, "safety")}
              className="hover:text-[#1E293B] dark:hover:text-white transition-colors cursor-pointer py-1"
            >
              Safety & Trust
            </a>
            <a
              href="#faq"
              onClick={(e) => handleNavClick(e, "faq")}
              className="hover:text-[#1E293B] dark:hover:text-white transition-colors cursor-pointer py-1"
            >
              FAQ
            </a>
            <Link
              to="/complaints"
              className="hover:text-[#A61B2B] dark:hover:text-rose-400 font-semibold transition-colors cursor-pointer py-1"
            >
              Complaints
            </Link>
          </nav>

          {/* DESKTOP BAR (lg+ only): ONLY ThemeToggle, Sign In, Get Started */}
          <div className="hidden lg:flex items-center gap-2.5">
            <ThemeToggle />

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/login")}
              className="rounded-full px-3.5 py-1.5 font-medium text-xs text-[#1E293B] dark:text-[#F1F5F9] border-[#E2E8F0] dark:border-[#343B47] hover:border-slate-300 dark:hover:border-zinc-600 transition-all duration-150"
            >
              <LogIn className="w-3.5 h-3.5 mr-1 text-[#64748B] dark:text-zinc-400" />
              <span>Sign In</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate("/register")}
              className="rounded-full px-4 py-1.5 font-semibold text-xs shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 flex items-center gap-1"
            >
              <span>Get Started</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* TABLET BAR (sm to lg) */}
          <div className="hidden sm:flex lg:hidden items-center gap-2">
            <ThemeToggle />

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/login")}
              className="rounded-full px-3 py-1.5 font-medium text-xs text-[#1E293B] dark:text-[#F1F5F9]"
            >
              <LogIn className="w-3.5 h-3.5 mr-1 text-[#64748B]" />
              <span>Sign In</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate("/register")}
              className="rounded-full px-3.5 py-1.5 font-semibold text-xs flex items-center gap-1"
            >
              <span>Get Started</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-[#475569] dark:text-[#CBD5E1] hover:text-[#1E293B] hover:bg-[#F1F5F9] dark:hover:bg-[#20242C] cursor-pointer ml-1"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-[#1E293B] dark:text-white" />
              ) : (
                <Menu className="w-5 h-5 text-[#1E293B] dark:text-white" />
              )}
            </button>
          </div>

          {/* MOBILE BAR (< sm only) */}
          <div className="flex sm:hidden items-center gap-1.5">
            <ThemeToggle />

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-[#475569] dark:text-[#CBD5E1] hover:text-[#1E293B] hover:bg-[#F1F5F9] dark:hover:bg-[#20242C] cursor-pointer"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-[#1E293B] dark:text-white" />
              ) : (
                <Menu className="w-5 h-5 text-[#1E293B] dark:text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b-2 border-[#CBD5E1] dark:border-[#343B47] bg-white dark:bg-[#181B21] px-4 pt-3 pb-6 space-y-3 shadow-2xl max-h-[calc(100dvh-3.5rem)] sm:max-h-[calc(100dvh-4rem)] overflow-y-auto overflow-x-hidden overscroll-contain animate-in slide-in-from-top-2 duration-150">
          <nav className="space-y-0.5">
            <a
              href="#home"
              onClick={(e) => handleNavClick(e, "home")}
              className="block py-2 px-2.5 rounded-lg text-sm font-medium text-[#475569] dark:text-zinc-300 hover:bg-[#F8FAFC] dark:hover:bg-zinc-800 hover:text-[#1E293B] dark:hover:text-white cursor-pointer transition-colors"
            >
              Home
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => handleNavClick(e, "how-it-works")}
              className="block py-2 px-2.5 rounded-lg text-sm font-medium text-[#475569] dark:text-zinc-300 hover:bg-[#F8FAFC] dark:hover:bg-zinc-800 hover:text-[#1E293B] dark:hover:text-white cursor-pointer transition-colors"
            >
              How It Works
            </a>
            <a
              href="#donation-process"
              onClick={(e) => handleNavClick(e, "donation-process")}
              className="block py-2 px-2.5 rounded-lg text-sm font-medium text-[#475569] dark:text-zinc-300 hover:bg-[#F8FAFC] dark:hover:bg-zinc-800 hover:text-[#1E293B] dark:hover:text-white cursor-pointer transition-colors"
            >
              Donation Process
            </a>
            <a
              href="#why-bloodward"
              onClick={(e) => handleNavClick(e, "why-bloodward")}
              className="block py-2 px-2.5 rounded-lg text-sm font-medium text-[#475569] dark:text-zinc-300 hover:bg-[#F8FAFC] dark:hover:bg-zinc-800 hover:text-[#1E293B] dark:hover:text-white cursor-pointer transition-colors"
            >
              Why BloodWard
            </a>
            <a
              href="#safety"
              onClick={(e) => handleNavClick(e, "safety")}
              className="block py-2 px-2.5 rounded-lg text-sm font-medium text-[#475569] dark:text-zinc-300 hover:bg-[#F8FAFC] dark:hover:bg-zinc-800 hover:text-[#1E293B] dark:hover:text-white cursor-pointer transition-colors"
            >
              Safety & Trust
            </a>
            <a
              href="#faq"
              onClick={(e) => handleNavClick(e, "faq")}
              className="block py-2 px-2.5 rounded-lg text-sm font-medium text-[#475569] dark:text-zinc-300 hover:bg-[#F8FAFC] dark:hover:bg-zinc-800 hover:text-[#1E293B] dark:hover:text-white cursor-pointer transition-colors"
            >
              FAQ
            </a>
            <Link
              to="/complaints"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 px-2.5 rounded-lg text-sm font-semibold text-[#A61B2B] dark:text-rose-400 hover:bg-[#F8FAFC] dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            >
              Complaints
            </Link>
          </nav>

          <div className="pt-3 border-t border-[#E2E8F0] dark:border-zinc-800 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-center text-xs font-semibold rounded-xl py-2"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/login");
              }}
            >
              <LogIn className="w-3.5 h-3.5 mr-1 text-[#64748B] dark:text-zinc-400" />
              <span>Sign In</span>
            </Button>

            <Button
              variant="primary"
              className="w-full justify-center text-xs font-semibold rounded-xl py-2 flex items-center gap-1.5"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/register");
              }}
            >
              <span>Get Started</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
