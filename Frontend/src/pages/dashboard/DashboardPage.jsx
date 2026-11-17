import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { OperationsDashboard } from './OperationsDashboard';
import { DispatcherDashboard } from './DispatcherDashboard';
import { TechnicianDashboard } from './TechnicianDashboard';
import { CustomerDashboard } from './CustomerDashboard';
import { Shield, Eye, Settings, CheckCircle2, ClipboardList, Clock, Columns3, BarChart3, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage = () => {
  const { user } = useAuth();
  // Allow admins or managers to preview dashboards from other roles
  const [previewRole, setPreviewRole] = useState(null);

  const activeRole = previewRole || user?.role || 'SUPER_ADMIN';
  const isStaffAdmin = ['SUPER_ADMIN', 'OPERATIONS_MANAGER'].includes(user?.role);

  const roleButtons = user?.role === 'SUPER_ADMIN'
    ? [
        { id: 'SUPER_ADMIN', label: 'Super Admin' },
        { id: 'OPERATIONS_MANAGER', label: 'Operations' },
        { id: 'DISPATCHER', label: 'Dispatcher' },
        { id: 'FIELD_TECHNICIAN', label: 'Technician' },
        { id: 'CUSTOMER', label: 'Customer' },
      ]
    : [
        { id: 'OPERATIONS_MANAGER', label: 'Operations' },
        { id: 'DISPATCHER', label: 'Dispatcher' },
        { id: 'FIELD_TECHNICIAN', label: 'Technician' },
        { id: 'CUSTOMER', label: 'Customer' },
      ];

  return (
    <div className="space-y-6">
      {/* Role Preview Switcher for Admins/Managers */}
      {isStaffAdmin && (
        <div className="bg-white dark:bg-slate-900/95 backdrop-blur-xl p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-300 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-cyan-500/10 border border-blue-200 dark:border-cyan-500/30 flex items-center justify-center text-blue-600 dark:text-cyan-400">
              <Eye className="w-3.5 h-3.5" />
            </div>
            <span>
              Active Perspective:{' '}
              <strong className="text-slate-900 dark:text-white font-extrabold uppercase tracking-wide">
                {activeRole.replace('_', ' ')}
              </strong>
            </span>
            {previewRole && previewRole !== user?.role && (
              <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 border border-amber-300 dark:border-amber-500/40">
                Preview Telemetry
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">Switch View:</span>
            {roleButtons.map((r) => {
              const isSelected = activeRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setPreviewRole(r.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition duration-150 shadow-xs cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm dark:bg-gradient-to-r dark:from-sky-500 dark:to-cyan-500 dark:text-slate-950 dark:shadow-glow-cyan dark:font-black'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/80 dark:hover:text-white dark:border-slate-700/80'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* When in SUPER_ADMIN perspective, display an Administrative Governance Banner */}
      {activeRole === 'SUPER_ADMIN' && (
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-50/90 via-sky-50/60 to-indigo-50/80 dark:from-[#090e1a] dark:via-[#0d1627] dark:to-[#090e1a] p-6 rounded-3xl border border-blue-100 dark:border-cyan-500/30 shadow-xs dark:shadow-2xl transition-colors">
          {/* Subtle top laser glow - Night Mode Only */}
          <div className="hidden dark:block absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-800 border border-blue-200 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border-cyan-500/40 px-3 py-1 rounded-full">
                  <Shield className="w-3 h-3 text-blue-600 dark:text-cyan-400" /> System Governance HUD
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  All Microservices Nominal
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Platform Governance & Core Enterprise Infrastructure
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Configure rate matrices, supervise field technician rosters, inspect multi-tenant audit logs, and override operational work order pipelines.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Link
                to="/services"
                className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs dark:bg-slate-800/90 dark:hover:bg-slate-700/90 dark:text-white text-xs font-bold rounded-xl dark:border-slate-700/80 dark:hover:border-cyan-500/50 transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                <span>Service Rates</span>
              </Link>
              <Link
                to="/technicians"
                className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs dark:bg-slate-800/90 dark:hover:bg-slate-700/90 dark:text-white text-xs font-bold rounded-xl dark:border-slate-700/80 dark:hover:border-cyan-500/50 transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <span>Tech Fleet</span>
              </Link>
              <Link
                to="/reports"
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-sm dark:bg-gradient-to-r dark:from-sky-500 dark:via-cyan-500 dark:to-indigo-600 dark:hover:from-sky-400 dark:hover:via-cyan-400 dark:hover:to-indigo-500 dark:text-slate-950 dark:font-black text-xs rounded-xl dark:shadow-glow-cyan transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <span>Analytics Grid &rarr;</span>
              </Link>
            </div>
          </div>

          {/* Super Admin Quick Launch Command Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-slate-200/80 dark:border-slate-800/80 relative z-10">
            <Link
              to="/work-orders"
              className="p-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 shadow-2xs dark:bg-slate-900/80 dark:hover:bg-slate-850 dark:text-slate-200 dark:border-slate-800 rounded-xl transition flex items-center gap-2.5 text-xs hover:border-blue-400 dark:hover:border-cyan-500/40 active:scale-95 group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 dark:bg-sky-500/10 dark:border-sky-500/20 dark:text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ClipboardList className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold">Work Orders</span>
            </Link>

            <Link
              to="/service-requests"
              className="p-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 shadow-2xs dark:bg-slate-900/80 dark:hover:bg-slate-850 dark:text-slate-200 dark:border-slate-800 rounded-xl transition flex items-center gap-2.5 text-xs hover:border-amber-400 dark:hover:border-amber-500/40 active:scale-95 group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold">Triage Requests</span>
            </Link>

            <Link
              to="/dispatch-board"
              className="p-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 shadow-2xs dark:bg-slate-900/80 dark:hover:bg-slate-850 dark:text-slate-200 dark:border-slate-800 rounded-xl transition flex items-center gap-2.5 text-xs hover:border-indigo-400 dark:hover:border-indigo-500/40 active:scale-95 group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Columns3 className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold">Dispatch Board</span>
            </Link>

            <Link
              to="/customers"
              className="p-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 shadow-2xs dark:bg-slate-900/80 dark:hover:bg-slate-850 dark:text-slate-200 dark:border-slate-800 rounded-xl transition flex items-center gap-2.5 text-xs hover:border-emerald-400 dark:hover:border-emerald-500/40 active:scale-95 group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold">Client Roster</span>
            </Link>
          </div>
        </div>
      )}

      {/* Render selected role dashboard */}
      {activeRole === 'CUSTOMER' && <CustomerDashboard />}
      {activeRole === 'FIELD_TECHNICIAN' && <TechnicianDashboard />}
      {activeRole === 'DISPATCHER' && <DispatcherDashboard />}
      {(activeRole === 'OPERATIONS_MANAGER' || activeRole === 'SUPER_ADMIN') && <OperationsDashboard />}
    </div>
  );
};

export default DashboardPage;
