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
  let badgeColor = 'bg-ready-light text-ready-text border-ready-border';
  let badgeIcon = <ShieldCheck className="w-5 h-5 text-ready-solid" />;
  let badgeLabel = 'DOCUMENTATION COMPLETE';

  if (status === 'BLOCKED') {
    badgeColor = 'bg-blocked-light text-blocked-text border-blocked-border';
    badgeIcon = <ShieldX className="w-5 h-5 text-blocked-solid" />;
    badgeLabel = 'CHANGES RECOMMENDED BEFORE SUBMISSION';
  } else if (status === 'REVIEW') {
    badgeColor = 'bg-review-light text-review-text border-review-border';
    badgeIcon = <ShieldAlert className="w-5 h-5 text-review-solid" />;
    badgeLabel = 'REVIEW RECOMMENDED';
  }

  const missingCount = totalChecks - passedChecks;

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-4">
          <div className={`p-3.5 rounded-2xl border ${badgeColor}`}>
            {badgeIcon}
          </div>
          <div>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold tracking-wide ${badgeColor}`}>
              <span>{badgeLabel}</span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mt-1">
              Pre-Submission Compliance Assessment
            </h3>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <div className="text-xs font-mono font-bold uppercase text-slate-400">Payer Criteria Checks</div>
          <div className="text-sm font-extrabold text-slate-800 font-mono mt-0.5">
            {passedChecks} / {totalChecks} Satisfied
          </div>
          {missingCount > 0 && (
            <div className="text-xs font-semibold text-rose-600 font-mono mt-0.5">
              {missingCount} {missingCount === 1 ? 'Requirement' : 'Requirements'} Missing or Deficient
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-slate-500 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>Audited against payer requirements and clinical documentation criteria before claim filing.</span>
      </div>
    </div>
  );
};
