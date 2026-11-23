import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  LogIn,
  Droplet,
  ShieldCheck,
  HeartHandshake,
  Search,
  Activity,
  ArrowRight,
  Radar,
  CheckCircle2,
  AlertCircle,
  Building2,
  Terminal,
  LockKeyhole,
} from "lucide-react";
import Input from "../../components/common/Input";
import Toast from "../../components/common/Toast";
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
  const [toastMessage, setToastMessage] = useState("");

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: "" }));
    }
    if (toastMessage) setToastMessage("");
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
    setToastMessage("");

    try {
      const response = await authService.login({
        email: formData.email,
        password: formData.password,
        role: selectedRole,
      });

      const user = response.user || response;
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
      setToastMessage(
        err.message || "Invalid login credentials"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const personaConfig = {
    [USER_ROLES.DONOR]: {
      tag: "VOLUNTARY DONOR",
      title: "Voluntary Donor",
      subtitle: "Emergency Dispatch & Proximity Acceptance",
      description: "Receive real-time notifications for compatible requests within 5-50 KM, manage availability, and accept hospital requests.",
      icon: HeartHandshake,
      accentColor: "crimson",
      activeBorder: "border-[#A61B2B]",
      activeBg: "bg-[#FEF2F2]",
      activeBadge: "bg-[#A61B2B] text-white",
      iconColor: "text-[#A61B2B]",
      placeholderEmail: "rahul.verma@example.in",
      btnText: "Sign In as Voluntary Donor",
    },
    [USER_ROLES.RECIPIENT]: {
      tag: "HOSPITAL RECIPIENT",
      title: "Hospital / Recipient",
      subtitle: "Requisitions & Discovery Radar",
      description: "Issue hospital blood requests, discover compatible donors across distance presets, and track real-time dispatches.",
      icon: Building2,
      accentColor: "blue",
      activeBorder: "border-[#315B83]",
      activeBg: "bg-[#F0F7FF]",
      activeBadge: "bg-[#315B83] text-white",
      iconColor: "text-[#315B83]",
      placeholderEmail: "priya.verma@example.in",
      btnText: "Sign In as Recipient",
    },
    [USER_ROLES.ADMIN]: {
      tag: "SYSTEM CONTROLLER",
      title: "Administrator",
      subtitle: "Audit Ledger & Governance",
      description: "Audit security logs, govern verified accounts, and monitor systemic blood dispatch telemetry.",
      icon: ShieldCheck,
      accentColor: "navy",
      activeBorder: "border-[#1E293B]",
      activeBg: "bg-[#F1F5F9]",
      activeBadge: "bg-[#1E293B] text-white",
      iconColor: "text-[#1E293B]",
      placeholderEmail: "admin@bloodward.com",
      btnText: "Sign In as Administrator",
    },
  };

  const activePersona = personaConfig[selectedRole];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />

      <div className="max-w-6xl w-full bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* LEFT COLUMN: HEALTHCARE PLATFORM TELEMETRY & SHOWCASE (5 cols) */}
        <div className="lg:col-span-5 bg-[#F8FAFC] border-b lg:border-b-0 lg:border-r border-[#E2E8F0] p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-8">
          {/* Top Brand & Eyebrow */}
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#A61B2B] text-xs font-semibold tracking-wide uppercase">
                <Droplet className="w-3.5 h-3.5 fill-current" />
                <span>BLOODWARD CLINICAL DISPATCH</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1E293B] tracking-tight leading-tight">
                Rapid Transfusion Coordination. When Seconds Count.
              </h2>
              <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                Enterprise healthcare platform connecting emergency hospital requisitions with verified voluntary blood donors through privacy-safe proximity matching.
              </p>
            </div>

            {/* Clinical Telemetry Monitor */}
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#E2E8F0] shadow-2xs space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] text-[11px] font-bold text-[#1E293B]">
                <span className="flex items-center gap-1.5 text-[#315B83]">
                  <Activity className="w-3.5 h-3.5 text-[#315B83]" />
                  PLATFORM SPECIFICATION
                </span>
                <span className="text-[#28734A] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#28734A] animate-pulse" />
                  OPERATIONAL
                </span>
              </div>

              <div className="space-y-2 text-[11px] text-[#475569]">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Proximity Engine:</span>
                  <span className="font-semibold text-[#1E293B]">Haversine Spherical</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Preset Horizons:</span>
                  <span className="font-semibold text-[#A61B2B]">5 · 10 · 20 · 30 · 50 KM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Donor Privacy:</span>
                  <span className="font-semibold text-[#28734A]">~500m Centroid Offset</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Session Protection:</span>
                  <span className="font-semibold text-[#315B83]">HttpOnly Cookie Auth</span>
                </div>
              </div>
            </div>

            {/* 3 Micro Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0]">
                <span className="block text-base font-bold text-[#A61B2B]">100%</span>
                <span className="text-[10px] text-[#64748B] font-medium leading-tight block">RBC Matched</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0]">
                <span className="block text-base font-bold text-[#315B83]">&lt;20ms</span>
                <span className="text-[10px] text-[#64748B] font-medium leading-tight block">Socket Sync</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-[#E2E8F0]">
                <span className="block text-base font-bold text-[#28734A]">Shielded</span>
                <span className="text-[10px] text-[#64748B] font-medium leading-tight block">Gated Contacts</span>
              </div>
            </div>
          </div>

          {/* Institutional Notice */}
          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
            <span>HEALTHCARE GOVERNANCE</span>
            <span className="font-bold text-[#1E293B]">SEC-AUTH v2.4</span>
          </div>
        </div>

        {/* RIGHT COLUMN: WORKSPACE SIGN-IN DESK (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#315B83] flex items-center gap-1.5">
                <LockKeyhole className="w-3.5 h-3.5" />
                SECURE WORKSPACE GATEWAY
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B] tracking-tight">
                Sign In to Your Workspace
              </h1>
              <p className="text-xs sm:text-sm text-[#475569]">
                Select your clinical role persona to access your operational dashboard.
              </p>
            </div>

            {/* REIMAGINED ROLE PERSONA COMMAND DECK */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#1E293B] uppercase tracking-wider">
                Select Operational Persona:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {Object.entries(personaConfig).map(([roleKey, cfg]) => {
                  const isSelected = selectedRole === roleKey;
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={roleKey}
                      type="button"
                      onClick={() => {
                        setSelectedRole(roleKey);
                        setToastMessage("");
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? `${cfg.activeBg} ${cfg.activeBorder} shadow-xs ring-1 ${cfg.activeBorder}`
                          : "bg-white hover:bg-[#F8FAFC] border-[#E2E8F0] text-[#1E293B]"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Icon className={`w-4 h-4 ${isSelected ? cfg.iconColor : "text-[#64748B]"}`} />
                        {isSelected && (
                          <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${cfg.activeBadge}`}>
                            Active
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="text-xs font-bold text-[#1E293B] leading-tight">
                          {cfg.title}
                        </div>
                        <div className="text-[10px] text-[#64748B] mt-0.5 leading-tight font-sans">
                          {cfg.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="space-y-3.5">
                <Input
                  label="Email Identifier"
                  id="email"
                  type="email"
                  placeholder={activePersona.placeholderEmail}
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
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  icon={Lock}
                  required
                />

                <div className="flex justify-end -mt-1">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-[#315B83] hover:text-[#1E293B] hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                variant={selectedRole === USER_ROLES.DONOR ? "primary" : selectedRole === USER_ROLES.RECIPIENT ? "secondary" : "navy"}
                className="w-full py-2.5 mt-2 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                isLoading={isLoading}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{activePersona.btnText} →</span>
              </Button>
            </form>
          </div>

          {/* DUAL REGISTRATION ONBOARDING GATEWAYS */}
          <div className="pt-5 border-t border-[#E2E8F0] space-y-3">
            <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Need a new verified account?
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                to="/register/donor"
                className="p-3 rounded-xl border border-[#E2E8F0] hover:border-[#A61B2B] bg-[#F8FAFC] hover:bg-[#FEF2F2] transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-[#1E293B] group-hover:text-[#A61B2B] flex items-center gap-1.5 transition-colors">
                    <HeartHandshake className="w-3.5 h-3.5 text-[#A61B2B]" />
                    Register as Donor
                  </div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">
                    Join voluntary donor registry
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#A61B2B] group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                to="/register/recipient"
                className="p-3 rounded-xl border border-[#E2E8F0] hover:border-[#315B83] bg-[#F8FAFC] hover:bg-[#F0F7FF] transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-[#1E293B] group-hover:text-[#315B83] flex items-center gap-1.5 transition-colors">
                    <Building2 className="w-3.5 h-3.5 text-[#315B83]" />
                    Register as Recipient
                  </div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">
                    Issue hospital requisitions
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#315B83] group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
