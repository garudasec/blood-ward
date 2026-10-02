import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Droplet, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: '' }));
    }
    if (serverError) setServerError('');
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    // Placeholder UI demonstration for Phase 3 before Phase 4 AuthContext integration
    setTimeout(() => {
      setIsLoading(false);
      // Notice for user
      setServerError('Backend API connection will be activated in Phase 4 (AuthContext & API Services).');
    }, 800);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl relative">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-600 text-white shadow-lg shadow-red-500/30">
            <Droplet className="w-8 h-8 fill-current" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Sign In to BloodWard
          </h2>
          <p className="text-xs text-slate-500">
            Access your Donor, Recipient, or Admin Dashboard
          </p>
        </div>

        {serverError && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Notice</p>
              <p>{serverError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email Address"
            id="email"
            type="email"
            placeholder="you@example.com"
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
            variant="primary"
            className="w-full py-3"
            isLoading={isLoading}
          >
            <LogIn className="w-4 h-4 mr-1" /> Sign In
          </Button>
        </form>

        {/* Admin note */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Admin accounts use this same login portal with pre-configured credentials.</span>
        </div>

        {/* Footer Registration Links */}
        <div className="pt-4 border-t border-slate-100 text-center space-y-3 text-xs">
          <p className="text-slate-600">Don't have an account yet?</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/register/donor"
              className="text-red-600 font-bold hover:underline inline-flex items-center gap-1"
            >
              Register as Donor <ArrowRight className="w-3 h-3" />
            </Link>
            <span className="hidden sm:inline text-slate-300">•</span>
            <Link
              to="/register/recipient"
              className="text-slate-900 font-bold hover:underline inline-flex items-center gap-1"
            >
              Register as Recipient <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}