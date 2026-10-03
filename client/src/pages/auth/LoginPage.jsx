import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  LogIn,
  Droplet,
  AlertCircle,
  ShieldCheck,
  HeartHandshake,
  Search,
  Activity,
} from "lucide-react";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { USER_ROLES } from "../../constants/theme";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState(USER_ROLES.DONOR);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: "" }));
    }
    if (serverError) setServerError("");
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = "Email address is required.";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    if (!formData.password) {
      newErrors.password = "Password is required.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setServerError("");

    try {
      const user = await authService.login(formData.email, formData.password);
      login(user);

      if (user.role === USER_ROLES.DONOR) {
        navigate("/donor");
      } else if (user.role === USER_ROLES.RECIPIENT) {
        navigate("/recipient");
      } else if (user.role === USER_ROLES.ADMIN) {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setServerError(
        err.message || "Failed to sign in. Please verify your email and password."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

        {/* LEFT BRAND PANEL */}
        <div className="lg:col-span-5 bg-slate-950 text-white p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
                  <Droplet className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <span className="text-xl font-extrabold tracking-tight">
                    Blood<span className="text-red-500">Ward</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase block -mt-1">
                    Emergency Network
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed pt-2 font-light">
                Rapid emergency blood matching platform connecting urgent recipients with nearby verified donors instantly.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 shrink-0 mt-0.5">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Instant Emergency Match</h4>
                  <p className="text-xs text-slate-400">Socket.io alerts notify available donors in radius instantly.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Privacy Protected</h4>
                  <p className="text-xs text-slate-400">Donor contact details are shielded until a request is accepted.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Role-Based Workflows</h4>
                  <p className="text-xs text-slate-400">Clear, tailored dashboards for Donors, Recipients, and Admins.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Secure Authentication Portal</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> System Active
            </span>
          </div>
        </div>

        {/* RIGHT FORM PANEL */}
        <div className="lg:col-span-7 bg-theme-card p-8 sm:p-10 rounded-3xl border border-theme shadow-xl flex flex-col justify-between transition-colors">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-theme-primary tracking-tight">
                Welcome Back
              </h2>
              <p className="text-xs text-theme-muted mt-1">
                {selectedRole === USER_ROLES.DONOR && "Sign in as Donor to manage availability and view blood requests."}
                {selectedRole === USER_ROLES.RECIPIENT && "Sign in as Recipient to search donors and issue emergency requests."}
                {selectedRole === USER_ROLES.ADMIN && "Sign in as Admin to manage users and inspect system audit logs."}
              </p>
            </div>

            <div className="bg-theme-subtle p-1.5 rounded-2xl flex items-center gap-1.5 border border-theme">
              <button
                type="button"
                onClick={() => setSelectedRole(USER_ROLES.DONOR)}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedRole === USER_ROLES.DONOR
                    ? "bg-red-600 text-white shadow-md"
                    : "text-theme-secondary hover:text-theme-primary hover:bg-theme-hover"
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                Donor
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole(USER_ROLES.RECIPIENT)}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedRole === USER_ROLES.RECIPIENT
                    ? "bg-red-600 text-white shadow-md"
                    : "text-theme-secondary hover:text-theme-primary hover:bg-theme-hover"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                Recipient
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole(USER_ROLES.ADMIN)}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedRole === USER_ROLES.ADMIN
                    ? "bg-slate-900 text-white shadow-md"
                    : "text-theme-secondary hover:text-theme-primary hover:bg-theme-hover"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin
              </button>
            </div>

            {serverError && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Authentication Error</p>
                  <p>{serverError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                id="email"
                type="email"
                placeholder={
                  selectedRole === USER_ROLES.DONOR
                    ? "donor@example.com"
                    : selectedRole === USER_ROLES.RECIPIENT
                    ? "recipient@example.com"
                    : "admin@bloodward.org"
                }
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                icon={Mail}
                required
              />

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

              <Button
                type="submit"
                variant={selectedRole === USER_ROLES.ADMIN ? "secondary" : "primary"}
                className="w-full py-3 mt-2 shadow-md font-bold"
                isLoading={isLoading}
              >
                <LogIn className="w-4 h-4 mr-1.5" />
                Sign In as {selectedRole === USER_ROLES.DONOR ? "Donor" : selectedRole === USER_ROLES.RECIPIENT ? "Recipient" : "Admin"}
              </Button>
            </form>
          </div>

          <div className="pt-6 mt-6 border-t border-theme text-center space-y-2 text-xs">
            <p className="text-theme-muted">Need a new BloodWard account?</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/register/donor"
                className="text-red-600 dark:text-red-400 font-bold hover:underline inline-flex items-center gap-1"
              >
                Register as Donor
              </Link>
              <span className="hidden sm:inline text-theme-muted">•</span>
              <Link
                to="/register/recipient"
                className="text-theme-primary font-bold hover:underline inline-flex items-center gap-1"
              >
                Register as Recipient
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
