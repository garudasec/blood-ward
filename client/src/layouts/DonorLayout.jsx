import React, { useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Droplet,
  LayoutDashboard,
  User,
  History,
  Power,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import BloodGroupBadge from "../components/common/BloodGroupBadge";
import ThemeToggle from "../components/common/ThemeToggle";
import { donorService } from "../services/donorService";

export default function DonorLayout() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAvailable, setIsAvailable] = useState(user?.availability === "available");

  React.useEffect(() => {
    setIsAvailable(user?.availability === "available");
  }, [user?.availability]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const toggleAvailability = async () => {
    const previousState = isAvailable;
    const nextState = !isAvailable;
    const nextAvailability = nextState ? "available" : "not_available";

    setIsAvailable(nextState);
    try {
      const res = await donorService.updateAvailability(nextAvailability);
      const canonical = res?.availability || nextAvailability;
      updateUser({ availability: canonical });
    } catch (err) {
      console.error("Failed to update availability", err);
      setIsAvailable(previousState);
    }
  };

  const navItems = [
    { label: "Dashboard", path: "/donor", icon: LayoutDashboard },
    { label: "Profile", path: "/donor/profile", icon: User },
    { label: "Requests", path: "/donor/requests", icon: Droplet },
    { label: "History", path: "/donor/history", icon: History },
  ];

  return (
    <div className="min-h-screen bg-theme-main text-theme-primary flex flex-col transition-colors">
      {/* Top Header */}
      <header className="bg-theme-header-top text-theme-primary sticky top-0 z-40 shadow-md border-b border-theme-header transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/donor" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white">
                <Droplet className="w-5 h-5 fill-current" />
              </div>
              <span className="font-bold text-base tracking-tight text-theme-primary">
                Blood<span className="text-red-500">Ward</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
                Donor Portal
              </span>
            </Link>

            {/* User Profile & Availability Quick Switch */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={toggleAvailability}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                  isAvailable
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                    : "bg-theme-subtle text-theme-muted border-theme hover:bg-theme-hover"
                }`}
                title="Click to toggle availability"
              >
                {isAvailable ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Available
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-theme-muted" /> Not Available
                  </>
                )}
              </button>

              {user?.bloodGroup && <BloodGroupBadge group={user.bloodGroup} size="sm" />}

              <div className="text-right hidden md:block">
                <p className="text-xs font-semibold text-theme-primary leading-tight">{user?.fullName}</p>
                <p className="text-[10px] text-theme-muted leading-tight">{user?.email}</p>
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

        {/* Horizontal Navigation Bar */}
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
                      ? "bg-red-600 text-white font-bold"
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

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
