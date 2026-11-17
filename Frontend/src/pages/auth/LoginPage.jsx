import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Wrench,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Zap,
  Sparkles,
  CheckCircle2,
  User,
  Users,
  Compass,
  Cpu,
  Building2,
  ShieldCheck,
} from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);

    if (res.success) {
      navigate('/', { replace: true });
    }
  };

  const demoAccounts = [
    {
      label: 'Super Admin',
      role: 'SUPER_ADMIN',
      desc: 'Full Governance & Config',
      email: 'admin@servisync.com',
      pass: 'Admin@123',
      icon: Shield,
      accent: 'border-purple-500/40 bg-purple-950/30 text-purple-300 hover:border-purple-400 hover:bg-purple-900/40 hover:shadow-glow-purple',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
      activeRing: 'ring-2 ring-purple-400 border-purple-400 bg-purple-900/50',
    },
    {
      label: 'Operations Mgr',
      role: 'OPERATIONS_MANAGER',
      desc: 'Fleet & Cost Analytics',
      email: 'manager@servisync.com',
      pass: 'Manager@123',
      icon: Zap,
      accent: 'border-sky-500/40 bg-sky-950/30 text-sky-300 hover:border-sky-400 hover:bg-sky-900/40 hover:shadow-glow-sky',
      badge: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
      activeRing: 'ring-2 ring-sky-400 border-sky-400 bg-sky-900/50',
    },
    {
      label: 'Dispatcher',
      role: 'DISPATCHER',
      desc: 'Live Routing & Grid',
      email: 'dispatcher@servisync.com',
      pass: 'Dispatcher@123',
      icon: Compass,
      accent: 'border-indigo-500/40 bg-indigo-950/30 text-indigo-300 hover:border-indigo-400 hover:bg-indigo-900/40 hover:shadow-glow-indigo',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
      activeRing: 'ring-2 ring-indigo-400 border-indigo-400 bg-indigo-900/50',
    },
    {
      label: 'Field Tech',
      role: 'FIELD_TECHNICIAN',
      desc: 'Mobile Jobs & Reports',
      email: 'tech.alex@servisync.com',
      pass: 'Tech@123',
      icon: Cpu,
      accent: 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-900/40 hover:shadow-glow-emerald',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
      activeRing: 'ring-2 ring-emerald-400 border-emerald-400 bg-emerald-900/50',
    },
    {
      label: 'Customer (Leo)',
      role: 'CUSTOMER',
      desc: 'Self-Service & Requests',
      email: 'customer.leo@example.com',
      pass: 'Customer@123',
      icon: Building2,
      accent: 'border-amber-500/40 bg-amber-950/30 text-amber-300 hover:border-amber-400 hover:bg-amber-900/40 hover:shadow-glow-amber',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
      activeRing: 'ring-2 ring-amber-400 border-amber-400 bg-amber-900/50',
    },
    {
      label: 'Customer (John)',
      role: 'CUSTOMER',
      desc: 'Appointments & History',
      email: 'customer.john@example.com',
      pass: 'Customer@123',
      icon: User,
      accent: 'border-orange-500/40 bg-orange-950/30 text-orange-300 hover:border-orange-400 hover:bg-orange-900/40 hover:shadow-glow-amber',
      badge: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
      activeRing: 'ring-2 ring-orange-400 border-orange-400 bg-orange-900/50',
    },
  ];

  const fillDemo = (acc) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setSelectedRole(acc.label);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-cyan-500 selection:text-black">
      {/* Futuristic Deep Space Ambient Lighting & Mesh Gradients */}
      <div className="absolute top-[-15%] left-[-10%] w-[650px] h-[650px] rounded-full bg-cyan-500/10 blur-[140px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[700px] h-[700px] rounded-full bg-indigo-600/15 blur-[160px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute top-[40%] right-[25%] w-[400px] h-[400px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none"></div>

      {/* Cybernetic Dot Grid Background Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(rgba(56, 189, 248, 0.4) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      ></div>

      {/* Top Brand & Portal Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center relative z-10 px-4">
        {/* Futuristic Status Beacon Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono font-semibold tracking-wider mb-5 shadow-lg shadow-cyan-500/10 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
          </span>
          <span>MISSION DISPATCH // SECURE GATEWAY V2.4</span>
        </div>

        {/* Brand Emblem */}
        <div className="flex justify-center mb-3">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 rounded-2xl blur-md opacity-70 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative w-16 h-16 rounded-2xl bg-slate-900/90 border border-white/20 flex items-center justify-center text-cyan-400 shadow-2xl backdrop-blur-xl">
              <Wrench className="w-8 h-8 text-cyan-400 animate-float" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          ServiSync<span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">Pro</span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-400 font-medium tracking-wide">
          Next-Generation Field Service Operations & Intelligent Work Order Dispatch
        </p>
      </div>

      {/* Central Holographic Glass Container */}
      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-xl px-4 relative z-10">
        <div className="relative rounded-3xl bg-slate-900/70 backdrop-blur-2xl py-7 px-6 sm:px-9 shadow-2xl shadow-black/80 border border-slate-800/80 overflow-hidden">
          {/* Top Laser Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Corporate Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-cyan-400 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSelectedRole(null);
                  }}
                  placeholder="user@servisync.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-inner"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Access Password
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Min 8 chars</span>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-cyan-400 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setSelectedRole(null);
                  }}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-cyan-500 via-sky-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-sky-600/30 hover:shadow-cyan-500/40 transition-all flex items-center justify-center gap-2 group cursor-pointer active:scale-[0.99] disabled:opacity-50 text-sm tracking-wide"
            >
              <span>{submitting ? 'Authenticating Credentials...' : 'Sign In to Operations Command'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Futuristic 1-Click Evaluation Login Matrix */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Instant 1-Click Evaluation Logins</span>
              </span>
              {selectedRole && (
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  Ready: {selectedRole}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {demoAccounts.map((acc) => {
                const Icon = acc.icon;
                const isSelected = selectedRole === acc.label;
                return (
                  <button
                    key={acc.label}
                    type="button"
                    onClick={() => fillDemo(acc)}
                    className={`relative p-2.5 rounded-xl border text-left transition-all group cursor-pointer ${
                      isSelected ? acc.activeRing : acc.accent
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs font-bold truncate">{acc.label}</span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate font-normal">
                      {acc.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Register Link */}
          <div className="mt-5 text-center text-xs text-slate-400 pt-3 border-t border-slate-800/60">
            New corporate client?{' '}
            <Link to="/register" className="font-semibold text-cyan-400 hover:text-cyan-300 underline underline-offset-4 decoration-cyan-400/40">
              Create customer account
            </Link>
          </div>
        </div>

        {/* Security & System Telemetry Footer */}
        <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-mono text-slate-400 text-center flex-wrap">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> 256-BIT ENCRYPTION
          </span>
          <span>•</span>
          <span>LIVE FLEET MESH</span>
          <span>•</span>
          <span>ZERO-TRUST RBAC</span>
        </div>
      </div>
    </div>
  );
};
