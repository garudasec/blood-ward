import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, getDashboardPath } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { NotificationProvider } from "./context/NotificationContext";

// Public & Auth Pages
import LandingPage from "./pages/common/LandingPage";
import NotFoundPage from "./pages/common/NotFoundPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import DonorRegisterPage from "./pages/auth/DonorRegisterPage";
import RecipientRegisterPage from "./pages/auth/RecipientRegisterPage";

// Donor Pages
import DonorDashboardPage from "./pages/donor/DonorDashboardPage";
import DonorProfilePage from "./pages/donor/DonorProfilePage";
import DonorAvailabilityPage from "./pages/donor/DonorAvailabilityPage";
import DonorRequestsPage from "./pages/donor/DonorRequestsPage";
import DonorHistoryPage from "./pages/donor/DonorHistoryPage";
import DonorNotificationsPage from "./pages/donor/DonorNotificationsPage";

// Recipient Pages
import RecipientDashboardPage from "./pages/recipient/RecipientDashboardPage";
import RecipientProfilePage from "./pages/recipient/RecipientProfilePage";
import RecipientFindDonorsPage from "./pages/recipient/RecipientFindDonorsPage";
import RecipientCreateRequestPage from "./pages/recipient/RecipientCreateRequestPage";
import RecipientRequestsPage from "./pages/recipient/RecipientRequestsPage";
import RecipientNotificationsPage from "./pages/recipient/RecipientNotificationsPage";

// Admin Pages
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminDonorsPage from "./pages/admin/AdminDonorsPage";
import AdminRecipientsPage from "./pages/admin/AdminRecipientsPage";
import AdminRequestsPage from "./pages/admin/AdminRequestsPage";
import AdminAuditLogsPage from "./pages/admin/AdminAuditLogsPage";

/**
 * ProtectedRoute
 * Guards routes. If no session, redirects to /login.
 * If logged in but wrong role, redirects to their role's dashboard.
 */
function ProtectedRoute({ children, requiredRole }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }
  return children;
}

/**
 * GuestRoute
 * Redirects authenticated users away from auth pages.
 */
function GuestRoute({ children }) {
  const { user } = useAuth();
  if (user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth — guest only */}
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/register/donor" element={<GuestRoute><DonorRegisterPage /></GuestRoute>} />
      <Route path="/register/recipient" element={<GuestRoute><RecipientRegisterPage /></GuestRoute>} />

      {/* Donor Application */}
      <Route path="/donor/dashboard" element={<ProtectedRoute requiredRole="donor"><DonorDashboardPage /></ProtectedRoute>} />
      <Route path="/donor/profile" element={<ProtectedRoute requiredRole="donor"><DonorProfilePage /></ProtectedRoute>} />
      <Route path="/donor/availability" element={<ProtectedRoute requiredRole="donor"><DonorAvailabilityPage /></ProtectedRoute>} />
      <Route path="/donor/requests" element={<ProtectedRoute requiredRole="donor"><DonorRequestsPage /></ProtectedRoute>} />
      <Route path="/donor/history" element={<ProtectedRoute requiredRole="donor"><DonorHistoryPage /></ProtectedRoute>} />
      <Route path="/donor/notifications" element={<ProtectedRoute requiredRole="donor"><DonorNotificationsPage /></ProtectedRoute>} />

      {/* Recipient Application */}
      <Route path="/recipient/dashboard" element={<ProtectedRoute requiredRole="recipient"><RecipientDashboardPage /></ProtectedRoute>} />
      <Route path="/recipient/profile" element={<ProtectedRoute requiredRole="recipient"><RecipientProfilePage /></ProtectedRoute>} />
      <Route path="/recipient/find-donors" element={<ProtectedRoute requiredRole="recipient"><RecipientFindDonorsPage /></ProtectedRoute>} />
      <Route path="/recipient/requests/new" element={<ProtectedRoute requiredRole="recipient"><RecipientCreateRequestPage /></ProtectedRoute>} />
      <Route path="/recipient/requests" element={<ProtectedRoute requiredRole="recipient"><RecipientRequestsPage /></ProtectedRoute>} />
      <Route path="/recipient/notifications" element={<ProtectedRoute requiredRole="recipient"><RecipientNotificationsPage /></ProtectedRoute>} />

      {/* Admin Application */}
      <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin"><AdminDashboardPage /></ProtectedRoute>} />
      <Route path="/admin/donors" element={<ProtectedRoute requiredRole="admin"><AdminDonorsPage /></ProtectedRoute>} />
      <Route path="/admin/recipients" element={<ProtectedRoute requiredRole="admin"><AdminRecipientsPage /></ProtectedRoute>} />
      <Route path="/admin/requests" element={<ProtectedRoute requiredRole="admin"><AdminRequestsPage /></ProtectedRoute>} />
      <Route path="/admin/audit-logs" element={<ProtectedRoute requiredRole="admin"><AdminAuditLogsPage /></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
