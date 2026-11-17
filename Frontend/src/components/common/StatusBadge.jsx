import React from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  Navigation,
  FileText,
  Ban,
  Sparkles,
} from 'lucide-react';

export const StatusBadge = ({ status }) => {
  if (!status) return null;

  const normalized = status.toUpperCase();

  const configs = {
    DRAFT: {
      bg: 'bg-slate-100/90',
      text: 'text-slate-800',
      border: 'border-slate-300',
      icon: FileText,
      isLive: false,
    },
    NEW: {
      bg: 'bg-sky-50',
      text: 'text-sky-800',
      border: 'border-sky-300',
      icon: Clock,
      isLive: true,
      beaconColor: 'bg-sky-500',
    },
    UNDER_REVIEW: {
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      border: 'border-amber-300',
      icon: Clock,
      isLive: false,
    },
    APPROVED: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      icon: CheckCircle2,
      isLive: false,
    },
    SCHEDULED: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-900',
      border: 'border-indigo-300',
      icon: Clock,
      isLive: true,
      beaconColor: 'bg-indigo-500',
    },
    ASSIGNED: {
      bg: 'bg-cyan-50',
      text: 'text-cyan-900',
      border: 'border-cyan-300',
      icon: Clock,
      isLive: true,
      beaconColor: 'bg-cyan-500',
    },
    EN_ROUTE: {
      bg: 'bg-purple-50',
      text: 'text-purple-900',
      border: 'border-purple-300',
      icon: Navigation,
      isLive: true,
      beaconColor: 'bg-purple-500',
    },
    IN_PROGRESS: {
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      border: 'border-amber-400',
      icon: PlayCircle,
      isLive: true,
      beaconColor: 'bg-amber-500',
    },
    ON_HOLD: {
      bg: 'bg-rose-50',
      text: 'text-rose-900',
      border: 'border-rose-300',
      icon: PauseCircle,
      isLive: false,
    },
    COMPLETED: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-900',
      border: 'border-emerald-300',
      icon: CheckCircle2,
      isLive: false,
    },
    CONVERTED: {
      bg: 'bg-teal-50',
      text: 'text-teal-900',
      border: 'border-teal-300',
      icon: CheckCircle2,
      isLive: false,
    },
    CANCELLED: {
      bg: 'bg-rose-50',
      text: 'text-rose-900',
      border: 'border-rose-300',
      icon: Ban,
      isLive: false,
    },
    REJECTED: {
      bg: 'bg-rose-50',
      text: 'text-rose-900',
      border: 'border-rose-300',
      icon: Ban,
      isLive: false,
    },
    ACTIVE: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-900',
      border: 'border-emerald-300',
      icon: CheckCircle2,
      isLive: true,
      beaconColor: 'bg-emerald-500',
    },
    INACTIVE: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
      icon: Ban,
      isLive: false,
    },
    AVAILABLE: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-900',
      border: 'border-emerald-300',
      icon: CheckCircle2,
      isLive: true,
      beaconColor: 'bg-emerald-500',
    },
    BUSY: {
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      border: 'border-amber-300',
      icon: PlayCircle,
      isLive: true,
      beaconColor: 'bg-amber-500',
    },
    ON_LEAVE: {
      bg: 'bg-rose-50',
      text: 'text-rose-900',
      border: 'border-rose-300',
      icon: PauseCircle,
      isLive: false,
    },
    IN_STOCK: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-900',
      border: 'border-emerald-300',
      icon: CheckCircle2,
      isLive: false,
    },
    LOW_STOCK: {
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      border: 'border-amber-300',
      icon: AlertCircle,
      isLive: false,
    },
    OUT_OF_STOCK: {
      bg: 'bg-rose-50',
      text: 'text-rose-900',
      border: 'border-rose-300',
      icon: Ban,
      isLive: false,
    },
  };

  const cfg = configs[normalized] || {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
    icon: Clock,
    isLive: false,
  };
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-xs tracking-wide transition-all ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      {cfg.isLive && cfg.beaconColor ? (
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${cfg.beaconColor}`}
          />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.beaconColor}`} />
        </span>
      ) : (
        <Icon className="w-3.5 h-3.5" />
      )}
      <span>{normalized.replace(/_/g, ' ')}</span>
    </span>
  );
};

export default StatusBadge;
