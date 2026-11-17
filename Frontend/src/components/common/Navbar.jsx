import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { notificationsApi } from '../../api';
import {
  Wrench,
  Bell,
  User,
  LogOut,
  Check,
  CheckCheck,
  Menu,
  X,
  ExternalLink,
  Sun,
  Moon,
  Clock,
  Monitor,
  ChevronDown,
} from 'lucide-react';

export const Navbar = ({ toggleSidebar, isSidebarOpen }) => {
  const { user, logout } = useAuth();
  const {
    themeMode,
    resolvedTheme,
    isDark,
    setThemeMode,
    toggleTheme,
    formattedRealTime,
    isRealTimeDaylight,
    dayStartTime,
    nightStartTime,
  } = useTheme();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsApi.list();
      if (res.data?.success) {
        setNotifications(res.data.data);
      }
      const countRes = await notificationsApi.getUnreadCount();
      if (countRes.data?.success) {
        setUnreadCount(countRes.data.data.unread_count);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 20000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkRead = async (id, linkUrl) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (linkUrl) {
        setIsNotifOpen(false);
        navigate(linkUrl);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const roleLabels = {
    SUPER_ADMIN: 'Super Admin',
    OPERATIONS_MANAGER: 'Ops Manager',
    DISPATCHER: 'Dispatcher',
    FIELD_TECHNICIAN: 'Field Technician',
    CUSTOMER: 'Customer',
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#090e1a]/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-xs dark:shadow-lg transition-colors duration-200">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Mobile Sidebar Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 rounded-lg lg:hidden transition"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-sky-600 to-indigo-600 dark:from-cyan-500 dark:via-sky-600 dark:to-indigo-600 flex items-center justify-center text-white shadow-md dark:shadow-glow-cyan transition-transform group-hover:scale-105">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                ServiSync<span className="text-blue-600 dark:text-cyan-400">Pro</span>
              </span>
              <span className="hidden sm:block text-[9px] uppercase tracking-widest font-black text-slate-500 dark:text-cyan-400/80">
                Operations Platform • v2.6
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Live Grid Telemetry Indicator (Desktop) */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors">
          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-cyan-400 shadow-xs dark:shadow-glow-cyan animate-pulse" />
          <span className="tracking-wide">DISPATCH TELEMETRY:</span>
          <span className="text-blue-600 dark:text-cyan-400 font-extrabold">LIVE CONNECTED</span>
        </div>

        {/* Right: Theme Switcher, Notifications & User profile */}
        <div className="flex items-center gap-3">
          {/* Day / Night Real-Time Theme Mode Capsule */}
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              title="Toggle Day / Night Mode & Real-Time Settings"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50/80 hover:bg-amber-100/80 dark:bg-slate-900/90 dark:hover:bg-slate-800 border border-amber-200/90 dark:border-slate-700/80 hover:border-amber-400 dark:hover:border-cyan-500/50 transition cursor-pointer group"
            >
              {resolvedTheme === 'dark' ? (
                <Moon className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              ) : (
                <Sun className="w-4 h-4 text-amber-600 group-hover:rotate-45 transition-transform" />
              )}
              <span className="hidden sm:inline text-[11px] font-bold tracking-wider">
                {themeMode === 'auto_time' ? (
                  <span className="text-blue-700 dark:text-cyan-300 flex items-center gap-1 font-bold">
                    <Clock className="w-3 h-3 text-blue-600 dark:text-cyan-400" />
                    AUTO: {resolvedTheme === 'dark' ? 'NIGHT' : 'DAY'}
                  </span>
                ) : themeMode === 'system' ? (
                  <span className="text-slate-700 dark:text-slate-300">SYS: {resolvedTheme.toUpperCase()}</span>
                ) : themeMode === 'dark' ? (
                  <span className="text-cyan-400">NIGHT</span>
                ) : (
                  <span className="text-amber-700">DAY</span>
                )}
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-500 dark:text-slate-400 transition-transform ${isThemeMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Quick Theme Dropdown Menu */}
            {isThemeMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-slate-700/80 p-2 z-50 animate-in fade-in duration-150 text-xs text-slate-800 dark:text-slate-100">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
                  <span className="font-extrabold text-slate-700 dark:text-slate-200 uppercase text-[10px] tracking-wider">
                    Theme & Schedule
                  </span>
                  <span className="text-[10px] font-mono text-blue-600 dark:text-cyan-400 font-bold bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                    {formattedRealTime}
                  </span>
                </div>

                {/* Option 1: Automatic Real-Time */}
                <button
                  type="button"
                  onClick={() => {
                    setThemeMode('auto_time');
                    setIsThemeMenuOpen(false);
                  }}
                  className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition cursor-pointer ${
                    themeMode === 'auto_time'
                      ? 'bg-blue-50 dark:bg-cyan-950/80 text-blue-900 dark:text-cyan-300 border border-blue-200 dark:border-cyan-500/40'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-cyan-500/10 border border-blue-200 dark:border-cyan-500/30 flex items-center justify-center text-blue-600 dark:text-cyan-400 shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs text-slate-900 dark:text-white">Auto (Real Time)</p>
                      {themeMode === 'auto_time' && (
                        <Check className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      Day ({dayStartTime}) • Night ({nightStartTime})
                    </p>
                  </div>
                </button>

                {/* Option 2: Day Mode */}
                <button
                  type="button"
                  onClick={() => {
                    setThemeMode('light');
                    setIsThemeMenuOpen(false);
                  }}
                  className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition cursor-pointer mt-1 ${
                    themeMode === 'light'
                      ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                    <Sun className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs text-slate-900 dark:text-white">Day Mode (Light)</p>
                      {themeMode === 'light' && (
                        <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Crisp high-contrast daytime UI
                    </p>
                  </div>
                </button>

                {/* Option 3: Night Mode */}
                <button
                  type="button"
                  onClick={() => {
                    setThemeMode('dark');
                    setIsThemeMenuOpen(false);
                  }}
                  className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition cursor-pointer mt-1 ${
                    themeMode === 'dark'
                      ? 'bg-indigo-50 dark:bg-cyan-950/80 text-indigo-900 dark:text-cyan-300 border border-indigo-200 dark:border-cyan-500/40'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-cyan-400 shrink-0 mt-0.5">
                    <Moon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs text-slate-900 dark:text-white">Night Mode (Dark)</p>
                      {themeMode === 'dark' && (
                        <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Cyber aerospace telemetry theme
                    </p>
                  </div>
                </button>

                {/* Option 4: System */}
                <button
                  type="button"
                  onClick={() => {
                    setThemeMode('system');
                    setIsThemeMenuOpen(false);
                  }}
                  className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition cursor-pointer mt-1 ${
                    themeMode === 'system'
                      ? 'bg-purple-50 dark:bg-purple-950/80 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-500/40'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
                    <Monitor className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs text-slate-900 dark:text-white">System (OS Sync)</p>
                      {themeMode === 'system' && (
                        <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Follows device OS color scheme
                    </p>
                  </div>
                </button>

                {/* Settings Link */}
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                  <Link
                    to="/profile"
                    onClick={() => setIsThemeMenuOpen(false)}
                    className="text-[11px] font-bold text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
                  >
                    Configure Custom Hours in Settings &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80 rounded-xl transition cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs dark:shadow-glow-rose">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden z-50 animate-in fade-in duration-150">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="bg-blue-100 text-blue-800 dark:bg-cyan-950 dark:text-cyan-400 border border-blue-200 dark:border-cyan-500/40 text-xs px-2 py-0.5 rounded-full font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-blue-600 dark:text-cyan-400 hover:text-blue-800 dark:hover:text-cyan-300 font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3.5 text-xs transition hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-start gap-2.5 ${
                          !n.is_read ? 'bg-blue-50/50 dark:bg-cyan-950/20' : ''
                        }`}
                      >
                        <div className="flex-1 cursor-pointer" onClick={() => handleMarkRead(n.id, n.link_url)}>
                          <p className="font-bold text-slate-900 dark:text-slate-100 mb-0.5">{n.title}</p>
                          <p className="text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">{n.message}</p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                            {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                          </span>
                        </div>
                        {!n.is_read && (
                          <button
                            onClick={() => handleMarkRead(n.id)}
                            title="Mark as read"
                            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-cyan-400 rounded transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

          {/* User profile pill */}
          <Link
            to="/profile"
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 dark:border-slate-750 dark:hover:border-cyan-500/40 transition group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-cyan-600 dark:to-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm ring-1 ring-blue-500/20 dark:ring-cyan-400/40 group-hover:scale-105 transition-transform">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight truncate max-w-[120px] group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors">
                {user?.full_name}
              </p>
              <p className="text-[10px] font-bold text-blue-600 dark:text-cyan-400 uppercase tracking-wider">
                {roleLabels[user?.role] || user?.role}
              </p>
            </div>
          </Link>

          {/* Logout */}
          <button
            onClick={logout}
            title="Log out"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
