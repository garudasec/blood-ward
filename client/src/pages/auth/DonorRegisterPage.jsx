import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Phone,
  Droplet,
  MapPin,
  HeartHandshake,
  AlertCircle,
  CheckCircle2,
  Search,
  ShieldCheck,
  Calendar,
  Scale,
  Pill,
  Heart,
  Clock,
  FileText,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import Button from "../../components/common/Button";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import EmailVerificationSection from "../../components/auth/EmailVerificationSection";
import { BLOOD_GROUPS, GENDER_OPTIONS } from "../../constants/theme";
import { INDIA_STATES_AND_CITIES, INDIAN_STATES_LIST } from "../../constants/indiaLocations";

const STAGES = [
  { id: 1, title: "Personal Info", subtitle: "Identity & credentials" },
  { id: 2, title: "Blood & Location", subtitle: "Blood group & city" },
  { id: 3, title: "Health Screening", subtitle: "Self-reported questionnaire" },
  { id: 4, title: "Safety Policy", subtitle: "Clinical disclaimer" },
  { id: 5, title: "Review & Submit", subtitle: "Availability & register" },
];

const isDateInFuture = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr).getTime();
  return !isNaN(d) && d > Date.now();
};

export default function DonorRegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [currentStage, setCurrentStage] = useState(1);

  const [formData, setFormData] = useState({
    // Stage 1: Personal Information
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    gender: "",
    dateOfBirth: "",

    // Stage 2: Blood Group & Location
    bloodGroup: "",
    state: "",
    city: "",
    pincode: "",

    // Stage 3: Health Questionnaire (Inline)
    currentWeight: "",
    medicalConditions: "",
    medications: "",
    recentIllnessOrFever: false,
    recentSurgery: false,
    previousDonation: false,
    lastDonationDate: "",
    additionalNotes: "",

    // Stage 5: Availability
    isAvailable: true,
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverNotice, setServerNotice] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;

    if (id === "email") {
      if (isEmailVerified || verifiedEmail) {
        setIsEmailVerified(false);
        setVerifiedEmail("");
      }
    }

    if (id === "phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, phone: digitsOnly }));
    } else if (id === "state") {
      setFormData((prev) => ({
        ...prev,
        state: value,
        city: "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [id]: type === "checkbox" ? checked : value,
      }));
    }

    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: "" }));
    }
    if (serverNotice) setServerNotice("");
  };

  // Validates a specific stage before allowing user to advance to the next stage
  const validateStage = (stage) => {
    const newErrors = {};

    if (stage === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
      const cleanEmail = formData.email.trim().toLowerCase();
      if (!cleanEmail) {
        newErrors.email = "Email address is required";
      } else if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
        newErrors.email = "Enter a valid email address";
      } else if (!isEmailVerified || !verifiedEmail || cleanEmail !== verifiedEmail.toLowerCase()) {
        newErrors.email = "Email verification is mandatory. Please verify your email with the 6-digit verification code before proceeding.";
      }

      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }

      const cleanPhone = formData.phone.trim();
      if (!cleanPhone) {
        newErrors.phone = "10-digit mobile number is required";
      } else if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        newErrors.phone = "Enter a valid 10-digit Indian mobile number (starts with 6-9)";
      }

      // Date of Birth is mandatory (minimum 18 years of age)
      if (!formData.dateOfBirth) {
        newErrors.dateOfBirth = "Date of birth is required";
      } else {
        const dobDate = new Date(formData.dateOfBirth);
        if (isNaN(dobDate.getTime())) {
          newErrors.dateOfBirth = "Please enter a valid date of birth";
        } else if (isDateInFuture(formData.dateOfBirth)) {
          newErrors.dateOfBirth = "Date of birth cannot be in the future";
        } else {
          const today = new Date();
          let age = today.getFullYear() - dobDate.getFullYear();
          const m = today.getMonth() - dobDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
            age--;
          }
          if (age < 18) {
            newErrors.dateOfBirth = "Voluntary donors must be at least 18 years of age";
          }
        }
      }
    } else if (stage === 2) {
      if (!formData.bloodGroup) newErrors.bloodGroup = "Blood group selection is required";
      if (!formData.state) newErrors.state = "State / UT selection is required";
      if (!formData.city) newErrors.city = "City selection is required";
    } else if (stage === 3) {
      if (formData.currentWeight !== "" && formData.currentWeight !== null && formData.currentWeight !== undefined) {
        const weightNum = Number(formData.currentWeight);
        if (isNaN(weightNum) || weightNum < 20 || weightNum > 300) {
          newErrors.currentWeight = "Please enter a valid weight between 20 kg and 300 kg";
        }
      }

      if (formData.previousDonation && formData.lastDonationDate) {
        if (isNaN(new Date(formData.lastDonationDate).getTime())) {
          newErrors.lastDonationDate = "Enter a valid date";
        } else if (isDateInFuture(formData.lastDonationDate)) {
          newErrors.lastDonationDate = "Last donation date cannot be in the future";
        }
      }
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  // Comprehensive validation across all stages before submission
  const validateForm = () => {
    const s1 = validateStage(1);
    const s2 = validateStage(2);
    const s3 = validateStage(3);
    return s1 && s2 && s3;
  };

  const handleNext = (e) => {
    if (e) e.preventDefault();
    const cleanEmail = formData.email.trim().toLowerCase();
    if (currentStage === 1 && (!isEmailVerified || !verifiedEmail || cleanEmail !== verifiedEmail.toLowerCase())) {
      setErrors((prev) => ({
        ...prev,
        email: "Email verification is mandatory. Please verify your email before proceeding to the next step.",
      }));
      setServerNotice("Email verification is mandatory. Please verify your email with the 6-digit OTP code before proceeding to the next step.");
      return;
    }
    if (validateStage(currentStage)) {
      setServerNotice("");
      setCurrentStage((prev) => Math.min(prev + 1, 5));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setServerNotice("Please resolve the highlighted fields before proceeding.");
    }
  };

  const handlePrev = (e) => {
    if (e) e.preventDefault();
    setServerNotice("");
    setCurrentStage((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStageClick = (targetStage) => {
    if (targetStage < currentStage) {
      setServerNotice("");
      setCurrentStage(targetStage);
    } else if (targetStage === currentStage) {
      // already on current stage
    } else {
      // Email verification is mandatory before proceeding beyond stage 1
      const cleanEmail = formData.email.trim().toLowerCase();
      if (!isEmailVerified || !verifiedEmail || cleanEmail !== verifiedEmail.toLowerCase()) {
        setServerNotice("Email verification is mandatory. Please verify your email before proceeding to subsequent registration steps.");
        setCurrentStage(1);
        return;
      }

      // verify preceding stages before allowing forward jump
      let canAdvance = true;
      for (let s = 1; s < targetStage; s++) {
        if (!validateStage(s)) {
          canAdvance = false;
          setCurrentStage(s);
          setServerNotice(`Please complete Stage ${s} before skipping ahead.`);
          break;
        }
      }
      if (canAdvance) {
        setServerNotice("");
        setCurrentStage(targetStage);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = formData.email.trim().toLowerCase();
    if (!isEmailVerified || !verifiedEmail || cleanEmail !== verifiedEmail.toLowerCase()) {
      setServerNotice("Email verification is mandatory. Please verify your email before submitting registration.");
      setCurrentStage(1);
      return;
    }

    if (!validateForm()) {
      setServerNotice("Please resolve the highlighted validation errors before submitting.");
      // Navigate to the first stage with errors
      if (!validateStage(1)) setCurrentStage(1);
      else if (!validateStage(2)) setCurrentStage(2);
      else if (!validateStage(3)) setCurrentStage(3);
      return;
    }

    setIsLoading(true);
    setServerNotice("");

    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        bloodGroup: formData.bloodGroup,
        state: formData.state,
        city: formData.city,
        pincode: formData.pincode.trim(),
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        availability: formData.isAvailable ? "available" : "not_available",
        healthQuestionnaire: {
          currentWeight: formData.currentWeight ? Number(formData.currentWeight) : null,
          medicalConditions: formData.medicalConditions.trim(),
          medications: formData.medications.trim(),
          recentIllnessOrFever: Boolean(formData.recentIllnessOrFever),
          recentSurgery: Boolean(formData.recentSurgery),
          previousDonation: Boolean(formData.previousDonation),
          lastDonationDate: formData.previousDonation ? formData.lastDonationDate : "",
          additionalNotes: formData.additionalNotes.trim(),
        },
      };

      const res = await authService.registerDonor(payload);

      if (res && res.user) {
        login(res.user);
        navigate("/donor");
      } else {
        navigate("/login");
      }
    } catch (err) {
      console.error("Donor Registration Error:", err);
      setServerNotice(err.message || "Failed to complete donor registration.");
    } finally {
      setIsLoading(false);
    }
  };

  const cityOptions = formData.state && INDIA_STATES_AND_CITIES[formData.state]
    ? INDIA_STATES_AND_CITIES[formData.state]
    : [];

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-10 px-3 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

        {/* LEFT BRAND PANEL & STAGE PROGRESS SIDEBAR */}
        <div className="lg:col-span-4 xl:col-span-3.5 bg-white dark:bg-zinc-900 text-[#1E293B] dark:text-zinc-100 p-4 sm:p-6 rounded-2xl border border-[#E2E8F0] dark:border-zinc-800 flex flex-col justify-between shadow-xs static lg:sticky lg:top-20 space-y-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FEF2F2] dark:bg-rose-950/40 border border-[#FECACA] dark:border-rose-900/50 text-[#A61B2B] dark:text-rose-300 text-xs font-semibold">
                <Droplet className="w-3.5 h-3.5 fill-current" />
                <span>Voluntary Donor Registry</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#1E293B] dark:text-white">
                Proximity Dispatch Network
              </h1>
              <p className="text-xs text-[#475569] dark:text-zinc-400 leading-relaxed">
                Register as a voluntary donor. Receive real-time proximity alerts when local hospitals need your compatible blood group.
              </p>
            </div>

            {/* Registration Progress Guide */}
            <div className="space-y-1.5 pt-4 border-t border-[#E2E8F0] dark:border-zinc-800 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-zinc-400 block mb-1">
                Registration Journey
              </span>
              {STAGES.map((stg) => {
                const isActive = currentStage === stg.id;
                const isCompleted = currentStage > stg.id;
                return (
                  <button
                    key={stg.id}
                    type="button"
                    onClick={() => handleStageClick(stg.id)}
                    className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#FEF2F2] dark:bg-rose-950/40 border border-[#FECACA] dark:border-rose-900/50"
                        : "hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 transition-colors ${
                        isCompleted
                          ? "bg-[#28734A] text-white"
                          : isActive
                          ? "bg-[#A61B2B] text-white"
                          : "bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                      }`}
                    >
                      {isCompleted ? <Check className="w-3 h-3 text-white" /> : stg.id}
                    </span>
                    <div className="min-w-0">
                      <strong
                        className={`block text-xs leading-tight ${
                          isActive
                            ? "text-[#A61B2B] dark:text-rose-300 font-bold"
                            : isCompleted
                            ? "text-[#1E293B] dark:text-white font-semibold"
                            : "text-[#64748B] dark:text-zinc-400 font-medium"
                        }`}
                      >
                        {stg.title}
                      </strong>
                      <span className="text-[#64748B] dark:text-zinc-400 text-[11px] block truncate">
                        {stg.subtitle}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Privacy Shield Notice */}
            <div className="p-3 rounded-xl bg-[#F0FDF4] dark:bg-emerald-950/30 border border-[#BBF7D0] dark:border-emerald-800/50 space-y-1">
              <div className="flex items-center gap-1.5 text-[#166534] dark:text-emerald-300 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4 text-[#28734A] dark:text-emerald-400 shrink-0" />
                <span>Protected Identity</span>
              </div>
              <p className="text-[11px] text-[#28734A] dark:text-emerald-300 leading-relaxed">
                Contact details stay private until you accept a request. Residential coordinates are coarsened by ~500m on discovery maps.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] dark:border-zinc-800 text-[11px] text-[#64748B] dark:text-zinc-400 flex items-center justify-between">
            <span>Healthcare Standard</span>
            <span className="text-[#28734A] font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#28734A] animate-pulse" /> Verified Registry
            </span>
          </div>
        </div>

        {/* RIGHT FORM PANEL */}
        <div className="lg:col-span-8 xl:col-span-8.5 bg-white dark:bg-zinc-900 p-4 sm:p-6 md:p-8 rounded-2xl border border-[#E2E8F0] dark:border-zinc-800 shadow-xs space-y-5 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-[#E2E8F0] dark:border-zinc-800">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white tracking-tight">
                Create Voluntary Donor Account
              </h2>
              <p className="text-xs text-[#475569] dark:text-zinc-400 mt-0.5">
                Complete your verified registration journey with full medical confidentiality.
              </p>
            </div>

            {/* Role Switcher Tabs */}
            <div className="bg-[#F8FAFC] dark:bg-zinc-800/60 p-1 rounded-lg grid grid-cols-2 sm:flex sm:items-center gap-1 border border-[#E2E8F0] dark:border-zinc-700 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                className="py-1.5 px-2.5 sm:px-3 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 bg-[#A61B2B] text-white cursor-default shadow-xs"
              >
                <HeartHandshake className="w-3.5 h-3.5 shrink-0" />
                <span>Donor</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/register/recipient")}
                className="py-1.5 px-2.5 sm:px-3 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 text-[#475569] dark:text-zinc-300 hover:text-[#1E293B] dark:hover:text-white cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span>Recipient Portal</span>
              </button>
            </div>
          </div>

          {/* Compact Step Progress Bar */}
          <div className="flex items-center justify-between py-2 px-2.5 sm:px-3 rounded-xl bg-[#F8FAFC] dark:bg-zinc-800/50 border border-[#E2E8F0] dark:border-zinc-800 text-xs gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="w-5 h-5 rounded-full bg-[#A61B2B] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                {currentStage}
              </span>
              <span className="font-bold text-[#1E293B] dark:text-white shrink-0 text-xs">
                Stage {currentStage}/5:
              </span>
              <span className="text-[#A61B2B] dark:text-rose-300 font-semibold truncate text-xs">
                {STAGES[currentStage - 1].title}
              </span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {STAGES.map((stg) => (
                <button
                  key={stg.id}
                  type="button"
                  onClick={() => handleStageClick(stg.id)}
                  title={`Stage ${stg.id}: ${stg.title}`}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    currentStage === stg.id
                      ? "bg-[#A61B2B] w-5 sm:w-7"
                      : currentStage > stg.id
                      ? "bg-[#28734A] w-2.5 sm:w-3"
                      : "bg-slate-200 dark:bg-zinc-700 w-2.5 sm:w-3"
                  }`}
                />
              ))}
            </div>
          </div>

          {serverNotice && (
            <div className="p-3.5 rounded-lg bg-[#FEF2F2] dark:bg-rose-950/40 border border-[#FECACA] dark:border-rose-900/50 text-[#991B1B] dark:text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#A61B2B] dark:text-rose-400 shrink-0 mt-0.5" />
              <p>{serverNotice}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ======================================================= */}
            {/* STAGE 1: PERSONAL INFORMATION */}
            {/* ======================================================= */}
            {currentStage === 1 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0] dark:border-zinc-800">
                  <span className="w-6 h-6 rounded-full bg-[#A61B2B] text-white text-xs font-bold flex items-center justify-center">1</span>
                  <div>
                    <h3 className="text-sm font-bold text-[#1E293B] dark:text-white">
                      Personal Information & Credentials
                    </h3>
                    <p className="text-[11px] text-[#64748B] dark:text-zinc-400">
                      Basic identification details for your voluntary donor profile.
                    </p>
                  </div>
                </div>

                {/* ROW 1: TWO EQUAL COLUMNS (Full Name | Email Address) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 items-start">
                  <div>
                    <Input
                      label="Full Name"
                      id="fullName"
                      placeholder="e.g. Rahul Verma"
                      value={formData.fullName}
                      onChange={handleChange}
                      error={errors.fullName}
                      icon={User}
                      required
                    />
                    <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-[#64748B] dark:text-zinc-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Legal identity as per government ID</span>
                    </div>
                  </div>

                  <div>
                    <Input
                      label="Email Address"
                      id="email"
                      type="email"
                      placeholder="e.g. rahul.verma@example.in"
                      value={formData.email}
                      onChange={handleChange}
                      error={errors.email}
                      icon={Mail}
                      required
                    />
                    <EmailVerificationSection
                      email={formData.email}
                      isVerified={isEmailVerified}
                      setIsVerified={setIsEmailVerified}
                      verifiedEmail={verifiedEmail}
                      setVerifiedEmail={setVerifiedEmail}
                      accentColor="blood"
                    />
                  </div>
                </div>

                {/* ROW 2: TWO EQUAL COLUMNS (Password | Confirm Password) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
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

                  <Input
                    label="Confirm Password"
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    icon={Lock}
                    required
                  />
                </div>

                {/* ROW 3: THREE EQUAL COLUMNS (Phone Number | Gender | Date of Birth) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                  <div>
                    <Input
                      label="Phone Number"
                      id="phone"
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={handleChange}
                      error={errors.phone}
                      icon={Phone}
                      required
                      maxLength={10}
                    />
                  </div>

                  <Select
                    label="Gender (Optional)"
                    id="gender"
                    options={GENDER_OPTIONS}
                    value={formData.gender}
                    onChange={handleChange}
                    error={errors.gender}
                  />

                  <Input
                    label="Date of Birth"
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    error={errors.dateOfBirth}
                    icon={Calendar}
                    required
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>

                {/* Navigation Button */}
                <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[#E2E8F0] dark:border-zinc-800">
                  {!isEmailVerified ? (
                    <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>Email verification is required to unlock the next step</span>
                    </div>
                  ) : (
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span>Email verified &mdash; click next to proceed</span>
                    </div>
                  )}
                  <div className="sm:ml-auto">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleNext}
                      disabled={!isEmailVerified || !verifiedEmail || formData.email.trim().toLowerCase() !== verifiedEmail.toLowerCase()}
                      className="w-full sm:w-auto font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>Next: Blood Group & Location</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================= */}
            {/* STAGE 2: BLOOD GROUP & GEOGRAPHIC LOCATION */}
            {/* ======================================================= */}
            {currentStage === 2 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0] dark:border-zinc-800">
                  <span className="w-6 h-6 rounded-full bg-[#A61B2B] text-white text-xs font-bold flex items-center justify-center">2</span>
                  <div>
                    <h3 className="text-sm font-bold text-[#1E293B] dark:text-white">
                      Blood Group & Geographic Anchoring
                    </h3>
                    <p className="text-[11px] text-[#64748B] dark:text-zinc-400">
                      Essential for RBC compatibility matching and proximity alert boundaries.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Blood Group"
                    id="bloodGroup"
                    options={BLOOD_GROUPS}
                    value={formData.bloodGroup}
                    onChange={handleChange}
                    error={errors.bloodGroup}
                    required
                  />

                  <Select
                    label="State / Union Territory"
                    id="state"
                    options={INDIAN_STATES_LIST}
                    value={formData.state}
                    onChange={handleChange}
                    error={errors.state}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="City"
                    id="city"
                    options={cityOptions}
                    value={formData.city}
                    onChange={handleChange}
                    error={errors.city}
                    disabled={!formData.state}
                    required
                  />

                  <Input
                    label="Postal Pincode (Optional)"
                    id="pincode"
                    placeholder="e.g. 560001"
                    value={formData.pincode}
                    onChange={handleChange}
                    error={errors.pincode}
                    icon={MapPin}
                    maxLength={6}
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-[#F0F7FF] dark:bg-blue-950/30 border border-[#BFDBFE] dark:border-blue-900/50 text-xs text-[#1E40AF] dark:text-blue-200">
                  <strong>Proximity Matching Note:</strong> Your registered city anchors the spherical Haversine dispatch radius [5..50 KM]. Map markers coarsen coordinates by ~500m to preserve residential privacy.
                </div>

                {/* Navigation Buttons */}
                <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[#E2E8F0] dark:border-zinc-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrev}
                    className="w-full sm:w-auto font-medium text-xs flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Previous: Personal Info</span>
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleNext}
                    className="w-full sm:w-auto font-semibold text-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Next: Health Screening</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ======================================================= */}
            {/* STAGE 3: SELF-REPORTED HEALTH QUESTIONNAIRE */}
            {/* ======================================================= */}
            {currentStage === 3 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0] dark:border-zinc-800">
                  <span className="w-6 h-6 rounded-full bg-[#A61B2B] text-white text-xs font-bold flex items-center justify-center">3</span>
                  <div>
                    <h3 className="text-sm font-bold text-[#1E293B] dark:text-white">
                      Self-Reported Health Questionnaire
                    </h3>
                    <p className="text-[11px] text-[#64748B] dark:text-zinc-400">
                      Preliminary screening metrics to assess donor readiness before alert dispatch.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Current Weight (kg) - Optional"
                      id="currentWeight"
                      type="number"
                      placeholder="e.g. 68"
                      min="20"
                      max="300"
                      value={formData.currentWeight}
                      onChange={handleChange}
                      error={errors.currentWeight}
                      icon={Scale}
                    />

                    {/* Weight Screening Advisory Note */}
                    {formData.currentWeight && Number(formData.currentWeight) < 45 && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-start gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>Standard whole blood donation guidelines recommend ≥ 45 kg. Preliminary self-reported response; formal clinical clearance occurs at the donation facility.</span>
                      </p>
                    )}
                    {formData.currentWeight && Number(formData.currentWeight) >= 45 && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                        <span>Preliminary screening weight meets ≥ 45 kg standard. (Does not certify medical eligibility; final clearance is verified on-site).</span>
                      </p>
                    )}
                  </div>

                  <Input
                    label="Current Medications (if any)"
                    id="medications"
                    placeholder="e.g. None / Multivitamins"
                    value={formData.medications}
                    onChange={handleChange}
                    error={errors.medications}
                    icon={Pill}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <Input
                    label="Relevant Medical Conditions / History"
                    id="medicalConditions"
                    placeholder="e.g. None / Mild asthma / Hypertension under control"
                    value={formData.medicalConditions}
                    onChange={handleChange}
                    error={errors.medicalConditions}
                    icon={Heart}
                  />
                </div>

                {/* Health Checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-zinc-800/50 border border-[#E2E8F0] dark:border-zinc-700/80 flex items-center justify-between">
                    <div className="pr-2">
                      <label htmlFor="recentIllnessOrFever" className="text-xs font-semibold text-[#1E293B] dark:text-zinc-200 cursor-pointer block">
                        Recent Illness / Fever (past 14 days)
                      </label>
                      <span className="text-[11px] text-[#64748B] dark:text-zinc-400">
                        Cold, viral infection, active fever.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      id="recentIllnessOrFever"
                      checked={formData.recentIllnessOrFever}
                      onChange={handleChange}
                      className="w-4 h-4 text-[#A61B2B] rounded border-[#CBD5E1] dark:border-zinc-700 cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-zinc-800/50 border border-[#E2E8F0] dark:border-zinc-700/80 flex items-center justify-between">
                    <div className="pr-2">
                      <label htmlFor="recentSurgery" className="text-xs font-semibold text-[#1E293B] dark:text-zinc-200 cursor-pointer block">
                        Recent Surgery (past 6 months)
                      </label>
                      <span className="text-[11px] text-[#64748B] dark:text-zinc-400">
                        Major or minor surgical procedure.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      id="recentSurgery"
                      checked={formData.recentSurgery}
                      onChange={handleChange}
                      className="w-4 h-4 text-[#A61B2B] rounded border-[#CBD5E1] dark:border-zinc-700 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Prior donation and conditional date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-zinc-800/50 border border-[#E2E8F0] dark:border-zinc-700/80 flex items-center justify-between">
                    <div className="pr-2">
                      <label htmlFor="previousDonation" className="text-xs font-semibold text-[#1E293B] dark:text-zinc-200 cursor-pointer block">
                        Have you donated blood before?
                      </label>
                      <span className="text-[11px] text-[#64748B] dark:text-zinc-400">
                        Prior voluntary donation experience.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      id="previousDonation"
                      checked={formData.previousDonation}
                      onChange={handleChange}
                      className="w-4 h-4 text-[#A61B2B] rounded border-[#CBD5E1] dark:border-zinc-700 cursor-pointer"
                    />
                  </div>

                  {formData.previousDonation ? (
                    <Input
                      label="Last Blood Donation Date"
                      id="lastDonationDate"
                      type="date"
                      value={formData.lastDonationDate}
                      onChange={handleChange}
                      error={errors.lastDonationDate}
                      icon={Clock}
                    />
                  ) : (
                    <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-zinc-800/30 border border-[#E2E8F0] dark:border-zinc-800 flex items-center text-xs text-[#64748B] dark:text-zinc-400 italic">
                      First-time voluntary donors are warmly welcomed!
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <Input
                    label="Additional Health Notes (Optional)"
                    id="additionalNotes"
                    placeholder="Any dietary restrictions, allergies, or context for medical coordinators"
                    value={formData.additionalNotes}
                    onChange={handleChange}
                    error={errors.additionalNotes}
                    icon={FileText}
                  />
                </div>

                {/* Navigation Buttons */}
                <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[#E2E8F0] dark:border-zinc-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrev}
                    className="w-full sm:w-auto font-medium text-xs flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Previous: Blood Group</span>
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleNext}
                    className="w-full sm:w-auto font-semibold text-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Next: Safety Policy</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ======================================================= */}
            {/* STAGE 4: MEDICAL SAFETY DISCLAIMER & CLINICAL POLICY */}
            {/* ======================================================= */}
            {currentStage === 4 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0] dark:border-zinc-800">
                  <span className="w-6 h-6 rounded-full bg-[#A61B2B] text-white text-xs font-bold flex items-center justify-center">4</span>
                  <div>
                    <h3 className="text-sm font-bold text-[#1E293B] dark:text-white">
                      Medical Safety Disclaimer & Privacy Protection
                    </h3>
                    <p className="text-[11px] text-[#64748B] dark:text-zinc-400">
                      Understanding clinical clearance standards and data safeguards.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#FFFBEB] dark:bg-amber-950/30 border border-[#FDE68A] dark:border-amber-900/50 text-xs text-[#92400E] dark:text-amber-200 space-y-2">
                    <div className="font-semibold flex items-center gap-1.5 text-[#78350F] dark:text-amber-100">
                      <AlertCircle className="w-4 h-4 text-[#A66B19] shrink-0" />
                      Preliminary Screening Only
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#92400E] dark:text-amber-300">
                      Questionnaire responses are self-reported and do not constitute formal medical clearance or clinical certification. Final suitability will be determined in person by certified healthcare professionals at the hospital or blood bank before donation.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#F0FDF4] dark:bg-emerald-950/30 border border-[#BBF7D0] dark:border-emerald-900/50 text-xs text-[#166534] dark:text-emerald-200 space-y-2">
                    <div className="font-semibold flex items-center gap-1.5 text-[#14532D] dark:text-emerald-100">
                      <ShieldCheck className="w-4 h-4 text-[#28734A] shrink-0" />
                      Confidential Privacy Shield
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#166534] dark:text-emerald-300">
                      Your self-reported questionnaire metrics are strictly restricted to your account and authorized platform administrators. They are never exposed in search results, map markers, or public feeds.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 text-xs text-[#475569] dark:text-zinc-300 space-y-2">
                  <h4 className="font-bold text-[#1E293B] dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#28734A]" />
                    Voluntary Donation Commitments
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-[#64748B] dark:text-zinc-400">
                    <li>I confirm that information provided in this questionnaire is truthful and self-reported.</li>
                    <li>I understand that I may toggle my availability anytime from the donor dashboard.</li>
                    <li>I understand that contact details are only shared with recipients upon mutual acceptance.</li>
                  </ul>
                </div>

                {/* Navigation Buttons */}
                <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[#E2E8F0] dark:border-zinc-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrev}
                    className="w-full sm:w-auto font-medium text-xs flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Previous: Health Questionnaire</span>
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleNext}
                    className="w-full sm:w-auto font-semibold text-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Next: Review & Submit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ======================================================= */}
            {/* STAGE 5: REVIEW, AVAILABILITY & FINAL SUBMISSION */}
            {/* ======================================================= */}
            {currentStage === 5 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0] dark:border-zinc-800">
                  <span className="w-6 h-6 rounded-full bg-[#A61B2B] text-white text-xs font-bold flex items-center justify-center">5</span>
                  <div>
                    <h3 className="text-sm font-bold text-[#1E293B] dark:text-white">
                      Review & Complete Registration
                    </h3>
                    <p className="text-[11px] text-[#64748B] dark:text-zinc-400">
                      Verify your registration summary and set initial availability status.
                    </p>
                  </div>
                </div>

                {/* Summary Card */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-zinc-800/60 border border-[#E2E8F0] dark:border-zinc-700 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-700">
                    <span className="font-bold text-[#1E293B] dark:text-white">Registration Profile Summary</span>
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-[#FEF2F2] dark:bg-rose-950/50 text-[#A61B2B] dark:text-rose-300 border border-[#FECACA] dark:border-rose-900/50">
                      Blood Group: {formData.bloodGroup || "Not selected"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-[#475569] dark:text-zinc-300">
                    <div>
                      <span className="text-[#64748B] dark:text-zinc-400 block">Donor Name:</span>
                      <strong className="text-[#1E293B] dark:text-white">{formData.fullName || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] dark:text-zinc-400 block">Email Identifier:</span>
                      <strong className="text-[#1E293B] dark:text-white">{formData.email || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] dark:text-zinc-400 block">Contact Phone:</span>
                      <strong className="text-[#1E293B] dark:text-white">+91 {formData.phone || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] dark:text-zinc-400 block">Registered Location:</span>
                      <strong className="text-[#1E293B] dark:text-white">{formData.city ? `${formData.city}, ${formData.state}` : "—"}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] dark:text-zinc-400 block">Reported Weight:</span>
                      <strong className="text-[#1E293B] dark:text-white">{formData.currentWeight ? `${formData.currentWeight} kg` : "Not specified"}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] dark:text-zinc-400 block">Prior Donation:</span>
                      <strong className="text-[#1E293B] dark:text-white">{formData.previousDonation ? `Yes (${formData.lastDonationDate || "Date unrecorded"})` : "First-time voluntary donor"}</strong>
                    </div>
                  </div>
                </div>

                {/* Availability Toggle */}
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-800/80 border border-[#E2E8F0] dark:border-zinc-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label htmlFor="isAvailable" className="text-xs font-semibold text-[#1E293B] dark:text-zinc-200 cursor-pointer">
                        Initial Availability for Proximity Dispatch
                      </label>
                      <p className="text-[11px] text-[#64748B] dark:text-zinc-400">
                        Receive real-time push alerts when patients within [5..50 KM] require your blood group.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="isAvailable"
                        checked={formData.isAvailable}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[#CBD5E1] dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#CBD5E1] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#28734A]"></div>
                    </label>
                  </div>
                  <div className="text-[11px] font-medium text-[#1E293B] dark:text-zinc-300 flex items-center gap-1.5 pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#28734A]" />
                    <span>Status: {formData.isAvailable ? "Available for emergency blood requests" : "Currently Unavailable"}</span>
                  </div>
                </div>

                {/* Final Navigation & Submit Buttons */}
                <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[#E2E8F0] dark:border-zinc-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrev}
                    className="w-full sm:w-auto font-medium text-xs flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Previous: Safety Policy</span>
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full sm:w-auto font-semibold text-xs py-2.5 px-4 shadow-sm flex items-center justify-center gap-1.5"
                    isLoading={isLoading}
                  >
                    <HeartHandshake className="w-3.5 h-3.5" />
                    <span>Complete Voluntary Donor Registration</span>
                  </Button>
                </div>
              </div>
            )}

          </form>

          <div className="pt-6 border-t border-[#E2E8F0] dark:border-zinc-800 text-center text-xs text-[#64748B] dark:text-zinc-400">
            Already registered as a donor?{" "}
            <Link to="/login" className="text-[#A61B2B] dark:text-rose-400 font-semibold hover:underline">
              Sign In here →
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
