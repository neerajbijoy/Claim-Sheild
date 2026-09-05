import React from 'react';
import { ShieldCheck, Plus, Sparkles, Database } from 'lucide-react';

interface TopBarProps {
  onStartAudit: () => void;
  dbStatus?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ onStartAudit, dbStatus = 'Local Database' }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">
          Pre-Submission Dental Claim Auditor
        </h2>
        <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> System Active
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
          <Database className="w-3.5 h-3.5 text-slate-600" />
          <span>Backend Database: <strong className="text-slate-800">{dbStatus}</strong></span>
        </div>

        <button
          onClick={onStartAudit}
          className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-brand-600/30 flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> START NEW AUDIT
        </button>
      </div>
    </header>
  );
};
