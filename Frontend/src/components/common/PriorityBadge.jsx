import React from 'react';
import { ArrowUp, ArrowDown, Minus, Flame, AlertOctagon } from 'lucide-react';

export const PriorityBadge = ({ priority }) => {
  if (!priority) return null;

  const normalized = priority.toUpperCase();

  const configs = {
    LOW: {
      bg: 'bg-slate-100/90',
      text: 'text-slate-800',
      border: 'border-slate-300',
      icon: ArrowDown,
      glow: '',
    },
    MEDIUM: {
      bg: 'bg-sky-50',
      text: 'text-sky-900',
      border: 'border-sky-300',
      icon: Minus,
      glow: '',
    },
    HIGH: {
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      border: 'border-amber-400',
      icon: ArrowUp,
      glow: 'shadow-xs',
    },
    URGENT: {
      bg: 'bg-rose-50',
      text: 'text-rose-950',
      border: 'border-rose-400',
      icon: Flame,
      glow: 'shadow-xs shadow-rose-500/20 ring-1 ring-rose-400/40',
    },
  };

  const cfg = configs[normalized] || {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
    icon: Minus,
    glow: '',
  };
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase border transition-all ${cfg.bg} ${cfg.text} ${cfg.border} ${cfg.glow}`}
    >
      <Icon className={`w-3 h-3 ${normalized === 'URGENT' ? 'text-rose-600 animate-pulse' : ''}`} />
      <span>{normalized}</span>
    </span>
  );
};

export default PriorityBadge;
