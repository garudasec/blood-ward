import { useState, useEffect } from "react";
import RecipientLayout from "../../layouts/RecipientLayout";
import { PageHeader, LoadingSkeleton, AppButton, EmptyState } from "../../components/app/UI";
import { getNotifications, markAllRead } from "../../services/notificationService";

const MOCK_RECIPIENT_NOTIFS = [
  { _id: "rn1", title: "Donor Accepted Your Request", message: "Dr. Rahul S. (B+) accepted your emergency blood request REQ-9398.", createdAt: "2026-09-28T16:05:00.000Z", read: false, type: "success" },
  { _id: "rn2", title: "Blood Request Broadcast Sent", message: "Your request REQ-9401 was sent to 6 nearby matching O- donors.", createdAt: "2026-09-28T19:30:00.000Z", read: true, type: "info" }
];

export default function RecipientNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifs() {
      try {
        const res = await getNotifications();
        setNotifications(res.notifications || MOCK_RECIPIENT_NOTIFS);
      } catch {
        setNotifications(MOCK_RECIPIENT_NOTIFS);
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
    <RecipientLayout>
      <PageHeader
        title="Notifications"
        subtitle="Donor responses, request updates, and safety alerts"
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
          description="You currently have no new notifications."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <div key={n._id} className={"glass rounded-2xl p-4 border transition-all flex items-start justify-between gap-4 " + (
              !n.read ? "border-red-500/30 bg-red-950/10" : "border-white/06"
            )}>
              <div className="flex items-start gap-3">
                <div className={"w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 " + (
                  n.type === "success" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/05 text-white/50"
                )}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2"/><polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2"/></svg>
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
    </RecipientLayout>
  );
}
