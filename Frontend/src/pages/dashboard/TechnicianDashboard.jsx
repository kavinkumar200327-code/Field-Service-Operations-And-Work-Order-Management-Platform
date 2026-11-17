import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi, workOrdersApi } from '../../api';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import {
  Wrench,
  Navigation,
  Play,
  Pause,
  CheckCircle,
  Calendar,
  Clock,
  Phone,
  MapPin,
  ArrowRight,
  Package,
  FileCheck,
} from 'lucide-react';

export const TechnicianDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  const fetchMetrics = async () => {
    try {
      const res = await analyticsApi.getTechnicianDashboard();
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleStartJob = async (woId) => {
    try {
      await workOrdersApi.start(woId);
      success("Job started! Status updated to IN PROGRESS.");
      fetchMetrics();
    } catch (err) {
      error(err.response?.data?.error?.message || "Failed to start job.");
    }
  };

  const formatTimeSlot = (timeStr) => {
    if (!timeStr) return 'TBD';
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      const [h, m] = timeStr.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${String(m).padStart(2, '0')} ${period}`;
    }
    return timeStr;
  };

  if (loading) return <LoadingSpinner text="Loading technician workspace..." />;

  const activeJob = data?.active_job;

  return (
    <div className="space-y-6">
      {/* Active Job Hero Banner (if on site) */}
      {activeJob ? (
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-sky-50/70 dark:from-[#09152b] dark:via-[#0f2444] dark:to-[#141b38] rounded-3xl p-6 sm:p-7 shadow-xs dark:shadow-2xl border border-emerald-200/80 dark:border-cyan-500/30 transition-colors">
          <div className="hidden dark:block absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 text-[10px] font-black px-3 py-1 rounded-full dark:border-emerald-500/40 uppercase tracking-widest mb-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 shadow-glow-emerald animate-pulse" />
                Active In-Progress Field Job
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                {activeJob.number} • {activeJob.service}
              </h2>
              <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600 dark:text-cyan-400 shrink-0" />
                  <span>{activeJob.location}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-cyan-400 shrink-0" />
                  <span>Dispatched timestamp: {formatTimeSlot(activeJob.started_at)}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                to={`/work-orders/${activeJob.id}`}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-sm dark:bg-gradient-to-r dark:from-sky-500 dark:via-cyan-500 dark:to-indigo-600 dark:hover:from-sky-400 dark:hover:via-cyan-400 dark:hover:to-indigo-500 dark:text-slate-950 dark:font-black text-xs rounded-xl dark:shadow-glow-cyan transition flex items-center gap-2 active:scale-95"
              >
                <span>Job Action Center</span>
                <ArrowRight className="w-4 h-4 text-white dark:text-slate-950" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-indigo-50/70 dark:from-[#090e1a] dark:via-[#0d1627] dark:to-[#090e1a] rounded-3xl p-6 sm:p-7 shadow-xs dark:shadow-2xl border border-blue-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
          <div className="hidden dark:block absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 border border-blue-200 dark:bg-cyan-950/80 dark:border-cyan-500/30 dark:text-cyan-400 flex items-center justify-center font-bold dark:shadow-glow-cyan">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-transparent px-2 py-0.5 rounded border border-emerald-200 dark:border-none mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                Fleet Ready • Dispatch Grid Standby
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Technician Operational Readiness</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Standby mode active. Review assigned work orders below to navigate and execute service checklists.
              </p>
            </div>
          </div>
          <Link
            to="/work-orders"
            className="relative z-10 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-white border border-blue-600 dark:border-slate-700/80 dark:hover:border-cyan-500/40 transition shrink-0 active:scale-95"
          >
            My Work Orders &rarr;
          </Link>
        </div>
      )}

      {/* Metrics - Interactive workable buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Work Orders"
          value={data?.my_assigned_work_orders_count || 0}
          subtitle="Total assigned to you • View all"
          icon={Wrench}
          color="blue"
          to="/work-orders"
        />
        <StatCard
          title="Today's Appointments"
          value={data?.today_appointments_count || 0}
          subtitle="Scheduled for today • View calendar"
          icon={Calendar}
          color="amber"
          to="/schedule"
        />
        <StatCard
          title="Completed Jobs"
          value={data?.completed_jobs_count || 0}
          subtitle="Successfully executed • Filter done"
          icon={CheckCircle}
          color="emerald"
          to="/work-orders?status=COMPLETED"
        />
        <StatCard
          title="Parts Issued"
          value={data?.parts_issued_count || 0}
          subtitle="Tracked in inventory • Inventory hub"
          icon={Package}
          color="purple"
          to="/inventory"
        />
      </div>

      {/* Today's Schedule */}
      <div className="bg-white dark:bg-slate-900/95 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm dark:shadow-lg overflow-hidden transition-colors">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Today's Appointment Schedule</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Chronological appointment agenda</p>
          </div>
          <Link to="/schedule" className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-cyan-400 dark:hover:text-cyan-300">
            Open Calendar
          </Link>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {data?.today_appointments?.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No appointments scheduled for today. Check upcoming days in the Calendar.
            </div>
          ) : (
            data?.today_appointments?.map((app) => (
              <div key={app.id} className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex flex-col items-center justify-center font-bold shrink-0">
                    <Clock className="w-4 h-4 text-blue-600 dark:text-cyan-400 mb-0.5" />
                    <span className="text-[10px]">{formatTimeSlot(app.time)}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{app.number}</span>
                      <StatusBadge status={app.status} />
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{app.customer}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{app.location}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/work-orders/${app.id}`}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
