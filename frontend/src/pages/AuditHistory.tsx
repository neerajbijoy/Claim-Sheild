import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ShieldX,
  Clock,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  FileText
} from 'lucide-react';

import { Claim, AuditResult } from '../types';
import { fetchClaims } from '../services/api';

interface AuditHistoryProps {
  onSelectClaim: (claimId: string) => void;
}

/*
 * ============================================================
 * DATE / TIME HELPERS
 * ============================================================
 *
 * Supabase stores timestamps in UTC.
 *
 * Example:
 *
 * 2026-09-06T02:47:18.321Z
 *
 * The functions below convert the timestamp to Indian
 * Standard Time (Asia/Kolkata) before displaying it.
 */

/**
 * Get the actual timestamp associated with an audit.
 *
 * audited_at = actual time when the audit was executed
 * created_at = fallback for older audit records
 */
const getAuditTimestamp = (
  audit: AuditResult
): string | undefined => {
  const auditRecord = audit as AuditResult & {
    audited_at?: string;
  };

  return (
    auditRecord.audited_at ||
    auditRecord.created_at
  );
};


/**
 * Format a timestamp as:
 *
 * 06 Sep 2026, 08:17:18 am
 *
 * using IST.
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


/**
 * Format time only.
 *
 * Example:
 *
 * 08:17:18 am
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


/**
 * Format date only.
 *
 * Example:
 *
 * 06 Sep 2026
 */
