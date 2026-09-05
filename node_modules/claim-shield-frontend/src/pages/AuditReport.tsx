import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, RefreshCw, Sparkles, ArrowLeft, CheckCircle2, History, AlertTriangle } from 'lucide-react';
import { ReadinessScoreCard } from '../components/ReadinessScoreCard';
import { ValidationCheckCard } from '../components/ValidationCheckCard';
import { EvidenceMap } from '../components/EvidenceMap';
import { FindingCard } from '../components/FindingCard';
import { FixModal } from '../components/FixModal';
import { Claim, AuditResult } from '../types';
import { fetchClaimById, reAuditApi, runAuditApi } from '../services/api';

interface AuditReportProps {
  claimId: string;
  initialAudit?: AuditResult | null;
  onBack: () => void;
  onViewHistory: () => void;
}

export const AuditReport: React.FC<AuditReportProps> = ({
  claimId,
  initialAudit,
  onBack,
  onViewHistory
}) => {
  const [claim, setClaim] = useState<Claim | null>(null);
  const [audit, setAudit] = useState<AuditResult | null>(initialAudit || null);
  const [loading, setLoading] = useState(true);

  // Fix modal state
  const [isFixModalOpen, setIsFixModalOpen] = useState(false);
  const [isReAuditing, setIsReAuditing] = useState(false);

  // Progression alert after re-audit
  const [reAuditProgression, setReAuditProgression] = useState<{
    previous_score: number;
    new_score: number;
    score_diff: number;
    resolved_issues: number;
  } | null>(null);

  useEffect(() => {
    loadClaimDetails();
  }, [claimId]);

  const loadClaimDetails = async () => {
    setLoading(true);
    try {
      const data = await fetchClaimById(claimId);
      setClaim(data);
      if (!initialAudit && data.latest_audit) {
        setAudit(data.latest_audit);
      } else if (!initialAudit && !data.latest_audit) {
        const fresh = await runAuditApi(claimId);
        setAudit(fresh);
      }
    } catch (err) {
      console.error('Error loading claim for report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReAuditExecute = async (updatedTooth: string, updatedNarrative: string) => {
    setIsReAuditing(true);
    try {
      // 1. Update claim tooth & narrative via API
      await fetch(`/api/claims/${claimId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tooth_number: updatedTooth,
          clinical_narrative: updatedNarrative
        })
      });

      // 2. Trigger re-audit endpoint (POST /api/claims/:id/audit/re-audit)
      const reAuditRes = await reAuditApi(claimId);

      setAudit(reAuditRes.data);
      setReAuditProgression(reAuditRes.progression);
      setIsFixModalOpen(false);

      // Reload updated claim
      const updatedClaim = await fetchClaimById(claimId);
      setClaim(updatedClaim);
    } catch (err) {
      console.error('Re-audit error:', err);
      alert('Re-audit failed');
    } finally {
      setIsReAuditing(false);
    }
  };

  if (loading || !claim) {
    return (
      <div className="p-12 text-center text-slate-400 font-medium text-xs">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
        Generating Pre-Submission Audit Analysis Report...
      </div>
    );
  }

  const primaryProc = claim.procedures && claim.procedures.length > 0
    ? claim.procedures[0]
    : { cdt_code: 'D2740', tooth_number: '14' };

  const currentScore = audit ? audit.readiness_score : claim.readiness_score;
  const currentStatus = audit ? audit.status : claim.status;
  const checks = audit ? audit.checks : [];
  const findings = audit ? audit.findings : (claim.findings || []);

  const hasMismatch = findings.some(f => f.finding_type === 'DOCUMENTATION_MISMATCH' && f.status === 'OPEN');
  const mismatchFinding = findings.find(f => f.finding_type === 'DOCUMENTATION_MISMATCH');

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                PRE-SUBMISSION AUDIT REPORT
              </span>
              <span className="text-xs font-mono font-extrabold text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-md border border-brand-200">
                {claim.claim_number}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              {claim.patient_name} • CDT {primaryProc.cdt_code} (Tooth #{primaryProc.tooth_number})
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onViewHistory}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
          >
            <History className="w-4 h-4 text-slate-500" /> View History
          </button>

          <button
            onClick={() => setIsFixModalOpen(true)}
            className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-teal-600 hover:from-brand-500 hover:to-teal-500 rounded-xl shadow-lg shadow-brand-600/30 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
          >
            <Sparkles className="w-4 h-4" /> FIX & RE-AUDIT
          </button>
        </div>
      </div>

      {/* Re-Audit Progression Banner */}
      {reAuditProgression && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between text-xs text-emerald-900 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-emerald-950">Re-Audit Execution Complete</h4>
              <p className="text-emerald-700 font-medium">
                Claim documentation parameters were re-verified by rule engine.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 font-mono">
            <div className="text-right">
              <span className="text-[10px] uppercase text-emerald-600 font-bold block">Score Improved</span>
              <span className="text-base font-extrabold text-emerald-800">
                {reAuditProgression.previous_score}% → {reAuditProgression.new_score}%
              </span>
            </div>
            <div className="bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs">
              {reAuditProgression.resolved_issues} Issues Resolved
            </div>
          </div>
        </div>
      )}

      {/* 1. Readiness Score Circular Gauge Card */}
      <ReadinessScoreCard
        score={currentScore}
        status={currentStatus}
        passedChecks={audit?.summary?.passed || 5}
        totalChecks={audit?.summary?.total_checks || 5}
        riskBreakdown={audit?.risk_breakdown}
      />

      {/* 2. Visual Evidence Map */}
      <EvidenceMap
        cdtCode={primaryProc.cdt_code}
        claimTooth={primaryProc.tooth_number}
        nodes={audit?.evidence_map}
        hasMismatch={hasMismatch}
        mismatchDetails={mismatchFinding ? {
          claimTooth: primaryProc.tooth_number,
          noteTooth: '13',
          xrayTooth: primaryProc.tooth_number,
          explanation: mismatchFinding.explanation,
          recommendedAction: mismatchFinding.recommended_action
        } : undefined}
      />

      {/* 3. Validation Checks Grid */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider text-xs text-slate-500">
          Individual Pre-Submission Validation Checks ({checks.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {checks.map((ch, idx) => (
            <ValidationCheckCard key={idx} check={ch} />
          ))}
        </div>
      </div>

      {/* 4. Findings & Risks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider text-xs text-slate-500">
            Detected Documentation Risks & Findings ({findings.length})
          </h3>
        </div>

        {findings.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center text-xs text-emerald-800 space-y-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <h4 className="font-bold text-sm">No Documentation Risks Found!</h4>
            <p>All clinical evidence, required X-Rays, narratives, and tooth locations are consistent.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {findings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                onResolve={() => setIsFixModalOpen(true)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fix & Re-Audit Modal */}
      <FixModal
        claim={claim}
        isOpen={isFixModalOpen}
        onClose={() => setIsFixModalOpen(false)}
        onReAudit={handleReAuditExecute}
        isReAuditing={isReAuditing}
      />
    </div>
  );
};
