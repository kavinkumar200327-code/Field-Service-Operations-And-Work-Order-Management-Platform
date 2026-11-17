import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi, serviceReportsApi } from '../../api';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  FileQuestion,
  Calendar,
  ClipboardCheck,
  Star,
  PlusCircle,
  FileDown,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const CustomerDashboard = ({ onOpenNewRequestModal }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const res = await analyticsApi.getCustomerDashboard();
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

  const formatAppointmentTime = (dateStr) => {
    if (!dateStr || dateStr === 'TBD') return 'To be scheduled';
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

  if (loading) return <LoadingSpinner text="Loading customer portal..." />;

  return (
    <div className="space-y-6">
      {/* Welcome Banner with Action */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-indigo-50/80 dark:from-[#09152b] dark:via-[#0f274a] dark:to-[#1e1b4b] rounded-3xl p-6 sm:p-7 shadow-xs dark:shadow-2xl border border-blue-100 dark:border-sky-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-colors">
        <div className="hidden dark:block absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 border border-blue-200 dark:bg-cyan-950/80 dark:text-cyan-300 text-[10px] font-black px-3 py-1 rounded-full dark:border-cyan-500/40 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-cyan-400 animate-pulse" />
            Customer Self-Service Hub
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Welcome to Your Service Portal</h2>
          <p className="text-slate-600 dark:text-slate-300 text-xs max-w-xl leading-relaxed">
            Request on-site maintenance, track your dispatched specialist in real-time, and download certified service reports.
          </p>
        </div>
        <Link
          to="/service-requests?new=true"
          className="relative z-10 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-sm dark:bg-gradient-to-r dark:from-sky-500 dark:via-cyan-500 dark:to-indigo-600 dark:hover:from-sky-400 dark:hover:via-cyan-400 dark:hover:to-indigo-500 dark:text-slate-950 dark:font-black text-xs rounded-xl dark:shadow-glow-cyan transition flex items-center justify-center gap-2 shrink-0 active:scale-95"
        >
          <PlusCircle className="w-4 h-4 text-white dark:text-slate-950" />
          <span>Book Service Request</span>
        </Link>
      </div>

      {/* Metrics - All interactive workable buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Work Orders"
          value={data?.active_work_orders_count || 0}
          subtitle="Currently underway • View active jobs"
          icon={Calendar}
          color="blue"
          to="/work-orders"
        />
        <StatCard
          title="Completed Services"
          value={data?.completed_services_count || 0}
          subtitle="All historical jobs • View reports"
          icon={ClipboardCheck}
          color="emerald"
          to="/service-reports"
        />
        <StatCard
          title="Service Requests"
          value={data?.my_service_requests_count || 0}
          subtitle="Total requests logged • View requests"
          icon={FileQuestion}
          color="purple"
          to="/service-requests"
        />
        <StatCard
          title="Reviews Submitted"
          value={data?.feedback_submitted_count || 0}
          subtitle="Verified feedback ratings • View reviews"
          icon={Star}
          color="amber"
          to="/feedback"
        />
      </div>

      {/* Active Work Orders */}
      <div className="bg-white dark:bg-slate-900/95 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm dark:shadow-lg overflow-hidden transition-colors">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Current & Upcoming Appointments</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Live technician dispatch and status tracking</p>
          </div>
          <Link to="/work-orders" className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-cyan-400 dark:hover:text-cyan-300 flex items-center gap-1 transition">
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {data?.active_work_orders?.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No active work orders right now. Click "Book Service Request" above to schedule an inspection.
            </div>
          ) : (
            data?.active_work_orders?.map((wo) => (
              <div key={wo.id} className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{wo.number}</span>
                    <StatusBadge status={wo.status} />
                  </div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{wo.service}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Assigned Technician: <strong className="text-slate-700 dark:text-slate-300">{wo.technician}</strong> | Scheduled for: {formatAppointmentTime(wo.scheduled_start)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/work-orders/${wo.id}`}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
                  >
                    <span>Track Order</span>
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
