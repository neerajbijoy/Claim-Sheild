import React from 'react';
import { AlertOctagon, AlertTriangle, Info, CheckCircle2, ShieldOff, Eye } from 'lucide-react';
import { Finding } from '../types';

interface FindingCardProps {
  finding: Finding;
  onResolve?: (id: string) => void;
  onOverride?: (id: string) => void;
}

export const FindingCard: React.FC<FindingCardProps> = ({ finding, onResolve, onOverride }) => {
  let severityBadge = (
    <span className="bg-red-100 text-red-800 border border-red-200 px-3 py-1 rounded-full text-xs font-extrabold font-mono flex items-center gap-1.5">
      <AlertOctagon className="w-4 h-4 text-red-600" /> HIGH RISK
    </span>
  );
  let cardBg = 'bg-red-50/40 border-red-200';

  if (finding.severity === 'MEDIUM') {
    severityBadge = (
      <span className="bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold font-mono flex items-center gap-1.5">
        <AlertTriangle className="w-4 h-4 text-amber-600" /> MEDIUM RISK
      </span>
    );
    cardBg = 'bg-amber-50/40 border-amber-200';
  } else if (finding.severity === 'LOW') {
    severityBadge = (
      <span className="bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold font-mono flex items-center gap-1.5">
        <Info className="w-4 h-4 text-blue-600" /> LOW RISK
      </span>
    );
    cardBg = 'bg-blue-50/40 border-blue-200';
  }

  return (
    <div className={`p-5 rounded-2xl border transition-all shadow-sm ${cardBg} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {severityBadge}
          <span className="text-xs font-mono font-semibold text-slate-500 bg-white/80 px-2.5 py-0.5 rounded-md border border-slate-200">
            {finding.finding_type}
          </span>
        </div>
        <div className="text-xs font-mono text-slate-500">
          Confidence: <span className="font-bold text-slate-800">{Math.round(finding.confidence * 100)}%</span>
        </div>
      </div>

      <div>
        <h4 className="text-base font-bold text-slate-900">{finding.title}</h4>
        <p className="text-xs text-slate-700 mt-1 font-medium leading-relaxed">{finding.explanation}</p>
      </div>

      {finding.evidence && (
        <div className="bg-white/90 p-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-700">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-sans block mb-1 font-bold">Detected Evidence</span>
          {finding.evidence}
        </div>
      )}

      <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl text-xs space-y-1">
        <span className="text-[10px] uppercase tracking-wider font-bold text-brand-400 block">Recommended Action</span>
        <p className="text-slate-100 font-medium">{finding.recommended_action}</p>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/60">
        {onOverride && (
          <button
            type="button"
            onClick={() => onOverride(finding.id)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-all flex items-center gap-1.5"
          >
            <ShieldOff className="w-3.5 h-3.5" /> Override Risk
          </button>
        )}
        {onResolve && (
          <button
            type="button"
            onClick={() => onResolve(finding.id)}
            className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Resolve Finding
          </button>
        )}
      </div>
    </div>
  );
};
