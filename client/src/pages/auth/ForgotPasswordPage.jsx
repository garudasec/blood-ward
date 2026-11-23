import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, KeyRound, CheckCircle2, ShieldAlert, Lock, Hash } from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import OtpInput from "../../components/common/OtpInput";
import { authService } from "../../services/authService";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState("otp"); // 'otp' | 'link'
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [serverMessage, setServerMessage] = useState("");

  // OTP Step 2 State
  const [otpStep, setOtpStep] = useState(1); // 1 = enter email, 2 = enter otp & new password
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpSuccess, setOtpSuccess] = useState(false);

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.forgotPassword(email);
      setServerMessage(
        response.message ||
          "If an account matches that email, instructions to reset your password have been sent. Please check your inbox."
      );
      setIsSubmitted(true);
    } catch (err) {
      setError(err.message || "Failed to process request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSend = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.forgotPasswordOtp(email);
      setOtpStep(2);
    } catch (err) {
      setError(err.message || "Failed to send password recovery code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpReset = async (e) => {
    e.preventDefault();
    setError("");

    if (otp.length !== 6) {
      setError("Please enter the full 6-digit recovery code.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPasswordOtp({
        email,
        otp,
        password: newPassword,
        confirmPassword,
      });
      setOtpSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 2500);
    } catch (err) {
      setError(err.message || "Failed to reset password. The code may be incorrect or expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6 bg-[#F8FAFC] dark:bg-[#0F1115] transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-[#1A1D24] rounded-2xl shadow-sm border border-[#E2E8F0] dark:border-[#2D3748] p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#FEF2F2] dark:bg-[#A61B2B]/20 rounded-xl flex items-center justify-center mx-auto text-[#A61B2B]">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B] dark:text-white">Reset Your Password</h1>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
            Recover access to your BloodWard account using a secure 6-digit code or reset link.
          </p>
        </div>

        {/* Method Switcher Tabs */}
        {otpStep === 1 && !isSubmitted && (
          <div className="flex rounded-xl bg-[#F1F5F9] dark:bg-[#0F1115] p-1 border border-[#E2E8F0] dark:border-[#2D3748]">
            <button
              type="button"
              onClick={() => {
                setMethod("otp");
                setError("");
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                method === "otp"
                  ? "bg-white dark:bg-[#1A1D24] text-[#A61B2B] shadow-sm"
                  : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B]"
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              6-Digit Code
            </button>
            <button
              type="button"
              onClick={() => {
                setMethod("link");
                setError("");
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                method === "link"
                  ? "bg-white dark:bg-[#1A1D24] text-[#A61B2B] shadow-sm"
                  : "text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B]"
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Reset Link
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 bg-[#FEF2F2] dark:bg-[#EF4444]/10 border border-[#FECACA] dark:border-[#EF4444]/30 rounded-xl text-xs text-[#991B1B] dark:text-[#FCA5A5] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-[#DC2626]" />
            <span>{error}</span>
          </div>
        )}

        {/* OTP Flow */}
        {method === "otp" && (
          <>
            {otpSuccess ? (
              <div className="space-y-4 text-center py-4">
                <div className="p-4 bg-[#F0FDF4] dark:bg-[#059669]/10 border border-[#BBF7D0] dark:border-[#059669]/30 rounded-xl text-xs text-[#166534] dark:text-[#6EE7B7] space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-[#16A34A]" />
                  <div className="font-bold text-sm">Password Reset Successful!</div>
                  <p>Your password has been securely updated. Redirecting to sign in...</p>
                </div>
                <Link to="/login">
                  <Button variant="secondary" className="w-full text-xs font-semibold py-2.5">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Sign In Now
                  </Button>
                </Link>
              </div>
            ) : otpStep === 1 ? (
              <form onSubmit={handleOtpSend} className="space-y-4">
                <Input
                  label="Registered Email Address"
                  id="email"
                  type="email"
                  placeholder="e.g. yourname@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  error={error}
                  icon={Mail}
                  required
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 text-xs font-semibold bg-[#A61B2B] hover:bg-[#8B1824] text-white"
                  isLoading={isLoading}
                >
                  Send Recovery Code
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
            ) : (
              <form onSubmit={handleOtpReset} className="space-y-5">
                <div className="text-center space-y-1">
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Enter the 6-digit code sent to <strong className="text-[#1E293B] dark:text-white">{email}</strong>:
                  </p>
                  <OtpInput value={otp} onChange={setOtp} numInputs={6} hasError={Boolean(error)} />
                </div>

                <Input
                  label="New Password"
                  id="newPassword"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  icon={Lock}
                  required
                />

                <Input
                  label="Confirm New Password"
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  icon={Lock}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 text-xs font-semibold bg-[#A61B2B] hover:bg-[#8B1824] text-white"
                  isLoading={isLoading}
                >
                  Confirm & Reset Password
                </Button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep(1);
                      setOtp("");
                      setError("");
                    }}
                    className="text-[#64748B] hover:text-[#1E293B] transition-colors"
                  >
                    Change Email
                  </button>
                  <button
                    type="button"
                    onClick={handleOtpSend}
                    disabled={isLoading}
                    className="text-[#A61B2B] font-semibold hover:underline"
                  >
                    Resend Code
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* Link Flow (Backward Compatible) */}
        {method === "link" && (
          <>
            {isSubmitted ? (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-[#F0FDF4] dark:bg-[#059669]/10 border border-[#BBF7D0] dark:border-[#059669]/30 rounded-xl text-xs text-[#166534] dark:text-[#6EE7B7] space-y-2">
                  <CheckCircle2 className="w-6 h-6 mx-auto text-[#16A34A]" />
                  <div className="font-semibold text-sm">Request Processed</div>
                  <p>{serverMessage}</p>
                </div>
                <Link to="/login">
                  <Button variant="secondary" className="w-full text-xs font-semibold py-2.5">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleLinkSubmit} className="space-y-4">
                <Input
                  label="Registered Email Address"
                  id="email"
                  type="email"
                  placeholder="e.g. yourname@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  error={error}
                  icon={Mail}
                  required
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 text-xs font-semibold bg-[#A61B2B] hover:bg-[#8B1824] text-white"
                  isLoading={isLoading}
                >
                  Generate Reset Link
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
          </>
        )}
      </div>
    </div>
  );
}
