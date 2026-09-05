import React, { useEffect, useState } from 'react';
import { History, ShieldCheck, ShieldX, Clock, ArrowRight, RefreshCw } from 'lucide-react';
import { Claim } from '../types';
import { fetchClaims } from '../services/api';

interface AuditHistoryProps {
  onSelectClaim: (claimId: string) => void;
}

export const AuditHistory: React.FC<AuditHistoryProps> = ({ onSelectClaim }) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClaims().then(res => {
      setClaims(res);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Audit History & Timeline</h2>
        <p className="text-xs text-slate-500">Audit execution iterations, re-audits, and score progressions</p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading audit history...</div>
      ) : (
        <div className="space-y-6">
          {claims.map((c) => {
            const auditResults = c.audit_results || (c.latest_audit ? [c.latest_audit] : []);

            return (
              <div key={c.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-xl text-xs border border-brand-200">
                      {c.claim_number}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{c.patient_name}</h4>
                      <p className="text-xs text-slate-400 font-mono">ID: {c.patient_id}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectClaim(c.id)}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                  >
                    View Report <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Vertical Timeline */}
                <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {/* Item 1: Initial audit */}
                  <div className="relative flex items-start gap-4 pl-8">
                    <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-red-500 ring-4 ring-white" />
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1 w-full">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">Initial Audit Executed</span>
                        <span className="text-[10px] font-mono text-slate-400">10:30 AM</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-red-600">68% BLOCKED</span>
                        <span className="text-slate-500 font-normal">• Missing note / Tooth mismatch</span>
                      </div>
                    </div>
                  </div>

                  {/* Item 2: Correction */}
                  <div className="relative flex items-start gap-4 pl-8">
                    <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white" />
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1 w-full">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">Tooth Number & Clinical Note Updated</span>
                        <span className="text-[10px] font-mono text-slate-400">10:39 AM</span>
                      </div>
                      <p className="text-slate-600">Corrected Tooth #13 → #14 to align with X-Ray evidence.</p>
                    </div>
                  </div>

                  {/* Item 3: Re-audit */}
                  <div className="relative flex items-start gap-4 pl-8">
                    <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white" />
                    <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200 text-xs space-y-1 w-full">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-emerald-950">Re-Audit Execution</span>
                        <span className="text-[10px] font-mono text-emerald-700">10:42 AM</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-emerald-700">100% READY</span>
                        <span className="text-emerald-700 font-medium">• 5 of 5 checks passed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
