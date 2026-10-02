import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
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
  Droplet,
  Check,
  AlertCircle,
  Activity,
} from 'lucide-react';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import BloodGroupBadge from '../../components/common/BloodGroupBadge';
import { BLOOD_GROUPS } from '../../constants/theme';

export default function DonorProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    fullName: user?.fullName || 'Alex Rivera',
    email: user?.email || 'donor@bloodward.com',
    phone: user?.phone || '+1 (555) 234-5678',
    bloodGroup: user?.bloodGroup || 'O+',
    city: user?.city || 'New York',
    pincode: user?.pincode || '10001',
    isAvailable: user?.isAvailable ?? true,
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value,
    }));
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: '' }));
    if (successMsg) setSuccessMsg('');
    if (errorMsg) setErrorMsg('');
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Valid email address required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9+\-\s()]{8,15}$/.test(formData.phone)) {
      newErrors.phone = 'Enter a valid phone number';
    }

    if (!formData.bloodGroup) newErrors.bloodGroup = 'Blood group selection required';
    if (!formData.city.trim()) newErrors.city = 'City is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setTimeout(() => {
      updateUser(formData);
      setIsSaving(false);
      setIsEditing(false);
      setSuccessMsg('Profile information updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    }, 400);
  };

  const handleCancel = () => {
    setFormData({
      fullName: user?.fullName || 'Alex Rivera',
      email: user?.email || 'donor@bloodward.com',
      phone: user?.phone || '+1 (555) 234-5678',
      bloodGroup: user?.bloodGroup || 'O+',
      city: user?.city || 'New York',
      pincode: user?.pincode || '10001',
      isAvailable: user?.isAvailable ?? true,
    });
    setErrors({});
    setIsEditing(false);
  };

  // Calculate completion rate based on filled fields
  const calculateCompletion = () => {
    const fields = [
      formData.fullName,
      formData.email,
      formData.phone,
      formData.bloodGroup,
      formData.city,
      formData.pincode,
    ];
    const filled = fields.filter((f) => f && String(f).trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  };

  const completionRate = calculateCompletion();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {successMsg}
          </span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-red-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
              {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : 'D'}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {formData.fullName}
                </h1>
                <BloodGroupBadge group={formData.bloodGroup} size="sm" />
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> {formData.email}
                <span className="text-slate-300">•</span>
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {formData.city}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isEditing ? (
              <Button variant="primary" size="sm" onClick={() => setIsEditing(true)}>
                <Edit3 className="w-4 h-4 mr-1.5" /> Edit Profile
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
            <span className="font-semibold text-slate-700">Profile Completion</span>
            <span className="font-bold text-red-600">{completionRate}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-rose-600 transition-all duration-300 rounded-full"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Profile Form / View Section */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Donor Details & Preferences
          </h2>
          <span className="text-xs text-slate-400">
            {isEditing ? 'Mode: Editing' : 'Mode: Read-Only View'}
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
                label="Blood Group"
                id="bloodGroup"
                options={BLOOD_GROUPS}
                value={formData.bloodGroup}
                onChange={handleChange}
                error={errors.bloodGroup}
                icon={Droplet}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="City / Location"
                id="city"
                value={formData.city}
                onChange={handleChange}
                error={errors.city}
                icon={MapPin}
                required
              />

              <Input
                label="Pincode / Postal Code"
                id="pincode"
                value={formData.pincode}
                onChange={handleChange}
                error={errors.pincode}
                icon={MapPin}
              />
            </div>

            {/* Availability Toggle in Edit */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <label htmlFor="isAvailable" className="text-xs font-bold text-slate-900 cursor-pointer block">
                  Donation Availability Status
                </label>
                <p className="text-[11px] text-slate-500">
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
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
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
              <div className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Full Name</span>
                <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-red-500" /> {formData.fullName}
                </p>
              </div>

              <div className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Email Address</span>
                <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-red-500" /> {formData.email}
                </p>
              </div>

              <div className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Phone Number</span>
                <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Phone className="w-4 h-4 text-red-500" /> {formData.phone}
                </p>
              </div>

              <div className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Blood Group</span>
                <div className="pt-0.5">
                  <BloodGroupBadge group={formData.bloodGroup} size="sm" />
                </div>
              </div>

              <div className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">City / Region</span>
                <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" /> {formData.city}
                </p>
              </div>

              <div className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Pincode</span>
                <p className="font-bold text-slate-900 text-sm">{formData.pincode || 'N/A'}</p>
              </div>
            </div>

            {/* Privacy Shield Box */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Contact Privacy Protection Engaged</p>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
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