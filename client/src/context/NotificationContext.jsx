import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";
import { getNotifications, markNotificationRead, markAllRead } from "../services/notificationService";
import { SOCKET_EVENTS } from "../constants";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { on, off } = useSocket() || {};
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Load from API when user logs in
  const loadNotifications = useCallback(async () => {
    if (!user) { setNotifications([]); return; }
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data?.notifications ?? []);
    } catch {
      // silent — notifications are non-critical
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  // Real-time: prepend new notification from socket
  useEffect(() => {
    if (!on || !off) return;
    const handler = (notification) => {
      setNotifications(prev => [{ ...notification, read: false }, ...prev]);
    };
    on(SOCKET_EVENTS.NEW_NOTIFICATION, handler);
    on(SOCKET_EVENTS.EMERGENCY_NEARBY, handler);
    return () => {
      off(SOCKET_EVENTS.NEW_NOTIFICATION, handler);
      off(SOCKET_EVENTS.EMERGENCY_NEARBY, handler);
    };
  }, [on, off]);

  const markRead = useCallback(async (id) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    try { await markNotificationRead(id); } catch { /* revert on failure if needed */ }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try { await markAllRead(); } catch { /* silent */ }
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, loading,
      loadNotifications, markRead, markAllAsRead,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
