import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import FormInput from "../../components/auth/FormInput";
import PasswordInput from "../../components/auth/PasswordInput";
import AuthButton from "../../components/auth/AuthButton";
import AlertMessage from "../../components/auth/AlertMessage";
import { loginUser } from "../../services/authService";
import { useAuth, getDashboardPath } from "../../context/AuthContext";

function validateLogin({ email, password }) {
  const errs = {};
  if (!email.trim()) errs.email = "Email address is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Please enter a valid email address.";
  if (!password) errs.password = "Password is required.";
  return errs;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null); // { type, message }
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = useCallback((field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
    setAlert(null);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const errs = validateLogin(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setAlert(null);

    try {
      const data = await loginUser(form);
      login(data.user);
      setSuccess(true);
      setAlert({ type: "success", message: "Login successful! Redirecting..." });
      setTimeout(() => navigate(getDashboardPath(data.user.role), { replace: true }), 800);
    } catch (err) {
      const msg = err.message || "Something went wrong. Please try again.";
      if (msg.toLowerCase().includes("credentials") || msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("not found")) {
        setAlert({ type: "error", message: "Incorrect email or password. Please check and try again." });
      } else if (msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
        setAlert({ type: "error", message: "Network error. Please check your connection and try again." });
      } else if (msg.toLowerCase().includes("server")) {
        setAlert({ type: "error", message: "Server error. Please try again in a moment." });
      } else {
        setAlert({ type: "error", message: msg });
      }
    } finally {
      setLoading(false);
    }
  }, [form, login, navigate]);

  return (
    <AuthLayout visualMode="login">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 glass rounded-full px-3.5 py-1.5 mb-5 border border-white/08">
          <div className="w-1.5 h-1.5 rounded-full bg-[#c0392b]" aria-hidden="true" />
          <span className="text-xs font-medium text-white/50 uppercase tracking-widest">Sign In</span>
        </div>
        <h1 className="font-display font-bold text-3xl text-white tracking-tight mb-2">
          Welcome back.
        </h1>
        <p className="text-white/45 text-sm leading-relaxed">
          Log in to BloodWard to stay connected with donors and blood requests in your area.
        </p>
      </div>

      {/* Alert */}
      {alert && (
        <div className="mb-5">
          <AlertMessage
            type={alert.type}
            message={alert.message}
            onDismiss={() => setAlert(null)}
          />
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="Login form">
        <FormInput
          id="login-email"
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={set("email")}
          error={errors.email}
          autoComplete="email"
          required
          disabled={loading || success}
        />

        <PasswordInput
          id="login-password"
          label="Password"
          value={form.password}
          onChange={set("password")}
          error={errors.password}
          autoComplete="current-password"
          required
          placeholder="Your password"
          disabled={loading || success}
        />

        {/* Forgot password row */}
        <div className="flex justify-end -mt-2">
          <button
            type="button"
            className="text-xs text-white/35 hover:text-[#e74c3c] transition-colors focus-ring rounded"
            aria-label="Reset your forgotten password (coming soon)"
            onClick={() => setAlert({ type: "warning", message: "Password reset will be available once the backend is connected." })}
          >
            Forgot password?
          </button>
        </div>

        <AuthButton
          id="login-submit-btn"
          type="submit"
          loading={loading}
          disabled={success}
          fullWidth
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Sign In
        </AuthButton>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6" aria-hidden="true">
        <div className="flex-1 h-px bg-white/06" />
        <span className="text-xs text-white/25 font-medium">New to BloodWard?</span>
        <div className="flex-1 h-px bg-white/06" />
      </div>

      {/* Role registration links */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/register/donor"
          id="login-goto-donor-register"
          className="group flex flex-col items-center gap-2 p-4 glass rounded-2xl border border-white/07 hover:border-[#c0392b]/30 transition-all duration-200 text-center"
        >
          <span className="text-xl" aria-hidden="true">🩸</span>
          <span className="text-xs font-semibold text-white/70 group-hover:text-white transition-colors">Become a Donor</span>
        </Link>
        <Link
          to="/register/recipient"
          id="login-goto-recipient-register"
          className="group flex flex-col items-center gap-2 p-4 glass rounded-2xl border border-white/07 hover:border-[#c0392b]/30 transition-all duration-200 text-center"
        >
          <span className="text-xl" aria-hidden="true">🚨</span>
          <span className="text-xs font-semibold text-white/70 group-hover:text-white transition-colors">Find Blood</span>
        </Link>
      </div>

      <p className="text-xs text-center text-white/25 mt-5">
        Or{" "}
        <Link to="/register" className="text-white/40 hover:text-white/60 transition-colors underline underline-offset-2">
          explore registration options
        </Link>
      </p>
    </AuthLayout>
  );
}
