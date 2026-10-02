import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Droplet, Menu, X, LogIn } from 'lucide-react';
import Button from './Button';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (location.pathname !== '/') {
      navigate(`/#${targetId}`);
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform duration-200">
              <Droplet className="w-6 h-6 fill-current" />
            </div>
            <div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                Blood<span className="text-red-600">Ward</span>
              </span>
              <span className="block text-[10px] font-semibold text-slate-400 -mt-1 tracking-widest uppercase">
                Emergency Network
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a
              href="#home"
              onClick={(e) => handleNavClick(e, 'home')}
              className="hover:text-red-600 transition-colors cursor-pointer"
            >
              Home
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => handleNavClick(e, 'how-it-works')}
              className="hover:text-red-600 transition-colors cursor-pointer"
            >
              How It Works
            </a>
            <a
              href="#privacy-security"
              onClick={(e) => handleNavClick(e, 'privacy-security')}
              className="hover:text-red-600 transition-colors cursor-pointer"
            >
              Privacy & Security
            </a>
            <a
              href="#about"
              onClick={(e) => handleNavClick(e, 'about')}
              className="hover:text-red-600 transition-colors cursor-pointer"
            >
              About
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/login')}
              className="font-semibold"
            >
              <LogIn className="w-4 h-4 mr-1 text-slate-500" />
              Sign In
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/login')}
              className="font-semibold"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <a
            href="#home"
            onClick={(e) => handleNavClick(e, 'home')}
            className="block py-2 text-base font-medium text-slate-700 hover:text-red-600 cursor-pointer"
          >
            Home
          </a>
          <a
            href="#how-it-works"
            onClick={(e) => handleNavClick(e, 'how-it-works')}
            className="block py-2 text-base font-medium text-slate-700 hover:text-red-600 cursor-pointer"
          >
            How It Works
          </a>
          <a
            href="#privacy-security"
            onClick={(e) => handleNavClick(e, 'privacy-security')}
            className="block py-2 text-base font-medium text-slate-700 hover:text-red-600 cursor-pointer"
          >
            Privacy & Security
          </a>
          <a
            href="#about"
            onClick={(e) => handleNavClick(e, 'about')}
            className="block py-2 text-base font-medium text-slate-700 hover:text-red-600 cursor-pointer"
          >
            About
          </a>
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-center"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/login');
              }}
            >
              Sign In
            </Button>
            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/login');
              }}
            >
              Get Started
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
