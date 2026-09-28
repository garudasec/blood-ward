import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationPanel from '../components/app/NotificationPanel';

const NAV = [
  { to: '/admin/dashboard',  label: 'Overview',        icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { to: '/admin/donors',     label: 'Donor Mgmt',      icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { to: '/admin/recipients', label: 'Recipient Mgmt',  icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { to: '/admin/requests',   label: 'Blood Requests',  icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5"/><path d="M14 2v6h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { to: '/admin/audit-logs', label: 'Audit Logs',      icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.5"/><path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
];

function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-sidebar h-full flex flex-col border-r border-white/08" style={{ background: '#09090b' }}>
      {/* Admin Logo Header */}
      <div className="px-5 py-5 border-b border-white/08 flex items-center justify-between">
        <Link to="/admin/dashboard" className="flex items-center gap-3" aria-label="Admin Portal">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-rose-900 flex items-center justify-center shadow-lg shadow-red-900/30 border border-red-500/30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="font-display font-bold text-base text-white leading-tight flex items-center gap-1.5">
              Blood<span className="text-red-500">Ward</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-red-400/90 bg-red-950/60 border border-red-800/40 px-1.5 py-0.5 rounded mt-0.5 inline-block">
              System Admin
            </div>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors focus-ring rounded lg:hidden" aria-label="Close menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Admin navigation">
        <div className="px-3 py-1.5 text-[10px] font-bold text-white/30 uppercase tracking-widest">Admin Console</div>
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin/dashboard'}
            onClick={onClose}
            className={({ isActive }) => ("sidebar-item " + (isActive ? 'active bg-red-950/40 text-red-400 border border-red-800/30 font-semibold' : 'text-white/60 hover:text-white hover:bg-white/04'))}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Admin User Section */}
      <div className="px-3 py-4 border-t border-white/08 bg-white/[0.01]">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-xl border border-white/06 bg-white/02">
          <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 font-bold text-xs flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white/90 truncate">{user?.name || 'System Admin'}</div>
            <div className="text-[10px] text-white/40 truncate">{user?.email || 'admin@bloodward.org'}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-item w-full text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
          aria-label="Log out of admin portal"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Admin Sign Out
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex" style={{ background: '#0b0b0e', minHeight: '100vh' }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex" aria-label="Admin Sidebar">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="mobile-overlay lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="mobile-drawer open lg:hidden" role="dialog" aria-modal="true" aria-label="Admin Navigation Menu">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* Main Container */}
      <div className="app-main flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="app-topbar border-b border-white/08 px-6 py-3.5 flex items-center justify-between glass-strong" style={{ background: '#0e0e12' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-white/60 hover:text-white focus-ring rounded-lg p-1.5 border border-white/10"
              aria-label="Open admin navigation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-white/50">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Admin Session Active
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationPanel dashboardBase="/admin" />
            <div className="flex items-center gap-2.5 glass px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-950/20">
              <div className="w-6 h-6 rounded-md bg-red-600 text-white font-bold text-xs flex items-center justify-center">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <span className="text-xs font-medium text-white/80 max-w-[140px] truncate">{user?.name || 'Administrator'}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="app-content p-6 lg:p-8 flex-1 max-w-7xl mx-auto w-full" id="admin-main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
