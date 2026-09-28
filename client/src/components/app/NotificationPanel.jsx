import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext";

function timeAgo(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

export default function NotificationPanel({ dashboardBase }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const { notifications, unreadCount, markRead, markAllAsRead, loading } = useNotifications() || {};

  useEffect(() => {
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const notifList = notifications || [];

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-9 h-9 rounded-xl glass flex items-center justify-center text-white/50 hover:text-white/80 border border-white/08 hover:border-white/15 transition-all duration-200 focus-ring"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {unreadCount > 0 && (
          <span className="notif-dot" aria-hidden="true">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 glass-strong rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden" role="menu" aria-label="Notifications">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/07">
            <span className="text-sm font-semibold text-white/80">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-[#e74c3c] hover:text-[#c0392b] transition-colors focus-ring rounded">
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <svg className="animate-spin text-white/30" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-label="Loading">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity=".25"/>
                  <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </div>
            ) : notifList.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-white/30">No notifications yet.</p>
              </div>
            ) : (
              notifList.slice(0, 20).map((n) => (
                <button
                  key={n._id || n.id}
                  onClick={() => { markRead?.(n._id || n.id); setOpen(false); }}
                  className={`w-full text-left px-4 py-3.5 border-b border-white/05 hover:bg-white/04 transition-colors last:border-0 ${!n.read ? "bg-white/02" : ""}`}
                  role="menuitem"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? (n.type === "emergency" ? "bg-red-400" : "bg-[#c0392b]") : "bg-transparent"}`} aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white/80 mb-0.5 leading-snug">{n.title || "Notification"}</p>
                      <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{n.message || n.body}</p>
                      <p className="text-[11px] text-white/25 mt-1">{timeAgo(n.createdAt || n.timestamp || new Date())}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/07 px-4 py-2.5">
            <Link
              to={`${dashboardBase}/notifications`}
              onClick={() => setOpen(false)}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
