import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  Building,
  Calendar,
  Lock,
  Unlock,
  Pencil,
  Check,
  X,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  Save,
  Sun,
  Moon,
  Clock,
  Monitor,
  Sliders,
  SunMedium
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { authApi } from '../../api';

const roleColors = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
  OPERATIONS_MANAGER: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  DISPATCHER: 'bg-blue-100 text-blue-800 border-blue-200',
  FIELD_TECHNICIAN: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CUSTOMER: 'bg-gray-100 text-gray-800 border-gray-200',
};

const ProfileSettingsPage = () => {
  const { user, updateUser, refreshUser } = useAuth();
  const { addToast } = useToast();

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Sync profile form when user loads or updates
  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Password State
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Real-Time Day & Night Mode Theme State
  const {
    themeMode,
    resolvedTheme,
    isDark,
    dayStartTime,
    nightStartTime,
    setThemeMode,
    setAutoSchedule,
    formattedRealTime,
    isRealTimeDaylight,
  } = useTheme();

  const [customDayTime, setCustomDayTime] = useState(dayStartTime);
  const [customNightTime, setCustomNightTime] = useState(nightStartTime);
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    setCustomDayTime(dayStartTime);
    setCustomNightTime(nightStartTime);
  }, [dayStartTime, nightStartTime]);

  const handleSaveSchedule = (e) => {
    e.preventDefault();
    setSavingSchedule(true);
    setAutoSchedule(customDayTime, customNightTime);
    setTimeout(() => {
      setSavingSchedule(false);
      addToast(`Automatic day/night schedule updated: Day starts at ${customDayTime}, Night starts at ${customNightTime}`, 'success');
    }, 200);
  };

  const handleResetSchedule = () => {
    setCustomDayTime('06:00');
    setCustomNightTime('18:00');
    setAutoSchedule('06:00', '18:00');
    addToast('Schedule reset to default (06:00 Day / 18:00 Night)', 'info');
  };

  // Copy Account ID Helper
  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      addToast('Account ID copied to clipboard!', 'info');
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Start Password Edit (Enables fields and focuses Current Password input)
  const handleStartPasswordChange = () => {
    setIsEditingPassword(true);
    setTimeout(() => {
      const el = document.getElementById('current-password-input');
      if (el) el.focus();
    }, 50);
  };

  // Cancel Password Edit (Re-locks fields and resets inputs)
  const handleCancelPasswordChange = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsEditingPassword(false);
  };

  // Save Profile Changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const trimmedName = profileForm.full_name.trim();
    const trimmedEmail = profileForm.email.trim();
    const trimmedPhone = profileForm.phone.trim();

    if (!trimmedName || trimmedName.length < 2) {
      addToast('Full name must be at least 2 characters long.', 'warning');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      addToast('Please enter a valid email address.', 'warning');
      return;
    }

    try {
      setSavingProfile(true);
      const res = await authApi.updateProfile({
        full_name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
      });

      if (res.data?.success) {
        addToast('Profile updated successfully!', 'success');
        if (updateUser) {
          updateUser(res.data.data);
        }
        if (refreshUser) {
          await refreshUser();
        }
        setIsEditingProfile(false);
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Failed to update profile settings.';
      addToast(String(errorMsg), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Cancel Profile Changes
  const handleCancelProfile = () => {
    setProfileForm({
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    setIsEditingProfile(false);
  };

  // Password Change Handler (Saves permanently to database)
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!isEditingPassword) {
      handleStartPasswordChange();
      return;
    }

    if (!currentPassword) {
      addToast('Please enter your current password.', 'warning');
      return;
    }
    if (newPassword.length < 8) {
      addToast('New password must be at least 8 characters long.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match.', 'error');
      return;
    }

    try {
      setSubmittingPassword(true);
      const res = await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (res.data?.success) {
        addToast('Password updated successfully and saved permanently in the database!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsEditingPassword(false);
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Failed to change password.';
      addToast(String(errorMsg), 'error');
    } finally {
      setSubmittingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Profile & Account Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your personal details, access role privileges, and security settings
        </p>
      </div>

      {/* User Information Card (Fully Editable) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        {/* Card Header with Edit/Save Controls */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
              {profileForm.full_name
                ? profileForm.full_name.charAt(0).toUpperCase()
                : user?.full_name
                ? user.full_name.charAt(0).toUpperCase()
                : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">
                  {user?.full_name || 'Loading profile...'}
                </h2>
                {isEditingProfile && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    Editing Mode
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleColors[user?.role] || 'bg-gray-100 text-gray-800'}`}>
                  <Shield className="w-3 h-3 mr-1" />
                  {user?.role?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Active Account
            </span>

            {!isEditingProfile && (
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-2xs transition cursor-pointer"
                title="Edit account details"
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Card Body: Form when editing, view grid when saved */}
        {isEditingProfile ? (
          <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Edit your contact and profile details below.</p>
                <p className="text-blue-700 mt-0.5">
                  Changes will be synchronized immediately across dispatch records, work order reports, and customer notices.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Full Name Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  placeholder="e.g. Edward Sterling"
                  className="w-full h-11 px-3.5 text-sm font-semibold rounded-xl bg-slate-50 border border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                />
              </div>

              {/* Email Address Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="admin@servisync.com"
                  className="w-full h-11 px-3.5 text-sm font-semibold rounded-xl bg-slate-50 border border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                />
              </div>

              {/* Phone Number Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 019-2831"
                  className="w-full h-11 px-3.5 text-sm font-semibold rounded-xl bg-slate-50 border border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                />
              </div>

              {/* Account ID (Read-only Metadata) */}
              <div className="space-y-1.5 opacity-80">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-gray-400" />
                  Account ID (System Managed)
                </label>
                <div className="h-11 px-3.5 flex items-center justify-between bg-gray-100 rounded-xl border border-gray-200 text-xs font-mono text-gray-600">
                  <span className="truncate">{user?.id}</span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="p-1 hover:bg-gray-200 rounded text-gray-500 transition cursor-pointer shrink-0 ml-2"
                    title="Copy Account ID"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Form Footer Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCancelProfile}
                disabled={savingProfile}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm hover:shadow-md transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {savingProfile ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phone Number</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{user?.phone || 'Not configured'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account ID</p>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs font-mono text-gray-600 break-all mt-0.5">{user?.id}</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Member Since</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Active Member'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Display & Real-Time Day/Night Theme Settings Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                {resolvedTheme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <h3 className="text-base font-bold text-gray-900">
                Display & Real-Time Day/Night Theming
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Select Day Mode, Night Mode, or Automatic Real-Time mode that automatically changes theme based on your local clock.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-2 text-xs">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-mono font-bold text-slate-800">{formattedRealTime}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                resolvedTheme === 'dark'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {resolvedTheme === 'dark' ? 'Night Active' : 'Day Active'}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Theme Mode Option Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Option 1: Automatic Real-Time */}
          <div
            onClick={() => setThemeMode('auto_time')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              themeMode === 'auto_time'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-cyan-950/40 dark:border-cyan-500 shadow-sm ring-2 ring-blue-500/20'
                : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-cyan-900/60 text-blue-700 dark:text-cyan-300 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-600 dark:bg-cyan-500 text-white dark:text-slate-950">
                  Auto Clock
                </span>
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Automatic (Real Time)</h4>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                Switches between Day and Night mode automatically based on your real-time local clock.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-gray-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-blue-700 dark:text-cyan-400 font-semibold">
                {isRealTimeDaylight ? '☀️ Day Window' : '🌙 Night Window'}
              </span>
              {themeMode === 'auto_time' && (
                <span className="flex items-center gap-1 font-bold text-blue-700 dark:text-cyan-400">
                  <Check className="w-3.5 h-3.5" /> Selected
                </span>
              )}
            </div>
          </div>

          {/* Option 2: Day Mode */}
          <div
            onClick={() => setThemeMode('light')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              themeMode === 'light'
                ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/40 dark:border-amber-500 shadow-sm ring-2 ring-amber-400/20'
                : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
                  <Sun className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                  Light
                </span>
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Day Mode</h4>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                Permanent high-visibility daylight theme designed for clear sunlight and office environments.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-gray-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-amber-700 dark:text-amber-400 font-semibold">Always Light</span>
              {themeMode === 'light' && (
                <span className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400">
                  <Check className="w-3.5 h-3.5" /> Selected
                </span>
              )}
            </div>
          </div>

          {/* Option 3: Night Mode */}
          <div
            onClick={() => setThemeMode('dark')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              themeMode === 'dark'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 dark:border-indigo-500 shadow-sm ring-2 ring-indigo-500/20'
                : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold">
                  <Moon className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                  Dark
                </span>
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Night Mode</h4>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                Futuristic aerospace cybernetic night theme with reduced glare and luminous telemetry indicators.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-gray-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-indigo-700 dark:text-indigo-400 font-semibold">Always Dark</span>
              {themeMode === 'dark' && (
                <span className="flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-400">
                  <Check className="w-3.5 h-3.5" /> Selected
                </span>
              )}
            </div>
          </div>

          {/* Option 4: System */}
          <div
            onClick={() => setThemeMode('system')}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              themeMode === 'system'
                ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/40 dark:border-purple-500 shadow-sm ring-2 ring-purple-500/20'
                : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
                  <Monitor className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                  OS Sync
                </span>
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">System Preference</h4>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                Automatically synchronizes with your computer or phone operating system color scheme.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-gray-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-purple-700 dark:text-purple-400 font-semibold">Follow OS</span>
              {themeMode === 'system' && (
                <span className="flex items-center gap-1 font-bold text-purple-700 dark:text-purple-400">
                  <Check className="w-3.5 h-3.5" /> Selected
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Automatic Day & Night Mode Changing Settings (Schedule Customizer) */}
        {themeMode === 'auto_time' && (
          <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-slate-900/90 border border-blue-200 dark:border-slate-700 space-y-4 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/70 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-cyan-300">
                  Automatic Day & Night Changing Schedule Settings
                </h4>
              </div>
              <button
                type="button"
                onClick={handleResetSchedule}
                className="text-[11px] font-bold text-blue-700 dark:text-cyan-400 hover:underline cursor-pointer self-start sm:self-auto"
              >
                Reset to Default (06:00 Day / 18:00 Night)
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-900 dark:text-cyan-300 mb-1 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  Day Mode Starts At
                </label>
                <input
                  type="time"
                  required
                  value={customDayTime}
                  onChange={(e) => setCustomDayTime(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-cyan-500/20"
                />
                <p className="text-[10px] text-blue-700 dark:text-slate-400 mt-1">Light theme activates at this hour</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-900 dark:text-cyan-300 mb-1 flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400" />
                  Night Mode Starts At
                </label>
                <input
                  type="time"
                  required
                  value={customNightTime}
                  onChange={(e) => setCustomNightTime(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-cyan-500/20"
                />
                <p className="text-[10px] text-blue-700 dark:text-slate-400 mt-1">Dark theme activates at this hour</p>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={savingSchedule}
                  className="w-full h-10 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingSchedule ? 'Saving Schedule...' : 'Save Schedule Settings'}</span>
                </button>
              </div>
            </form>

            <div className="pt-2 text-[11px] text-blue-800 dark:text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-cyan-400 animate-pulse" />
              <span>
                Real-time monitor active: Currently <strong>{formattedRealTime}</strong> ({isRealTimeDaylight ? 'Daylight Hours' : 'Night Hours'}). The platform updates automatically without page reloads.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Role Capabilities Matrix */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Role Capabilities & Access Scope
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Permissions assigned to your account level in accordance with platform security policies:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {user?.role === 'SUPER_ADMIN' && (
            <>
              <div className="p-3 bg-purple-50 rounded-xl text-purple-900 flex items-center gap-2 border border-purple-100">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="font-medium text-xs">Full System & User Configuration Access</span>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl text-purple-900 flex items-center gap-2 border border-purple-100">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="font-medium text-xs">Service Catalog & Pricing Management</span>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl text-purple-900 flex items-center gap-2 border border-purple-100">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="font-medium text-xs">Audit Logs & Security Monitoring</span>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl text-purple-900 flex items-center gap-2 border border-purple-100">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="font-medium text-xs">Override & Reopen Work Orders</span>
              </div>
            </>
          )}

          {user?.role === 'OPERATIONS_MANAGER' && (
            <>
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-900 flex items-center gap-2 border border-indigo-100">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-medium text-xs">Team & Technician Utilization Monitoring</span>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-900 flex items-center gap-2 border border-indigo-100">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-medium text-xs">Operational KPI & CSV Export Access</span>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-900 flex items-center gap-2 border border-indigo-100">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-medium text-xs">Parts & Inventory Replenishment</span>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-900 flex items-center gap-2 border border-indigo-100">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-medium text-xs">Customer Feedback & CSAT Analysis</span>
              </div>
            </>
          )}

          {user?.role === 'DISPATCHER' && (
            <>
              <div className="p-3 bg-blue-50 rounded-xl text-blue-900 flex items-center gap-2 border border-blue-100">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-medium text-xs">Interactive Schedule & Dispatch Board</span>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl text-blue-900 flex items-center gap-2 border border-blue-100">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-medium text-xs">Service Request Triage & Conversion</span>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl text-blue-900 flex items-center gap-2 border border-blue-100">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-medium text-xs">Technician Conflict Prevention & Assignment</span>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl text-blue-900 flex items-center gap-2 border border-blue-100">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-medium text-xs">Work Order Rescheduling & Cancellation</span>
              </div>
            </>
          )}

          {user?.role === 'FIELD_TECHNICIAN' && (
            <>
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-900 flex items-center gap-2 border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium text-xs">Real-Time Job Execution Workflow (Start/Hold/Resume)</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-900 flex items-center gap-2 border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium text-xs">On-Site Parts Consumption & Return Logging</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-900 flex items-center gap-2 border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium text-xs">Field Service Report Submission & PDF Generation</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-900 flex items-center gap-2 border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium text-xs">Availability & Time-Off Management</span>
              </div>
            </>
          )}

          {user?.role === 'CUSTOMER' && (
            <>
              <div className="p-3 bg-gray-50 rounded-xl text-gray-800 flex items-center gap-2 border border-gray-200">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-medium text-xs">Submit & Track Service Requests</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl text-gray-800 flex items-center gap-2 border border-gray-200">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-medium text-xs">Track Live Field Technician Appointments</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl text-gray-800 flex items-center gap-2 border border-gray-200">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-medium text-xs">View & Download Official Service Reports</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl text-gray-800 flex items-center gap-2 border border-gray-200">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-medium text-xs">Submit Ratings & Verified Customer Feedback</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Password Change Card (Update Password Column with both Change Password and Save Password buttons) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 space-y-5">
        <div className="border-b border-gray-100 pb-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-600" />
            Update Password
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Ensure your account uses a secure password with at least 8 characters.
          </p>
        </div>

        {/* Status helper banner */}
        {!isEditingPassword ? (
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center gap-2 text-xs text-amber-900">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Password fields are locked. Click <strong>Change Password</strong> below to enable the fields.</span>
          </div>
        ) : (
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center gap-2 text-xs text-blue-900">
            <Unlock className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Password fields are enabled. Enter your current credentials and new password, then click <strong>Save Password</strong>.</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
          {/* Current Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Current Password
            </label>
            <div className="relative">
              <input
                id="current-password-input"
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={!isEditingPassword}
                required={isEditingPassword}
                className={`w-full h-11 px-3.5 pr-10 text-sm font-semibold rounded-xl border transition ${
                  isEditingPassword
                    ? 'bg-slate-50 text-gray-900 border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none'
                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed select-none'
                }`}
                placeholder={isEditingPassword ? 'Enter current password' : 'Click "Change Password" to enable'}
              />
              <button
                type="button"
                disabled={!isEditingPassword}
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className={`absolute right-3 top-3 ${
                  isEditingPassword ? 'text-gray-400 hover:text-gray-600 cursor-pointer' : 'text-gray-300 cursor-not-allowed'
                }`}
                title={showCurrentPw ? 'Hide password' : 'Show password'}
              >
                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                New Password
              </label>
              <span className={`text-[11px] font-semibold ${newPassword.length >= 8 ? 'text-emerald-600' : 'text-gray-400'}`}>
                {newPassword.length >= 8 ? '✓ 8+ chars' : 'Min 8 chars'}
              </span>
            </div>
            <div className="relative">
              <input
                type={showNewPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={!isEditingPassword}
                required={isEditingPassword}
                minLength={8}
                className={`w-full h-11 px-3.5 pr-10 text-sm font-semibold rounded-xl border transition ${
                  isEditingPassword
                    ? 'bg-slate-50 text-gray-900 border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none'
                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed select-none'
                }`}
                placeholder={isEditingPassword ? 'Enter new strong password' : 'Click "Change Password" to enable'}
              />
              <button
                type="button"
                disabled={!isEditingPassword}
                onClick={() => setShowNewPw(!showNewPw)}
                className={`absolute right-3 top-3 ${
                  isEditingPassword ? 'text-gray-400 hover:text-gray-600 cursor-pointer' : 'text-gray-300 cursor-not-allowed'
                }`}
                title={showNewPw ? 'Hide password' : 'Show password'}
              >
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Confirm New Password
              </label>
              {confirmPassword && (
                <span className={`text-[11px] font-semibold ${confirmPassword === newPassword ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {confirmPassword === newPassword ? '✓ Passwords match' : '✗ Does not match'}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showConfirmPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={!isEditingPassword}
                required={isEditingPassword}
                minLength={8}
                className={`w-full h-11 px-3.5 pr-10 text-sm font-semibold rounded-xl border transition ${
                  isEditingPassword
                    ? 'bg-slate-50 text-gray-900 border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none'
                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed select-none'
                }`}
                placeholder={isEditingPassword ? 'Re-enter new password' : 'Click "Change Password" to enable'}
              />
              <button
                type="button"
                disabled={!isEditingPassword}
                onClick={() => setShowConfirmPw(!showConfirmPw)}
                className={`absolute right-3 top-3 ${
                  isEditingPassword ? 'text-gray-400 hover:text-gray-600 cursor-pointer' : 'text-gray-300 cursor-not-allowed'
                }`}
                title={showConfirmPw ? 'Hide password' : 'Show password'}
              >
                {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action Buttons: Both 'Change Password' and 'Save Password' Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {/* Button 1: Change Password Button */}
            <button
              type="button"
              onClick={handleStartPasswordChange}
              disabled={isEditingPassword}
              className={`inline-flex items-center px-4 py-2.5 text-xs font-bold rounded-xl transition ${
                !isEditingPassword
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow-md cursor-pointer'
                  : 'bg-blue-50 text-blue-600 border border-blue-200 cursor-not-allowed opacity-80'
              }`}
            >
              <KeyRound className="w-4 h-4 mr-2" />
              {isEditingPassword ? 'Change Password (Active)' : 'Change Password'}
            </button>

            {/* Button 2: Save Password Button */}
            <button
              type="submit"
              disabled={!isEditingPassword || submittingPassword}
              className={`inline-flex items-center px-5 py-2.5 text-xs font-bold rounded-xl shadow-xs transition-all ${
                isEditingPassword
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md cursor-pointer'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
              }`}
              title={
                !isEditingPassword
                  ? 'Click "Change Password" first to enable fields'
                  : 'Save your new password permanently to the database'
              }
            >
              {submittingPassword ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving Password...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Password
                </>
              )}
            </button>

            {/* Cancel Button (Visible when editing) */}
            {isEditingPassword && (
              <button
                type="button"
                onClick={handleCancelPasswordChange}
                className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export { ProfileSettingsPage };
export default ProfileSettingsPage;
