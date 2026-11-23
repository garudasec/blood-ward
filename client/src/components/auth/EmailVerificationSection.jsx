import React, { useState, useEffect, useRef } from "react";
import { Mail, CheckCircle2, AlertCircle, Clock, RotateCw, ShieldCheck } from "lucide-react";
import Button from "../common/Button";
import { authService } from "../../services/authService";

/**
 * Clean, Compact Horizontal Email OTP Verification Strip
 * Designed according to SaaSFrame & SaaSUI verification design patterns.
 * - Sizing: Compact horizontal strip matching 100% of the email field width.
 * - Parity: Initial and verified states maintain an exact 28px height matching the left column helper strip.
 * - Clear visual states: Pending Verification -> OTP Dispatched -> Email Verified.
 * - Clean error/cooldown handling without pushing unrelated form rows out of alignment.
 */
export default function EmailVerificationSection({
  email = "",
  isVerified = false,
  setIsVerified,
  verifiedEmail = "",
  setVerifiedEmail,
  accentColor = "blood", // 'blood' (#A61B2B) or 'navy' (#315B83)
}) {
  const [status, setStatus] = useState("idle"); // 'idle' | 'sending' | 'sent' | 'verifying' | 'verified' | 'expired'
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const timerRef = useRef(null);
  const prevEmailRef = useRef(email);

  // Email format validator
  const isValidEmail = Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Decrement cooldown every second
  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setInterval(() => {
        setCooldown((prev) => {
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
  }, [cooldown]);

  // Monitor email changes: if email changed after verification, immediately invalidate!
  useEffect(() => {
    const currentClean = (email || "").trim().toLowerCase();
    const prevClean = (prevEmailRef.current || "").trim().toLowerCase();

    if (currentClean !== prevClean) {
      prevEmailRef.current = email;
      if (isVerified || verifiedEmail) {
        setIsVerified(false);
        setVerifiedEmail("");
        setStatus("idle");
        setOtp("");
        setError("Email changed. Verification reset.");
      } else if (status === "sent" || status === "verifying") {
        setStatus("idle");
        setOtp("");
        setError("Email changed. Please request a new code.");
      }
    }
  }, [email, isVerified, verifiedEmail, status, setIsVerified, setVerifiedEmail]);

  // Keep internal status synced with parent isVerified prop
  useEffect(() => {
    if (isVerified && verifiedEmail && (email || "").trim().toLowerCase() === verifiedEmail.toLowerCase()) {
      setStatus("verified");
    } else if (!isVerified && status === "verified") {
      setStatus("idle");
    }
  }, [isVerified, verifiedEmail, email, status]);

  const handleSendOtp = async () => {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !isValidEmail) {
      setError("Enter a valid email first");
      return;
    }

    setError("");
    setStatus("sending");

    try {
      await authService.sendEmailOtp(cleanEmail, "verification");
      setStatus("sent");
      setCooldown(60);
    } catch (err) {
      setStatus("idle");
      if (err.inCooldown && err.remainingSeconds) {
        setCooldown(err.remainingSeconds);
        setError(`Wait ${err.remainingSeconds}s before resending.`);
      } else {
        setError(err.message || "Failed to send code. Try again.");
      }
    }
  };

  const handleVerifyOtp = async () => {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!cleanEmail || !isValidEmail) {
      setError("Valid email required");
      return;
    }

    if (!cleanOtp || cleanOtp.length !== 6) {
      setError("Enter 6-digit code");
      return;
    }

    setError("");
    setStatus("verifying");

    try {
      await authService.verifyEmailOtp(cleanEmail, cleanOtp, "verification");
      setIsVerified(true);
      setVerifiedEmail(cleanEmail);
      setStatus("verified");
      setError("");
    } catch (err) {
      setStatus("sent");
      if (err.attemptsRemaining !== undefined && err.attemptsRemaining === 0) {
        setStatus("expired");
      }
      setError(err.message || "Invalid or expired code");
    }
  };

  // =========================================================================
  // STATE 1: VERIFIED (Exact 28px height, compact green indicator)
  // =========================================================================
  if (isVerified && verifiedEmail && (email || "").trim().toLowerCase() === verifiedEmail.toLowerCase()) {
    return (
      <div className="mt-1.5 h-[28px] w-full flex items-center justify-between px-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs transition-colors">
        <div className="flex items-center gap-1.5 min-w-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-semibold text-[11px] text-emerald-800 dark:text-emerald-300 truncate">
            Email Verified
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono hidden sm:inline truncate">
            ({verifiedEmail})
          </span>
        </div>
        <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ml-1">
          Ready
        </span>
      </div>
    );
  }

  // =========================================================================
  // STATE 2: INITIAL / IDLE / SENDING (Exact 28px height, horizontal strip)
  // =========================================================================
  if (status === "idle" || status === "sending") {
    return (
      <div className="mt-1.5 space-y-1">
        <div className="h-[28px] w-full flex items-center justify-between px-2.5 rounded-md bg-[#F8FAFC] dark:bg-zinc-800/40 border border-[#E2E8F0] dark:border-zinc-800 text-xs transition-colors">
          <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] dark:text-zinc-400 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
            <span className="truncate">
              Status: <strong className="text-amber-600 dark:text-amber-400 font-semibold">Pending Verification</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={handleSendOtp}
            disabled={!isValidEmail || status === "sending"}
            className={`inline-flex items-center gap-1 text-[11px] font-semibold py-0.5 px-2 rounded transition-all cursor-pointer select-none ${
              accentColor === "navy"
                ? "bg-[#315B83] text-white hover:bg-[#264666]"
                : "bg-[#A61B2B] text-white hover:bg-[#8E1724]"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {status === "sending" ? (
              <>
                <RotateCw className="w-3 h-3 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Mail className="w-3 h-3" />
                <span>Send OTP</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="px-2 py-0.5 text-[10px] font-medium text-[#A61B2B] dark:text-rose-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // STATE 3: OTP SENT / VERIFYING / EXPIRED (Compact single-level controls)
  // =========================================================================
  return (
    <div className="mt-1.5 space-y-1">
      <div className="w-full p-1.5 rounded-md bg-[#F8FAFC] dark:bg-zinc-800/50 border border-[#CBD5E1] dark:border-zinc-700 text-xs transition-all space-y-1.5">
        {/* Main Controls Row: OTP Input + Verify Button + Resend */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-24 sm:w-28 h-[28px] px-2 text-center text-xs font-bold font-mono tracking-widest rounded border border-[#CBD5E1] dark:border-zinc-600 bg-white dark:bg-zinc-900 text-[#1E293B] dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#A61B2B]"
          />

          <Button
            type="button"
            variant={accentColor === "navy" ? "secondary" : "primary"}
            size="sm"
            onClick={handleVerifyOtp}
            disabled={otp.length !== 6 || status === "verifying"}
            className="h-[28px] py-0 px-2.5 text-[11px] font-semibold rounded shrink-0 flex items-center gap-1"
          >
            {status === "verifying" ? (
              <>
                <RotateCw className="w-3 h-3 animate-spin" />
                <span>Verifying</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3 h-3" />
                <span>Verify</span>
              </>
            )}
          </Button>

          <div className="ml-auto text-[10px] shrink-0 text-[#64748B] dark:text-zinc-400 pr-0.5">
            {cooldown > 0 ? (
              <span>Resend in <strong className="font-mono text-zinc-700 dark:text-zinc-300">{cooldown}s</strong></span>
            ) : (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={status === "sending"}
                className="font-semibold text-[#A61B2B] dark:text-rose-400 hover:underline cursor-pointer"
              >
                Resend
              </button>
            )}
          </div>
        </div>

        {/* Concise Status Subline */}
        <div className="flex items-center justify-between text-[10px] text-[#64748B] dark:text-zinc-400 px-0.5">
          <span className="truncate">
            Code sent to <strong className="font-mono text-zinc-700 dark:text-zinc-300">{email.trim()}</strong>
          </span>
          <span className="shrink-0 text-slate-400 dark:text-zinc-500 ml-1">10m expiry</span>
        </div>
      </div>

      {error && (
        <div className="px-2 py-0.5 text-[10px] font-medium text-[#A61B2B] dark:text-rose-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}
    </div>
  );
}
