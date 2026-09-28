import { createContext, useContext, useState, useCallback } from "react";
import { getCurrentUser, logoutUser } from "../services/authService";

/**
 * AuthContext
 *
 * Provides authentication state throughout the app.
 * Actual session verification happens via HttpOnly cookie + /api/auth/me.
 *
 * user shape: { id, name, email, role: "admin" | "donor" | "recipient" }
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  const login = useCallback((userData) => {
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // silent fail — still clear local state
    }
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    setAuthLoading(true);
    try {
      const data = await getCurrentUser();
      setUser(data?.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, authLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/**
 * Role-based redirect helper.
 * Returns the dashboard path for a given user role.
 */
export function getDashboardPath(role) {
  switch (role) {
    case "admin":     return "/admin/dashboard";
    case "donor":     return "/donor/dashboard";
    case "recipient": return "/recipient/dashboard";
    default:          return "/";
  }
}
