import api from "../../services/api";
import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  User,
  Mail,
  Phone,
  Droplet,
  MapPin,
  ShieldCheck,
  Edit,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import Button from "../../components/common/Button";
import BloodGroupBadge from "../../components/common/BloodGroupBadge";
import { BLOOD_GROUPS, GENDER_OPTIONS } from "../../constants/theme";
import { INDIA_STATES_AND_CITIES, INDIAN_STATES_LIST } from "../../constants/indiaLocations";

export default function DonorProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorNotice, setErrorNotice] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    bloodGroup: "",
    gender: "",
    state: "",
    city: "",
    pincode: "",
    isAvailable: true,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        bloodGroup: user.bloodGroup || "",
        gender: user.gender || "",
        state: user.state || "",
        city: user.city || user.location || "",
        pincode: user.pincode || "",
        isAvailable: user.isAvailable ?? (user.availability === "Available" || user.availability === "available"),
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;

    if (id === "state") {
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
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    if (!formData.bloodGroup) newErrors.bloodGroup = "Blood Group is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    setNotice("");
    setErrorNotice("");

    try {
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        bloodGroup: formData.bloodGroup,
        gender: formData.gender,
        state: formData.state,
        city: formData.city,
        pincode: formData.pincode,
        availability: formData.isAvailable ? "Available" : "Not Available",
        isAvailable: formData.isAvailable,
      };

      const updatedUser = await api.put("/donors/me/profile", payload);
      if (updatedUser) {
        updateUser(updatedUser.data?.user || updatedUser.data || payload);
      }
      setNotice("Donor profile updated successfully!");
      setIsEditing(false);
      setTimeout(() => setNotice(""), 4000);
    } catch (err) {
      console.error("Failed to save donor profile:", err);
      setErrorNotice(err.response?.data?.message || err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        fullName: user.fullName || user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        bloodGroup: user.bloodGroup || "",
        gender: user.gender || "",
        state: user.state || "",
        city: user.city || user.location || "",
        pincode: user.pincode || "",
        isAvailable: user.isAvailable ?? (user.availability === "Available" || user.availability === "available"),
      });
    }
    setErrors({});
    setIsEditing(false);
  };

  const cityOptions = formData.state && INDIA_STATES_AND_CITIES[formData.state]
    ? INDIA_STATES_AND_CITIES[formData.state]
    : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-theme-card p-6 sm:p-8 rounded-3xl border border-theme shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center text-white font-black text-2xl shadow-md shadow-red-600/30">
            {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : "D"}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-theme-primary tracking-tight">
                {formData.fullName || "Donor Profile"}
              </h1>
              {formData.bloodGroup && <BloodGroupBadge group={formData.bloodGroup} size="sm" />}
            </div>
            <p className="text-xs text-theme-muted flex items-center gap-2">
              <span>{formData.email}</span>
              <span>•</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Donor Profile Verified</span>
            </p>
          </div>
        </div>

        {!isEditing && (
          <Button variant="primary" size="sm" onClick={() => setIsEditing(true)} className="shrink-0 font-bold">
            <Edit className="w-4 h-4 mr-1.5" /> Edit Profile
          </Button>
        )}
      </div>

      {/* Success Notification */}
      {notice && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {notice}
          </span>
          <button onClick={() => setNotice("")} className="text-theme-muted hover:text-theme-primary cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorNotice && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" /> {errorNotice}
          </span>
          <button onClick={() => setErrorNotice("")} className="text-theme-muted hover:text-theme-primary cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Form / Profile Info Box */}
      <div className="bg-theme-card p-6 sm:p-8 rounded-3xl border border-theme shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-theme pb-4">
          <h2 className="text-lg font-extrabold text-theme-primary tracking-tight">
            Personal & Location Details
          </h2>
          <span className="text-xs text-theme-muted">
            {isEditing ? "Editing Mode" : "Read-Only Overview"}
          </span>
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
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
                label="Blood Group"
                id="bloodGroup"
                options={BLOOD_GROUPS}
                value={formData.bloodGroup}
                onChange={handleChange}
                error={errors.bloodGroup}
                placeholder="Select Blood Group"
                icon={Droplet}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
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
                label="City"
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

            <div className="p-4 rounded-2xl bg-theme-card-elevated border border-theme flex items-center justify-between">
              <div>
                <label htmlFor="isAvailable" className="text-xs font-bold text-theme-primary cursor-pointer block">
                  Donation Availability Status
                </label>
                <p className="text-[11px] text-theme-muted">
                  Toggle whether your profile appears in active emergency donor searches.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  id="isAvailable"
                  checked={formData.isAvailable}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-400 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-['] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" type="button" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={isSaving}>
                <Save className="w-4 h-4 mr-1.5" /> Save Profile
              </Button>
            </div>
          </form>
        ) : (
          /* READ-ONLY DISPLAY VIEW */
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1 bg-theme-card-elevated p-4 rounded-2xl border border-theme">
                <span className="text-[10px] uppercase font-bold text-theme-muted">Full Name</span>
                <p className="font-bold text-theme-primary text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-red-500" /> {formData.fullName}
                </p>
              </div>

              <div className="space-y-1 bg-theme-card-elevated p-4 rounded-2xl border border-theme">
                <span className="text-[10px] uppercase font-bold text-theme-muted">Email Address</span>
                <p className="font-bold text-theme-primary text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-red-500" /> {formData.email}
                </p>
              </div>

              <div className="space-y-1 bg-theme-card-elevated p-4 rounded-2xl border border-theme">
                <span className="text-[10px] uppercase font-bold text-theme-muted">Phone Number</span>
                <p className="font-bold text-theme-primary text-sm flex items-center gap-2">
                  <Phone className="w-4 h-4 text-red-500" /> {formData.phone}
                </p>
              </div>

              <div className="space-y-1 bg-theme-card-elevated p-4 rounded-2xl border border-theme">
                <span className="text-[10px] uppercase font-bold text-theme-muted">Blood Group</span>
                <div className="pt-0.5">
                  <BloodGroupBadge group={formData.bloodGroup} size="sm" />
                </div>
              </div>

              <div className="space-y-1 bg-theme-card-elevated p-4 rounded-2xl border border-theme">
                <span className="text-[10px] uppercase font-bold text-theme-muted">Gender</span>
                <p className="font-bold text-theme-primary text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-red-500" /> {formData.gender || "Not specified"}
                </p>
              </div>

              <div className="space-y-1 bg-theme-card-elevated p-4 rounded-2xl border border-theme">
                <span className="text-[10px] uppercase font-bold text-theme-muted">State / UT</span>
                <p className="font-bold text-theme-primary text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" /> {formData.state || "Not specified"}
                </p>
              </div>

              <div className="space-y-1 bg-theme-card-elevated p-4 rounded-2xl border border-theme">
                <span className="text-[10px] uppercase font-bold text-theme-muted">City / Region</span>
                <p className="font-bold text-theme-primary text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" /> {formData.city || "Not specified"}
                </p>
              </div>

              <div className="space-y-1 bg-theme-card-elevated p-4 rounded-2xl border border-theme sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-theme-muted">Pincode</span>
                <p className="font-bold text-theme-primary text-sm">{formData.pincode || "N/A"}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Contact Privacy Protection Engaged</p>
                <p className="text-[11px] leading-relaxed">
                  Your phone number and exact residential location are shielded from public recipient searches. They are only disclosed when you explicitly accept a blood request.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
