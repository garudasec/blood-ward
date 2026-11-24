import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Lock, CheckCircle2, ShieldAlert, ArrowLeft, KeyRound } from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { authService } from "../../services/authService";

export default function ResetPasswordPage() {
  const { token: routeToken } = useParams();
  const [token] = useState(routeToken || "");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Dynamically enforce no-referrer policy on the reset page for defense-in-depth token protection
    let meta = document.querySelector('meta[name="referrer"]');
    const originalPolicy = meta ? meta.content : "strict-origin-when-cross-origin";

    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "referrer";
      meta.content = "no-referrer";
      document.head.appendChild(meta);
    } else {
      meta.content = "no-referrer";
    }

    // Scrub token from the browser address bar and history to prevent leakage to third-party scripts or extensions
    if (window.history && window.history.replaceState && routeToken) {
      window.history.replaceState({ hasToken: true }, document.title, "/reset-password");
    }

    return () => {
      // Restore standard referrer policy on unmount so subsequent pages (such as maps) function properly
      if (meta) {
        meta.content = originalPolicy;
      }
    };
  }, [routeToken]);

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6 bg-[#F8FAFC]">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 sm:p-8 space-y-6 text-center">
          <div className="w-12 h-12 bg-[#FEF2F2] rounded-xl flex items-center justify-center mx-auto text-[#DC2626]">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[#1E293B]">Invalid or Expired Link</h1>
          <p className="text-xs sm:text-sm text-[#64748B]">
            Password reset tokens are single-use and time-limited. Please request a new password reset link.
          </p>
          <div className="pt-2">
            <Link to="/forgot-password">
              <Button variant="primary" className="text-xs font-semibold py-2 px-4">
                Request Reset Link
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const validate = () => {
    const errs = {};
    if (!password || password.length < 8) {
      errs.password = "Password must be at least 8 characters long.";
    }
    if (password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validate()) return;

    setIsLoading(true);
    try {
      await authService.resetPassword(token, { password, confirmPassword });
      setIsSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setServerError(err.message || "Failed to reset password. The link may be invalid or expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6 bg-[#F8FAFC]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#EFF6FF] rounded-xl flex items-center justify-center mx-auto text-[#315B83]">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Set New Password</h1>
          <p className="text-xs sm:text-sm text-[#64748B]">
            Create a secure new password for your BloodWard account.
          </p>
        </div>

        {serverError && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#991B1B] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-[#DC2626]" />
            <span>{serverError}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-[#16A34A] mx-auto" />
            <div className="font-semibold text-sm text-[#166534]">Password Reset Successfully!</div>
            <p className="text-xs text-[#15803D]">
              Your password has been securely updated. Redirecting to login in 3 seconds...
            </p>
            <Link to="/login" className="inline-block pt-2">
              <Button variant="primary" className="text-xs font-semibold py-2 px-4">
                Sign In Now
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="New Password"
              id="password"
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
              }}
              error={errors.password}
              icon={Lock}
              required
            />

            <Input
              label="Confirm New Password"
              id="confirmPassword"
              type="password"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
              error={errors.confirmPassword}
              icon={Lock}
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 text-xs font-semibold"
              isLoading={isLoading}
            >
              Update Password
            </Button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-[#1E293B] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