const formatDate = (
  timestamp?: string | null
): string => {
  if (!timestamp) {
    return 'Date unavailable';
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};


export const AuditHistory: React.FC<AuditHistoryProps> = ({
  onSelectClaim
}) => {

  /*
   * ============================================================
   * STATE
   * ============================================================
   */

  const [claims, setClaims] =
    useState<Claim[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);


  /*
   * ============================================================
   * LOAD AUDIT HISTORY
   * ============================================================
   */

  const loadHistory = async () => {
    try {

      setRefreshing(true);

      const result =
        await fetchClaims();

      /*
       * Sort claims by their actual Supabase
       * created_at timestamp.
       *
       * Newest claims appear first.
       */
      const sortedClaims =
        [...result].sort(
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


  /*
   * Load history when the page opens.
   */
  useEffect(() => {
    loadHistory();
  }, []);


  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">

      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div className="flex items-start justify-between">

        <div>

          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Audit History & Timeline
          </h2>

          <p className="text-xs text-slate-500 mt-1">
            Audit execution iterations, re-audits, and score progressions
          </p>

        </div>


        {/* REFRESH */}

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


      {/* ======================================================
          LOADING
      ====================================================== */}

      {loading ? (

        <div className="py-12 text-center">

          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-300" />

          <p className="text-xs text-slate-400 mt-3">
            Loading audit history from Supabase...
          </p>

        </div>

      ) : claims.length === 0 ? (

        /* ====================================================
           NO CLAIMS
        ==================================================== */

        <div className="py-16 text-center">

          <Clock className="w-8 h-8 text-slate-300 mx-auto" />

          <p className="text-sm font-semibold text-slate-500 mt-3">
            No audit history available
          </p>

          <p className="text-xs text-slate-400 mt-1">
            Run a claim audit to create an audit history record.
          </p>

        </div>

      ) : (

        /* ====================================================
           CLAIM LIST
        ==================================================== */

        <div className="space-y-6">

          {claims.map((claim) => {

            /*
             * ==================================================
             * AUDIT RESULTS
             * ==================================================
             *
             * Supabase returns:
             *
             * audit_results(*, findings(*))
             *
             * Therefore every actual audit execution can be
             * displayed here.
             */

            const auditResults =
              claim.audit_results ||
              (
                claim.latest_audit
                  ? [claim.latest_audit]
                  : []
              );


            /*
             * Sort using audited_at.
             *
             * This is important:
             *
             * We DO NOT use hard-coded times.
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


            /*
             * ==================================================
             * PROCEDURE
             * ==================================================
             *
             * Get the actual procedure attached to the claim.
             */

            const procedure =
              claim.procedures &&
              claim.procedures.length > 0
                ? claim.procedures[0]
                : null;


            return (

              <div
                key={claim.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4"
              >

                {/* =================================================
                    CLAIM HEADER
                ================================================= */}

                <div className="flex items-start justify-between border-b border-slate-100 pb-4">

                  <div className="flex items-start gap-3">

                    {/* CLAIM NUMBER */}

                    <span className="font-mono font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-xl text-xs border border-brand-200">
                      {claim.claim_number}
                    </span>


                    {/* PATIENT INFORMATION */}

                    <div>

                      <h4 className="font-bold text-slate-900 text-sm">
                        {claim.patient_name}
                      </h4>

                      <p className="text-xs text-slate-400 font-mono">
                        ID: {claim.patient_id}
                      </p>


                      {/* =================================================
                          ACTUAL PROCEDURE
                          ================================================= */}

                      {procedure ? (

                        <div className="flex items-center gap-2 mt-2 flex-wrap">

                          <FileText className="w-3.5 h-3.5 text-brand-500" />

                          <span className="font-mono font-bold text-brand-600 text-xs">
                            {procedure.cdt_code}
                          </span>


                          {procedure.description && (
                            <span className="text-xs text-slate-600">
                              {procedure.description}
                            </span>
                          )}


                          {procedure.tooth_number && (
                            <span className="text-[10px] font-mono text-slate-400">
                              • Tooth #{procedure.tooth_number}
                            </span>
                          )}

                        </div>

                      ) : (

                        <p className="text-[10px] text-slate-400 mt-2">
                          No procedure information
                        </p>

                      )}

                    </div>

                  </div>


                  {/* VIEW REPORT */}

                  <button
                    onClick={() =>
                      onSelectClaim(
                        claim.id
                      )
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

                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">

                  <Clock className="w-3.5 h-3.5" />

                  <span>
                    Claim created:
                  </span>

                  <span className="font-semibold text-slate-500">
                    {formatDateTime(
                      claim.created_at
                    )}
                  </span>

                </div>


                {/* =================================================
                    AUDIT TIMELINE
                ================================================= */}

                <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">

                  {sortedAudits.length === 0 ? (

                    /* ===========================================
                       NO AUDIT YET
                    =========================================== */

                    <div className="relative flex items-start gap-4 pl-8">

                      <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-white" />

                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs w-full">

                        <div className="flex justify-between items-center">

                          <span className="font-bold text-slate-800">
                            Claim Created
                          </span>

                          <span className="text-[10px] font-mono text-slate-400">
                            {formatTime(
                              claim.created_at
                            )}
                          </span>

                        </div>

                        <p className="text-slate-500 mt-1">
                          Waiting for the first audit execution.
                        </p>

                      </div>

                    </div>

                  ) : (

                    /* ===========================================
                       REAL AUDIT RECORDS
                    =========================================== */

                    sortedAudits.map(
                      (audit, index) => {

                        /*
                         * REAL AUDIT TIMESTAMP
                         */

                        const timestamp =
                          getAuditTimestamp(
                            audit
                          );


                        /*
                         * LATEST AUDIT
                         */

                        const isLatest =
                          index === 0;


                        /*
                         * READINESS
                         */

                        const readiness =
                          Number(
                            audit.readiness_score ||
                            0
                          );


                        /*
                         * STATUS
                         */

                        const status =
                          audit.status ||
                          'REVIEW';


                        /*
                         * STATUS HELPERS
                         */

                        const isReady =
                          status === 'READY' ||
                          readiness >= 90;

                        const isBlocked =
                          status === 'BLOCKED' ||
                          readiness < 70;


                        /*
                         * FINDINGS
                         */

                        const findings =
                          audit.findings ||
                          [];

                        const openFindings =
                          findings.filter(
                            finding =>
                              finding.status ===
                              'OPEN'
                          ).length;


                        /*
                         * SUMMARY
                         */

                        const passed =
                          audit.summary?.passed ||
                          0;

                        const totalChecks =
                          audit.summary?.total_checks ||
                          0;


                        return (

                          <div
                            key={
                              audit.id ||
                              audit.audit_id ||
                              `${claim.id}-${timestamp}-${index}`
                            }
                            className="relative flex items-start gap-4 pl-8"
                          >

                            {/* =================================
                                TIMELINE DOT
                            ================================= */}

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


                            {/* =================================
                                AUDIT CARD
                            ================================= */}

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

                              {/* =================================
                                  TITLE + REAL TIME
                              ================================= */}

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

                                    <span
                                      className={`
                                        font-bold
                                        ${
                                          isReady
                                            ? 'text-emerald-950'
                                            : isBlocked
                                            ? 'text-red-950'
                                            : 'text-slate-800'
                                        }
                                      `}
                                    >

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


                                {/* =================================
                                    ACTUAL SUPABASE TIMESTAMP
                                ================================= */}

                                <div className="text-right shrink-0">

                                  <div className="text-[10px] font-mono font-semibold text-slate-500">

                                    {formatTime(
                                      timestamp
                                    )}

                                  </div>

                                  <div className="text-[9px] font-mono text-slate-400 mt-0.5">

                                    {formatDate(
                                      timestamp
                                    )}

                                  </div>

                                </div>

                              </div>


                              {/* =================================
                                  READINESS
                              ================================= */}

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

                                  {passed}

                                  {' '}of{' '}

                                  {totalChecks}

                                  {' '}

                                  checks passed

                                </span>

                              </div>


                              {/* =================================
                                  FINDINGS
                              ================================= */}

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


                              {/* =================================
                                  AUDIT ID
                              ================================= */}

                              {(audit.id ||
                                audit.audit_id) && (

                                <div className="pt-1 border-t border-slate-200/70">

                                  <span className="text-[9px] font-mono text-slate-400">

                                    Audit ID:{' '}

                                    {audit.id ||
                                      audit.audit_id}

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