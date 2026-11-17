import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi } from '../../api';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Columns3,
  CalendarDays,
  UserCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  UserPlus,
  Flame,
  MapPin,
  CheckCircle2,
  ExternalLink,
  Phone,
  Mail,
  Wrench,
  ShieldAlert,
  ChevronRight,
  Layers,
  Sparkles
} from 'lucide-react';

export const DispatcherDashboard = ({ onOpenAssignModal }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('unassigned');

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await analyticsApi.getDispatcherDashboard();
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const formatDateTime = (dateStr) => {
    if (!dateStr || dateStr === 'Flexible') return 'Flexible';
    try {
      const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T'));
      if (isNaN(d.getTime())) return dateStr;
      return (
        d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) +
        ' • ' +
        d.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch {
      return dateStr;
    }
  };

  const formatTimeSlot = (timeStr) => {
    if (!timeStr) return 'Today';
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      const [h, m] = timeStr.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${String(m).padStart(2, '0')} ${period}`;
    }
    return timeStr;
  };

  if (loading) return <LoadingSpinner text="Loading dispatcher operations..." />;

  const unassignedCount = data?.unassigned_work_orders_count || 0;
  const todayCount = data?.today_scheduled_jobs_count || 0;
  const activeTechsCount = data?.active_technicians_count || 0;
  const urgentCount = data?.urgent_jobs_count || 0;

  return (
    <div className="space-y-6">
      {/* Quick Action Top Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-indigo-50/80 dark:from-[#091528] dark:via-[#0e1d38] dark:to-[#161f38] p-6 sm:p-7 rounded-3xl shadow-xs dark:shadow-2xl border border-blue-100 dark:border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-colors">
        <div className="hidden dark:block absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 border border-blue-200 dark:bg-cyan-950/80 dark:text-cyan-300 text-[10px] font-black px-3 py-1 rounded-full dark:border-cyan-500/40 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-cyan-400 animate-pulse" />
            Dispatch Command Center
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Active Schedule & Resource Routing</h2>
          <p className="text-slate-600 dark:text-slate-300 text-xs max-w-xl leading-relaxed">
            Allocate unassigned jobs, resolve schedule conflicts, and balance field technician workloads across active dispatch zones.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 relative z-10 flex-wrap">
          <Link
            to="/dispatch-board"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-sm dark:bg-gradient-to-r dark:from-sky-500 dark:via-cyan-500 dark:to-indigo-600 dark:hover:from-sky-400 dark:hover:via-cyan-400 dark:hover:to-indigo-500 dark:text-slate-950 dark:font-black text-xs rounded-xl dark:shadow-glow-cyan transition flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Columns3 className="w-4 h-4 text-white dark:text-slate-950" />
            <span>Interactive Dispatch Board</span>
          </Link>
          <Link
            to="/schedule"
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 dark:bg-slate-800/90 dark:hover:bg-slate-700/90 dark:text-white dark:border-slate-700/80 dark:hover:border-cyan-500/40 transition flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <CalendarDays className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
            <span>Calendar Grid</span>
          </Link>
        </div>
      </div>

      {/* 4 Clickable Metric Buttons with Active Highlight */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Button 1: Unassigned Work Orders */}
        <div
          onClick={() => setActiveTab('unassigned')}
          className={`cursor-pointer transition-all duration-200 rounded-2xl ${
            activeTab === 'unassigned'
              ? 'ring-2 ring-amber-500 shadow-lg -translate-y-0.5 bg-amber-50/20'
              : 'hover:-translate-y-0.5 hover:shadow-md'
          }`}
        >
          <StatCard
            title="Unassigned Work Orders"
            value={unassignedCount}
            subtitle={activeTab === 'unassigned' ? "✓ Showing queue below" : "Click to view unassigned orders"}
            icon={UserPlus}
            color="amber"
          />
        </div>

        {/* Button 2: Today's Scheduled Jobs */}
        <div
          onClick={() => setActiveTab('today')}
          className={`cursor-pointer transition-all duration-200 rounded-2xl ${
            activeTab === 'today'
              ? 'ring-2 ring-blue-500 shadow-lg -translate-y-0.5 bg-blue-50/20'
              : 'hover:-translate-y-0.5 hover:shadow-md'
          }`}
        >
          <StatCard
            title="Today's Scheduled Jobs"
            value={todayCount}
            subtitle={activeTab === 'today' ? "✓ Showing schedule below" : "Click to view today's jobs"}
            icon={CalendarDays}
            color="blue"
          />
        </div>

        {/* Button 3: Active Technicians */}
        <div
          onClick={() => setActiveTab('technicians')}
          className={`cursor-pointer transition-all duration-200 rounded-2xl ${
            activeTab === 'technicians'
              ? 'ring-2 ring-emerald-500 shadow-lg -translate-y-0.5 bg-emerald-50/20'
              : 'hover:-translate-y-0.5 hover:shadow-md'
          }`}
        >
          <StatCard
            title="Active Technicians"
            value={activeTechsCount}
            subtitle={activeTab === 'technicians' ? "✓ Showing fleet below" : "Click to view active technicians"}
            icon={UserCheck}
            color="emerald"
          />
        </div>

        {/* Button 4: Urgent Service Jobs */}
        <div
          onClick={() => setActiveTab('urgent')}
          className={`cursor-pointer transition-all duration-200 rounded-2xl ${
            activeTab === 'urgent'
              ? 'ring-2 ring-rose-500 shadow-lg -translate-y-0.5 bg-rose-50/20'
              : 'hover:-translate-y-0.5 hover:shadow-md'
          }`}
        >
          <StatCard
            title="Urgent Service Jobs"
            value={urgentCount}
            subtitle={activeTab === 'urgent' ? "✓ Showing priority below" : "Click to view urgent jobs"}
            icon={Flame}
            color="rose"
          />
        </div>
      </div>

      {/* Interactive Category Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('unassigned')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'unassigned'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-700/80'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Unassigned Work Orders</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'unassigned' ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            {unassignedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('today')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'today'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-700/80'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Today's Scheduled Jobs</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'today' ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            {todayCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('technicians')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'technicians'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-700/80'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Active Technicians</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'technicians' ? 'bg-emerald-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            {activeTechsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('urgent')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'urgent'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-700/80'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Urgent Service Jobs</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'urgent' ? 'bg-rose-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            {urgentCount}
          </span>
        </button>
      </div>

      {/* Main Dynamic Information Container */}
      <div className="bg-white dark:bg-slate-900/95 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden transition-colors">
        {/* VIEW 1: UNASSIGNED WORK ORDERS */}
        {activeTab === 'unassigned' && (
          <div>
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/30">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-amber-600" />
                  Unassigned Work Orders Queue
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Orders requiring technician allocation and slot scheduling to prevent service delays
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  to="/dispatch-board"
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <Columns3 className="w-3.5 h-3.5" />
                  <span>Dispatch Board</span>
                </Link>
                <Link
                  to="/work-orders?status=UNASSIGNED"
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <span>All in Work Orders</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {(!data?.unassigned_work_orders || data.unassigned_work_orders.length === 0) ? (
                <div className="p-12 text-center text-slate-500">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-slate-800">All work orders currently have assigned technicians!</p>
                  <p className="text-xs text-slate-400 mt-1">New work orders will appear here automatically when created without technician assignment.</p>
                </div>
              ) : (
                data.unassigned_work_orders.map((wo) => (
                  <div key={wo.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{wo.number}</span>
                        <PriorityBadge priority={wo.priority} />
                        <StatusBadge status={wo.status} />
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Awaiting Assignment
                        </span>
                      </div>
                      <p className="font-bold text-slate-800 text-sm">
                        {wo.service} <span className="font-normal text-slate-500">• {wo.customer}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-slate-500 text-[11px]">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {wo.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Requested: {formatDateTime(wo.scheduled_start)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/dispatch-board`}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Dispatch Slot</span>
                      </Link>
                      <Link
                        to={`/work-orders/${wo.id}`}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: TODAY'S SCHEDULED JOBS */}
        {activeTab === 'today' && (
          <div>
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-sky-50/30">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-sky-600" />
                  Today's Scheduled Jobs Timeline
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live appointments and on-site service operations scheduled for execution today
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  to="/dispatch-board"
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <Columns3 className="w-3.5 h-3.5" />
                  <span>Interactive Board</span>
                </Link>
                <Link
                  to="/schedule"
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <span>Calendar View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {(!data?.today_jobs || data.today_jobs.length === 0) ? (
                <div className="p-12 text-center text-slate-500">
                  <CalendarDays className="w-10 h-10 text-sky-400 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-slate-800">No appointments scheduled for today.</p>
                  <p className="text-xs text-slate-400 mt-1">Book slots on the Interactive Dispatch Board or Schedule Calendar.</p>
                </div>
              ) : (
                data.today_jobs.map((job) => (
                  <div key={job.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="flex items-start gap-3.5 flex-1">
                      <div className="p-2.5 rounded-xl bg-sky-50 text-sky-700 font-bold border border-sky-100 text-center shrink-0 min-w-[70px]">
                        <Clock className="w-3.5 h-3.5 mx-auto mb-0.5 text-sky-600" />
                        <span className="text-xs">{formatTimeSlot(job.time)}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{job.number}</span>
                          <StatusBadge status={job.status} />
                          {job.priority && <PriorityBadge priority={job.priority} />}
                        </div>
                        <p className="font-bold text-slate-800 text-sm">
                          {job.service || 'Service Job'} <span className="font-normal text-slate-500">• {job.customer}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-slate-500 text-[11px]">
                          <span>
                            Technician: <strong className="text-slate-800">{job.technician}</strong>
                          </span>
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {job.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/dispatch-board`}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition flex items-center gap-1.5"
                      >
                        <Columns3 className="w-3.5 h-3.5" />
                        <span>Dispatch Board</span>
                      </Link>
                      <Link
                        to={`/work-orders/${job.id}`}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: ACTIVE TECHNICIANS */}
        {activeTab === 'technicians' && (
          <div>
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/30">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  Active Technician Fleet Roster
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified field specialists, operational availability, skill categories, and assigned regional territories
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  to="/technicians"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Full Technician Directory</span>
                </Link>
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(!data?.technician_availability_summary || data.technician_availability_summary.length === 0) ? (
                <div className="col-span-full p-12 text-center text-slate-500">
                  No active technicians registered in the roster.
                </div>
              ) : (
                data.technician_availability_summary.map((tech) => (
                  <div
                    key={tech.id}
                    className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-emerald-300 hover:shadow-md transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                          {tech.name?.charAt(0) || 'T'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{tech.name}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {tech.region || 'All Territories'}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={tech.status} />
                    </div>

                    {tech.skills && tech.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tech.skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {tech.phone || 'Phone verified'}
                      </span>
                      <Link
                        to={`/technicians/${tech.id}`}
                        className="font-bold text-sky-600 hover:text-sky-800 flex items-center gap-0.5"
                      >
                        <span>Profile</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW 4: URGENT SERVICE JOBS */}
        {activeTab === 'urgent' && (
          <div>
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-50/30">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-rose-600" />
                  Urgent & High-Priority Service Jobs
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Critical service tickets, emergency repairs, and high-impact work orders requiring fast-track dispatch
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  to="/work-orders?priority=URGENT"
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Filter in Work Orders</span>
                </Link>
                <Link
                  to="/dispatch-board"
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <span>Dispatch Board</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {(!data?.urgent_service_jobs || data.urgent_service_jobs.length === 0) ? (
                <div className="p-12 text-center text-slate-500">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-slate-800">No urgent or critical incidents currently pending!</p>
                  <p className="text-xs text-slate-400 mt-1">All high-priority tickets are handled.</p>
                </div>
              ) : (
                data.urgent_service_jobs.map((wo) => (
                  <div key={wo.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{wo.number}</span>
                        <PriorityBadge priority={wo.priority} />
                        <StatusBadge status={wo.status} />
                        <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          Priority Attention
                        </span>
                      </div>
                      <p className="font-bold text-slate-800 text-sm">
                        {wo.service} <span className="font-normal text-slate-500">• {wo.customer}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-slate-500 text-[11px]">
                        <span>
                          Assigned Technician:{' '}
                          {wo.technician === 'Unassigned' ? (
                            <strong className="text-rose-600 font-bold">Unassigned (Action Required)</strong>
                          ) : (
                            <strong className="text-slate-800">{wo.technician}</strong>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {wo.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {wo.scheduled_start}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/work-orders/${wo.id}`}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>Fast-Track</span>
                      </Link>
                      <Link
                        to={`/dispatch-board`}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
                      >
                        Dispatch Board
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
