import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  Search,
  AlertCircle,
} from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';

export default function RecipientRegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    location: '',
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverNotice, setServerNotice] = useState('');

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
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

    if (!formData.location.trim()) newErrors.location = 'City / Location is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setServerNotice('');
    try {
      const res = await authService.registerRecipient({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        city: formData.location,
      });
      if (res.success && res.user) {
        login(res.user);
        navigate('/recipient');
      }
    } catch (err) {
      setServerNotice(err.message || 'Recipient registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 text-white mb-1 shadow-md">
            <Search className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Register as a Recipient
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Create an account to search nearby blood donors and issue emergency blood requests.
          </p>
        </div>

        {serverNotice && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
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
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
              icon={Phone}
              required
            />

            <Input
              label="City / Location"
              id="location"
              placeholder="e.g. Chicago / New Delhi"
              value={formData.location}
              onChange={handleChange}
              error={errors.location}
              icon={MapPin}
              required
            />
          </div>

          <Button
            type="submit"
            variant="secondary"
            className="w-full py-3 mt-4"
            isLoading={isLoading}
          >
            Create Recipient Account
          </Button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
          Already have a Recipient account?{' '}
          <Link to="/login" className="text-red-600 font-bold hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
