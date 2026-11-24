import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, KeyRound, CheckCircle2, ShieldAlert } from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { authService } from "../../services/authService";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [serverMessage, setServerMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/\S+@\S+\.\S+/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.forgotPassword(cleanEmail);
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

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6 bg-[#F8FAFC] dark:bg-[#0F1115] transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-[#1A1D24] rounded-2xl shadow-sm border border-[#E2E8F0] dark:border-[#2D3748] p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#FEF2F2] dark:bg-[#A61B2B]/20 rounded-xl flex items-center justify-center mx-auto text-[#A61B2B]">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B] dark:text-white">Reset Your Password</h1>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
            Enter your registered email address and we will send you a secure link to reset your password.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-[#FEF2F2] dark:bg-[#EF4444]/10 border border-[#FECACA] dark:border-[#EF4444]/30 rounded-xl text-xs text-[#991B1B] dark:text-[#FCA5A5] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-[#DC2626]" />
            <span>{error}</span>
          </div>
        )}

        {isSubmitted ? (
          <div className="space-y-4 text-center">
            <div className="p-4 bg-[#F0FDF4] dark:bg-[#059669]/10 border border-[#BBF7D0] dark:border-[#059669]/30 rounded-xl text-xs text-[#166534] dark:text-[#6EE7B7] space-y-2">
              <CheckCircle2 className="w-6 h-6 mx-auto text-[#16A34A]" />
              <div className="font-semibold text-sm">Reset Link Dispatched</div>
              <p>{serverMessage}</p>
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              The link will expire in 15 minutes. Check your spam folder if you don't see it within a few minutes.
            </p>
            <div className="pt-2">
              <Link to="/login">
                <Button variant="secondary" className="w-full text-xs font-semibold py-2.5">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
              Send Password Reset Link
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
