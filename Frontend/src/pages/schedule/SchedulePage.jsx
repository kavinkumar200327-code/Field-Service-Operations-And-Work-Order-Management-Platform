import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { scheduleApi, techniciansApi } from '../../api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  MapPin,
  ExternalLink,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Flame,
  DollarSign,
  Wrench,
  Columns3,
  ListOrdered,
  X,
  Phone,
  RefreshCw,
} from 'lucide-react';

export const SchedulePage = () => {
  const navigate = useNavigate();

  // Navigation & View Modes: 'month' | 'week' | 'agenda'
  const [viewMode, setViewMode] = useState('month');
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Data states
  const [events, setEvents] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedTech, setSelectedTech] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');

  // Calendar density sizing: 'compact' (reduced clean footprint) | 'standard'
  const [calendarDensity, setCalendarDensity] = useState('compact');

  // Modals
  const [activeModalEvent, setActiveModalEvent] = useState(null);
  const [dayDetailsModal, setDayDetailsModal] = useState(null); // { dateStr, events }

  // Helpers for date calculations
  const pad = (n) => String(n).padStart(2, '0');
  const formatDateISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const safeFormatTime = (isoString, fallback = '') => {
    if (!isoString) return fallback;
    try {
      const safeStr = typeof isoString === 'string' && !isoString.includes('T') ? isoString.replace(' ', 'T') : isoString;
      const d = new Date(safeStr);
      if (isNaN(d.getTime())) return fallback || String(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return fallback || String(isoString);
    }
  };

  const safeFormatDate = (isoString, options = { month: 'short', day: 'numeric', year: 'numeric' }, fallback = '') => {
    if (!isoString) return fallback;
    try {
      const safeStr = typeof isoString === 'string' && !isoString.includes('T') ? isoString.replace(' ', 'T') : isoString;
      const d = new Date(safeStr);
      if (isNaN(d.getTime())) return fallback || String(isoString);
      return d.toLocaleDateString(undefined, options);
    } catch {
      return fallback || String(isoString);
    }
  };

  // Calculate start and end date for fetching based on current date & view
  const { fetchStart, fetchEnd } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === 'month') {
      // 1st of month minus 7 days buffer to end of month plus 14 days buffer
      const start = new Date(year, month, 1);
      start.setDate(start.getDate() - 7);
      const end = new Date(year, month + 1, 0);
      end.setDate(end.getDate() + 14);
      return { fetchStart: formatDateISO(start), fetchEnd: formatDateISO(end) };
    } else if (viewMode === 'week') {
      const curr = new Date(currentDate);
      const day = curr.getDay(); // 0 is Sun
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(curr);
      monday.setDate(curr.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { fetchStart: formatDateISO(monday), fetchEnd: formatDateISO(sunday) };
    } else {
      // Agenda view: past 14 days and next 45 days
      const start = new Date(currentDate);
      start.setDate(start.getDate() - 14);
      const end = new Date(currentDate);
      end.setDate(end.getDate() + 45);
      return { fetchStart: formatDateISO(start), fetchEnd: formatDateISO(end) };
    }
  }, [currentDate, viewMode]);

  // Fetch schedule
  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const res = await scheduleApi.getSchedule({
        start_date: fetchStart,
        end_date: fetchEnd,
        technician_id: selectedTech || undefined,
        status: selectedStatus || undefined,
        priority: selectedPriority || undefined,
      });
      if (res.data?.success) {
        setEvents(res.data.data);
      }
    } catch (e) {
      console.error("Error fetching schedule:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadTechs = async () => {
      try {
        const res = await techniciansApi.list();
        if (res.data?.success) setTechnicians(res.data.data);
      } catch (e) {}
    };
    loadTechs();
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchStart, fetchEnd, selectedTech, selectedStatus, selectedPriority]);

  // Date Navigation handlers
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 14);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 14);
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // KPI Metrics Calculation for current events
  const metrics = useMemo(() => {
    const totalJobs = events.filter(e => e.type !== 'LEAVE').length;
    const activeTechs = new Set(events.filter(e => e.technician_id).map(e => e.technician_id)).size;
    const criticalJobs = events.filter(e => e.priority === 'URGENT' || e.priority === 'HIGH').length;
    const totalRevenue = events.reduce((sum, e) => sum + (e.estimated_cost || 0), 0);

    return { totalJobs, activeTechs, criticalJobs, totalRevenue };
  }, [events]);

  // Group events by date string YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach(ev => {
      const dStr = ev.start ? ev.start.split('T')[0] : 'Unscheduled';
      if (!map[dStr]) map[dStr] = [];
      map[dStr].push(ev);
    });
    return map;
  }, [events]);

  // Month Grid Calculation (Mon to Sun columns)
  const monthGridDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday is 0, Sunday is 6
    const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
    const totalDays = lastDayOfMonth.getDate();

    const days = [];

    // Previous month filler days
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDate - i);
      days.push({
        date: d,
        dateStr: formatDateISO(d),
        isCurrentMonth: false,
        dayNum: d.getDate(),
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        dateStr: formatDateISO(d),
        isCurrentMonth: true,
        dayNum: i,
      });
    }

    // Next month filler days to complete grid (multiples of 7)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        days.push({
          date: d,
          dateStr: formatDateISO(d),
          isCurrentMonth: false,
          dayNum: i,
        });
      }
    }

    return days;
  }, [currentDate]);

  // Week View Days Calculation (7 days from Monday of current week)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const day = curr.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + diffToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({
        date: d,
        dateStr: formatDateISO(d),
        dayNum: d.getDate(),
        weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
      });
    }
    return days;
  }, [currentDate]);

  // Sorted date keys for Agenda view
  const agendaDates = useMemo(() => {
    return Object.keys(eventsByDate).sort();
  }, [eventsByDate]);

  const todayStr = formatDateISO(new Date());

  // Event color badge styling helper
  const getEventBadgeClass = (status, priority, type) => {
    if (type === 'LEAVE') {
      return 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100';
    }
    if (priority === 'URGENT') {
      return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
    }
    if (status === 'IN_PROGRESS') {
      return 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100';
    }
    if (status === 'COMPLETED') {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100';
    }
    return 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100';
  };

  const getPriorityDot = (priority) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500';
      case 'HIGH': return 'bg-amber-500';
      case 'MEDIUM': return 'bg-sky-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Schedule & Calendar Agenda</h1>
            <span className="px-2.5 py-0.5 bg-sky-100 text-sky-700 font-semibold text-[11px] rounded-full">
              Live Operations
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational appointments, technician allocations, and service windows
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <Link
            to="/dispatch-board"
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 shadow-xs transition flex items-center gap-1.5"
          >
            <Columns3 className="w-3.5 h-3.5 text-sky-600" />
            <span>Dispatch Board</span>
          </Link>
          <Link
            to="/work-orders"
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Work Order</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Summary Strip (Compact) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Jobs</p>
            <p className="text-base font-extrabold text-slate-900">{metrics.totalJobs}</p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Techs</p>
            <p className="text-base font-extrabold text-slate-900">{metrics.activeTechs}</p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Critical Priority</p>
            <p className="text-base font-extrabold text-slate-900">{metrics.criticalJobs}</p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Booked Revenue</p>
            <p className="text-base font-extrabold text-slate-900">${metrics.totalRevenue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Main Calendar Navigation & Filters Toolbar */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-0.5">
            <button
              onClick={handlePrev}
              title="Previous period"
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition shadow-none hover:shadow-xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-white rounded-lg transition hover:shadow-xs cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              title="Next period"
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition shadow-none hover:shadow-xs cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-sm sm:text-base font-bold text-slate-900 ml-1.5">
            {viewMode === 'month' &&
              currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            {viewMode === 'week' && (
              <span>
                {weekDays[0]?.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} –{' '}
                {weekDays[6]?.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            {viewMode === 'agenda' && (
              <span>Agenda Timeline ({currentDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })})</span>
            )}
          </h2>
        </div>

        {/* View Switcher, Density Toggle & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Buttons */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold text-slate-600">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                viewMode === 'month' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                viewMode === 'week' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                viewMode === 'agenda' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Agenda
            </button>
          </div>

          {/* Density Sizing Toggle (Compact vs Standard) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-[11px] font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setCalendarDensity('compact')}
              title="Compact reduced cell size"
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                calendarDensity === 'compact'
                  ? 'bg-sky-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Compact
            </button>
            <button
              type="button"
              onClick={() => setCalendarDensity('standard')}
              title="Standard expanded cell size"
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                calendarDensity === 'standard'
                  ? 'bg-sky-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Standard
            </button>
          </div>

          {/* Technician Dropdown */}
          <select
            value={selectedTech}
            onChange={(e) => setSelectedTech(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
          >
            <option value="">All Technicians</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name} ({t.assigned_region})
              </option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="ON_HOLD">On Hold</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={fetchSchedule}
            title="Reload schedule"
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <LoadingSpinner text="Refreshing calendar appointments & allocations..." />
      ) : (
        <>
          {/* VIEW 1: MONTH CALENDAR GRID */}
          {viewMode === 'month' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              {/* Day of Week Headers */}
              <div
                className={`grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center font-bold text-slate-600 uppercase tracking-wider ${
                  calendarDensity === 'compact' ? 'py-1.5 text-[11px]' : 'py-3 text-xs'
                }`}
              >
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div className="text-slate-400">Sat</div>
                <div className="text-slate-400">Sun</div>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-100/50">
                {monthGridDays.map((cell) => {
                  const dayEvents = eventsByDate[cell.dateStr] || [];
                  const isToday = cell.dateStr === todayStr;
                  const maxChips = calendarDensity === 'compact' ? 2 : 3;

                  return (
                    <div
                      key={cell.dateStr}
                      onClick={() => {
                        if (dayEvents.length > 0) {
                          setDayDetailsModal({ dateStr: cell.dateStr, events: dayEvents });
                        }
                      }}
                      className={`${
                        calendarDensity === 'compact'
                          ? 'min-h-[72px] sm:min-h-[78px] p-1.5'
                          : 'min-h-[115px] p-2'
                      } bg-white transition flex flex-col justify-between ${
                        !cell.isCurrentMonth ? 'bg-slate-50/60 text-slate-300' : 'hover:bg-slate-50/80 cursor-pointer'
                      }`}
                    >
                      {/* Cell Day Header */}
                      <div className={`flex items-center justify-between ${calendarDensity === 'compact' ? 'mb-1' : 'mb-1.5'}`}>
                        <span
                          className={`${
                            calendarDensity === 'compact' ? 'w-5 h-5 text-[11px]' : 'w-6 h-6 text-xs'
                          } flex items-center justify-center rounded-full font-bold ${
                            isToday
                              ? 'bg-sky-600 text-white shadow-xs'
                              : cell.isCurrentMonth
                              ? 'text-slate-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {cell.dayNum}
                        </span>

                        {dayEvents.length > 0 && (
                          <span
                            className={`font-bold rounded-full bg-slate-100 text-slate-600 ${
                              calendarDensity === 'compact' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-1.5 py-0.5'
                            }`}
                          >
                            {dayEvents.length} {dayEvents.length === 1 ? 'job' : 'jobs'}
                          </span>
                        )}
                      </div>

                      {/* Event Chips List */}
                      <div className={`space-y-0.5 flex-1 overflow-hidden ${calendarDensity === 'compact' ? 'space-y-1' : 'space-y-1.5'}`}>
                        {dayEvents.slice(0, maxChips).map((ev) => (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveModalEvent(ev);
                            }}
                            title={`${ev.title}\nTech: ${ev.technician_name}\nStatus: ${ev.status}`}
                            className={`${
                              calendarDensity === 'compact'
                                ? 'px-1.5 py-0.5 rounded-md text-[10px] gap-1'
                                : 'px-2 py-1 rounded-lg text-[11px] gap-1.5'
                            } border font-medium truncate transition cursor-pointer flex items-center ${getEventBadgeClass(
                              ev.status,
                              ev.priority,
                              ev.type
                            )}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getPriorityDot(ev.priority)}`} />
                            <span className="font-mono text-[9px] opacity-80 shrink-0">
                              {safeFormatTime(ev.start)}
                            </span>
                            <span className="truncate">{ev.work_order_number || ev.title}</span>
                          </div>
                        ))}

                        {dayEvents.length > maxChips && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDayDetailsModal({ dateStr: cell.dateStr, events: dayEvents });
                            }}
                            className="w-full text-left text-[9px] font-bold text-sky-600 hover:text-sky-700 pl-0.5 leading-tight cursor-pointer"
                          >
                            +{dayEvents.length - maxChips} more {dayEvents.length - maxChips === 1 ? 'job' : 'jobs'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 2: WEEK TIMELINE VIEW */}
          {viewMode === 'week' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="grid grid-cols-7 divide-x divide-slate-100">
                {weekDays.map((col) => {
                  const dayEvents = eventsByDate[col.dateStr] || [];
                  const isToday = col.dateStr === todayStr;

                  return (
                    <div
                      key={col.dateStr}
                      className={`${
                        calendarDensity === 'compact' ? 'min-h-[380px]' : 'min-h-[500px]'
                      } flex flex-col`}
                    >
                      {/* Column Header */}
                      <div
                        className={`text-center border-b border-slate-100 ${
                          calendarDensity === 'compact' ? 'p-2' : 'p-3'
                        } ${isToday ? 'bg-sky-50/80 text-sky-900' : 'bg-slate-50 text-slate-700'}`}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {col.weekday}
                        </p>
                        <p
                          className={`font-extrabold mt-0.5 inline-block rounded-full ${
                            calendarDensity === 'compact'
                              ? 'text-sm w-6 h-6 leading-6'
                              : 'text-base w-8 h-8 leading-8'
                          } ${isToday ? 'bg-sky-600 text-white shadow-xs' : ''}`}
                        >
                          {col.dayNum}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                          {dayEvents.length} {dayEvents.length === 1 ? 'Job' : 'Jobs'}
                        </p>
                      </div>

                      {/* Column Body Events */}
                      <div className="p-2 space-y-1.5 flex-1 bg-slate-50/30 overflow-y-auto">
                        {dayEvents.length === 0 ? (
                          <div className="h-full flex items-center justify-center p-3 text-center">
                            <span className="text-[11px] text-slate-400 italic">No appointments</span>
                          </div>
                        ) : (
                          dayEvents.map((ev) => (
                            <div
                              key={ev.id}
                              onClick={() => setActiveModalEvent(ev)}
                              className={`${
                                calendarDensity === 'compact' ? 'p-2 space-y-1' : 'p-3 space-y-1.5'
                              } bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-sky-300 hover:shadow-xs transition cursor-pointer text-xs`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-slate-900 text-[11px] truncate">
                                  {ev.work_order_number || ev.title}
                                </span>
                                <PriorityBadge priority={ev.priority} />
                              </div>

                              <p className="text-slate-700 font-medium text-[11px] line-clamp-1">{ev.service_name}</p>

                              <div className="text-[10px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-sky-600 shrink-0" />
                                  <span>
                                    {safeFormatTime(ev.start)} – {safeFormatTime(ev.end)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{ev.technician_name}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 3: AGENDA LIST VIEW */}
          {viewMode === 'agenda' && (
            <div>
              {agendaDates.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                  <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-bold text-slate-700 text-sm">No scheduled appointments found</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    There are no work orders matching your current filter criteria in this schedule timeframe.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedTech('');
                        setSelectedStatus('');
                        setSelectedPriority('');
                      }}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                    >
                      Clear Filters
                    </button>
                    <Link
                      to="/work-orders"
                      className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
                    >
                      Create Work Order
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {agendaDates.map((dStr) => {
                    const isToday = dStr === todayStr;
                    const dateObj = new Date(dStr + 'T00:00:00');

                    return (
                      <div key={dStr} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                        <div
                          className={`px-5 py-3 border-b flex items-center justify-between ${
                            isToday ? 'bg-sky-50/80 border-sky-100 text-sky-950' : 'bg-slate-50 border-slate-100 text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 text-xs font-bold">
                            <CalendarDays className={`w-4 h-4 ${isToday ? 'text-sky-600' : 'text-slate-500'}`} />
                            <span>
                              {dateObj.toLocaleDateString(undefined, {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                            {isToday && (
                              <span className="px-2 py-0.5 bg-sky-600 text-white text-[10px] font-extrabold rounded-full">
                                TODAY
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {eventsByDate[dStr].length} {eventsByDate[dStr].length === 1 ? 'Appointment' : 'Appointments'}
                          </span>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {eventsByDate[dStr].map((ev) => (
                            <div
                              key={ev.id}
                              className="p-4 hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                            >
                              <div className="flex items-start gap-3.5">
                                {/* Time Window Badge */}
                                <div className="w-20 rounded-xl bg-slate-100 p-2 text-center text-slate-700 shrink-0 border border-slate-200">
                                  <Clock className="w-3.5 h-3.5 text-sky-600 mx-auto mb-1" />
                                  <span className="font-extrabold text-[11px] block text-slate-900">
                                    {safeFormatTime(ev.start, 'TBD')}
                                  </span>
                                  <span className="text-[10px] text-slate-500 block">
                                    {safeFormatTime(ev.end)}
                                  </span>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-slate-900 text-sm">
                                      {ev.work_order_number || ev.title}
                                    </span>
                                    <StatusBadge status={ev.status} />
                                    <PriorityBadge priority={ev.priority} />
                                  </div>

                                  <p className="text-slate-800 font-semibold text-xs">{ev.service_name}</p>

                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3 text-slate-400" />
                                      <span>Technician: <strong className="text-slate-700">{ev.technician_name}</strong></span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-slate-400" />
                                      <span className="truncate max-w-xs">{ev.location}</span>
                                    </span>
                                    <span>Client: <strong className="text-slate-700">{ev.customer_name}</strong></span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setActiveModalEvent(ev)}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                                >
                                  Quick View
                                </button>
                                {ev.type !== 'LEAVE' && (
                                  <Link
                                    to={`/work-orders/${ev.id}`}
                                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                                  >
                                    <span>Manage Job</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Link>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL 1: APPOINTMENT QUICK DETAILS */}
      {activeModalEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {activeModalEvent.work_order_number || activeModalEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveModalEvent(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Service Type</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{activeModalEvent.service_name}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={activeModalEvent.status} />
                  <PriorityBadge priority={activeModalEvent.priority} />
                </div>
              </div>

              {/* Time Window */}
              <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-sky-900 font-bold">
                  <Clock className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>
                    {safeFormatDate(activeModalEvent.start, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <p className="text-[11px] text-sky-700 pl-6 font-medium">
                  {safeFormatTime(activeModalEvent.start)} – {safeFormatTime(activeModalEvent.end)}
                </p>
              </div>

              {/* Technician Info */}
              <div className="border border-slate-100 rounded-2xl p-3 space-y-1 bg-slate-50/50">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Assigned Technician</p>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="font-bold text-slate-900">{activeModalEvent.technician_name}</span>
                  {activeModalEvent.technician_region && (
                    <span className="text-[11px] px-2 py-0.5 bg-slate-200/70 rounded-md font-semibold text-slate-700">
                      {activeModalEvent.technician_region}
                    </span>
                  )}
                </div>
              </div>

              {/* Customer & Location */}
              <div className="space-y-2">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Customer</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{activeModalEvent.customer_name}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Service Location</p>
                  <p className="text-slate-600 flex items-start gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{activeModalEvent.location}</span>
                  </p>
                </div>
                {activeModalEvent.description && (
                  <div>
                    <p className="text-[11px] text-slate-400 uppercase font-semibold">Job Notes</p>
                    <p className="text-slate-600 italic mt-0.5">{activeModalEvent.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                {activeModalEvent.estimated_cost ? `Est. Cost: $${activeModalEvent.estimated_cost.toFixed(2)}` : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModalEvent(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition"
                >
                  Close
                </button>
                {activeModalEvent.type !== 'LEAVE' && (
                  <Link
                    to={`/work-orders/${activeModalEvent.id}`}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-md transition flex items-center gap-1"
                  >
                    <span>Manage Work Order</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DAY DETAILS OVERFLOW POPUP */}
      {dayDetailsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {new Date(dayDetailsModal.dateStr + 'T00:00:00').toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h3>
                <p className="text-xs text-slate-500">
                  {dayDetailsModal.events.length} appointments scheduled
                </p>
              </div>
              <button
                onClick={() => setDayDetailsModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
              {dayDetailsModal.events.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => {
                    setDayDetailsModal(null);
                    setActiveModalEvent(ev);
                  }}
                  className="py-3 px-2 hover:bg-slate-50 rounded-xl transition cursor-pointer flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-10 rounded-lg bg-sky-50 text-sky-700 flex flex-col items-center justify-center font-bold text-[10px] shrink-0 border border-sky-100">
                      {safeFormatTime(ev.start)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{ev.work_order_number || ev.title}</span>
                        <PriorityBadge priority={ev.priority} />
                      </div>
                      <p className="text-slate-600 text-[11px] truncate max-w-xs">{ev.service_name}</p>
                      <p className="text-slate-400 text-[10px]">Tech: {ev.technician_name}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDayDetailsModal(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
