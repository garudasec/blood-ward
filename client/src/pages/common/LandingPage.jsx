import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplet,
  Search,
  MapPin,
  BellRing,
  ShieldCheck,
  HeartHandshake,
  ArrowRight,
  Clock,
  UserCheck,
  Activity,
  ChevronRight,
} from 'lucide-react';
import Button from '../../components/common/Button';
import BloodGroupBadge from '../../components/common/BloodGroupBadge';
import { BLOOD_GROUPS, DONOR_COMPATIBILITY } from '../../constants/theme';

export default function LandingPage() {
  const navigate = useNavigate();
  const [selectedGroup, setSelectedGroup] = useState('O+');

  return (
    <div className="space-y-20 pb-16">
      {/* 1. HERO SECTION */}
      <section id="home" className="relative overflow-hidden bg-slate-900 scroll-mt-24 text-white pt-16 pb-24 md:pt-24 md:pb-32">
        {/* Glow background effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-30">
          <div className="absolute top-[-10%] left-[20%] w-96 h-96 bg-red-600 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[20%] w-96 h-96 bg-red-900 rounded-full blur-[140px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                Real-Time Emergency Blood Discovery
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                Find Blood. Find Donors.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-500 to-red-600">
                  Save Time When It Matters.
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-300 max-w-2xl font-light leading-relaxed">
                BloodWard connects urgent blood recipients with nearby verified donors instantly through real-time notifications and location-based matching—without compromising donor privacy.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/register/recipient')}
                  className="w-full sm:w-auto shadow-lg shadow-red-600/30"
                >
                  Find a Donor <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/register/donor')}
                  className="w-full sm:w-auto bg-slate-800/80 border-slate-700 text-white hover:bg-slate-800"
                >
                  <HeartHandshake className="w-5 h-5 mr-1 text-red-400" /> Become a Donor
                </Button>
              </div>

              {/* Quick Trust Badges */}
              <div className="pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-4 text-xs text-slate-400 max-w-lg mx-auto lg:mx-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Privacy Shielded</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                  <span>GPS Radius Search</span>
                </div>
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Socket.io Alerts</span>
                </div>
              </div>
            </div>

            {/* Right Card: Interactive Compatibility Quick Tool */}
            <div className="lg:col-span-5">
              <div className="glass-card bg-slate-800/90 border-slate-700/80 p-6 sm:p-8 rounded-2xl shadow-2xl text-white">
                <div className="flex items-center justify-between pb-4 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <Droplet className="w-5 h-5 text-red-500 fill-current" />
                    <h3 className="font-bold text-base">Blood Compatibility Tool</h3>
                  </div>
                  <span className="text-xs text-slate-400">Quick Reference</span>
                </div>

                <div className="mt-6 space-y-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Select Recipient Blood Group:
                  </label>

                  <div className="grid grid-cols-4 gap-2">
                    {BLOOD_GROUPS.map((bg) => (
                      <button
                        key={bg}
                        onClick={() => setSelectedGroup(bg)}
                        className={`py-2 px-1 text-xs font-extrabold rounded-lg border transition-all ${
                          selectedGroup === bg
                            ? 'bg-red-600 border-red-500 text-white shadow-md'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {bg}
                      </button>
                    ))}
                  </div>

                  {/* Compatibility Results */}
                  <div className="mt-6 p-4 rounded-xl bg-slate-900/90 border border-slate-700/60 space-y-3">
                    <div className="text-xs font-medium text-slate-400">
                      Who can donate to <span className="font-bold text-red-400">{selectedGroup}</span>?
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {BLOOD_GROUPS.filter((donorBg) =>
                        DONOR_COMPATIBILITY[donorBg]?.includes(selectedGroup)
                      ).map((compatibleBg) => (
                        <BloodGroupBadge key={compatibleBg} group={compatibleBg} size="sm" />
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full mt-2"
                    onClick={() => navigate(`/register/recipient?group=${encodeURIComponent(selectedGroup)}`)}
                  >
                    Search Donors for {selectedGroup}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-red-600">
            Streamlined Emergency Response
          </h2>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            How BloodWard Operates
          </p>
          <p className="text-slate-600 text-base">
            Designed for clarity, speed, and privacy during critical medical situations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-black text-lg border border-red-100">
              01
            </div>
            <h3 className="text-xl font-bold text-slate-900">Create Request / Search</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Recipients search nearby available donors by blood group and distance radius (2km to 20km+), or submit an emergency request.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-black text-lg border border-red-100">
              02
            </div>
            <h3 className="text-xl font-bold text-slate-900">Real-Time Alerts</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Matching donors marked as <span className="font-semibold text-emerald-600">Available</span> receive instant push notifications via Socket.io.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-black text-lg border border-red-100">
              03
            </div>
            <h3 className="text-xl font-bold text-slate-900">Secure Acceptance</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Once a donor accepts the request, contact details become securely available to coordinate the blood donation.
            </p>
          </div>
        </div>
      </section>

      {/* 3. KEY FEATURES SECTION */}
      <section id="about" className="bg-slate-100/70 py-16 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-bold uppercase tracking-widest text-red-600">
                Location-Aware & Responsive
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
                Location-Based Donor Search & Interactive Maps
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Utilizes Leaflet and OpenStreetMap integration to map approximate donor proximity while enforcing strict privacy rules to avoid exposing exact residential addresses.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-red-100 text-red-600 shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Radius Filtering</h4>
                    <p className="text-xs text-slate-600">
                      Filter available donors from 2 km to 20 km away.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 shrink-0 mt-0.5">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Donor Availability Switch</h4>
                    <p className="text-xs text-slate-600">
                      Donors control when they appear in search results with a single toggle.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Mockup Box */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
                  <span className="text-xs font-bold text-slate-700">Active Emergency Match</span>
                </div>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">
                  High Urgency
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Target Blood Group:</span>
                  <BloodGroupBadge group="AB+" size="sm" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Location:</span>
                  <span className="font-semibold text-slate-800">City Hospital, Sector 14</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Approx Distance:</span>
                  <span className="font-bold text-emerald-600">~ 3.2 km away</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200">
                🔔 Live alert sent to 4 available matching donors in radius.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECURITY & PRIVACY SECTION */}
      <section id="privacy-security" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" /> Cybersecurity & Privacy Protection
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight">
              Built with Modern Privacy Standards
            </h2>

            <p className="text-slate-300 text-sm leading-relaxed">
              BloodWard prioritizes user security and privacy. We implement secure HttpOnly cookie authentication (no JWT in localStorage), granular Role-Based Access Control (Admin, Donor, Recipient), and shielded location privacy.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-4">
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                <h4 className="font-bold text-white text-sm">🔒 HttpOnly Auth Cookies</h4>
                <p className="text-slate-400">
                  Tokens are never exposed to client-side scripts, protecting against XSS attacks.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                <h4 className="font-bold text-white text-sm">🛡️ Shielded Contact Info</h4>
                <p className="text-slate-400">
                  Phone numbers and exact addresses remain private until a donor accepts a request.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
          Ready to join the BloodWard network?
        </h2>
        <p className="text-slate-600 max-w-xl mx-auto text-base">
          Whether you need emergency blood assistance or want to be available to save a life, get started in seconds.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/register/recipient')}
          >
            Find a Donor Now
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate('/register/donor')}
          >
            Register as a Donor
          </Button>
        </div>
      </section>
    </div>
  );
}