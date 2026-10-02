import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Droplet,
  LayoutDashboard,
  Search,
  PlusCircle,
  FileText,
  User,
  Power,
  MapPin,
} from 'lucide-react';

export default function RecipientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/recipient', icon: LayoutDashboard },
    { label: 'Find Donors', path: '/recipient/donors', icon: Search },
    { label: 'Create Request', path: '/recipient/requests/create', icon: PlusCircle },
    { label: 'My Requests', path: '/recipient/requests', icon: FileText },
    { label: 'Profile', path: '/recipient/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/recipient" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Droplet className="w-5 h-5 fill-current" />
              </div>
              <span className="font-bold text-base tracking-tight">
                Blood<span className="text-blue-400">Ward</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Recipient Portal
              </span>
            </Link>

            <div className="flex items-center gap-4">
              {user?.city && (
                <div className="hidden sm:flex items-center gap-1 text-xs text-slate-300 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  <span>{user.city}</span>
                </div>
              )}

              <div className="text-right hidden md:block">
                <p className="text-xs font-semibold text-white leading-tight">{user?.fullName}</p>
                <p className="text-[10px] text-slate-400 leading-tight">{user?.email}</p>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 transition-colors"
                title="Sign Out"
              >
                <Power className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Navigation */}
        <div className="bg-slate-800 border-t border-slate-700/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}