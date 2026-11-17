import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', trend, to, onClick }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200 group-hover:bg-blue-600 group-hover:text-white dark:bg-sky-950/60 dark:text-cyan-400 dark:border-cyan-500/30 dark:group-hover:bg-cyan-600 dark:group-hover:text-white dark:group-hover:shadow-glow-cyan',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-500/30 dark:group-hover:bg-emerald-600 dark:group-hover:text-white dark:group-hover:shadow-glow-emerald',
    amber: 'bg-amber-50 text-amber-600 border-amber-200 group-hover:bg-amber-600 group-hover:text-white dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-500/30 dark:group-hover:bg-amber-600 dark:group-hover:text-white dark:group-hover:shadow-glow-amber',
    purple: 'bg-purple-50 text-purple-600 border-purple-200 group-hover:bg-purple-600 group-hover:text-white dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-500/30 dark:group-hover:bg-purple-600 dark:group-hover:text-white dark:group-hover:shadow-glow-purple',
    rose: 'bg-rose-50 text-rose-600 border-rose-200 group-hover:bg-rose-600 group-hover:text-white dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-500/30 dark:group-hover:bg-rose-600 dark:group-hover:text-white dark:group-hover:shadow-glow-rose',
    sky: 'bg-sky-50 text-sky-600 border-sky-200 group-hover:bg-sky-600 group-hover:text-white dark:bg-cyan-950/60 dark:text-cyan-400 dark:border-cyan-500/30 dark:group-hover:bg-cyan-600 dark:group-hover:text-white dark:group-hover:shadow-glow-cyan',
  };

  const badgeColor = colorMap[color] || colorMap.blue;

  const content = (
    <div
      className={`cyber-card relative overflow-hidden bg-white dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-lg transition-all duration-200 ${
        to || onClick
          ? 'group cursor-pointer hover:border-blue-400 dark:hover:border-cyan-400 hover:shadow-md dark:hover:shadow-glow-cyan active:scale-[0.99]'
          : 'group'
      }`}
    >
      {/* Top Laser Highlight on Hover */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 dark:via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {(to || onClick) && (
        <div className="absolute top-3.5 right-3.5 text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150">
          <ArrowUpRight className="w-4 h-4" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            {title}
          </p>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors tracking-tight">
            {value}
          </h3>
        </div>
        {Icon && (
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-200 group-hover:scale-105 ${badgeColor}`}
          >
            <Icon className="w-6 h-6 transition-transform duration-200 group-hover:rotate-3" />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
          {trend && (
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
              {trend}
            </span>
          )}
          {subtitle && <span className="truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block no-underline">
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full text-left p-0 border-0 bg-transparent">
        {content}
      </button>
    );
  }

  return content;
};

export default StatCard;
