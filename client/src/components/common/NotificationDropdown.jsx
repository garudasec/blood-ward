import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  CheckCircle2,
  Droplet,
  Users,
  UserPlus,
  Building2,
  AlertTriangle,
  HeartHandshake,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { inAppNotificationService } from "../../services/inAppNotificationService";
import { socketService } from "../../services/socketService";

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 30) return "Just now";
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getNotificationIcon(type) {
  switch (type) {
    case "new_donor":
      return <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    case "new_recipient":
      return <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
    case "new_request":
    case "potential_match":
      return <Droplet className="w-4 h-4 text-[#A61B2B] dark:text-rose-400" />;
    case "new_complaint":
      return <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case "match_accepted":
      return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    case "donation_completed":
      return <HeartHandshake className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    default:
      return <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" />;
  }
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const navigate = useNavigate();

  // Fetch initial notifications and unread count
  const fetchNotifications = useCallback(async () => {
    try {
      const data = await inAppNotificationService.getMyNotifications({ limit: 20 });
      if (data && data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn("[NotificationDropdown] Failed to fetch notifications:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time WebSocket listener
  useEffect(() => {
    const socket = socketService.connect();
    if (!socket) return;

    const handleNewNotification = (notif) => {
      if (!notif || !notif._id) return;
      setNotifications((prev) => {
        // Prevent duplicate in state
        if (prev.some((n) => n._id === notif._id)) {
          return prev;
        }
        return [notif, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
    };

    socketService.on("notification:new", handleNewNotification);

    return () => {
      socketService.off("notification:new", handleNewNotification);
    };
  }, []);

  // Outside click listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Escape key listener
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        // Refresh notifications when opened
        fetchNotifications();
      }
      return next;
    });
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await inAppNotificationService.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn("[NotificationDropdown] Failed to mark read:", err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      await inAppNotificationService.markAllRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.warn("[NotificationDropdown] Failed to mark all as read:", err.message);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      handleMarkAsRead(notif._id);
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Accessible Bell Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        aria-label={
          unreadCount > 0
            ? `Notifications (${unreadCount} unread)`
            : "Notifications (none unread)"
        }
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative p-2 rounded-lg bg-[#F8FAFC] dark:bg-[#20242C] border border-[#E2E8F0] dark:border-[#343B47] text-[#475569] dark:text-[#CBD5E1] hover:text-[#1E293B] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#252A33] transition-colors cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#A61B2B] dark:focus:ring-rose-500"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-[#A61B2B] text-white text-[10px] font-mono font-bold flex items-center justify-center shadow-xs animate-pulse"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Recent notifications"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] z-50 rounded-xl bg-white dark:bg-[#1E242C] border border-[#E2E8F0] dark:border-[#343B47] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] dark:border-[#343B47] bg-[#F8FAFC] dark:bg-[#252B35]">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#1E293B] dark:text-white">
                Notifications
              </h3>
              {unreadCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FEF2F2] dark:bg-rose-950/50 text-[#A61B2B] dark:text-rose-300 border border-[#FEE2E2] dark:border-rose-900/50">
                  {unreadCount} new
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F1F5F9] dark:bg-[#2E3642] text-[#64748B] dark:text-[#94A3B8]">
                  Caught up
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll}
                className="text-xs font-medium text-[#A61B2B] dark:text-rose-400 hover:text-[#8B1522] dark:hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isMarkingAll ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-[#E2E8F0]/60 dark:divide-[#343B47]/60">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-[#E2E8F0] dark:bg-[#343B47]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-[#E2E8F0] dark:bg-[#343B47] rounded w-3/4" />
                      <div className="h-2.5 bg-[#E2E8F0] dark:bg-[#343B47] rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-[#F1F5F9] dark:bg-[#252B35] flex items-center justify-center text-[#94A3B8] mb-2">
                  <BellOff className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-[#1E293B] dark:text-white">
                  No notifications yet
                </p>
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                  You're all caught up with administrative updates.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.read;
                return (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`relative p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                      isUnread
                        ? "bg-[#FFF9F9] dark:bg-[#262A34] hover:bg-[#FFF1F2] dark:hover:bg-[#2D333F]"
                        : "bg-white dark:bg-[#1E242C] hover:bg-[#F8FAFC] dark:hover:bg-[#252A33]"
                    }`}
                  >
                    {/* Type Icon Container */}
                    <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] dark:bg-[#2A313C] flex items-center justify-center shrink-0 mt-0.5">
                      {getNotificationIcon(notif.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p
                          className={`text-xs truncate ${
                            isUnread
                              ? "font-bold text-[#1E293B] dark:text-white"
                              : "font-medium text-[#475569] dark:text-[#CBD5E1]"
                          }`}
                        >
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-[#94A3B8] dark:text-[#64748B] shrink-0 font-mono">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      {notif.link && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-[#A61B2B] dark:text-rose-400">
                          <span>View details</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>

                    {/* Unread dot or Mark Read Button */}
                    <div className="shrink-0 flex items-center self-center">
                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(notif._id, e)}
                          title="Mark as read"
                          aria-label="Mark as read"
                          className="p-1 rounded text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-white transition-colors cursor-pointer"
                        >
                          <span className="w-2 h-2 rounded-full bg-[#A61B2B] dark:bg-rose-500 block" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
