import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ text = "Loading...", fullScreen = false }) => {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3 border border-slate-100">
          <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
          <p className="text-sm font-medium text-slate-700">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-12 gap-3 text-slate-500">
      <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
};

export default LoadingSpinner;
