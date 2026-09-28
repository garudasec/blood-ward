import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import FormInput from "../../components/auth/FormInput";
import PasswordInput from "../../components/auth/PasswordInput";
import AuthButton from "../../components/auth/AuthButton";
import AlertMessage from "../../components/auth/AlertMessage";
import BloodGroupSelector from "../../components/auth/BloodGroupSelector";
import { registerDonor } from "../../services/authService";

/* ─── Validation ─────────────────────────────────────────── */
function validate(form) {
  const e = {};
  if (!form.fullName.trim()) e.fullName = "Full name is required.";
  else if (form.fullName.trim().length < 2) e.fullName = "Name must be at least 2 characters.";

  if (!form.email.trim()) e.email = "Email address is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Please enter a valid email address.";

  if (!form.phone.trim()) e.phone = "Phone number is required.";
  else if (!/^\+?[\d\s\-().]{7,15}$/.test(form.phone)) e.phone = "Please enter a valid phone number.";

  if (!form.password) e.password = "Password is required.";
  else if (form.password.length < 8) e.password = "Password must be at least 8 characters.";
  else if (!/[A-Z]/.test(form.password)) e.password = "Password must contain at least one uppercase letter.";
  else if (!/[0-9]/.test(form.password)) e.password = "Password must contain at least one number.";

  if (!form.confirmPassword) e.confirmPassword = "Please confirm your password.";
  else if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match.";

  if (!form.bloodGroup) e.bloodGroup = "Please select your blood group.";
  if (!form.city.trim()) e.city = "City is required.";

  if (!form.pincode.trim()) e.pincode = "Pincode is required.";
  else if (!/^\d{4,10}$/.test(form.pincode.trim())) e.pincode = "Please enter a valid pincode (4–10 digits).";

  if (!form.consent) e.consent = "You must agree to the privacy policy to register.";
  return e;
}

const INITIAL = {
  fullName: "", email: "", phone: "",
  password: "", confirmPassword: "",
  bloodGroup: "", city: "", pincode: "",
  availability: "available", consent: false,
};

