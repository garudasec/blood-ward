import React from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ShieldAlert,
  LayoutDashboard,
  Users,
  FileText,
  Activity,
  Power,
  UserCheck,
} from "lucide-react";
import ThemeToggle from "../components/common/ThemeToggle";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { label: "Donors", path: "/admin/donors", icon: Users },
    { label: "Recipients", path: "/admin/recipients", icon: UserCheck },
    { label: "Requests", path: "/admin/requests", icon: FileText },
    { label: "Audit Logs", path: "/admin/audit-logs", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-theme-main text-theme-primary flex flex-col transition-colors">
      {/* Admin Top Header */}
      <header className="bg-theme-header-top text-theme-primary sticky top-0 z-40 shadow-md border-b border-theme-header transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/admin" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold">
                <ShieldAlert className="w-5 h-5 fill-current" />
              </div>
              <span className="font-bold text-base tracking-tight text-theme-primary">
                Blood<span className="text-amber-500">Ward</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30">
                Admin Console
              </span>
            </Link>

            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-right hidden md:block">
                <p className="text-xs font-semibold text-theme-primary leading-tight">{user?.fullName}</p>
                <p className="text-[10px] text-amber-500 dark:text-amber-400 font-mono leading-tight">ADMINISTRATOR</p>
              </div>

              <ThemeToggle />

              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-theme-subtle hover:bg-rose-500/20 text-theme-secondary hover:text-rose-500 border border-theme transition-colors cursor-pointer"
                title="Sign Out"
              >
                <Power className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-theme-header-nav border-t border-theme-header">
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
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "text-theme-secondary hover:bg-theme-subtle hover:text-theme-primary"
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
