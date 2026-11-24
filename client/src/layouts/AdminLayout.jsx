import React, { useState, useEffect, useRef } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import {
  ShieldCheck,
  ShieldAlert,
  LayoutDashboard,
  Users,
  FileText,
  Activity,
  LogOut,
  UserCheck,
  Bell,
  Menu,
  X,
} from "lucide-react";
import ThemeToggle from "../components/common/ThemeToggle";
import LogoutConfirmModal from "../components/common/LogoutConfirmModal";
import NotificationDropdown from "../components/common/NotificationDropdown";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { toasts } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoutBtnRef = useRef(null);

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

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const navItems = [
    { label: "Overview", path: "/admin", icon: LayoutDashboard },
    { label: "Donors", path: "/admin/donors", icon: Users },
    { label: "Recipients", path: "/admin/recipients", icon: UserCheck },
    { label: "Requests", path: "/admin/requests", icon: FileText },
    { label: "Complaints", path: "/admin/complaints", icon: ShieldAlert },
    { label: "Notifications", path: "/admin/notifications", icon: Bell },
    { label: "Audit Logs", path: "/admin/audit-logs", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F1115] text-[#1E293B] dark:text-[#F1F5F9] flex flex-col transition-colors">
      {/* Admin Top Header */}
      <header className="bg-white dark:bg-[#181B21] text-[#1E293B] dark:text-[#F1F5F9] sticky top-0 z-40 border-b border-[#E2E8F0] dark:border-[#343B47] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link to="/admin" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1E293B] dark:bg-[#252A33] text-white flex items-center justify-center font-bold shadow-xs">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-base tracking-tight text-[#1E293B] dark:text-white">
                Blood<span className="text-[#A61B2B]">Ward</span>
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-[#FFFBEB] dark:bg-amber-950/40 text-[#A66B19] dark:text-amber-300 border border-[#FDE68A] dark:border-amber-900/50">
                Governance Desk
              </span>
            </Link>

            {/* Profile & Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notification Centre */}
              <NotificationDropdown />

              <div className="text-right hidden md:block">
                <p className="text-xs font-bold text-[#1E293B] dark:text-white leading-tight">{user?.fullName || "System Administrator"}</p>
                <p className="text-[10px] text-[#A66B19] dark:text-amber-400 uppercase tracking-wider leading-tight font-medium">Root Admin</p>
              </div>

              {/* Theme Selector (Always in header) */}
              <ThemeToggle />

              <button
                ref={logoutBtnRef}
                onClick={() => setShowLogoutModal(true)}
                className="p-2 rounded-lg bg-[#F8FAFC] dark:bg-[#20242C] hover:bg-[#FEF2F2] dark:hover:bg-rose-950/30 hover:text-[#A61B2B] dark:hover:text-rose-400 text-[#64748B] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#343B47] transition-colors cursor-pointer"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F1F5F9] dark:hover:bg-[#20242C] cursor-pointer"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? <X className="w-5 h-5 text-[#1E293B] dark:text-white" /> : <Menu className="w-5 h-5 text-[#1E293B] dark:text-white" />}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="hidden md:block bg-[#F8FAFC] dark:bg-[#181B21] border-t border-[#E2E8F0] dark:border-[#343B47]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1.5 overflow-x-auto py-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-[#1E293B] dark:bg-[#252A33] text-white dark:text-[#F1F5F9] font-semibold shadow-xs ring-1 ring-white/10"
                      : "text-[#475569] dark:text-[#94A3B8] hover:bg-[#E2E8F0] dark:hover:bg-[#20242C] hover:text-[#1E293B] dark:hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-[#181B21] border-t border-[#E2E8F0] dark:border-[#343B47] px-4 py-3 space-y-2 shadow-2xl max-h-[calc(100dvh-3.5rem)] overflow-y-auto overflow-x-hidden overscroll-contain animate-in slide-in-from-top-2 duration-150">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    isActive
                      ? "bg-[#1E293B] dark:bg-[#252A33] text-white dark:text-[#F1F5F9] font-semibold"
                      : "text-[#475569] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#20242C] hover:text-[#1E293B] dark:hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-[#F1F5F9] dark:border-[#343B47]">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowLogoutModal(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        isLoading={isLoggingOut}
        onConfirm={handleConfirmLogout}
        onClose={() => setShowLogoutModal(false)}
        triggerRef={logoutBtnRef}
      />
    </div>
  );
}
