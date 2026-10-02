import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  LayoutDashboard,
  Users,
  FileText,
  Activity,
  Power,
  ShieldCheck,
} from 'lucide-react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Overview', path: '/admin', icon: LayoutDashboard },
    { label: 'Donors', path: '/admin/donors', icon: Users },
    { label: 'Recipients', path: '/admin/recipients', icon: Users },
    { label: 'Blood Requests', path: '/admin/requests', icon: FileText },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col">
      <header className="bg-slate-950 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/admin" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold">
                <Shield className="w-5 h-5 fill-current" />
              </div>
              <span className="font-bold text-base tracking-tight">
                Blood<span className="text-amber-500">Ward</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Admin Console
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-xs font-semibold text-white leading-tight">{user?.fullName}</p>
                <p className="text-[10px] text-amber-400 font-mono leading-tight">ADMINISTRATOR</p>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-slate-900 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 transition-colors"
                title="Sign Out"
              >
                <Power className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border-t border-slate-800">
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
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
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