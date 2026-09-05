import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';
import { ClaimStatus } from '../types';

interface ReadinessScoreCardProps {
  score: number;
  status: ClaimStatus;
  passedChecks?: number;
  totalChecks?: number;
  riskBreakdown?: {
    documentation: number;
    evidence: number;
    consistency: number;
    clinicalSupport: number;
  };
}

export const ReadinessScoreCard: React.FC<ReadinessScoreCardProps> = ({
  score,
  status,
  passedChecks = 5,
  totalChecks = 5,
  riskBreakdown = { documentation: 100, evidence: 100, consistency: 100, clinicalSupport: 100 }
}) => {
  // Gauge calculations
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let badgeColor = 'bg-ready-light text-ready-text border-ready-border';
  let badgeIcon = <ShieldCheck className="w-5 h-5 text-ready-solid" />;
  let badgeLabel = 'DOCUMENTATION READY';

  if (status === 'BLOCKED') {
    badgeColor = 'bg-blocked-light text-blocked-text border-blocked-border';
    badgeIcon = <ShieldX className="w-5 h-5 text-blocked-solid" />;
    badgeLabel = 'SUBMISSION BLOCKED';
  } else if (status === 'REVIEW') {
    badgeColor = 'bg-review-light text-review-text border-review-border';
    badgeIcon = <ShieldAlert className="w-5 h-5 text-review-solid" />;
    badgeLabel = 'HUMAN REVIEW RECOMMENDED';
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-100 pb-6">
        {/* Left: Circular Readiness Gauge */}
        <div className="flex items-center gap-6">
          <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-slate-100"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="72"
                cy="72"
                r={radius}
                className={`transition-all duration-1000 ease-out ${
                  status === 'READY' ? 'stroke-emerald-500' : (status === 'REVIEW' ? 'stroke-amber-500' : 'stroke-red-500')
                }`}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">{score}%</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Readiness</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold tracking-wide ${badgeColor}`}>
              {badgeIcon}
              <span>{badgeLabel}</span>
            </div>
            <p className="text-slate-600 text-sm font-medium">
              {passedChecks} of {totalChecks} pre-submission checks passed
            </p>
            <p className="text-xs text-slate-400">
              Audited against payer requirements before submission.
            </p>
          </div>
        </div>
      </div>

      {/* Risk Breakdown Progress Bars */}
      <div>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Documentation Risk Breakdown</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(riskBreakdown).map(([key, val]) => {
            const labelMap: Record<string, string> = {
              documentation: 'Documentation',
              evidence: 'Evidence',
              consistency: 'Consistency',
              clinicalSupport: 'Clinical Support'
            };
            return (
              <div key={key} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">{labelMap[key]}</span>
                  <span className="font-mono font-bold text-slate-900">{val}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      val >= 90 ? 'bg-emerald-500' : (val >= 60 ? 'bg-amber-500' : 'bg-red-500')
                    }`}
                    style={{ width: `${val}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
