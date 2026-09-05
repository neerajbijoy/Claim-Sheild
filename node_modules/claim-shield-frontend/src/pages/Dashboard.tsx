import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, Clock, ArrowUpRight, Plus, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';
import { Claim } from '../types';
import { fetchClaims } from '../services/api';

interface DashboardProps {
  onSelectClaim: (claimId: string) => void;
  onNewAudit: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectClaim, onNewAudit }) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const data = await fetchClaims();
      setClaims(data);
    } catch (err) {
      console.error('Failed loading dashboard claims:', err);
    } finally {
      setLoading(false);
    }
  };

  // Compute live dynamic stats from DB claims
  const totalAudited = claims.length;
  const readyCount = claims.filter(c => c.status === 'READY').length;
  const reviewCount = claims.filter(c => c.status === 'REVIEW').length;
  const blockedCount = claims.filter(c => c.status === 'BLOCKED').length;

  const avgReadiness = totalAudited > 0
    ? Math.round(claims.reduce((acc, c) => acc + (c.readiness_score || 0), 0) / totalAudited)
    : 100;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="text-xs font-mono font-bold text-teal-400 uppercase tracking-widest">Good Morning</div>
          <h2 className="text-2xl font-extrabold tracking-tight">Protect your next claim.</h2>
          <p className="text-xs text-slate-300">
            Real-time pre-submission audits running on Supabase database engine.
          </p>
        </div>

        <button
          onClick={onNewAudit}
          className="bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-lg shadow-brand-600/30 flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>START NEW PRE-SUBMISSION AUDIT</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Claims Audited</span>
          <div className="text-2xl font-extrabold font-mono text-slate-900">{totalAudited}</div>
          <p className="text-[10px] text-slate-500">Total claims in database</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            <span>Ready</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-800">{readyCount}</div>
          <p className="text-[10px] text-emerald-600">Passed pre-submission check</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-amber-700">
            <span>Needs Review</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-800">{reviewCount}</div>
          <p className="text-[10px] text-amber-600">Minor Gaps / Warnings</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-red-700">
            <span>Blocked</span>
            <ShieldX className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-red-800">{blockedCount}</div>
          <p className="text-[10px] text-red-600">Documentation Risk</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg Readiness</span>
          <div className="text-2xl font-extrabold font-mono text-brand-600">{avgReadiness}%</div>
          <p className="text-[10px] text-slate-500">Overall readiness index</p>
        </div>
      </div>

      {/* Main Grid: Recent Claims Table & Audit Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Recent Claims Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Audited Claims</h3>
              <p className="text-xs text-slate-500">Click any row to open full audit analysis report</p>
            </div>
            <button
              onClick={loadDashboardData}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading DB Claims...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                    <th className="py-3 px-3">Claim ID</th>
                    <th className="py-3 px-3">Patient</th>
                    <th className="py-3 px-3">Procedure</th>
                    <th className="py-3 px-3">Tooth</th>
                    <th className="py-3 px-3">Readiness</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {claims.map((c) => {
                    const proc = c.procedures && c.procedures.length > 0 ? c.procedures[0] : { cdt_code: 'D2740', tooth_number: '14' };
                    let statusBadge = (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono">
                        READY
                      </span>
                    );
                    if (c.status === 'BLOCKED') {
                      statusBadge = (
                        <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono">
                          BLOCKED
                        </span>
                      );
                    } else if (c.status === 'REVIEW') {
                      statusBadge = (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono">
                          REVIEW
                        </span>
                      );
                    }

                    return (
                      <tr
                        key={c.id}
                        onClick={() => onSelectClaim(c.id)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-3 font-mono font-bold text-brand-600">{c.claim_number}</td>
                        <td className="py-3.5 px-3 text-slate-800 font-semibold">{c.patient_name}</td>
                        <td className="py-3.5 px-3 font-mono text-slate-700">{proc.cdt_code}</td>
                        <td className="py-3.5 px-3 font-mono text-slate-700">#{proc.tooth_number}</td>
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-900">{c.readiness_score}%</td>
                        <td className="py-3.5 px-3">{statusBadge}</td>
                        <td className="py-3.5 px-3 text-right">
                          <span className="text-slate-400 hover:text-brand-600 inline-flex items-center gap-1 font-semibold text-[11px]">
                            View <ArrowUpRight className="w-3.5 h-3.5" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Col: Audit Activity & Risk Overview */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" /> Audit Activity Timeline
            </h3>

            <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              <div className="relative flex items-start gap-3 pl-6">
                <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white" />
                <div className="space-y-0.5 text-xs">
                  <div className="text-[10px] text-slate-400 font-mono">10:42 AM</div>
                  <p className="font-semibold text-slate-800">CLM-1001 re-audited</p>
                  <p className="text-[11px] text-emerald-600 font-mono font-bold">82% → 100% READY</p>
                </div>
              </div>

              <div className="relative flex items-start gap-3 pl-6">
                <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-red-500 ring-4 ring-white" />
                <div className="space-y-0.5 text-xs">
                  <div className="text-[10px] text-slate-400 font-mono">10:35 AM</div>
                  <p className="font-semibold text-slate-800">CLM-1002 audit executed</p>
                  <p className="text-[11px] text-red-600 font-mono font-bold">68% BLOCKED (Tooth mismatch)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Overview */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold tracking-wide uppercase text-slate-300">Documentation Risk Overview</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Documentation Completeness</span>
                <span className="font-mono text-emerald-400 font-bold">100%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Supporting Evidence (X-Ray)</span>
                <span className="font-mono text-emerald-400 font-bold">100%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Cross-Source Consistency</span>
                <span className="font-mono text-amber-400 font-bold">85%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Clinical Support Indicators</span>
                <span className="font-mono text-emerald-400 font-bold">94%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
