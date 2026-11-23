import React, { useState, useEffect, useRef } from "react";
import { X, Mail, AlertCircle, CheckCircle2, RotateCw } from "lucide-react";
import OtpInput from "./OtpInput";
import Button from "./Button";
import { authService } from "../../services/authService";

export default function OtpVerificationModal({
  isOpen,
  onClose,
  target,
  targetType = "email",
  purpose = "verification",
  onSuccess,
}) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isSent, setIsSent] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const timerRef = useRef(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle countdown timer
  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [countdown]);

  // When modal opens, reset state and send initial OTP
  useEffect(() => {
    if (isOpen && target) {
      setOtp("");
      setError("");
      setIsSuccess(false);
      handleSendOtp();
    }
  }, [isOpen, target]);

  const handleSendOtp = async () => {
    if (!target) return;
    setError("");
    setIsSending(true);

    try {
      await authService.sendEmailOtp(target, purpose);
      setIsSent(true);
      setCountdown(60); // 60s cooldown
    } catch (err) {
      if (err.inCooldown && err.remainingSeconds) {
        setCountdown(err.remainingSeconds);
        setIsSent(true);
      }
      setError(err.message || "Failed to send verification code. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("Please enter the full 6-digit verification code.");
      return;
    }

    setError("");
    setIsVerifying(true);

    try {
      await authService.verifyEmailOtp(target, otp, purpose);
      setIsSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || "Verification failed. The code may be incorrect or expired.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-[#1A1D24] rounded-2xl shadow-xl border border-[#E2E8F0] dark:border-[#2D3748] p-6 space-y-6 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] dark:bg-[#A61B2B]/20 text-[#A61B2B] flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1E293B] dark:text-white">
                Verify Email Address
              </h3>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                Email verification for BloodWard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#64748b] hover:text-[#1E293B] dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isSuccess ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 bg-[#ECFDF5] dark:bg-[#059669]/20 text-[#059669] rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-semibold text-[#1E293B] dark:text-white">
              Email Verified Successfully!
            </h4>
            <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
              Your email address has been securely confirmed.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center space-y-1">
              <p className="text-sm text-[#475569] dark:text-[#cbd5e1]">
                Enter the 6-digit code sent to:
              </p>
              <p className="text-sm font-semibold text-[#1E293B] dark:text-white bg-[#F8FAFC] dark:bg-[#0F1115] py-1.5 px-3 rounded-lg inline-block">
                {target}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-[#FEF2F2] dark:bg-[#EF4444]/10 border border-[#FECACA] dark:border-[#EF4444]/30 rounded-xl flex items-start gap-2.5 text-xs text-[#991B1B] dark:text-[#FCA5A5]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* OTP Input Component */}
            <OtpInput
              value={otp}
              onChange={setOtp}
              numInputs={6}
              disabled={isVerifying || isSending}
              hasError={Boolean(error)}
            />

            {/* Resend and Countdown */}
            <div className="text-center text-xs text-[#64748b] dark:text-[#94a3b8]">
              {countdown > 0 ? (
                <span>Resend code in <strong className="text-[#A61B2B]">{countdown}s</strong></span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSending}
                  className="text-[#A61B2B] hover:underline font-semibold flex items-center gap-1.5 mx-auto transition-colors"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isSending ? "animate-spin" : ""}`} />
                  Resend verification code
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                className="w-1/2"
                onClick={onClose}
                disabled={isVerifying}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="w-1/2 bg-[#A61B2B] hover:bg-[#8B1824] text-white"
                onClick={handleVerify}
                disabled={otp.length !== 6 || isVerifying || isSending}
                isLoading={isVerifying}
              >
                Verify Code
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
