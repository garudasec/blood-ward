import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  Search,
  Droplet,
  HeartHandshake,
  ShieldCheck,
  Activity,
  AlertCircle,
} from "lucide-react";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import Button from "../../components/common/Button";
import { GENDER_OPTIONS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { INDIA_STATES_AND_CITIES, INDIAN_STATES_LIST } from "../../constants/indiaLocations";

export default function RecipientRegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    gender: "",
    state: "",
    location: "",
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverNotice, setServerNotice] = useState("");

  const handleChange = (e) => {
    const { id, value } = e.target;

    if (id === "state") {
      setFormData((prev) => ({
        ...prev,
        state: value,
        location: "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [id]: value,
      }));
    }

    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: "" }));
    }
    if (serverNotice) setServerNotice("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = "Full Name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Valid email address required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[0-9+\-\s()]{8,15}$/.test(formData.phone)) {
      newErrors.phone = "Enter a valid phone number";
    }

    if (!formData.state) newErrors.state = "State / UT selection is required";
    if (!formData.location) newErrors.location = "City selection is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setServerNotice("");
    try {
      const res = await authService.registerRecipient({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        gender: formData.gender,
        state: formData.state,
        city: formData.location,
      });

      if (res && res.user) {
        login(res.user);
        navigate("/recipient");
      } else {
        navigate("/login");
      }
    } catch (err) {
      console.error("Recipient Registration Error:", err);
      setServerNotice(err.message || "Failed to complete recipient registration.");
    } finally {
      setIsLoading(false);
    }
  };

  const cityOptions = formData.state && INDIA_STATES_AND_CITIES[formData.state]
    ? INDIA_STATES_AND_CITIES[formData.state]
    : [];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

        {/* LEFT BRAND PANEL */}
        <div className="lg:col-span-5 bg-slate-950 text-white p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                  <Droplet className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <span className="text-xl font-extrabold tracking-tight">
                    Blood<span className="text-blue-400">Ward</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase block -mt-1">
                    Emergency Network
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed pt-2 font-light">
                Find available voluntary blood donors near your hospital and broadcast emergency requests in real time.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 shrink-0 mt-0.5">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Radius Search</h4>
                  <p className="text-xs text-slate-400">Locate available blood donors within 2 km to 20 km.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Emergency Request Broadcast</h4>
                  <p className="text-xs text-slate-400">Instantly notify matching donors in your vicinity via live alerts.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Secure Coordination</h4>
                  <p className="text-xs text-slate-400">Contact details are securely shared once a donor accepts.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Recipient Registration</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Network Active
            </span>
          </div>
        </div>

        {/* RIGHT FORM PANEL */}
        <div className="lg:col-span-7 bg-theme-card p-8 sm:p-10 rounded-3xl border border-theme shadow-xl flex flex-col justify-between transition-colors">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-theme-primary tracking-tight">
                Create an Account
              </h2>
              <p className="text-xs text-theme-muted mt-1">
                Register as a Blood Recipient to search donors and issue urgent blood requests.
              </p>
            </div>

            {/* Role Switcher Tabs */}
            <div className="bg-theme-subtle p-1.5 rounded-2xl flex items-center gap-1.5 border border-theme">
              <button
                type="button"
                onClick={() => navigate("/register/donor")}
                className="flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 text-theme-secondary hover:text-theme-primary hover:bg-theme-hover cursor-pointer"
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                Donor
              </button>

              <button
                type="button"
                className="flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 bg-red-600 text-white shadow-md cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                Recipient
              </button>
            </div>

            {serverNotice && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>{serverNotice}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  id="fullName"
                  placeholder="Jane Smith"
                  value={formData.fullName}
                  onChange={handleChange}
                  error={errors.fullName}
                  icon={User}
                  required
                />

                <Input
                  label="Email Address"
                  id="email"
                  type="email"
                  placeholder="recipient@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  icon={Mail}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Password"
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  icon={Lock}
                  required
                />

                <Input
                  label="Confirm Password"
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={errors.confirmPassword}
                  icon={Lock}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Phone Number"
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                  error={errors.phone}
                  icon={Phone}
                  required
                />

                <Select
                  label="Gender"
                  id="gender"
                  options={GENDER_OPTIONS}
                  value={formData.gender}
                  onChange={handleChange}
                  error={errors.gender}
                  placeholder="Select Gender"
                  icon={User}
                />
              </div>

              {/* Dependent State & City Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="State / UT"
                  id="state"
                  options={INDIAN_STATES_LIST}
                  value={formData.state}
                  onChange={handleChange}
                  error={errors.state}
                  placeholder="Select State / UT"
                  icon={MapPin}
                  required
                />

                <Select
                  label="City"
                  id="location"
                  options={cityOptions}
                  value={formData.location}
                  onChange={handleChange}
                  error={errors.location}
                  placeholder={formData.state ? "Select City" : "Select State First"}
                  disabled={!formData.state}
                  icon={MapPin}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 mt-4 font-bold shadow-md"
                isLoading={isLoading}
              >
                Create Recipient Account
              </Button>
            </form>
          </div>

          <div className="pt-6 mt-6 border-t border-theme text-center text-xs text-theme-muted">
            Already have a Recipient account?{" "}
            <Link to="/login" className="text-red-600 dark:text-red-400 font-bold hover:underline">
              Sign In here
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
