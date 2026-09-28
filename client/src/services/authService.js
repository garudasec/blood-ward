/**
 * BloodWard Auth Service
 *
 * API contract placeholders for future backend integration.
 * All endpoints will use HttpOnly cookies + JWT.
 * DO NOT store tokens in localStorage or sessionStorage.
 *
 * Expected backend base URL: /api/auth
 */

const BASE = "/api/auth";

/**
 * Login with email + password.
 * Backend sets HttpOnly cookie on success.
 * Returns: { user: { id, name, email, role } }
 */
export async function loginUser({ email, password }) {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // send/receive HttpOnly cookies
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Login failed" }));
    throw new Error(err.message || "Login failed");
  }
  return res.json();
}

/**
 * Register a new donor account.
 */
export async function registerDonor(data) {
  const res = await fetch(`${BASE}/register/donor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Registration failed" }));
    throw new Error(err.message || "Registration failed");
  }
  return res.json();
}

/**
 * Register a new recipient account.
 */
export async function registerRecipient(data) {
  const res = await fetch(`${BASE}/register/recipient`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Registration failed" }));
    throw new Error(err.message || "Registration failed");
  }
  return res.json();
}

/**
 * Logout — clears HttpOnly cookie server-side.
 */
export async function logoutUser() {
  const res = await fetch(`${BASE}/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Logout failed");
  return res.json();
}

/**
 * Get current authenticated user from session/cookie.
 * Returns: { user: { id, name, email, role } } or 401.
 */
export async function getCurrentUser() {
  const res = await fetch(`${BASE}/me`, {
    credentials: "include",
  });
  if (!res.ok) return null;
  return res.json();
}
