import React from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { CheckItem } from '../types';

interface ValidationCheckCardProps {
  check: CheckItem;
}

export const ValidationCheckCard: React.FC<ValidationCheckCardProps> = ({ check }) => {
  let statusBadge = (
    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> PASSED
    </span>
  );
  let cardBorder = 'border-slate-200 hover:border-slate-300';
  let iconBg = 'bg-emerald-50 text-emerald-600';

  if (check.status === 'FAILED') {
    statusBadge = (
      <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
        <XCircle className="w-3.5 h-3.5 text-red-600" /> FAILED
      </span>
    );
    cardBorder = 'border-red-200 bg-red-50/30';
    iconBg = 'bg-red-100 text-red-600';
  } else if (check.status === 'WARNING') {
    statusBadge = (
      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
        <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> WARNING
      </span>
    );
    cardBorder = 'border-amber-200 bg-amber-50/20';
    iconBg = 'bg-amber-100 text-amber-600';
  }

  return (
    <div className={`p-4 bg-white rounded-2xl border transition-all shadow-sm ${cardBorder}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${iconBg}`}>
            {check.status === 'FAILED' ? <XCircle className="w-5 h-5" /> : (check.status === 'WARNING' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />)}
          </div>
          <div>
            <h5 className="text-sm font-bold text-slate-800">{check.title}</h5>
            <p className="text-xs text-slate-600 mt-0.5">{check.message}</p>
          </div>
        </div>
        <div>{statusBadge}</div>
      </div>
    </div>
  );
};
