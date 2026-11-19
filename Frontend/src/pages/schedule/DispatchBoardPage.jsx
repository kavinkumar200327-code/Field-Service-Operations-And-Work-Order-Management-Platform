import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { scheduleApi, workOrdersApi } from '../../api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Users,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Zap,
  Filter,
  Search,
  RefreshCw,
  Plus,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Layers,
  MapPin,
  Phone,
  Briefcase,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  BarChart3,
  Activity,
  AlertTriangle,
  Info,
} from 'lucide-react';

export const DispatchBoardPage = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();

  // Local date helper functions (immune to UTC offset discrepancies)
  const getLocalDateStr = (d = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getOffsetDateStr = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return getLocalDateStr(d);
  };

  // Selected Board Date (defaults to today's date formatted as YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(() => {
    return getLocalDateStr();
  });

  const [boardData, setBoardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & View State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [selectedAvailability, setSelectedAvailability] = useState('ALL');
  const [timelineSpan, setTimelineSpan] = useState('standard'); // 'standard' (8am-6pm) | 'extended' (7am-8pm)
  const [isTriageDrawerOpen, setIsTriageDrawerOpen] = useState(true);

  // Modals
  const [activeJobModal, setActiveJobModal] = useState(null);
  const [activeKpiModal, setActiveKpiModal] = useState(null); // 'CAPACITY' | 'UTILIZATION' | 'REVENUE' | null
  const [dispatchModal, setDispatchModal] = useState({
    isOpen: false,
    workOrder: null,
    technicianId: '',
    startTime: '09:00',
    durationMinutes: 60,
    notes: '',
    submitting: false,
  });

  // Live Time Tracker (ticks every 1000ms for real-time second precision)
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Quick relative date references (updated daily)
  const currentDayKey = currentTime.toDateString();
  const yesterdayStr = useMemo(() => getOffsetDateStr(-1), [currentDayKey]);
  const todayStr = useMemo(() => getOffsetDateStr(0), [currentDayKey]);
  const tomorrowStr = useMemo(() => getOffsetDateStr(1), [currentDayKey]);

  const fetchBoard = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);
      const res = await scheduleApi.getDispatchBoard({ date: selectedDate });
      if (res.data?.success) {
        setBoardData(res.data.data);
      }
    } catch (err) {
      error("Failed to load dispatch board data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, [selectedDate]);

  const changeDateBy = (days) => {
    const parts = (selectedDate || getLocalDateStr()).split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2] + days);
    setSelectedDate(getLocalDateStr(d));
  };

  const setQuickDate = (offsetDays) => {
    setSelectedDate(getOffsetDateStr(offsetDays));
  };

  // Timeline Scale Definitions
  const timelineConfig = useMemo(() => {
    if (timelineSpan === 'extended') {
      return {
        startHour: 7,
        endHour: 20,
        hours: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
        totalMinutes: (20 - 7) * 60, // 780 mins
      };
    }
    return {
      startHour: 8,
      endHour: 18,
      hours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
      totalMinutes: (18 - 8) * 60, // 600 mins
    };
  }, [timelineSpan]);

  const getPositionPercent = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const currentMinutes = (h - timelineConfig.startHour) * 60 + m;
    const pct = (currentMinutes / timelineConfig.totalMinutes) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  // Robust time string parser (handles "09:00", "09:00 AM", "2:30 PM", etc.)
  const parseTimeString = (str) => {
    if (!str) return { h: 9, m: 0 };
    const cleaned = String(str).trim();
    const isPM = /pm/i.test(cleaned);
    const isAM = /am/i.test(cleaned);
    const match = cleaned.match(/(\d+):(\d+)/);
    if (!match) return { h: 9, m: 0 };
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) || 0;
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    return { h, m };
  };

  // Mini Shift Schedule Graph Position Calculator (relative to technician's working hours)
  const getMiniPosition = (timeStr, startStr = '08:00', endStr = '17:00') => {
    if (!timeStr) return 0;
    const [sH, sM] = (startStr || '08:00').split(':').map(Number);
    const [eH, eM] = (endStr || '17:00').split(':').map(Number);
    const [jH, jM] = timeStr.split(':').map(Number);
    const shiftStartMins = sH * 60 + sM;
    const shiftEndMins = eH * 60 + eM;
    const totalShiftMins = Math.max(60, shiftEndMins - shiftStartMins);
    const jobMins = jH * 60 + jM;
    const pct = ((jobMins - shiftStartMins) / totalShiftMins) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  // Live Marker Position (tracks real-time hours, minutes, and seconds)
  const liveIndicatorPercent = useMemo(() => {
    if (selectedDate !== todayStr) return null;
    const h = currentTime.getHours();
    const m = currentTime.getMinutes();
    const s = currentTime.getSeconds();
    const currentMinutes = (h - timelineConfig.startHour) * 60 + m + s / 60;
    const pct = (currentMinutes / timelineConfig.totalMinutes) * 100;
    if (pct < 0 || pct > 100) return null;
    return pct;
  }, [currentTime, selectedDate, todayStr, timelineConfig]);

  // Regions Available from Data
  const availableRegions = useMemo(() => {
    if (!boardData?.technicians) return [];
    const set = new Set();
    boardData.technicians.forEach((t) => {
      if (t.region) set.add(t.region);
    });
    return Array.from(set);
  }, [boardData]);

  // Filtered Technicians
  const filteredTechnicians = useMemo(() => {
    if (!boardData?.technicians) return [];
    return boardData.technicians.filter((t) => {
      // Region Filter
      if (selectedRegion !== 'ALL' && t.region !== selectedRegion) return false;
      // Availability Filter
      if (selectedAvailability !== 'ALL' && t.availability_status !== selectedAvailability) return false;
      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = t.technician_name?.toLowerCase().includes(q);
        const regionMatch = t.region?.toLowerCase().includes(q);
        const skillMatch = t.skills?.some((s) => s.toLowerCase().includes(q));
        if (!nameMatch && !regionMatch && !skillMatch) return false;
      }
      return true;
    });
  }, [boardData, selectedRegion, selectedAvailability, searchQuery]);

  // Flattened scheduled jobs for today
  const allTodayScheduledJobs = useMemo(() => {
    if (!boardData?.technicians) return [];
    const list = [];
    boardData.technicians.forEach((t) => {
      (t.work_orders || []).forEach((w) => {
        list.push({ ...w, technician_name: t.technician_name, technician_id: t.technician_id, region: t.region });
      });
    });
    return list;
  }, [boardData]);

  // Live Conflict and Timing Validation inside Dispatch Modal
  const dispatchValidation = useMemo(() => {
    if (!dispatchModal.isOpen) return null;

    const { h: sH, m: sM } = parseTimeString(dispatchModal.startTime);
    const duration = Math.max(15, parseInt(dispatchModal.durationMinutes, 10) || 60);
    const startMins = sH * 60 + sM;
    const endMins = startMins + duration;

    const eH = Math.floor(endMins / 60);
    const eM = endMins % 60;

    const formatHour = (h, m) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const dispH = h % 12 || 12;
      return `${String(dispH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    };

    const formattedStart = formatHour(sH, sM);
    const formattedEnd = formatHour(eH, eM);

    const tech = boardData?.technicians?.find((t) => t.technician_id === dispatchModal.technicianId);

    if (!tech) {
      return {
        isValid: false,
        message: 'Please select a technician.',
        formattedStart,
        formattedEnd,
        durationHours: (duration / 60).toFixed(1),
      };
    }

    // Check shift working hours
    const [wStartH, wStartM] = (tech.work_start_time || '08:00').split(':').map(Number);
    const [wEndH, wEndM] = (tech.work_end_time || '17:00').split(':').map(Number);
    const shiftStart = wStartH * 60 + wStartM;
    const shiftEnd = wEndH * 60 + wEndM;

    if (startMins < shiftStart || endMins > shiftEnd) {
      return {
        isValid: false,
        isWarning: true,
        message: `Outside working hours (${tech.work_start_time} - ${tech.work_end_time}). Shift ends at ${tech.work_end_time}.`,
        formattedStart,
        formattedEnd,
        durationHours: (duration / 60).toFixed(1),
      };
    }

    // Check overlap with scheduled jobs on this board date
    for (const job of tech.work_orders || []) {
      if (dispatchModal.workOrder && job.id === dispatchModal.workOrder.id) continue;
      const [jStartH, jStartM] = job.start.split(':').map(Number);
      const [jEndH, jEndM] = job.end.split(':').map(Number);
      const jStart = jStartH * 60 + jStartM;
      const jEnd = jEndH * 60 + jEndM;

      if (jStart < endMins && jEnd > startMins) {
        return {
          isValid: false,
          isConflict: true,
          message: `Overlap Conflict: ${tech.technician_name} is already booked for ${job.work_order_number} (${job.start} - ${job.end}).`,
          formattedStart,
          formattedEnd,
          durationHours: (duration / 60).toFixed(1),
        };
      }
    }

    return {
      isValid: true,
      message: `Slot is fully available for ${tech.technician_name}!`,
      formattedStart,
      formattedEnd,
      durationHours: (duration / 60).toFixed(1),
    };
  }, [dispatchModal, boardData]);

  // Quick Dispatch Helpers
  const handleOpenDispatchForJob = (workOrder) => {
    let matchedTechId = '';
    if (boardData?.technicians?.length) {
      const match = boardData.technicians.find((t) =>
        t.skills?.some((s) => workOrder.service_name?.toLowerCase().includes(s.toLowerCase().split(' ')[0]))
      );
      matchedTechId = match ? match.technician_id : boardData.technicians[0].technician_id;
    }

    setDispatchModal({
      isOpen: true,
      workOrder: workOrder,
      technicianId: matchedTechId,
      startTime: '10:00',
      durationMinutes: workOrder.estimated_duration || 60,
      notes: '',
      submitting: false,
    });
  };

  const handleOpenDispatchForTech = (tech) => {
    const firstUnassigned = boardData?.unassigned_work_orders?.[0] || null;

    setDispatchModal({
      isOpen: true,
      workOrder: firstUnassigned,
      technicianId: tech.technician_id,
      startTime: '09:00',
      durationMinutes: firstUnassigned?.estimated_duration || 60,
      notes: '',
      submitting: false,
    });
  };

  const handleTimelineSlotClick = (tech, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const totalMins = timelineConfig.totalMinutes;
    const clickedMins = timelineConfig.startHour * 60 + Math.round((ratio * totalMins) / 30) * 30;
    const h = Math.floor(clickedMins / 60);
    const m = clickedMins % 60;
    const timeFormatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    const firstUnassigned = boardData?.unassigned_work_orders?.[0] || null;

    setDispatchModal({
      isOpen: true,
      workOrder: firstUnassigned,
      technicianId: tech.technician_id,
      startTime: timeFormatted,
      durationMinutes: firstUnassigned?.estimated_duration || 60,
      notes: '',
      submitting: false,
    });
  };

  const handleConfirmDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchModal.workOrder) {
      error("Please select a work order to dispatch.");
      return;
    }
    if (!dispatchModal.technicianId) {
      error("Please select a field technician.");
      return;
    }

    try {
      setDispatchModal((prev) => ({ ...prev, submitting: true }));

      // Cleanly parse start time (handles "09:00", "09:00 AM", etc.)
      const { h: sH, m: sM } = parseTimeString(dispatchModal.startTime);
      const duration = Math.max(15, parseInt(dispatchModal.durationMinutes, 10) || 60);
      const startTotalMins = sH * 60 + sM;
      const endTotalMins = startTotalMins + duration;
      const eH = Math.floor(endTotalMins / 60);
      const eM = endTotalMins % 60;

      // Construct ISO strings
      const startIso = `${selectedDate}T${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}:00`;
      const endIso = `${selectedDate}T${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}:00`;

      const payload = {
        technician_id: dispatchModal.technicianId,
        scheduled_start: startIso,
        scheduled_end: endIso,
        notes: dispatchModal.notes || `Dispatched via Interactive Dispatch Board for ${selectedDate}`,
      };

      const res = await workOrdersApi.assign(dispatchModal.workOrder.id, payload);
      if (res.data?.success) {
        success(`Successfully dispatched ${dispatchModal.workOrder.work_order_number}!`);
        setDispatchModal({
          isOpen: false,
          workOrder: null,
          technicianId: '',
          startTime: '09:00',
          durationMinutes: 60,
          notes: '',
          submitting: false,
        });
        await fetchBoard(true);
      }
    } catch (err) {
      let errMsg = "Failed to dispatch work order.";
      if (err.response?.data?.error?.message) {
        errMsg = err.response.data.error.message;
      } else if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      } else if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errMsg = err.response.data.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
        } else {
          errMsg = String(err.response.data.detail);
        }
      } else if (err.message) {
        errMsg = err.message;
      }
      error(errMsg);
    } finally {
      setDispatchModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Helper for capacity progress bar colors
  const getCapacityColor = (pct) => {
    if (pct >= 85) return 'bg-rose-500';
    if (pct >= 60) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const stats = boardData?.stats || {};
  const unassignedCount = boardData?.unassigned_work_orders?.length || 0;
  const totalFleetHours = (boardData?.technicians?.length || 0) * 8.0;
  const totalBookedHours = boardData?.technicians?.reduce((sum, t) => sum + (t.total_booked_hours || 0), 0) || 0;
  const remainingFleetHours = Math.max(0, totalFleetHours - totalBookedHours);

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Command Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Interactive Dispatch Board</h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              Live Operations Grid
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time fleet timeline, capacity utilization, triage queues, and quick schedule dispatch
          </p>
        </div>

        {/* Date Selector & Navigation Bar */}
        <div className="flex items-center flex-wrap gap-2 self-start lg:self-auto bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center bg-slate-50 rounded-xl p-0.5 border border-slate-200/60">
            <button
              onClick={() => changeDateBy(-1)}
              title="Previous Day"
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition shadow-none hover:shadow-xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-2.5 text-xs font-bold text-slate-800">
              <Calendar className="w-4 h-4 text-sky-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-xs font-black text-slate-800 cursor-pointer"
              />
            </div>

            <button
              onClick={() => changeDateBy(1)}
              title="Next Day"
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition shadow-none hover:shadow-xs cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Date Selectors (Uniform reactive blue glow when selected) */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setQuickDate(-1)}
              className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all duration-150 cursor-pointer ${
                selectedDate === yesterdayStr
                  ? 'bg-sky-600 text-white shadow-xs shadow-sky-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(0)}
              className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all duration-150 cursor-pointer ${
                selectedDate === todayStr
                  ? 'bg-sky-600 text-white shadow-xs shadow-sky-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(1)}
              className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all duration-150 cursor-pointer ${
                selectedDate === tomorrowStr
                  ? 'bg-sky-600 text-white shadow-xs shadow-sky-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
              }`}
            >
              Tomorrow
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchBoard(true)}
            disabled={refreshing}
            title="Refresh Board"
            className="p-1.5 ml-1 hover:bg-slate-100 rounded-xl text-slate-600 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${refreshing ? 'animate-spin text-sky-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Interactive Operational KPI Command Ribbon (Workable Buttons) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Workable Button 1: Fleet Capacity */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveKpiModal('CAPACITY')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveKpiModal('CAPACITY')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-sky-300 hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer flex flex-col justify-between group"
          title="Click to view Fleet Capacity & Technician Roster"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-sky-600 transition">
                Fleet Capacity
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{boardData?.technicians?.length || 0}</span>
                <span className="text-xs font-semibold text-slate-500">Techs Active</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-100 group-hover:bg-sky-600 group-hover:text-white flex items-center justify-center text-sky-600 transition">
              <User className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span>{stats.available_technicians || 0} Avail</span>
              <span className="text-slate-300">•</span>
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
              <span>{stats.busy_technicians || 0} On Job</span>
            </div>
            <span className="text-[10px] font-bold text-sky-600 group-hover:underline flex items-center gap-0.5">
              Roster <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Workable Button 2: Fleet Utilization */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveKpiModal('UTILIZATION')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveKpiModal('UTILIZATION')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-300 hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer flex flex-col justify-between group"
          title="Click to view Fleet Utilization & Workload Breakdown"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-indigo-600 transition">
                Fleet Utilization
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{stats.fleet_utilization_pct || 0}%</span>
                <span className="text-xs font-semibold text-slate-500">of Shift Hours</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center text-indigo-600 transition shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getCapacityColor(stats.fleet_utilization_pct || 0)}`}
                style={{ width: `${Math.min(100, stats.fleet_utilization_pct || 0)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500">{totalBookedHours.toFixed(1)}h / {totalFleetHours.toFixed(0)}h Booked</span>
              <span className="font-bold text-indigo-600 group-hover:underline flex items-center gap-0.5">
                Workload <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Workable Button 3: Booked Revenue */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveKpiModal('REVENUE')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveKpiModal('REVENUE')}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer flex flex-col justify-between group"
          title="Click to view Booked Revenue & Scheduled Jobs Ledger"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-emerald-600 transition">
                Booked Revenue
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-slate-900">${(stats.total_revenue_today || 0).toLocaleString()}</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center text-emerald-600 transition">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {stats.total_scheduled_jobs || 0} scheduled jobs
            </span>
            <span className="font-bold text-emerald-700 group-hover:underline flex items-center gap-0.5">
              Ledger <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Workable Button 4: Triage Queue Status */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsTriageDrawerOpen(!isTriageDrawerOpen)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsTriageDrawerOpen(!isTriageDrawerOpen)}
          className={`p-4 rounded-2xl border transition cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between group ${
            unassignedCount > 0
              ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
          title="Click to toggle Triage Shelf view"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-amber-600 transition">
                Triage Queue
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-black ${unassignedCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {unassignedCount}
                </span>
                <span className="text-xs font-semibold text-slate-500">Unassigned</span>
              </div>
            </div>
            <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition ${
              unassignedCount > 0
                ? 'bg-amber-100 border-amber-200 text-amber-700 group-hover:bg-amber-500 group-hover:text-white'
                : 'bg-slate-50 border-slate-100 text-slate-400'
            }`}>
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-amber-100/60 flex items-center justify-between text-[10px]">
            <span className="font-bold text-sky-600 flex items-center gap-1 group-hover:underline">
              <Zap className="w-3 h-3 text-amber-500" />
              {isTriageDrawerOpen ? 'Collapse Shelf ▲' : 'Open Shelf ▼'}
            </span>
            <span className="text-slate-400 font-medium">Quick Dispatch</span>
          </div>
        </div>
      </div>

      {/* 3. Unscheduled / Triage Queue Shelf */}
      {isTriageDrawerOpen && unassignedCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-sky-500/5 to-indigo-500/10 border border-amber-200 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Ready for Dispatch / Triage Shelf ({unassignedCount})
              </h3>
              <span className="text-xs text-slate-500 hidden sm:inline">
                Click ⚡ Quick Dispatch to auto-match and book into the timeline
              </span>
            </div>
            <button
              onClick={() => setIsTriageDrawerOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {boardData.unassigned_work_orders.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-black text-xs text-slate-900 tracking-tight">{job.work_order_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      job.priority === 'URGENT'
                        ? 'bg-rose-100 text-rose-700'
                        : job.priority === 'HIGH'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-sky-100 text-sky-800'
                    }`}>
                      {job.priority}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs text-slate-800 line-clamp-1">{job.service_name}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    {job.customer_name}
                  </p>
                  <p className="text-[11px] text-slate-400 line-clamp-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    {job.service_location}
                  </p>

                  <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-600 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-sky-600" />
                      {job.estimated_duration || 60} mins
                    </span>
                    <span>•</span>
                    <span className="font-bold text-slate-900">${job.estimated_cost?.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2">
                  <button
                    onClick={() => handleOpenDispatchForJob(job)}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs hover:shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    ⚡ Quick Dispatch Slot
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Controls & Filters Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search technician name or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>
        </div>

        {/* Filter Selectors */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Region Dropdown */}
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
          >
            <option value="ALL">All Regions</option>
            {availableRegions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Availability Status Dropdown */}
          <select
            value={selectedAvailability}
            onChange={(e) => setSelectedAvailability(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available Only</option>
            <option value="BUSY">Busy Only</option>
          </select>

          {/* Timeline View Mode */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setTimelineSpan('standard')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                timelineSpan === 'standard' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              8 AM - 6 PM
            </button>
            <button
              onClick={() => setTimelineSpan('extended')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                timelineSpan === 'extended' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              7 AM - 8 PM
            </button>
          </div>
        </div>
      </div>

      {/* 5. Board Visualizer & Interactive Matrix */}
      {loading ? (
        <LoadingSpinner text="Rendering dispatch board matrix & timeline tracks..." />
      ) : filteredTechnicians.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-sm">No Technicians Match Filters</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria, clearing region filters, or resetting the date.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedRegion('ALL');
              setSelectedAvailability('ALL');
            }}
            className="mt-4 px-4 py-2 bg-sky-50 text-sky-700 rounded-xl text-xs font-bold hover:bg-sky-100 transition cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-x-auto timeline-scrollbar">
          <div className="min-w-[1100px]">
            {/* Header Hours Scale */}
            <div className="flex items-center border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold text-slate-500 py-3 sticky top-0 z-20 backdrop-blur-xs">
              <div className="w-[340px] px-5 shrink-0 uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Technician Fleet & Capacity</span>
                <span className="text-[10px] text-slate-400 font-normal">Utilization & Workload</span>
              </div>
              <div className="flex-1 relative flex text-center pr-5">
                {timelineConfig.hours.map((h) => (
                  <div key={h} className="flex-1 border-l border-slate-200/80 first:border-none py-0.5">
                    {h < 12 ? `${h}:00 AM` : h === 12 ? `12:00 PM` : `${h - 12}:00 PM`}
                  </div>
                ))}
              </div>
            </div>

            {/* Technician Rows */}
            <div className="divide-y divide-slate-100 relative">
              {filteredTechnicians.map((t) => (
                <div
                  key={t.technician_id}
                  className="flex items-stretch py-4 hover:bg-slate-50/60 transition group"
                >
                  {/* Left Column: Technician Profile, Workload Progress Graph & Mini Schedule Strip */}
                  <div className="w-[340px] px-5 shrink-0 flex flex-col justify-between py-1">
                    <div>
                      {/* Avatar, Name, Region & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          {/* Avatar with Status Beacon */}
                          <div className="relative shrink-0">
                            <div className="w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] shrink-0 aspect-square rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs select-none">
                              {t.technician_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                t.availability_status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              title={`Status: ${t.availability_status}`}
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-xs tracking-tight line-clamp-1">
                              {t.technician_name}
                            </h4>
                            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {t.region || 'All Region'}
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={t.availability_status} />
                      </div>

                      {/* Workload Progress Bar Graph */}
                      <div className="mt-3 space-y-1.5 p-2.5 bg-slate-50/90 rounded-2xl border border-slate-200/60">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700 flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5 text-sky-600" />
                            Workload: {t.total_booked_hours || 0}h / 8.0h
                          </span>
                          <span className="font-black text-slate-900">{t.capacity_percentage || 0}% Utilized</span>
                        </div>
                        <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden shadow-inner">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getCapacityColor(t.capacity_percentage || 0)}`}
                            style={{ width: `${Math.min(100, t.capacity_percentage || 0)}%` }}
                          />
                        </div>

                        {/* Shift Schedule Mini-Graph Strip */}
                        <div className="mt-2 pt-2 border-t border-slate-200/60">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                            <span className="font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-indigo-600" />
                              Shift Schedule Graph
                            </span>
                            <span className="font-semibold text-slate-600">
                              {t.work_orders?.length || 0} jobs booked
                            </span>
                          </div>

                          {/* Visual Shift Strip */}
                          <div className="relative h-6 bg-slate-200/50 rounded-lg overflow-hidden border border-slate-200/80 flex items-center">
                            {/* Leaves */}
                            {t.leaves?.map((l) => {
                              const left = getMiniPosition(l.start, t.work_start_time, t.work_end_time);
                              const right = getMiniPosition(l.end, t.work_start_time, t.work_end_time);
                              const width = Math.max(6, right - left);
                              return (
                                <div
                                  key={l.id}
                                  style={{ left: `${left}%`, width: `${width}%` }}
                                  className="absolute top-0.5 bottom-0.5 bg-rose-400/90 rounded text-[8px] font-black text-white px-1 flex items-center justify-center truncate"
                                  title={`Leave: ${l.type} (${l.start} - ${l.end})`}
                                >
                                  Leave
                                </div>
                              );
                            })}

                            {/* Work Orders in mini graph */}
                            {t.work_orders?.map((job) => {
                              const left = getMiniPosition(job.start, t.work_start_time, t.work_end_time);
                              const right = getMiniPosition(job.end, t.work_start_time, t.work_end_time);
                              const width = Math.max(8, right - left);
                              return (
                                <div
                                  key={job.id}
                                  style={{ left: `${left}%`, width: `${width}%` }}
                                  className={`absolute top-0.5 bottom-0.5 rounded text-[8px] font-bold px-1 flex items-center justify-center truncate text-white shadow-2xs ${
                                    job.status === 'COMPLETED'
                                      ? 'bg-emerald-500'
                                      : job.status === 'IN_PROGRESS'
                                      ? 'bg-amber-500'
                                      : 'bg-sky-600'
                                  }`}
                                  title={`${job.work_order_number}: ${job.start} - ${job.end}`}
                                >
                                  {job.start}
                                </div>
                              );
                            })}

                            {(!t.work_orders || t.work_orders.length === 0) && (
                              <span className="text-[9px] text-slate-400 font-medium italic mx-auto">
                                Full Shift Available (8h Free)
                              </span>
                            )}
                          </div>

                          {/* Shift time milestones */}
                          <div className="flex justify-between text-[8px] text-slate-400 font-bold px-1 mt-0.5">
                            <span>{t.work_start_time || '08:00'}</span>
                            <span>12:00 PM</span>
                            <span>{t.work_end_time || '17:00'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Specialized Skills Chips */}
                      {t.skills && t.skills.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-2">
                          {t.skills.slice(0, 2).map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-semibold"
                            >
                              {skill}
                            </span>
                          ))}
                          {t.skills.length > 2 && (
                            <span className="text-[9px] text-slate-400 font-bold">
                              +{t.skills.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Dedicated 'Click to Book / Dispatch Slot' Button in its respective space */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleOpenDispatchForTech(t)}
                        className="w-full py-1.5 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 hover:text-sky-800 border border-sky-200/90 font-bold text-xs shadow-2xs hover:shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-sky-600" />
                        Click to Book / Dispatch Slot
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Timeline Schedule Matrix Graph */}
                  <div
                    onClick={(e) => handleTimelineSlotClick(t, e)}
                    style={{ minHeight: '100px', height: '100px' }}
                    className="flex-1 relative bg-slate-50/70 rounded-2xl mr-5 border border-slate-200/80 cursor-pointer overflow-hidden hover:border-sky-300 hover:bg-slate-100/40 transition"
                  >
                    {/* Hour Vertical Grid Guidelines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {timelineConfig.hours.map((h) => (
                        <div key={h} className="flex-1 border-r border-slate-200/50 h-full" />
                      ))}
                    </div>

                    {/* Live Current Time Line (if viewing today) */}
                    {liveIndicatorPercent !== null && (
                      <div
                        className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center"
                        style={{ left: `${liveIndicatorPercent}%` }}
                      >
                        <div className="w-0.5 h-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                      </div>
                    )}

                    {/* Scheduled Absence / Leave Blocks */}
                    {t.leaves?.map((l) => {
                      const left = getPositionPercent(l.start);
                      const right = getPositionPercent(l.end);
                      const width = Math.max(8, right - left);
                      return (
                        <div
                          key={l.id}
                          onClick={(e) => e.stopPropagation()}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          className="absolute top-1.5 bottom-1.5 bg-stripes-rose bg-rose-100/90 border border-rose-300 rounded-xl p-2 text-[10px] text-rose-900 font-bold overflow-hidden shadow-xs flex items-center justify-center cursor-not-allowed z-10"
                          title={`Unavailable: ${l.type} (${l.start} - ${l.end})`}
                        >
                          <span className="truncate">Unavailable: {l.type}</span>
                        </div>
                      );
                    })}

                    {/* Scheduled Work Order Blocks */}
                    {t.work_orders?.map((job) => {
                      const left = getPositionPercent(job.start);
                      const right = getPositionPercent(job.end);
                      const width = Math.max(12, right - left);

                      const isUrgent = job.priority === 'URGENT';
                      const isHigh = job.priority === 'HIGH';
                      const isCompleted = job.status === 'COMPLETED';
                      const isInProgress = job.status === 'IN_PROGRESS';

                      return (
                        <div
                          key={job.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveJobModal(job);
                          }}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          className={`absolute top-2 bottom-2 rounded-xl p-2.5 text-[11px] font-semibold border shadow-xs transition hover:shadow-md hover:scale-[1.01] overflow-hidden flex flex-col justify-between cursor-pointer z-10 ${
                            isCompleted
                              ? 'bg-emerald-500/10 border-emerald-400 text-emerald-950'
                              : isInProgress
                              ? 'bg-amber-500/15 border-amber-400 text-amber-950 ring-1 ring-amber-400/40'
                              : isUrgent
                              ? 'bg-rose-500/15 border-rose-400 text-rose-950 ring-1 ring-rose-400/40'
                              : isHigh
                              ? 'bg-orange-500/15 border-orange-400 text-orange-950'
                              : 'bg-sky-500/15 border-sky-400 text-sky-950'
                          }`}
                          title={`${job.work_order_number}: ${job.service_name} (${job.start} - ${job.end}) - Click for details`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-extrabold truncate text-xs flex items-center gap-1">
                              {isInProgress && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              )}
                              {job.work_order_number}
                            </span>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-white/70">
                              {job.start} - {job.end}
                            </span>
                          </div>

                          <div className="truncate">
                            <p className="font-bold text-[10px] truncate text-slate-800">{job.service_name}</p>
                            <p className="text-[9px] text-slate-500 truncate">{job.customer_name}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Live Indicator Legend */}
            {liveIndicatorPercent !== null && (
              <div className="p-3 bg-slate-50/90 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span className="font-bold text-rose-600 font-mono tracking-tight">
                    Live System Clock: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="text-slate-400">| Vertical red tracker marks current time</span>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-md bg-sky-200 border border-sky-400" /> Scheduled
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-md bg-amber-200 border border-amber-400" /> In Progress
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-md bg-emerald-200 border border-emerald-400" /> Completed
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-md bg-rose-200 border border-rose-400" /> Urgent
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Quick Job Details Modal */}
      {activeJobModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-sky-600">Work Order Details</span>
                <h3 className="text-xl font-black text-slate-900">{activeJobModal.work_order_number}</h3>
              </div>
              <button
                onClick={() => setActiveJobModal(null)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs">
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold">Status</span>
                <div className="mt-1">
                  <StatusBadge status={activeJobModal.status} />
                </div>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold">Priority</span>
                <p className="font-bold text-slate-800 mt-1">{activeJobModal.priority}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold">Time Window</span>
                <p className="font-bold text-slate-800 mt-1">{activeJobModal.start} - {activeJobModal.end}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold">Estimated Cost</span>
                <p className="font-bold text-slate-900 mt-1">${activeJobModal.estimated_cost?.toFixed(2)}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 font-bold text-[10px] uppercase">Service Type</span>
                <p className="font-bold text-slate-800 text-sm">{activeJobModal.service_name}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold text-[10px] uppercase">Customer & Location</span>
                <p className="font-semibold text-slate-700">{activeJobModal.customer_name}</p>
                <p className="text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {activeJobModal.service_location}
                </p>
              </div>
              {activeJobModal.description && (
                <div>
                  <span className="text-slate-400 font-bold text-[10px] uppercase">Scope Notes</span>
                  <p className="text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 mt-0.5">
                    {activeJobModal.description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setActiveJobModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              <Link
                to={`/work-orders/${activeJobModal.id}`}
                className="px-4 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Full Work Order
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 7. Redesigned, High-Precision Rapid Dispatch Coordinator Modal */}
      {dispatchModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmDispatch}
            className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header Block */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
                  <Zap className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Schedule Work Order Slot</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Board Date: <span className="font-bold text-slate-800">{selectedDate}</span> • Rapid Dispatch Coordinator
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDispatchModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Block 1: Work Order Selection */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                1. Select Work Order
              </label>
              {dispatchModal.workOrder ? (
                <div className="p-3.5 bg-gradient-to-r from-sky-50/80 to-indigo-50/40 border border-sky-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-xs text-sky-950 bg-sky-100 px-2 py-0.5 rounded-md">
                      {dispatchModal.workOrder.work_order_number}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        dispatchModal.workOrder.priority === 'URGENT'
                          ? 'bg-rose-100 text-rose-700'
                          : dispatchModal.workOrder.priority === 'HIGH'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}>
                        {dispatchModal.workOrder.priority || 'NORMAL'}
                      </span>
                      {boardData?.unassigned_work_orders?.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setDispatchModal((prev) => ({ ...prev, workOrder: null }))}
                          className="text-[11px] font-bold text-sky-600 hover:text-sky-800 hover:underline cursor-pointer"
                        >
                          Change
                        </button>
                      )}
                    </div>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{dispatchModal.workOrder.service_name}</h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {dispatchModal.workOrder.customer_name}
                    </span>
                    <span className="font-semibold text-slate-700">${dispatchModal.workOrder.estimated_cost?.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <select
                  required
                  onChange={(e) => {
                    const picked = boardData?.unassigned_work_orders?.find((w) => w.id === e.target.value);
                    setDispatchModal((prev) => ({
                      ...prev,
                      workOrder: picked || null,
                      durationMinutes: picked?.estimated_duration || 60,
                    }));
                  }}
                  className="h-11 w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition cursor-pointer"
                >
                  <option value="">-- Choose an Unassigned Work Order --</option>
                  {boardData?.unassigned_work_orders?.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.work_order_number} - {w.service_name} ({w.customer_name})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Block 2: Technician Selection */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                2. Assign Field Technician
              </label>
              <select
                required
                value={dispatchModal.technicianId}
                onChange={(e) => setDispatchModal((prev) => ({ ...prev, technicianId: e.target.value }))}
                className="h-11 w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition cursor-pointer"
              >
                <option value="">-- Choose Field Technician --</option>
                {boardData?.technicians?.map((t) => (
                  <option key={t.technician_id} value={t.technician_id}>
                    {t.technician_name} ({t.region || 'Metro'}) - {t.availability_status} [Workload: {t.capacity_percentage}%]
                  </option>
                ))}
              </select>
            </div>

            {/* Block 3: Timing Inputs (Precisely Aligned Grid) */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  Start Time
                </label>
                <input
                  type="time"
                  required
                  value={dispatchModal.startTime}
                  onChange={(e) => setDispatchModal((prev) => ({ ...prev, startTime: e.target.value }))}
                  className="h-11 w-full px-3.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-600" />
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  required
                  value={dispatchModal.durationMinutes}
                  onChange={(e) => setDispatchModal((prev) => ({ ...prev, durationMinutes: Number(e.target.value) }))}
                  className="h-11 w-full px-3.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition"
                />
              </div>
            </div>

            {/* Live Scheduled Window & Conflict Prevention Banner */}
            {dispatchValidation && (
              <div
                className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 shadow-2xs transition-all ${
                  dispatchValidation.isConflict
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : dispatchValidation.isWarning
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {dispatchValidation.isConflict ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  ) : dispatchValidation.isWarning ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <span className="font-semibold line-clamp-1">{dispatchValidation.message}</span>
                </div>
                <div className="text-right shrink-0 font-bold">
                  <span>{dispatchValidation.formattedStart} → {dispatchValidation.formattedEnd}</span>
                  <span className="text-[10px] block opacity-80">({dispatchValidation.durationHours} hrs)</span>
                </div>
              </div>
            )}

            {/* Block 4: Dispatch Notes */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Dispatch Instructions / Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Special access codes, safety instructions, or tooling requirements..."
                value={dispatchModal.notes}
                onChange={(e) => setDispatchModal((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition"
              />
            </div>

            {/* Block 5: Actions Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDispatchModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={dispatchModal.submitting}
                className="px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-xl shadow-md shadow-sky-500/20 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {dispatchModal.submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Locking Slot...
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    Confirm & Dispatch Slot
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 8. WORKABLE MODAL: Fleet Capacity Overview */}
      {activeKpiModal === 'CAPACITY' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Fleet Capacity & Roster</h3>
                  <p className="text-xs text-slate-500">Live operational status for {selectedDate}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveKpiModal(null)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick summary stats */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/60 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Total Fleet</span>
                <p className="text-lg font-black text-slate-900 mt-0.5">{boardData?.technicians?.length || 0}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-600">Available</span>
                <p className="text-lg font-black text-emerald-600 mt-0.5">{stats.available_technicians || 0}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-amber-600">On Job</span>
                <p className="text-lg font-black text-amber-600 mt-0.5">{stats.busy_technicians || 0}</p>
              </div>
            </div>

            {/* Technician list with interactive actions */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {boardData?.technicians?.map((t) => (
                <div
                  key={t.technician_id}
                  className="p-3 bg-white rounded-2xl border border-slate-200/80 hover:border-sky-300 shadow-2xs hover:shadow-xs transition flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {t.technician_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-slate-900">{t.technician_name}</h4>
                        <StatusBadge status={t.availability_status} />
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {t.region || 'All Region'} • Shift: {t.work_start_time} - {t.work_end_time}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setSearchQuery(t.technician_name);
                        setActiveKpiModal(null);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                      title="Filter dispatch board to this technician"
                    >
                      Filter Board
                    </button>
                    <button
                      onClick={() => {
                        setActiveKpiModal(null);
                        handleOpenDispatchForTech(t);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg transition cursor-pointer flex items-center gap-1"
                      title="Dispatch slot for this technician"
                    >
                      <Plus className="w-3 h-3" />
                      Dispatch
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">Manage field profiles & working schedules</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveKpiModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
                <Link
                  to="/technicians"
                  className="px-4 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Technicians Portal
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. WORKABLE MODAL: Fleet Utilization & Workload Breakdown */}
      {activeKpiModal === 'UTILIZATION' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Fleet Utilization Analysis</h3>
                  <p className="text-xs text-slate-500">Shift workload & schedule capacity for {selectedDate}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveKpiModal(null)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick metrics */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-indigo-700">Fleet Utilization</span>
                <p className="text-xl font-black text-indigo-950 mt-0.5">{stats.fleet_utilization_pct || 0}%</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500">Total Booked</span>
                <p className="text-xl font-black text-slate-900 mt-0.5">{totalBookedHours.toFixed(1)} hrs</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-600">Available Free</span>
                <p className="text-xl font-black text-emerald-600 mt-0.5">{remainingFleetHours.toFixed(1)} hrs</p>
              </div>
            </div>

            {/* Workload list per technician */}
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {boardData?.technicians?.map((t) => (
                <div
                  key={t.technician_id}
                  className="p-3.5 bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-300 shadow-2xs transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{t.technician_name}</h4>
                      <p className="text-[11px] text-slate-400">{t.region} • {t.work_orders?.length || 0} scheduled jobs</p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-xs text-slate-900">{t.capacity_percentage || 0}%</span>
                      <p className="text-[10px] text-slate-500">{t.total_booked_hours || 0}h / 8.0h</p>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getCapacityColor(t.capacity_percentage || 0)}`}
                      style={{ width: `${Math.min(100, t.capacity_percentage || 0)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-slate-500">
                      {t.capacity_percentage >= 80 ? '⚡ Heavy workload' : t.capacity_percentage >= 50 ? '● Moderate workload' : '✨ High capacity available'}
                    </span>
                    <button
                      onClick={() => {
                        setActiveKpiModal(null);
                        handleOpenDispatchForTech(t);
                      }}
                      className="font-bold text-indigo-600 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Job
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setActiveKpiModal(null)}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition cursor-pointer"
              >
                Close Workload View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. WORKABLE MODAL: Booked Revenue & Scheduled Jobs Ledger */}
      {activeKpiModal === 'REVENUE' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Today's Booked Revenue</h3>
                  <p className="text-xs text-slate-500">Scheduled operations value for {selectedDate}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveKpiModal(null)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Financial Summary */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-800">Total Booked</span>
                <p className="text-xl font-black text-emerald-700 mt-0.5">${(stats.total_revenue_today || 0).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500">Scheduled Jobs</span>
                <p className="text-xl font-black text-slate-900 mt-0.5">{allTodayScheduledJobs.length}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500">Avg Job Value</span>
                <p className="text-xl font-black text-slate-900 mt-0.5">
                  ${allTodayScheduledJobs.length > 0 ? Math.round((stats.total_revenue_today || 0) / allTodayScheduledJobs.length) : 0}
                </p>
              </div>
            </div>

            {/* Itemized list of revenue work orders */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {allTodayScheduledJobs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No work orders scheduled for this date.
                </div>
              ) : (
                allTodayScheduledJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => {
                      setActiveKpiModal(null);
                      setActiveJobModal(job);
                    }}
                    className="p-3 bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-300 shadow-2xs hover:shadow-xs transition flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900 group-hover:text-emerald-700 transition">
                          {job.work_order_number}
                        </span>
                        <StatusBadge status={job.status} />
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 line-clamp-1 mt-0.5">{job.service_name}</h4>
                      <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{job.customer_name}</span>
                        <span>•</span>
                        <span>{job.technician_name}</span>
                        <span>•</span>
                        <span>{job.start} - {job.end}</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-sm text-slate-900">${job.estimated_cost?.toFixed(2)}</span>
                      <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 justify-end mt-0.5">
                        Details <ArrowRight className="w-3 h-3" />
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">Analyze performance & financial variances</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveKpiModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
                <Link
                  to="/reports"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Reports & Analytics
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchBoardPage;
