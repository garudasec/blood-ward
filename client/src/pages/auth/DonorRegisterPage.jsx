import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  Droplet,
  ShieldCheck,
} from 'lucide-react';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import { BLOOD_GROUPS } from '../../constants/theme';

export default function DonorRegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    bloodGroup: '',
    city: '',
    pincode: '',
    isAvailable: true,
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverNotice, setServerNotice] = useState('');

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value,
    }));
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: '' }));
    }
    if (serverNotice) setServerNotice('');
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Valid email address required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9+\-\s()]{8,15}$/.test(formData.phone)) {
      newErrors.phone = 'Enter a valid phone number';
    }

    if (!formData.bloodGroup) newErrors.bloodGroup = 'Blood group selection is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setServerNotice('Registration UI verified. Backend registration service will be hooked up in Phase 4.');
    }, 800);
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-red-100 text-red-600 mb-1">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Register as a Blood Donor
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Join the BloodWard emergency donor network. Your contact details remain shielded until you accept a request.
          </p>
        </div>

        {serverNotice && (
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>{serverNotice}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              id="fullName"
              placeholder="John Doe"
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
              placeholder="donor@example.com"
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
              placeholder="+1 (555) 000-0000"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="City"
              id="city"
              placeholder="e.g. New York / Gurgaon"
              value={formData.city}
              onChange={handleChange}
              error={errors.city}
              icon={MapPin}
              required
            />

            <Input
              label="Pincode / Postal Code"
              id="pincode"
              placeholder="e.g. 10001"
              value={formData.pincode}
              onChange={handleChange}
              error={errors.pincode}
              icon={MapPin}
            />
          </div>

          {/* Availability Toggle Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="isAvailable" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Initial Availability Status
                </label>
                <p className="text-[11px] text-slate-500">
                  You can toggle this at any time from your Donor Dashboard.
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
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Status: {formData.isAvailable ? 'AVAILABLE for donor search' : 'NOT AVAILABLE'}</span>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full py-3 mt-4"
            isLoading={isLoading}
          >
            Complete Donor Registration
          </Button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
          Already registered as a donor?{' '}
          <Link to="/login" className="text-red-600 font-bold hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}