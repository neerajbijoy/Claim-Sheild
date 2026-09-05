import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldX,
  Clock,
  ArrowRight,
  RefreshCw,
  CheckCircle
} from 'lucide-react';

import { Claim, AuditResult } from '../types';
import { fetchClaims } from '../services/api';

interface AuditHistoryProps {
  onSelectClaim: (claimId: string) => void;
}

/*
 * Format a Supabase timestamp using the actual stored time.
 *
 * Supabase normally stores timestamps in UTC.
 * The browser converts the timestamp to IST here.
 */
const formatDateTime = (
  timestamp?: string | null
): string => {
  if (!timestamp) {
    return 'Time unavailable';
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return 'Time unavailable';
  }

  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

/*
 * Format only the time.
 */
const formatTime = (
  timestamp?: string | null
): string => {
  if (!timestamp) {
    return 'Time unavailable';
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return 'Time unavailable';
  }

  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

/*
 * Get the timestamp from an audit result.
 *
 * Supabase audit_results uses audited_at.
 * The fallback to created_at also supports older records.
 */
const getAuditTimestamp = (
  audit: AuditResult
): string | undefined => {
  return (
    (audit as any).audited_at ||
    audit.created_at
  );
};

export const AuditHistory: React.FC<AuditHistoryProps> = ({
  onSelectClaim
}) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /*
   * Load audit history from Supabase.
   */
  const loadHistory = async () => {
    try {
      setRefreshing(true);

      const res = await fetchClaims();

      /*
       * Sort newest claims first using the REAL
       * Supabase created_at timestamp.
       */
      const sortedClaims = [...res].sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      );

      setClaims(sortedClaims);
    } catch (error) {
      console.error(
        'Failed to load audit history:',
        error
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex items-start justify-between">

        <div>

          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Audit History & Timeline
          </h2>

          <p className="text-xs text-slate-500 mt-1">
            Audit execution iterations, re-audits, and score progressions
          </p>

        </div>

        <button
          onClick={loadHistory}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${
              refreshing
                ? 'animate-spin'
                : ''
            }`}
          />

          Refresh
        </button>

      </div>


      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading ? (

        <div className="py-12 text-center text-xs text-slate-400">
          Loading audit history...
        </div>

      ) : claims.length === 0 ? (

        <div className="py-16 text-center">

          <Clock className="w-8 h-8 text-slate-300 mx-auto" />

          <p className="text-sm font-semibold text-slate-500 mt-3">
            No audit history available
          </p>

        </div>

      ) : (

        <div className="space-y-6">

          {claims.map((c) => {

            /*
             * Get all actual audit records belonging
             * to this claim.
             */
            const auditResults =
              c.audit_results ||
              (
                c.latest_audit
                  ? [c.latest_audit]
                  : []
              );

            /*
             * Sort audits using the actual Supabase
             * audited_at / created_at timestamp.
             */
            const sortedAudits =
              [...auditResults].sort(
                (a, b) =>
                  new Date(
                    getAuditTimestamp(b) || 0
                  ).getTime() -
                  new Date(
                    getAuditTimestamp(a) || 0
                  ).getTime()
              );

            return (

              <div
                key={c.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4"
              >

                {/* =================================================
                    CLAIM HEADER
                ================================================= */}

                <div className="flex items-center justify-between border-b border-slate-100 pb-4">

                  <div className="flex items-center gap-3">

                    <span className="font-mono font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-xl text-xs border border-brand-200">
                      {c.claim_number}
                    </span>

                    <div>

                      <h4 className="font-bold text-slate-900 text-sm">
                        {c.patient_name}
                      </h4>

                      <p className="text-xs text-slate-400 font-mono">
                        ID: {c.patient_id}
                      </p>

                    </div>

                  </div>


                  <button
                    onClick={() =>
                      onSelectClaim(c.id)
                    }
                    className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                  >
                    View Report

                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                </div>


                {/* =================================================
                    CLAIM CREATED TIME
                ================================================= */}
git                 <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">

                  <Clock className="w-3.5 h-3.5" />

                  Claim created:

                  <span className="font-semibold text-slate-500">
                    {formatDateTime(
                      c.created_at
                    )}
                  </span>

                </div>


                {/* =================================================
                    AUDIT TIMELINE
                ================================================= */}

                <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">

                  {sortedAudits.length === 0 ? (

                    /*
                     * No audit yet.
                     */
                    <div className="relative flex items-start gap-4 pl-8">

                      <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-white" />

                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs w-full">

                        <div className="flex justify-between items-center">

                          <span className="font-bold text-slate-800">
                            Claim Created
                          </span>

                          <span className="text-[10px] font-mono text-slate-400">
                            {formatTime(
                              c.created_at
                            )}
                          </span>

                        </div>

                        <p className="text-slate-500 mt-1">
                          Waiting for the first audit execution.
                        </p>

                      </div>

                    </div>

                  ) : (

                    sortedAudits.map(
                      (audit, index) => {

                        const timestamp =
                          getAuditTimestamp(
                            audit
                          );

                        const isLatest =
                          index === 0;

                        const readiness =
                          audit.readiness_score ??
                          0;

                        const status =
                          audit.status ||
                          'REVIEW';

                        const isReady =
                          status ===
                          'READY' ||
                          readiness >= 90;

                        const isBlocked =
                          status ===
                          'BLOCKED' ||
                          readiness < 70;

                        const openFindings =
                          (
                            audit.findings ||
                            []
                          ).filter(
                            f =>
                              f.status ===
                              'OPEN'
                          ).length;

                        return (

                          <div
                            key={
                              audit.id ||
                              audit.audit_id ||
                              `${c.id}-${timestamp}-${index}`
                            }
                            className="relative flex items-start gap-4 pl-8"
                          >

                            {/* TIMELINE DOT */}

                            <div
                              className={`
                                absolute
                                left-1.5
                                top-1.5
                                w-3
                                h-3
                                rounded-full
                                ring-4
                                ring-white

                                ${
                                  isReady
                                    ? 'bg-emerald-500'
                                    : isBlocked
                                    ? 'bg-red-500'
                                    : 'bg-amber-500'
                                }
                              `}
                            />


                            {/* AUDIT CARD */}

                            <div
                              className={`
                                p-3.5
                                rounded-2xl
                                border
                                text-xs
                                space-y-2
                                w-full

                                ${
                                  isReady
                                    ? 'bg-emerald-50/60 border-emerald-200'
                                    : isBlocked
                                    ? 'bg-red-50/40 border-red-200'
                                    : 'bg-slate-50 border-slate-200'
                                }
                              `}
                            >

                              {/* TITLE + TIME */}

                              <div className="flex justify-between items-start gap-4">

                                <div className="flex items-center gap-2">

                                  {isReady ? (

                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />

                                  ) : isBlocked ? (

                                    <ShieldX className="w-4 h-4 text-red-600" />

                                  ) : (

                                    <Clock className="w-4 h-4 text-amber-600" />

                                  )}

                                  <div>

                                    <span className="font-bold text-slate-800">

                                      {index ===
                                      sortedAudits.length - 1
                                        ? 'Initial Audit Executed'
                                        : 'Re-Audit Execution'}

                                    </span>

                                    {isLatest && (
                                      <span className="ml-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-100 text-brand-700">
                                        Latest
                                      </span>
                                    )}

                                  </div>

                                </div>


                                {/* REAL SUPABASE TIME */}

                                <div className="text-right shrink-0">

                                  <div className="text-[10px] font-mono font-semibold text-slate-500">

                                    {formatTime(
                                      timestamp
                                    )}

                                  </div>

                                  <div className="text-[9px] font-mono text-slate-400 mt-0.5">

                                    {formatDateTime(
                                      timestamp
                                    ).split(',')[0]}

                                  </div>

                                </div>

                              </div>


                              {/* SCORE */}

                              <div className="flex items-center gap-2">

                                <span
                                  className={`
                                    font-mono
                                    font-bold

                                    ${
                                      isReady
                                        ? 'text-emerald-700'
                                        : isBlocked
                                        ? 'text-red-600'
                                        : 'text-amber-600'
                                    }
                                  `}
                                >

                                  {readiness}%

                                  {' '}

                                  {status}

                                </span>

                                <span className="text-slate-400">
                                  •
                                </span>

                                <span className="text-slate-500">

                                  {audit.summary?.passed ??
                                    0}

                                  {' '}of{' '}

                                  {audit.summary?.total_checks ??
                                    0}

                                  {' '}
                                  checks passed

                                </span>

                              </div>


                              {/* FINDINGS */}

                              <div className="flex items-center gap-2 text-[10px]">

                                <span className="text-slate-400">
                                  Open findings:
                                </span>

                                <span
                                  className={`
                                    font-bold

                                    ${
                                      openFindings === 0
                                        ? 'text-emerald-600'
                                        : 'text-red-600'
                                    }
                                  `}
                                >
                                  {openFindings}
                                </span>

                              </div>


                              {/* AUDIT ID */}

                              {(
                                audit.id ||
                                audit.audit_id
                              ) && (

                                <div className="pt-1 border-t border-slate-200/70">

                                  <span className="text-[9px] font-mono text-slate-400">
                                    Audit ID:{' '}
                                    {
                                      audit.id ||
                                      audit.audit_id
                                    }
                                  </span>

                                </div>

                              )}

                            </div>

                          </div>

                        );
                      }
                    )

                  )}

                </div>

              </div>

            );

          })}

        </div>

      )}

    </div>
  );
};

export default AuditHistory;
