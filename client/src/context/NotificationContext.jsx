import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { socketService } from "../services/socketService";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  X,
  ExternalLink,
  Droplet,
  Bell,
} from "lucide-react";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);
  const recentEventsRef = useRef(new Map());

  // Prune old event hashes every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of recentEventsRef.current.entries()) {
        if (now - timestamp > 30000) {
          recentEventsRef.current.delete(key);
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ title, message, type = "info", path = null, actionText = "View", duration = 6000 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newToast = { id, title, message, type, path, actionText, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // keep at most 5 toasts visible

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  // Deduplication checker
  const shouldDeduplicate = useCallback((key, windowMs = 8000) => {
    const now = Date.now();
    const lastSeen = recentEventsRef.current.get(key);
    if (lastSeen && now - lastSeen < windowMs) {
      return true;
    }
    recentEventsRef.current.set(key, now);
    return false;
  }, []);

  // Global socket listener orchestration
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setToasts([]);
      return;
    }

    const socket = socketService.connect();
    if (!socket) return;

    // --- DONOR LISTENERS ---
    const handleDonorNewRequest = (payload) => {
      if (!payload) return;
      const reqId = payload.requestId || payload.id || "";
      const isUrgent = payload.urgency === "Emergency" || payload.urgency === "High";
      const dedupeKey = `donor:req:${reqId}:${isUrgent ? "urgent" : "norm"}`;

      if (shouldDeduplicate(dedupeKey)) return;

      const bloodGroup = payload.bloodGroup || "Blood";
      const units = payload.unitsNeeded ? `(${payload.unitsNeeded} unit${payload.unitsNeeded > 1 ? "s" : ""})` : "";
      const hospital = payload.hospitalName ? ` at ${payload.hospitalName}` : "";
      const city = payload.city ? `, ${payload.city}` : "";

      if (isUrgent) {
        addToast({
          title: payload.urgency === "Emergency" ? "🚨 Emergency Blood Requisition" : "⚠️ High Urgency Blood Request",
          message: `${payload.urgency ? payload.urgency.toUpperCase() : 'URGENT'}: ${bloodGroup} required ${units}${hospital}${city}.`,
          type: "error",
          path: "/donor/requests",
          actionText: "Respond Now",
          duration: 9000,
        });
      } else {
        addToast({
          title: "🩸 Compatible Blood Request",
          message: `New matching request for ${bloodGroup} ${units}${hospital}${city}.`,
          type: "info",
          path: "/donor/requests",
          actionText: "View Request",
          duration: 7000,
        });
      }
    };

    const handleDonorRadiusExpanded = (payload) => {
      if (!payload) return;
      const reqId = payload.requestId || payload.id || "";
      const dedupeKey = `donor:radius:${reqId}:${payload.radiusKm || ""}`;

      if (shouldDeduplicate(dedupeKey)) return;

      const bloodGroup = payload.bloodGroup || "Blood";
      const radiusKm = payload.radiusKm ? `${payload.radiusKm} KM` : "expanded area";

      addToast({
        title: "📍 Search Radius Expanded",
        message: `A request for ${bloodGroup} has expanded search radius to ${radiusKm} near you.`,
        type: "info",
        path: "/donor/requests",
        actionText: "Check Eligibility",
        duration: 7000,
      });
    };

    const handleDonorStatusChanged = (payload) => {
      if (!payload) return;
      const reqId = payload.requestId || payload.id || "";
      const status = payload.status || "updated";
      const dedupeKey = `donor:status:${reqId}:${status}`;

      if (shouldDeduplicate(dedupeKey)) return;

      if (status === "Fulfilled") {
        addToast({
          title: "✅ Blood Request Fulfilled",
          message: "A blood donation request you were involved with was completed. Thank you!",
          type: "success",
          path: "/donor/history",
          actionText: "View History",
          duration: 7000,
        });
      } else if (status === "In Progress") {
        addToast({
          title: "📋 Donation In Progress",
          message: "Request marked In Progress. Safe travels to the hospital!",
          type: "info",
          path: "/donor/requests",
          actionText: "View Details",
          duration: 6000,
        });
      }
    };

    const handleDonorCancelled = (payload) => {
      if (!payload) return;
      const reqId = payload.requestId || payload.id || "";
      const dedupeKey = `donor:cancelled:${reqId}`;

      if (shouldDeduplicate(dedupeKey)) return;

      addToast({
        title: "⚠️ Blood Request Cancelled",
        message: "A pending blood request was cancelled by the recipient.",
        type: "warning",
        path: "/donor/requests",
        actionText: "Refresh",
        duration: 6000,
      });
    };

    // --- RECIPIENT LISTENERS ---
    const handleRecipientAccepted = (payload) => {
      if (!payload) return;
      const reqId = payload.id || payload._id || payload.requestId || "";
      const dedupeKey = `rec:accepted:${reqId}`;

      if (shouldDeduplicate(dedupeKey)) return;

      const bloodGroup = payload.bloodGroup || "";
      const hospital = payload.hospitalName ? ` at ${payload.hospitalName}` : "";

      addToast({
        title: "🎉 Donor Accepted Your Request!",
        message: `A compatible donor accepted your ${bloodGroup} request${hospital}. Contact details are now unlocked.`,
        type: "success",
        path: "/recipient/requests",
        actionText: "Contact Donor",
        duration: 10000,
      });
    };

    const handleRecipientStatusChanged = (payload) => {
      if (!payload) return;
      const reqId = payload.requestId || payload.id || "";
      const status = payload.status || "";
      const dedupeKey = `rec:status:${reqId}:${status}`;

      if (shouldDeduplicate(dedupeKey)) return;

      if (status === "In Progress") {
        addToast({
          title: "🚗 Donor On The Way",
          message: "Your blood request is marked In Progress. The donor is en route.",
          type: "info",
          path: "/recipient/requests",
          actionText: "Track Request",
          duration: 7000,
        });
      } else if (status === "Fulfilled") {
        addToast({
          title: "✅ Blood Request Fulfilled",
          message: "Your blood request has been successfully fulfilled. Thank you!",
          type: "success",
          path: "/recipient/requests",
          actionText: "View Summary",
          duration: 8000,
        });
      } else if (status === "Cancelled") {
        addToast({
          title: "⚠️ Request Cancelled",
          message: "Your blood request has been cancelled.",
          type: "warning",
          path: "/recipient/requests",
          actionText: "View Requests",
          duration: 6000,
        });
      } else if (status === "Expired") {
        addToast({
          title: "⏳ Blood Request Expired",
          message: "Your blood request reached its required date without fulfilment.",
          type: "warning",
          path: "/recipient/requests",
          actionText: "Review",
          duration: 7000,
        });
      }
    };

    const handleDonorAvailabilityNotice = (payload) => {
      if (!payload) return;
      const donorId = payload.donorId || payload.id || "";
      const dedupeKey = `rec:avail:${donorId}:${payload.availability || ""}`;

      if (shouldDeduplicate(dedupeKey, 15000)) return;

      if (payload.availability === "available") {
        addToast({
          title: "👥 Donor Available Nearby",
          message: `A compatible donor is now available in your area.`,
          type: "info",
          path: "/recipient/donors",
          actionText: "Search Donors",
          duration: 6000,
        });
      }
    };

    if (user.role === "donor") {
      socketService.on("bloodRequest:new", handleDonorNewRequest);
      socketService.on("request:created", handleDonorNewRequest);
      socketService.on("bloodRequest:emergency", handleDonorNewRequest);
      socketService.on("bloodRequest:radius_expanded", handleDonorRadiusExpanded);
      socketService.on("request:radius_expanded", handleDonorRadiusExpanded);
      socketService.on("bloodRequest:statusChanged", handleDonorStatusChanged);
      socketService.on("bloodRequest:fulfilled", handleDonorStatusChanged);
      socketService.on("bloodRequest:cancelled", handleDonorCancelled);
    } else if (user.role === "recipient") {
      socketService.on("bloodRequest:accepted", handleRecipientAccepted);
      socketService.on("bloodRequest:statusChanged", handleRecipientStatusChanged);
      socketService.on("bloodRequest:fulfilled", handleRecipientStatusChanged);
      socketService.on("bloodRequest:cancelled", handleRecipientStatusChanged);
      socketService.on("donor:availabilityChanged", handleDonorAvailabilityNotice);
      socketService.on("donor:availability_updated", handleDonorAvailabilityNotice);
    }

    return () => {
      if (user.role === "donor") {
        socketService.off("bloodRequest:new", handleDonorNewRequest);
        socketService.off("request:created", handleDonorNewRequest);
        socketService.off("bloodRequest:emergency", handleDonorNewRequest);
        socketService.off("bloodRequest:radius_expanded", handleDonorRadiusExpanded);
        socketService.off("request:radius_expanded", handleDonorRadiusExpanded);
        socketService.off("bloodRequest:statusChanged", handleDonorStatusChanged);
        socketService.off("bloodRequest:fulfilled", handleDonorStatusChanged);
        socketService.off("bloodRequest:cancelled", handleDonorCancelled);
      } else if (user.role === "recipient") {
        socketService.off("bloodRequest:accepted", handleRecipientAccepted);
        socketService.off("bloodRequest:statusChanged", handleRecipientStatusChanged);
        socketService.off("bloodRequest:fulfilled", handleRecipientStatusChanged);
        socketService.off("bloodRequest:cancelled", handleRecipientStatusChanged);
        socketService.off("donor:availabilityChanged", handleDonorAvailabilityNotice);
        socketService.off("donor:availability_updated", handleDonorAvailabilityNotice);
      }
    };
  }, [user, isAuthenticated, addToast, shouldDeduplicate]);

  const handleToastClick = (toast) => {
    if (toast.path) {
      navigate(toast.path);
    }
    removeToast(toast.id);
  };

  return (
    <NotificationContext.Provider value={{ addToast, removeToast, toasts }}>
      {children}

      {/* Floating Global Toast Notification Container */}
      <div
        className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full px-4 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const isError = toast.type === "error";
          const isSuccess = toast.type === "success";
          const isWarning = toast.type === "warning";

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-xl shadow-lg border transition-all animate-in fade-in slide-in-from-top-3 duration-200 ${
                isError
                  ? "bg-white dark:bg-zinc-900 border-red-500/80 dark:border-red-500/80 text-zinc-900 dark:text-zinc-100 ring-1 ring-red-500/20"
                  : isSuccess
                  ? "bg-white dark:bg-zinc-900 border-emerald-500/80 dark:border-emerald-500/80 text-zinc-900 dark:text-zinc-100 ring-1 ring-emerald-500/20"
                  : isWarning
                  ? "bg-white dark:bg-zinc-900 border-amber-500/80 dark:border-amber-500/80 text-zinc-900 dark:text-zinc-100 ring-1 ring-amber-500/20"
                  : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
              }`}
            >
              <div className="flex items-start gap-3">
                {isError ? (
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                ) : isSuccess ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                ) : isWarning ? (
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                ) : (
                  <Bell className="w-5 h-5 shrink-0 text-zinc-700 dark:text-zinc-300 mt-0.5" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    {toast.title}
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-snug">
                    {toast.message}
                  </p>

                  {toast.path && (
                    <button
                      onClick={() => handleToastClick(toast)}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 hover:underline cursor-pointer"
                    >
                      <span>{toast.actionText || "View"}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors shrink-0 cursor-pointer"
                  aria-label="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};

export default NotificationContext;
