import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Wrench,
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  Building,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'CUSTOMER',
    customer_type: 'INDIVIDUAL',
    address: '',
    service_location: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await register(formData);
    setSubmitting(false);

    if (res.success) {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#090d16] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-cyan-500 selection:text-white">
      {/* Ambient Aurora Glow Fields */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-br from-sky-500/20 via-cyan-500/15 to-indigo-600/25 blur-3xl rounded-full" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 w-[500px] h-[400px] bg-gradient-to-tr from-indigo-700/20 via-sky-600/15 to-transparent blur-3xl rounded-full" />
      <div className="pointer-events-none absolute top-1/3 -right-20 w-[450px] h-[450px] bg-gradient-to-tl from-purple-700/15 via-cyan-600/10 to-transparent blur-3xl rounded-full" />

      {/* Futuristic Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center relative z-10 mb-6">
        <div className="inline-flex items-center justify-center p-0.5 rounded-2xl bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-600 shadow-glow-cyan mb-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-950 flex items-center justify-center text-cyan-400">
            <Wrench className="w-7 h-7 transform -rotate-12 animate-pulse-slow" />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold tracking-widest uppercase mb-2">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>New Operator & Customer Enrollment</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
          Create Platform <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">Identity</span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Enroll in the ServiSync Pro Operations Grid to dispatch, manage, and monitor intelligent field service lifecycles.
        </p>
      </div>

      {/* Glassmorphic Form Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="bg-slate-900/80 backdrop-blur-2xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-800/90 relative overflow-hidden">
          {/* Subtle top laser border */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name / Organization
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="full_name"
                    required
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="e.g. Marcus Vance"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Contact Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 019-2831"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Authentication
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@servisync.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Master Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Entity Structure
                </label>
                <select
                  name="customer_type"
                  value={formData.customer_type}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition"
                >
                  <option value="INDIVIDUAL" className="bg-slate-900 text-slate-100">Individual Property Owner</option>
                  <option value="BUSINESS" className="bg-slate-900 text-slate-100">Commercial / Enterprise Facility</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Platform Role Scope
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition"
                >
                  <option value="CUSTOMER" className="bg-slate-900 text-slate-100">Customer Self-Service</option>
                  <option value="FIELD_TECHNICIAN" className="bg-slate-900 text-slate-100">Field Operations Specialist</option>
                  <option value="DISPATCHER" className="bg-slate-900 text-slate-100">Dispatcher & Coordinator</option>
                  <option value="OPERATIONS_MANAGER" className="bg-slate-900 text-slate-100">Operations Manager</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Billing Headquarters Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street, City, State, Postal Code"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Primary Service Coordinates / Facility Site
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Building className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="service_location"
                  required
                  value={formData.service_location}
                  onChange={handleChange}
                  placeholder="Building/Unit, Gate codes, Access dock"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-3 py-3 px-4 bg-gradient-to-r from-sky-500 via-cyan-500 to-indigo-600 hover:from-sky-400 hover:via-cyan-400 hover:to-indigo-500 text-white font-bold rounded-xl shadow-glow-cyan transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] cursor-pointer"
            >
              <span>{submitting ? 'Initializing Account & Keys...' : 'Deploy Platform Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Bottom Security Assurance & Links */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>TLS 1.3 & AES-256 Verified Onboarding</span>
            </div>
            <div className="text-slate-400">
              Already enrolled?{' '}
              <Link to="/login" className="font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
                Sign In to Grid &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
