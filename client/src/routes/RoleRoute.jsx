import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { USER_ROLES } from "../constants/theme";
import { ShieldAlert } from "lucide-react";

export default function RoleRoute({ allowedRoles, children }) {
  const { role, isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    if (role === USER_ROLES.DONOR) return <Navigate to="/donor" replace />;
    if (role === USER_ROLES.RECIPIENT) return <Navigate to="/recipient" replace />;
    if (role === USER_ROLES.ADMIN) return <Navigate to="/admin" replace />;

    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-main p-4">
        <div className="bg-theme-card p-8 rounded-2xl border border-theme shadow-xl text-center max-w-md space-y-4">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-theme-primary">Access Denied (403)</h2>
          <p className="text-xs text-theme-secondary">
            Your account ({role || "Unknown"}) does not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
