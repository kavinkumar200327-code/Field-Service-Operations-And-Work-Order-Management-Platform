import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Columns3,
  FileQuestion,
  Users2,
  Building2,
  Package,
  FileCheck,
  Star,
  BarChart3,
  SlidersHorizontal,
  Settings,
  ShieldCheck,
  Radio,
  Cpu,
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, hasRole } = useAuth();

  const isStaff = hasRole(['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'DISPATCHER', 'FIELD_TECHNICIAN']);
  const isAdminOrManager = hasRole(['SUPER_ADMIN', 'OPERATIONS_MANAGER']);
  const isDispatcher = hasRole(['SUPER_ADMIN', 'OPERATIONS_MANAGER', 'DISPATCHER']);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, show: true },
    { label: 'Work Orders', path: '/work-orders', icon: ClipboardList, show: true },
    { label: 'Dispatch Board', path: '/dispatch-board', icon: Columns3, show: isDispatcher },
    { label: 'Schedule Calendar', path: '/schedule', icon: CalendarDays, show: isStaff },
    { label: 'Service Requests', path: '/service-requests', icon: FileQuestion, show: true },
    { label: 'Technicians', path: '/technicians', icon: Users2, show: isDispatcher },
    { label: 'Customers', path: '/customers', icon: Building2, show: isDispatcher },
    { label: 'Service Catalog', path: '/services', icon: SlidersHorizontal, show: true },
    { label: 'Parts & Inventory', path: '/inventory', icon: Package, show: isStaff },
    { label: 'Service Reports', path: '/service-reports', icon: FileCheck, show: true },
    { label: 'Customer Feedback', path: '/feedback', icon: Star, show: true },
    { label: 'Reports & Analytics', path: '/reports', icon: BarChart3, show: isAdminOrManager },
    { label: 'Profile & Settings', path: '/profile', icon: Settings, show: true },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Dynamic Day/Night Cyber Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white dark:bg-gradient-to-b dark:from-[#0b1120] dark:via-[#090e1a] dark:to-[#050811] text-slate-600 dark:text-slate-300 flex flex-col transition-all duration-200 ease-in-out border-r border-slate-200 dark:border-slate-800/80 shadow-xs dark:shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1">
          {/* Navigation Title Header with Live Radio Signal */}
          <div className="px-3 pb-2.5 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-cyan-400/90 border-b border-slate-200 dark:border-slate-800/60 mb-2">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
              <span>Operations Grid</span>
            </span>
            <span className="flex items-center gap-1 text-[9px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          </div>

          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-bold dark:bg-gradient-to-r dark:from-sky-600 dark:via-sky-500 dark:to-indigo-600 dark:text-white dark:border-l-2 dark:border-cyan-300 dark:shadow-glow-sky'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                          isActive
                            ? 'text-blue-600 dark:text-white'
                            : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-cyan-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-cyan-300 shadow-xs dark:shadow-glow-cyan animate-pulse" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
        </div>

        {/* Bottom Role / Security Telemetry HUD */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-950/80 backdrop-blur">
          <div className="bg-white dark:bg-slate-900/90 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs dark:shadow-none">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Role Scope</p>
                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate max-w-[110px]">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-xs dark:shadow-glow-emerald animate-pulse" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