/* ─── Step indicator ─────────────────────────────────────── */
function StepIndicator({ current }) {
  const steps = ["Personal", "Donor Info", "Account"];
  return (
    <div className="flex items-center gap-2 mb-8" aria-label="Registration steps">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-300 ${
                i < current
                  ? "gradient-crimson text-white"
                  : i === current
                  ? "border-2 border-[#c0392b] text-[#e74c3c]"
                  : "border border-white/15 text-white/25"
              }`}
              aria-current={i === current ? "step" : undefined}
            >
              {i < current ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (i + 1)}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === current ? "text-white/80" : "text-white/25"}`}>
              {s}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="flex-1 h-px mx-1" style={{
              background: i < current ? "#c0392b" : "rgba(255,255,255,0.08)",
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function DonorRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(0);

  const set = useCallback((field) => (e) => {
    const val = e && e.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setForm((f) => ({ ...f, [field]: val }));
    setErrors((er) => ({ ...er, [field]: undefined }));
    setAlert(null);
  }, []);

  /* Step-level partial validation */
  const validateStep = (s) => {
    const e = validate(form);
    const stepFields = [
      ["fullName", "email", "phone"],
      ["bloodGroup", "city", "pincode", "availability"],
      ["password", "confirmPassword", "consent"],
    ];
    const relevant = {};
    stepFields[s].forEach((f) => { if (e[f]) relevant[f] = e[f]; });
    return relevant;
  };

  const nextStep = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep((s) => s + 1);
  };

  const prevStep = () => {
    setErrors({});
    setStep((s) => s - 1);
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setAlert(null);

    try {
      const { confirmPassword: _, consent: __, ...payload } = form;
      await registerDonor(payload);
      setSuccess(true);
      setAlert({ type: "success", message: "Account created! Redirecting to login..." });
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
    <AuthLayout visualMode="donor">
      {/* Header */}
      <div className="mb-6">
        <Link to="/register" className="inline-flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors mb-5 focus-ring rounded">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to role selection
        </Link>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl" aria-hidden="true">🩸</span>
          <div>
            <h1 className="font-display font-bold text-2xl text-white tracking-tight">Donor Registration</h1>
            <p className="text-xs text-white/40">Create your blood donor profile</p>
          </div>
        </div>
        <StepIndicator current={step} />
      </div>

      {/* Alert */}
      {alert && (
        <div className="mb-5">
          <AlertMessage type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate aria-label="Donor registration form">

        {/* ── Step 0: Personal Information ── */}
        {step === 0 && (
          <div className="space-y-5">
            <div className="mb-2">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest">Personal Information</h2>
            </div>

            <FormInput
              id="donor-fullname"
              label="Full Name"
              placeholder="Your full name"
              value={form.fullName}
              onChange={set("fullName")}
              error={errors.fullName}
              autoComplete="name"
              required
              disabled={loading}
            />
            <FormInput
              id="donor-email"
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set("email")}
              error={errors.email}
              autoComplete="email"
              required
              disabled={loading}
            />
            <FormInput
              id="donor-phone"
              label="Phone Number"
              type="tel"
              placeholder="+91 9876543210"
              value={form.phone}
              onChange={set("phone")}
              error={errors.phone}
              autoComplete="tel"
              required
              hint="Used only to coordinate donation — never shown publicly."
              disabled={loading}
            />

            <AuthButton type="button" onClick={nextStep} id="donor-step1-next">
              Continue
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </AuthButton>
          </div>
        )}

        {/* ── Step 1: Donor Information ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="mb-2">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest">Donation Information</h2>
            </div>

            <BloodGroupSelector
              value={form.bloodGroup}
              onChange={set("bloodGroup")}
              error={errors.bloodGroup}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormInput
                id="donor-city"
                label="City"
                placeholder="Mumbai"
                value={form.city}
                onChange={set("city")}
                error={errors.city}
                autoComplete="address-level2"
                required
                disabled={loading}
              />
              <FormInput
                id="donor-pincode"
                label="Pincode"
                placeholder="400001"
                value={form.pincode}
                onChange={set("pincode")}
                error={errors.pincode}
                autoComplete="postal-code"
                required
                disabled={loading}
              />
            </div>

            {/* Availability toggle */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-white/70">
                Initial Availability <span className="text-[#e74c3c]" aria-hidden="true">*</span>
              </span>
              <div className="flex gap-3" role="group" aria-label="Availability status">
                <button
                  type="button"
                  onClick={() => set("availability")("available")}
                  className={`availability-option focus-ring ${form.availability === "available" ? "selected-available" : ""}`}
                  aria-pressed={form.availability === "available"}
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${form.availability === "available" ? "bg-green-400" : "bg-white/25"}`} aria-hidden="true" />
                    <span className={`text-sm font-semibold ${form.availability === "available" ? "text-green-400" : "text-white/40"}`}>Available</span>
                  </div>
                  <p className="text-[11px] text-white/30 leading-tight">Ready to donate</p>
                </button>
                <button
                  type="button"
                  onClick={() => set("availability")("unavailable")}
                  className={`availability-option focus-ring ${form.availability === "unavailable" ? "selected-unavailable" : ""}`}
                  aria-pressed={form.availability === "unavailable"}
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${form.availability === "unavailable" ? "bg-white/50" : "bg-white/20"}`} aria-hidden="true" />
                    <span className={`text-sm font-semibold ${form.availability === "unavailable" ? "text-white/70" : "text-white/30"}`}>Not Available</span>
                  </div>
                  <p className="text-[11px] text-white/30 leading-tight">Unavailable now</p>
                </button>
              </div>
              <p className="text-xs text-white/30">You can change this anytime from your donor dashboard.</p>
            </div>

            <div className="flex gap-3">
              <AuthButton type="button" onClick={prevStep} variant="secondary" fullWidth={false} id="donor-step2-back">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back
              </AuthButton>
              <AuthButton type="button" onClick={nextStep} fullWidth={false} id="donor-step2-next" className="flex-1">
                Continue
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </AuthButton>
            </div>
          </div>
        )}

        {/* ── Step 2: Account Security ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="mb-2">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest">Account Security</h2>
            </div>

            <PasswordInput
              id="donor-password"
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
              id="donor-confirm-password"
              label="Confirm Password"
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              error={errors.confirmPassword}
              autoComplete="new-password"
              required
              placeholder="Repeat your password"
              disabled={loading || success}
            />

            {/* Consent */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    id="donor-consent"
                    type="checkbox"
                    checked={form.consent}
                    onChange={set("consent")}
                    required
                    aria-describedby={errors.consent ? "donor-consent-error" : undefined}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded-md border transition-all duration-200 flex items-center justify-center ${
                      form.consent
                        ? "gradient-crimson border-[#c0392b]"
                        : "border-white/15 bg-white/03 group-hover:border-white/25"
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
                  and understand that my profile information, blood group, and approximate location are used to connect me with blood recipients.
                </span>
              </label>
              {errors.consent && (
                <p id="donor-consent-error" role="alert" className="text-xs text-red-400 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  {errors.consent}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <AuthButton type="button" onClick={prevStep} variant="secondary" fullWidth={false} id="donor-step3-back">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back
              </AuthButton>
              <AuthButton type="submit" loading={loading} disabled={success} fullWidth={false} id="donor-register-submit" className="flex-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M19 8v6M22 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Create Donor Account
              </AuthButton>
            </div>
          </div>
        )}
      </form>

      <p className="text-xs text-center text-white/25 mt-6">
        Already registered?{" "}
        <Link to="/login" className="text-white/40 hover:text-white/60 transition-colors underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
