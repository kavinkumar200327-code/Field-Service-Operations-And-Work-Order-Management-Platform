import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { analyticsApi, workOrdersApi } from '../../api';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  ClipboardList,
  Clock,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Percent,
  Star,
  AlertTriangle,
  ArrowRight,
  Filter,
  Download,
  Calendar,
  Layers,
  Search,
  X,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  Legend,
} from 'recharts';

export const OperationsDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendTimeframe, setTrendTimeframe] = useState('6M');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedStatusModal, setSelectedStatusModal] = useState(null);
  const [modalWorkOrders, setModalWorkOrders] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedStatusModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStatusClick = async (statusItem) => {
    if (!statusItem) return;
    const target = statusItem?.statusKey
      ? statusItem
      : statusItem?.payload?.statusKey
      ? statusItem.payload
      : statusItem?.activePayload?.[0]?.payload;
    if (!target || !target.statusKey) return;

    setSelectedStatusModal(target);
    setModalSearch('');
    setModalLoading(true);
    try {
      const res = await workOrdersApi.list({ status: target.statusKey });
      if (res.data?.success) {
        setModalWorkOrders(res.data.data || []);
      } else {
        setModalWorkOrders([]);
      }
    } catch (err) {
      console.error("Failed to load work orders for status:", target.statusKey, err);
      setModalWorkOrders([]);
    } finally {
      setModalLoading(false);
    }
  };

  const getStatusMeta = (statusKey) => {
    switch (statusKey) {
      case 'SCHEDULED':
        return {
          title: 'Scheduled Work Orders',
          subtitle: 'Work orders booked and confirmed in the dispatch queue',
          badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dotColor: '#6366F1',
          icon: Calendar,
        };
      case 'IN_PROGRESS':
        return {
          title: 'In Progress Work Orders',
          subtitle: 'Work orders actively being serviced by field technicians',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
          dotColor: '#F59E0B',
          icon: PlayCircle,
        };
      case 'COMPLETED':
        return {
          title: 'Completed Work Orders',
          subtitle: 'Work orders fulfilled and verified with signed service reports',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dotColor: '#10B981',
          icon: CheckCircle2,
        };
      case 'CANCELLED':
        return {
          title: 'Cancelled Work Orders',
          subtitle: 'Work orders terminated prior to execution or requested cancellation',
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
          dotColor: '#EF4444',
          icon: AlertCircle,
        };
      default:
        return {
          title: `${statusKey} Work Orders`,
          subtitle: 'Work order operations status details',
          badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
          dotColor: '#64748B',
          icon: ClipboardList,
        };
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Not scheduled';
    try {
      const safeStr = typeof dateStr === 'string' && !dateStr.includes('T') ? dateStr.replace(' ', 'T') : dateStr;
      const d = new Date(safeStr);
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

  const filteredModalOrders = modalWorkOrders.filter((wo) => {
    if (!modalSearch.trim()) return true;
    const term = modalSearch.toLowerCase();
    return (
      (wo.work_order_number && wo.work_order_number.toLowerCase().includes(term)) ||
      (wo.customer_name && wo.customer_name.toLowerCase().includes(term)) ||
      (wo.service_name && wo.service_name.toLowerCase().includes(term)) ||
      (wo.service_location && wo.service_location.toLowerCase().includes(term)) ||
      (wo.technician_name && wo.technician_name.toLowerCase().includes(term)) ||
      (wo.priority && wo.priority.toLowerCase().includes(term))
    );
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await analyticsApi.getOperationsDashboard();
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

  if (loading) return <LoadingSpinner text="Compiling operational intelligence..." />;

  // Professional status color definitions
  const statusDistribution = [
    { name: 'Scheduled', count: data?.scheduled_jobs || 0, fill: '#6366F1', statusKey: 'SCHEDULED' },   // Vibrant Indigo
    { name: 'In Progress', count: data?.in_progress_jobs || 0, fill: '#F59E0B', statusKey: 'IN_PROGRESS' }, // Warm Amber Gold
    { name: 'Completed', count: data?.completed_jobs || 0, fill: '#10B981', statusKey: 'COMPLETED' },   // Emerald Green
    { name: 'Cancelled', count: data?.cancelled_jobs || 0, fill: '#EF4444', statusKey: 'CANCELLED' },   // Crimson Red
  ];

  // Dynamic trend data based on selected timeframe button
  const getTrendData = () => {
    if (trendTimeframe === '7D') {
      return [
        { month: 'Mon', completed: 3, new: 4 },
        { month: 'Tue', completed: 5, new: 6 },
        { month: 'Wed', completed: 4, new: 5 },
        { month: 'Thu', completed: 7, new: 8 },
        { month: 'Fri', completed: 6, new: 7 },
        { month: 'Sat', completed: 2, new: 3 },
        { month: 'Sun', completed: 1, new: 2 },
      ];
    }
    if (trendTimeframe === '30D') {
      return [
        { month: 'Week 1', completed: 12, new: 14 },
        { month: 'Week 2', completed: 15, new: 16 },
        { month: 'Week 3', completed: 18, new: 20 },
        { month: 'Week 4', completed: data?.completed_jobs || 8, new: data?.total_work_orders || 10 },
      ];
    }
    // Default: 6M
    return data?.monthly_trend || [
      { month: 'May', completed: 24, new: 28 },
      { month: 'Jun', completed: 32, new: 35 },
      { month: 'Jul', completed: 40, new: 42 },
      { month: 'Aug', completed: 38, new: 40 },
      { month: 'Sep', completed: 45, new: 48 },
      { month: 'Oct', completed: data?.completed_jobs || 4, new: data?.total_work_orders || 4 },
    ];
  };

  // Filter recent work orders based on interactive status pills
  const filteredOrders = data?.recent_work_orders?.filter((wo) => {
    if (statusFilter === 'ALL') return true;
    return wo.status === statusFilter;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Top Stat Cards - All interactive with direct route links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Work Orders"
          value={data?.total_work_orders || 0}
          subtitle="All recorded jobs • Click to view"
          icon={ClipboardList}
          color="blue"
          to="/work-orders"
        />
        <StatCard
          title="Pending Requests"
          value={data?.pending_service_requests || 0}
          subtitle="Awaiting triage • Click to review"
          icon={Clock}
          color="amber"
          to="/service-requests"
        />
        <StatCard
          title="Technician Utilization"
          value={`${data?.technician_utilization_rate || 0}%`}
          subtitle="Field capacity • Click for fleet"
          icon={Percent}
          color="purple"
          to="/technicians"
        />
        <StatCard
          title="Customer CSAT"
          value={`${data?.customer_satisfaction_avg || 0} / 5`}
          subtitle="Average satisfaction score"
          icon={Star}
          color="emerald"
          to="/feedback"
        />
      </div>

      {/* Secondary Metrics Bar - Fully interactive & responsive cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/reports"
          className="cyber-card relative overflow-hidden bg-white dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-lg hover:border-blue-400 dark:hover:border-cyan-400 hover:shadow-md transition-all flex items-center justify-between group active:scale-[0.99] cursor-pointer"
        >
          <div className="hidden dark:block absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
              Avg Completion Time
            </p>
            <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {data?.average_completion_time_hours || 0} hrs
            </h4>
            <span className="text-[10px] text-blue-600 dark:text-cyan-400 font-bold inline-flex items-center gap-0.5 mt-0.5">
              View operational report &rarr;
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-cyan-950/60 text-blue-600 dark:text-cyan-400 group-hover:bg-blue-600 dark:group-hover:bg-cyan-500 group-hover:text-white dark:group-hover:text-slate-950 dark:group-hover:shadow-glow-cyan transition-all flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </Link>

        <Link
          to="/work-orders?status=IN_PROGRESS"
          className="cyber-card relative overflow-hidden bg-white dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-lg hover:border-amber-400 hover:shadow-md transition-all flex items-center justify-between group active:scale-[0.99] cursor-pointer"
        >
          <div className="hidden dark:block absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              Jobs Currently Active
            </p>
            <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {data?.in_progress_jobs || 0} jobs
            </h4>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold inline-flex items-center gap-0.5 mt-0.5">
              Filter in-progress jobs &rarr;
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white dark:group-hover:shadow-glow-amber transition-all flex items-center justify-center font-bold">
            <PlayCircle className="w-5 h-5" />
          </div>
        </Link>

        <Link
          to="/inventory"
          className="cyber-card relative overflow-hidden bg-white dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-lg hover:border-rose-400 hover:shadow-md transition-all flex items-center justify-between group active:scale-[0.99] cursor-pointer"
        >
          <div className="hidden dark:block absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-rose-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
              Low Stock Alerts
            </p>
            <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {data?.low_stock_parts_count || 0} SKUs
            </h4>
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold inline-flex items-center gap-0.5 mt-0.5">
              Open parts replenishment &rarr;
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white dark:group-hover:shadow-glow-rose transition-all flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </Link>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart with responsive timeframe switcher */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/95 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm dark:shadow-lg flex flex-col justify-between transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Work Order Volume & Completion Trend</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Historical performance analytics</p>
            </div>
            {/* Interactive Timeframe Filter Buttons */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {[
                { id: '7D', label: '7 Days' },
                { id: '30D', label: '30 Days' },
                { id: '6M', label: '6 Months' },
              ].map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setTrendTimeframe(tf.id)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    trendTimeframe === tf.id
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-cyan-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getTrendData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="new" name="Created" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNew)" />
                <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorComp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2 text-xs">
            <div className="flex items-center gap-4 text-slate-600 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span> Created Jobs
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Completed Jobs
              </span>
            </div>
            <Link to="/reports" className="text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1">
              <span>View Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Status Breakdown Bar Chart - Distinct Colors & Interactive Pop-up Inspector */}
        <div className="bg-white dark:bg-slate-900/95 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm dark:shadow-lg flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Status Mix</h3>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                {data?.total_work_orders || 0} Total
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Click any status bar to view details in a pop-up</p>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusDistribution}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(state) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    handleStatusClick(state.activePayload[0].payload);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight={500} interval={0} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value) => [`${value} Work Orders (Click to inspect)`, 'Volume']}
                />
                <Bar
                  dataKey="count"
                  name="Jobs"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={48}
                  className="cursor-pointer"
                  onClick={(entry) => handleStatusClick(entry)}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.fill}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={(e) => {
                        e?.stopPropagation?.();
                        handleStatusClick(entry);
                      }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Color Palette Indicator Legend with Clickable Status Pop-ups */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2 text-[11px] font-semibold">
            {statusDistribution.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => handleStatusClick(item)}
                className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-slate-700 dark:text-slate-300 text-left group cursor-pointer"
                title={`Inspect ${item.name} work orders pop-up`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                  style={{ backgroundColor: item.fill }}
                ></span>
                <span className="truncate">{item.name}</span>
                <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500 font-normal">({item.count})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Work Orders Table with Interactive Status Filter Bar */}
      <div className="bg-white dark:bg-slate-900/95 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm dark:shadow-lg overflow-hidden transition-colors">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Operational Work Orders</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Live operational dispatch queue</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Live Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'DRAFT', label: 'Draft' },
                { id: 'SCHEDULED', label: 'Scheduled' },
                { id: 'IN_PROGRESS', label: 'In Progress' },
                { id: 'COMPLETED', label: 'Completed' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    statusFilter === tab.id
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-cyan-400 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Link
              to="/work-orders"
              className="text-xs font-semibold text-blue-600 dark:text-cyan-400 hover:text-blue-800 dark:hover:text-cyan-300 flex items-center gap-1 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-800 transition"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">WO Number</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Cost</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    No work orders found matching "{statusFilter}".
                  </td>
                </tr>
              ) : (
                filteredOrders.map((wo) => (
                  <tr
                    key={wo.id}
                    onClick={() => navigate(`/work-orders/${wo.id}`)}
                    className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                      {wo.number}
                    </td>
                    <td className="py-3 px-4">{wo.customer}</td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{wo.service}</td>
                    <td className="py-3 px-4">
                      <PriorityBadge priority={wo.priority} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={wo.status} />
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white">
                      ${wo.cost?.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/work-orders/${wo.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1 text-xs font-bold bg-blue-50 dark:bg-cyan-950/60 text-blue-600 dark:text-cyan-400 hover:bg-blue-600 dark:hover:bg-cyan-500 hover:text-white dark:hover:text-slate-950 rounded-lg transition-all shadow-sm"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Respective Status Details Pop-up Modal */}
      {selectedStatusModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedStatusModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            {(() => {
              const meta = getStatusMeta(selectedStatusModal.statusKey);
              const StatusIcon = meta.icon;
              return (
                <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                        style={{ backgroundColor: selectedStatusModal.fill || meta.dotColor }}
                      >
                        <StatusIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {meta.title}
                          </h3>
                          <span
                            className="px-2.5 py-0.5 text-xs font-bold rounded-full text-white shadow-xs"
                            style={{ backgroundColor: selectedStatusModal.fill || meta.dotColor }}
                          >
                            {modalWorkOrders.length} {modalWorkOrders.length === 1 ? 'Job' : 'Jobs'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{meta.subtitle}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStatusModal(null)}
                      className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                      title="Close popup"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Search bar inside modal */}
                  <div className="mt-4 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={`Filter ${selectedStatusModal.name} jobs by WO #, customer, technician, service, location...`}
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-cyan-500/20 focus:border-blue-500 dark:focus:border-cyan-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-2xs"
                    />
                    {modalSearch && (
                      <button
                        type="button"
                        onClick={() => setModalSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 bg-slate-50/50 dark:bg-slate-950/50">
              {modalLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-3 border-blue-500 dark:border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Retrieving {selectedStatusModal.name} work order details...
                  </p>
                </div>
              ) : filteredModalOrders.length === 0 ? (
                <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
                  <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {modalSearch
                      ? `No work orders matched "${modalSearch}"`
                      : `No ${selectedStatusModal.name} work orders found`}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {modalSearch
                      ? 'Try clearing the search query to see all results.'
                      : 'There are currently no active work orders in this state.'}
                  </p>
                  {modalSearch && (
                    <button
                      type="button"
                      onClick={() => setModalSearch('')}
                      className="mt-3 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              ) : (
                filteredModalOrders.map((wo) => (
                  <div
                    key={wo.id}
                    className="bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/90 dark:border-slate-800 p-4 hover:border-blue-400 dark:hover:border-cyan-400 hover:shadow-md transition-all space-y-3"
                  >
                    {/* Top Row: WO Number, Status, Priority, Cost */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
                          {wo.work_order_number}
                        </span>
                        <PriorityBadge priority={wo.priority} />
                        <StatusBadge status={wo.status} />
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 font-medium">Cost: </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          ${(wo.actual_cost || wo.estimated_cost || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Middle Grid: Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      {/* Customer */}
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Customer
                        </span>
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{wo.customer_name || 'Walk-in Client'}</p>
                        {wo.customer_phone && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{wo.customer_phone}</p>
                        )}
                      </div>

                      {/* Service & Category */}
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Requested Service
                        </span>
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{wo.service_name || 'General Service'}</p>
                        {wo.service_category_name && (
                          <span className="inline-block text-[10px] text-blue-700 dark:text-cyan-300 bg-blue-50 dark:bg-cyan-950/80 px-1.5 py-0.5 rounded font-medium mt-0.5 border border-blue-200 dark:border-cyan-500/30">
                            {wo.service_category_name}
                          </span>
                        )}
                      </div>

                      {/* Assigned Tech */}
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Assigned Tech
                        </span>
                        {wo.technician_name ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-[10px]">
                              {wo.technician_name.charAt(0)}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{wo.technician_name}</span>
                          </div>
                        ) : (
                          <span className="inline-block text-[11px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/40">
                            Unassigned
                          </span>
                        )}
                      </div>

                      {/* Timing */}
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Schedule Window
                        </span>
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                          {formatDateTime(wo.scheduled_start || wo.actual_start || wo.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Service Location */}
                    {wo.service_location && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{wo.service_location}</span>
                      </div>
                    )}

                    {/* Description preview */}
                    {wo.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-amber-50/40 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-100/50 dark:border-amber-900/30 line-clamp-2">
                        "{wo.description}"
                      </p>
                    )}

                    {/* Footer Action */}
                    <div className="flex items-center justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStatusModal(null);
                          navigate(`/work-orders/${wo.id}`);
                        }}
                        className="px-3.5 py-1.5 bg-blue-50 dark:bg-cyan-950/60 text-blue-700 dark:text-cyan-400 hover:bg-blue-600 hover:text-white dark:hover:bg-cyan-500 dark:hover:text-slate-950 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs group cursor-pointer"
                      >
                        <span>Manage Work Order</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Showing <strong className="text-slate-800 dark:text-slate-200">{filteredModalOrders.length}</strong> of{' '}
                <strong className="text-slate-800 dark:text-slate-200">{modalWorkOrders.length}</strong> {selectedStatusModal.name} jobs
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStatusModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const key = selectedStatusModal.statusKey;
                    setSelectedStatusModal(null);
                    navigate(`/work-orders?status=${key}`);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-cyan-600 dark:hover:bg-cyan-500 rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open in Full Table</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsDashboard;
