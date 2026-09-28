import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import FormInput from "../../components/auth/FormInput";
import PasswordInput from "../../components/auth/PasswordInput";
import AuthButton from "../../components/auth/AuthButton";
import AlertMessage from "../../components/auth/AlertMessage";
import { registerRecipient } from "../../services/authService";

function validate(form) {
  const e = {};
  if (!form.fullName.trim()) e.fullName = "Full name is required.";
  else if (form.fullName.trim().length < 2) e.fullName = "Name must be at least 2 characters.";

  if (!form.email.trim()) e.email = "Email address is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Please enter a valid email address.";

  if (!form.phone.trim()) e.phone = "Phone number is required.";
  else if (!/^\+?[\d\s\-().]{7,15}$/.test(form.phone)) e.phone = "Please enter a valid phone number.";

  if (!form.city.trim()) e.city = "City is required.";

  if (!form.pincode.trim()) e.pincode = "Pincode is required.";
  else if (!/^\d{4,10}$/.test(form.pincode.trim())) e.pincode = "Please enter a valid pincode (4–10 digits).";

  if (!form.password) e.password = "Password is required.";
  else if (form.password.length < 8) e.password = "Password must be at least 8 characters.";
  else if (!/[A-Z]/.test(form.password)) e.password = "Password must contain at least one uppercase letter.";
  else if (!/[0-9]/.test(form.password)) e.password = "Password must contain at least one number.";

  if (!form.confirmPassword) e.confirmPassword = "Please confirm your password.";
  else if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match.";

  if (!form.consent) e.consent = "You must agree to the privacy policy to register.";
  return e;
}

const INITIAL = {
  fullName: "", email: "", phone: "",
  city: "", pincode: "",
  password: "", confirmPassword: "",
  consent: false,
};

export default function RecipientRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = useCallback((field) => (e) => {
    const val = e && e.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setForm((f) => ({ ...f, [field]: val }));
    setErrors((er) => ({ ...er, [field]: undefined }));
    setAlert(null);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setAlert(null);

    try {
      const { confirmPassword: _, consent: __, ...payload } = form;
      await registerRecipient(payload);
      setSuccess(true);
      setAlert({ type: "success", message: "Account created successfully! Redirecting to login..." });
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      const msg = err.message || "Registration failed. Please try again.";
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exists")) {
        setAlert({ type: "error", message: "An account with this email already exists. Try logging in." });
      } else if (msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
        setAlert({ type: "error", message: "Network error. Please check your connection." });
      } else {
        setAlert({ type: "error", message: msg });
      }
    } finally {
      setLoading(false);
    }
  }, [form, navigate]);

  return (
    <AuthLayout visualMode="recipient">
      {/* Header */}
      <div className="mb-7">
        <Link to="/register" className="inline-flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors mb-5 focus-ring rounded">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to role selection
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl" aria-hidden="true">🚨</span>
          <div>
            <h1 className="font-display font-bold text-2xl text-white tracking-tight">Recipient Registration</h1>
            <p className="text-xs text-white/40">Create your account to find blood donors</p>
          </div>
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <div className="mb-5">
          <AlertMessage type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate aria-label="Recipient registration form" className="space-y-5">

        {/* Personal Information */}
        <div>
          <h2 className="text-xs font-semibold text-white/45 uppercase tracking-widest mb-4">Personal Information</h2>
          <div className="space-y-4">
            <FormInput
              id="recipient-fullname"
              label="Full Name"
              placeholder="Your full name"
              value={form.fullName}
              onChange={set("fullName")}
              error={errors.fullName}
              autoComplete="name"
              required
              disabled={loading || success}
            />
            <FormInput
              id="recipient-email"
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
            <FormInput
              id="recipient-phone"
              label="Phone Number"
              type="tel"
              placeholder="+91 9876543210"
              value={form.phone}
              onChange={set("phone")}
              error={errors.phone}
              autoComplete="tel"
              required
              hint="Used only when a donor responds to your request."
              disabled={loading || success}
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <h2 className="text-xs font-semibold text-white/45 uppercase tracking-widest mb-4">Location</h2>
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              id="recipient-city"
              label="City"
              placeholder="Mumbai"
              value={form.city}
              onChange={set("city")}
              error={errors.city}
              autoComplete="address-level2"
              required
              disabled={loading || success}
            />
            <FormInput
              id="recipient-pincode"
              label="Pincode"
              placeholder="400001"
              value={form.pincode}
              onChange={set("pincode")}
              error={errors.pincode}
              autoComplete="postal-code"
              required
              disabled={loading || success}
            />
          </div>
          <p className="text-xs text-white/30 mt-2">
            Location is used to find nearby donors. GPS-based precision search will be available once you log in.
          </p>
        </div>

        {/* Account Security */}
        <div>
          <h2 className="text-xs font-semibold text-white/45 uppercase tracking-widest mb-4">Account Security</h2>
          <div className="space-y-4">
            <PasswordInput
              id="recipient-password"
              label="Password"
              value={form.password}
              onChange={set("password")}
              error={errors.password}
              autoComplete="new-password"
              required
              showStrength
              placeholder="Create a strong password"
              disabled={loading || success}
            />
            <PasswordInput
              id="recipient-confirm-password"
              label="Confirm Password"
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              error={errors.confirmPassword}
              autoComplete="new-password"
              required
              placeholder="Repeat your password"
              disabled={loading || success}
            />
          </div>
        </div>

        {/* Consent */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex-shrink-0 mt-0.5">
              <input
                id="recipient-consent"
                type="checkbox"
                checked={form.consent}
                onChange={set("consent")}
                required
                aria-describedby={errors.consent ? "recipient-consent-error" : undefined}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-md border transition-all duration-200 flex items-center justify-center ${
                  form.consent ? "gradient-crimson border-[#c0392b]" : "border-white/15 bg-white/03 group-hover:border-white/25"
                }`}
                aria-hidden="true"
              >
                {form.consent && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>
            <span className="text-xs text-white/50 leading-relaxed group-hover:text-white/65 transition-colors select-none">
              I agree to the{" "}
              <Link to="/privacy" className="text-white/70 underline underline-offset-2 hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                BloodWard Privacy Policy
              </Link>{" "}
              and understand that my location and profile information are used to connect me with nearby blood donors.
            </span>
          </label>
          {errors.consent && (
            <p id="recipient-consent-error" role="alert" className="text-xs text-red-400 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {errors.consent}
            </p>
          )}
        </div>

        <AuthButton
          id="recipient-register-submit"
          type="submit"
          loading={loading}
          disabled={success}
          fullWidth
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
            <path d="M19 8v6M22 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Create Recipient Account
        </AuthButton>
      </form>

      <p className="text-xs text-center text-white/25 mt-5">
        Already registered?{" "}
        <Link to="/login" className="text-white/40 hover:text-white/60 transition-colors underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
