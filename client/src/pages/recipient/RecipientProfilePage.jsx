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
  Search,
} from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

export default function RecipientProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    fullName: user?.fullName || 'Sarah Chen',
    email: user?.email || 'recipient@bloodward.com',
    phone: user?.phone || '+1 (555) 987-6543',
    city: user?.city || 'New York',
    pincode: user?.pincode || '10001',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: '' }));
    if (successMsg) setSuccessMsg('');
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
      setSuccessMsg('Recipient profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    }, 400);
  };

  const handleCancel = () => {
    setFormData({
      fullName: user?.fullName || 'Sarah Chen',
      email: user?.email || 'recipient@bloodward.com',
      phone: user?.phone || '+1 (555) 987-6543',
      city: user?.city || 'New York',
      pincode: user?.pincode || '10001',
    });
    setErrors({});
    setIsEditing(false);
  };

  const calculateCompletion = () => {
    const fields = [
      formData.fullName,
      formData.email,
      formData.phone,
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

      {/* Header Profile Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : 'R'}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {formData.fullName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Recipient Profile
                </span>
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
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
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
            <span className="font-bold text-blue-600">{completionRate}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-700 transition-all duration-300 rounded-full"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Details Section */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Recipient Account Details
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

              <Input
                label="City / Search Location"
                id="city"
                value={formData.city}
                onChange={handleChange}
                error={errors.city}
                icon={MapPin}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Full Name</span>
                <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-500" /> {formData.fullName}
                </p>
              </div>

              <div className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Email Address</span>
                <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-500" /> {formData.email}
                </p>
              </div>

              <div className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Phone Number</span>
                <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-500" /> {formData.phone}
                </p>
              </div>

              <div className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">City / Location</span>
                <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" /> {formData.city}
                </p>
              </div>

              <div className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100 sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Pincode</span>
                <p className="font-bold text-slate-900 text-sm">{formData.pincode || 'N/A'}</p>
              </div>
            </div>

            {/* Privacy Box */}
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-900 text-xs flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Recipient Account Security</p>
                <p className="text-[11px] text-blue-800 leading-relaxed">
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