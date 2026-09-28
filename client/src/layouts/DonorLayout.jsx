import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationPanel from "../components/app/NotificationPanel";

const NAV = [
  { to: "/donor/dashboard",      label: "Dashboard",     icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { to: "/donor/profile",        label: "My Profile",    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { to: "/donor/availability",   label: "Availability",  icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { to: "/donor/requests",       label: "Requests",      icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M14 2v6h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { to: "/donor/history",        label: "History",       icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 3v5h5M12 7v5l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { to: "/donor/notifications",  label: "Notifications", icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
];

function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-sidebar h-full flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/06 flex items-center justify-between">
        <Link to="/donor/dashboard" className="flex items-center gap-2.5" aria-label="Donor dashboard">
          <div className="w-8 h-8 rounded-xl gradient-crimson flex items-center justify-center glow-crimson-sm">
            <svg width="13" height="15" viewBox="0 0 18 20" fill="none" aria-hidden="true"><path d="M9 0C9 0 0 7.5 0 12.5C0 17 4 20 9 20C14 20 18 17 18 12.5C18 7.5 9 0 9 0Z" fill="white" fillOpacity="0.95"/></svg>
          </div>
          <div>
            <div className="font-display font-bold text-base text-white leading-tight">Blood<span className="text-[#c0392b]">Ward</span></div>
            <div className="text-[10px] text-white/35 font-medium">Donor</div>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors focus-ring rounded lg:hidden" aria-label="Close menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Donor navigation">
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/donor/dashboard"}
            onClick={onClose}
            className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-white/06">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
          <div className="w-8 h-8 rounded-xl gradient-crimson flex items-center justify-center text-white font-bold text-sm flex-shrink-0" aria-hidden="true">
            {user?.name?.[0]?.toUpperCase() || "D"}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white/80 truncate">{user?.name || "Donor"}</div>
            <div className="text-xs text-white/35 truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-item w-full text-red-400/60 hover:text-red-400 hover:bg-red-400/08"
          aria-label="Log out of your account"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Log Out
        </button>
      </div>
    </div>
  );
}

export default function DonorLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex" style={{ background: "#0d0d0f", minHeight: "100vh" }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex" aria-label="Sidebar">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="mobile-overlay lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="mobile-drawer open lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* Main */}
      <div className="app-main">
        {/* Topbar */}
        <header className="app-topbar">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden mr-3 text-white/50 hover:text-white/80 transition-colors focus-ring rounded-lg p-1"
            aria-label="Open navigation menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <NotificationPanel dashboardBase="/donor" />
            <div className="hidden sm:flex items-center gap-2 glass rounded-xl px-3 py-1.5 border border-white/08">
              <div className="w-6 h-6 rounded-lg gradient-crimson flex items-center justify-center text-white font-bold text-xs" aria-hidden="true">
                {user?.name?.[0]?.toUpperCase() || "D"}
              </div>
              <span className="text-sm text-white/70 font-medium max-w-[120px] truncate">{user?.name || "Donor"}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="app-content" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
