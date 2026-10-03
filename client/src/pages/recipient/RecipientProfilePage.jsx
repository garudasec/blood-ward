import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import {
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Edit3,
  Save,
  X,
  CheckCircle2,
} from "lucide-react";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import Button from "../../components/common/Button";
import { GENDER_OPTIONS } from "../../constants/theme";
import { INDIA_STATES_AND_CITIES, INDIAN_STATES_LIST } from "../../constants/indiaLocations";

export default function RecipientProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    state: user?.state || "",
    city: user?.city || "",
    pincode: user?.pincode || "",
    gender: user?.gender || "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user && !isEditing) {
      setFormData({
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        state: user.state || "",
        city: user.city || "",
        pincode: user.pincode || "",
        gender: user.gender || "",
      });
    }
  }, [user, isEditing]);

  const cityOptions = formData.state ? (INDIA_STATES_AND_CITIES[formData.state] || []) : [];

  const handleChange = (e) => {
    const { id, value } = e.target;

    if (id === "state") {
      setFormData((prev) => ({
        ...prev,
        state: value,
        city: "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }));
    }

    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: "" }));
    if (successMsg) setSuccessMsg("");
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full Name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Valid email address required";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[0-9+\-\s()]{8,15}$/.test(formData.phone)) {
      newErrors.phone = "Enter a valid phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const res = await authService.updateProfile(formData);
      if (res && res.user) {
        updateUser(res.user);
      } else {
        updateUser(formData);
      }
      setIsEditing(false);
      setSuccessMsg("Recipient profile updated successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        form: err.message || "Failed to save recipient profile",
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: user?.fullName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      state: user?.state || "",
      city: user?.city || "",
      pincode: user?.pincode || "",
      gender: user?.gender || "",
    });
    setErrors({});
    setIsEditing(false);
  };

  const calculateProfileCompletion = () => {
    const fields = ["fullName", "email", "phone", "state", "city", "pincode", "gender"];
    const filled = fields.filter((field) => formData[field] && String(formData[field]).trim() !== "");
    return Math.round((filled.length / fields.length) * 100);
  };

  const completionRate = calculateProfileCompletion();

  return (
    <div className="space-y-6 pb-12">
      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Form error notification */}
      {errors.form && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center justify-between shadow-sm">
          <span>{errors.form}</span>
          <button onClick={() => setErrors((prev) => ({ ...prev, form: "" }))} className="text-red-600 hover:text-red-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile Header & Summary */}
      <div className="bg-theme-card p-6 sm:p-8 rounded-3xl border border-theme shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-theme pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-extrabold text-2xl shadow-md shadow-blue-500/20">
              {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : "R"}
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold text-theme-primary tracking-tight">
                {formData.fullName || "Recipient User"}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-theme-secondary font-medium">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider text-[10px]">
                  Recipient Account
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-theme-muted" />
                  {formData.city ? (formData.state ? formData.city + ", " + formData.state : formData.city) : "Location Not Specified"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button variant="primary" size="sm" onClick={() => setIsEditing(true)}>
                <Edit3 className="w-4 h-4 mr-1" /> Edit Profile
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
                <Button variant="primary" size="sm" isLoading={isSaving} onClick={handleSave}>
                  <Save className="w-4 h-4 mr-1" /> Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Profile Completion Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-theme-secondary">Profile Completion</span>
            <span className="font-bold text-blue-600">{completionRate}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-theme-subtle overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-700 transition-all duration-300 rounded-full"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Details Section */}
      <div className="bg-theme-card p-6 sm:p-8 rounded-3xl border border-theme shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-theme pb-4">
          <h2 className="text-lg font-extrabold text-theme-primary tracking-tight">
            Recipient Account Details
          </h2>
          <span className="text-xs text-theme-muted">
            {isEditing ? "Mode: Editing" : "Mode: Read-Only View"}
          </span>
        </div>

        {isEditing ? (
          /* EDIT FORM */
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                id="fullName"
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
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                icon={Mail}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                id="phone"
                type="tel"
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

            {/* Dependent Location Dropdowns */}
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
              />

              <Select
                label="City / Search Location"
                id="city"
                options={cityOptions}
                value={formData.city}
                onChange={handleChange}
                error={errors.city}
                placeholder={formData.state ? "Select City" : (formData.city || "Select State First")}
                icon={MapPin}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Input
                label="Pincode / Postal Code"
                id="pincode"
                value={formData.pincode}
                onChange={handleChange}
                error={errors.pincode}
                icon={MapPin}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" type="button" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="secondary" type="submit" isLoading={isSaving}>
                <Save className="w-4 h-4 mr-1.5" /> Save Profile
              </Button>
            </div>
          </form>
        ) : (
          /* READ-ONLY VIEW */
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1 bg-theme-surface p-4 rounded-2xl border border-theme">
                <span className="text-[10px] uppercase font-bold text-theme-muted">Full Name</span>
                <p className="font-bold text-theme-primary text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-500" /> {formData.fullName}
                </p>
              </div>

              <div className="space-y-1 bg-theme-surface p-4 rounded-2xl border border-theme">
                <span className="text-[10px] uppercase font-bold text-theme-muted">Email Address</span>
                <p className="font-bold text-theme-primary text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-500" /> {formData.email}
                </p>
              </div>

              <div className="space-y-1 bg-theme-surface p-4 rounded-2xl border border-theme">
                <span className="text-[10px] uppercase font-bold text-theme-muted">Phone Number</span>
                <p className="font-bold text-theme-primary text-sm flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-500" /> {formData.phone}
                </p>
              </div>

              <div className="space-y-1 bg-theme-surface p-4 rounded-2xl border border-theme">
                <span className="text-[10px] uppercase font-bold text-theme-muted">Gender</span>
                <p className="font-bold text-theme-primary text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-500" /> {formData.gender || "Not specified"}
                </p>
              </div>

              <div className="space-y-1 bg-theme-surface p-4 rounded-2xl border border-theme">
                <span className="text-[10px] uppercase font-bold text-theme-muted">State / UT</span>
                <p className="font-bold text-theme-primary text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" /> {formData.state || "Not specified"}
                </p>
              </div>

              <div className="space-y-1 bg-theme-surface p-4 rounded-2xl border border-theme">
                <span className="text-[10px] uppercase font-bold text-theme-muted">City / Location</span>
                <p className="font-bold text-theme-primary text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" /> {formData.city || "Not specified"}
                </p>
              </div>

              <div className="space-y-1 bg-theme-surface p-4 rounded-2xl border border-theme sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-theme-muted">Pincode</span>
                <p className="font-bold text-theme-primary text-sm">{formData.pincode || "N/A"}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Recipient Account Security</p>
                <p className="text-[11px] text-blue-600/90 dark:text-blue-300/90 leading-relaxed">
                  Your phone contact details are only shared with matching donors who explicitly accept your blood requests.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}