import { useState, useEffect } from "react";
import DonorLayout from "../../layouts/DonorLayout";
import { PageHeader, LoadingSkeleton, AppButton, EmptyState } from "../../components/app/UI";
import { getNotifications, markAllRead } from "../../services/notificationService";

const MOCK_NOTIFS = [
  { _id: "n1", title: "Emergency O+ Request Nearby", message: "A hospital 1.8 km away requested 2 units of O+ blood.", createdAt: "2026-09-28T19:30:00.000Z", read: false, type: "emergency" },
  { _id: "n2", title: "Recipient Accepted Your Availability", message: "Priya N. sent an inquiry regarding your O+ blood donation.", createdAt: "2026-09-28T15:10:00.000Z", read: true, type: "info" }
];

export default function DonorNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifs() {
      try {
        const res = await getNotifications();
        setNotifications(res.notifications || MOCK_NOTIFS);
      } catch {
        setNotifications(MOCK_NOTIFS);
      } finally {
        setLoading(false);
      }
    }
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  return (
    <DonorLayout>
      <PageHeader
        title="Notifications"
        subtitle="Real-time alerts, request matches, and system announcements"
        action={
          <AppButton size="sm" variant="secondary" onClick={handleMarkAllRead}>
            Mark All Read
          </AppButton>
        }
      />

      {loading ? (
        <LoadingSkeleton rows={3} />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="No Notifications"
          description="You're all caught up! Emergency blood request alerts will appear here."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <div key={n._id} className={"glass rounded-2xl p-4 border transition-all flex items-start justify-between gap-4 " + (
              !n.read ? "border-red-500/30 bg-red-950/10" : "border-white/06"
            )}>
              <div className="flex items-start gap-3">
                <div className={"w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 " + (
                  n.type === "emergency" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-white/05 text-white/50"
                )}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2"/></svg>
                </div>
                <div>
                  <h4 className="font-display font-semibold text-white text-sm mb-0.5">{n.title}</h4>
                  <p className="text-xs text-white/50 leading-relaxed mb-2">{n.message}</p>
                  <span className="text-[10px] text-white/35 font-mono">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
              </div>
              {!n.read && (
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 mt-2 animate-pulse" />
              )}
            </div>
          ))}
        </div>
      )}
    </DonorLayout>
  );
}
