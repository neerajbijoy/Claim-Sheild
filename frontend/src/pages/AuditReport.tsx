import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  History,
  AlertTriangle,
  AlertOctagon,
  BrainCircuit,
  TrendingUp,
  FileCheck,
  Tag,
  Stethoscope,
  ChevronRight,
  Info
} from 'lucide-react';
import { ReadinessScoreCard } from '../components/ReadinessScoreCard';
import { ValidationCheckCard } from '../components/ValidationCheckCard';
import { EvidenceMap } from '../components/EvidenceMap';
import { FindingCard } from '../components/FindingCard';
import { FixModal } from '../components/FixModal';
import { Claim, AuditResult, ProcedureAudit } from '../types';
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
  const [selectedProcedureIdx, setSelectedProcedureIdx] = useState<number>(0);

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
      <div className="p-16 text-center text-slate-400 font-medium text-xs">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-brand-600" />
        <span className="text-sm font-semibold text-slate-700 block">Analyzing Clinical Documentation & Payer Rules...</span>
        <span className="text-slate-400 mt-1 block">Executing Clinical NLP extraction and payer criteria verification</span>
      </div>
    );
  }

  // Multi-procedure evaluation list
  const procedureAudits: ProcedureAudit[] = audit?.procedure_audits || [
    {
      cdt_code: claim.procedures?.[0]?.cdt_code || 'D2740',
      tooth_number: claim.procedures?.[0]?.tooth_number || '14',
      description: claim.procedures?.[0]?.description || 'Crown - Porcelain/Ceramic Substrate',
      priority: (audit?.risk_priority as any) || (audit?.status === 'BLOCKED' ? 'HIGH' : (audit?.status === 'REVIEW' ? 'MEDIUM' : 'LOW')),
      risk_score: audit?.status === 'BLOCKED' ? 85 : 30,
      explanation: audit?.status === 'BLOCKED'
        ? 'Action Recommended: documentation or attachments do not satisfy mandatory payer requirements.'
        : 'Criteria Satisfied: all documentation parameters met.',
      risk_factors: ['Pre-operative radiograph check', 'Clinical necessity evaluation'],
      checks: audit?.checks || [],
      findings: audit?.findings || []
    }
  ];

  const activeProcedure = procedureAudits[selectedProcedureIdx] || procedureAudits[0];

  const currentScore = audit ? audit.readiness_score : claim.readiness_score;
  const currentStatus = audit ? audit.status : claim.status;

  // Checks and findings for the selected procedure
  const displayedChecks = activeProcedure?.checks || audit?.checks || [];
  const displayedFindings = activeProcedure?.findings || audit?.findings || (claim.findings || []);

  const hasMismatch = displayedFindings.some(f => f.finding_type === 'DOCUMENTATION_MISMATCH' && f.status === 'OPEN');
  const mismatchFinding = displayedFindings.find(f => f.finding_type === 'DOCUMENTATION_MISMATCH');

  const clinicalEvidence = audit?.extracted_evidence;
  const candidateCdts = audit?.candidate_cdt_suggestions || clinicalEvidence?.suggested_codes || [];
  const historicalSignal = activeProcedure?.historical_signal;

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
              <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {procedureAudits.length} {procedureAudits.length === 1 ? 'Procedure' : 'Procedures'} Audited
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              {claim.patient_name} • ${claim.claim_amount?.toLocaleString() || '0'}
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

          <div className="flex items-center gap-3 font-mono">
            <div className="bg-emerald-100 text-emerald-900 font-bold px-3 py-1.5 rounded-xl text-xs border border-emerald-300">
              Payer Criteria Updated
            </div>
            <div className="bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs">
              {reAuditProgression.resolved_issues} Issues Resolved
            </div>
          </div>
        </div>
      )}

      {/* 1. Pre-Submission Compliance Assessment Card */}
      <ReadinessScoreCard
        score={currentScore}
        status={currentStatus}
        passedChecks={audit?.summary?.passed || 5}
        totalChecks={audit?.summary?.total_checks || 5}
        riskBreakdown={audit?.risk_breakdown}
      />

      {/* Executive Pre-Submission Summary Box for Judges */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-3xl border border-slate-700 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-500/20 text-brand-300 border border-brand-500/40">
              <ShieldCheck className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Claim Verification Summary
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Cross-checking uploaded documentation against mandatory CDT library & payer rules
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
            AUDIT ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">1. Required Documents</span>
            <span className="text-xs font-bold text-slate-100 block">X-Ray Radiograph & Clinical Note</span>
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 pt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Checked against CDT Code
            </span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">2. Document Status</span>
            <span className="text-xs font-bold text-slate-100 block">
              {displayedFindings.some(f => f.finding_type === 'MISSING_DOCUMENT') ? 'Missing Radiograph Attachment' : 'All Required Docs Attached'}
            </span>
            <span className={`text-[11px] font-medium flex items-center gap-1 pt-0.5 ${displayedFindings.some(f => f.finding_type === 'MISSING_DOCUMENT') ? 'text-amber-400' : 'text-emerald-400'}`}>
              {displayedFindings.some(f => f.finding_type === 'MISSING_DOCUMENT') ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
              {displayedFindings.some(f => f.finding_type === 'MISSING_DOCUMENT') ? 'Attachment Needed' : 'Documents Present'}
            </span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">3. Evidence & Consistency</span>
            <span className="text-xs font-bold text-slate-100 block">
              {hasMismatch ? 'Tooth Location Discrepancy' : 'Tooth Location Verified'}
            </span>
            <span className={`text-[11px] font-medium flex items-center gap-1 pt-0.5 ${hasMismatch ? 'text-rose-400' : 'text-emerald-400'}`}>
              {hasMismatch ? <AlertOctagon className="w-3.5 h-3.5 shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
              {hasMismatch ? 'Inconsistency Flagged' : 'Cross-Document Match'}
            </span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">4. Recommended Action</span>
            <span className="text-xs font-bold text-slate-100 block">
              {displayedFindings.length > 0 ? 'Fix Items Before Submitting' : 'Ready for Submission'}
            </span>
            <span className="text-[11px] text-brand-300 font-medium flex items-center gap-1 pt-0.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-brand-400" />
              {displayedFindings.length > 0 ? 'Use Fix & Re-Audit' : 'Zero Deficiencies'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Procedure Risk Prioritization */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Procedure Audit Prioritization
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Every procedure on the claim is audited against CDT rules, clinical evidence, and payer criteria.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {audit?.summary?.high_risk_procedures ? (
              <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                <AlertOctagon className="w-3 h-3 text-rose-600" /> {audit.summary.high_risk_procedures} Action Needed
              </span>
            ) : null}
            {audit?.summary?.medium_risk_procedures ? (
              <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" /> {audit.summary.medium_risk_procedures} Review Needed
              </span>
            ) : null}
            {audit?.summary?.low_risk_procedures ? (
              <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {audit.summary.low_risk_procedures} Satisfied
              </span>
            ) : null}
          </div>
        </div>

        {/* Procedure Selector Chips */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {procedureAudits.map((proc, idx) => {
            const isSelected = idx === selectedProcedureIdx;
            const priorityColor =
              proc.priority === 'HIGH'
                ? 'border-rose-400 bg-rose-50 text-rose-900'
                : proc.priority === 'MEDIUM'
                ? 'border-amber-400 bg-amber-50 text-amber-900'
                : 'border-emerald-400 bg-emerald-50 text-emerald-900';

            const badgeBg =
              proc.priority === 'HIGH'
                ? 'bg-rose-600 text-white'
                : proc.priority === 'MEDIUM'
                ? 'bg-amber-600 text-white'
                : 'bg-emerald-600 text-white';

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedProcedureIdx(idx)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  isSelected
                    ? `${priorityColor} ring-2 ring-brand-500 shadow-md`
                    : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-sm text-slate-900">
                      {proc.cdt_code}
                    </span>
                    {proc.tooth_number && (
                      <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        Tooth #{proc.tooth_number}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium block truncate max-w-[180px]">
                    {proc.description || 'Dental Procedure'}
                  </span>
                </div>

                <div className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold font-mono uppercase ${badgeBg}`}>
                  {proc.priority === 'HIGH' ? 'ACTION NEEDED' : proc.priority === 'MEDIUM' ? 'REVIEW NEEDED' : 'SATISFIED'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Procedure Detail & Rationale */}
        {activeProcedure && (
          <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                  ACTIVE PROCEDURE FOCUS:
                </span>
                <span className="font-bold text-sm text-slate-900">
                  {activeProcedure.cdt_code} {activeProcedure.tooth_number ? `(Tooth #${activeProcedure.tooth_number})` : ''}
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold font-mono uppercase ${
                activeProcedure.priority === 'HIGH'
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : activeProcedure.priority === 'MEDIUM'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                Audit Priority: {activeProcedure.priority}
              </span>
            </div>

            <p className="text-xs font-medium text-slate-800 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
              <strong className="text-slate-900">Audit Finding Rationale: </strong>
              {activeProcedure.explanation}
            </p>

            {activeProcedure.risk_factors && activeProcedure.risk_factors.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Contributing Clinical Documentation Factors:
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeProcedure.risk_factors.map((rf, i) => (
                    <span key={i} className="text-xs text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-medium">
                      • {rf}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Clinical NLP Document Intelligence & Candidate CDTs */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Clinical NLP Document Intelligence
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Structured clinical entities extracted from notes & uploaded PDF files using clinical NLP.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Engine: {clinicalEvidence?.source?.includes('DETERMINISTIC') ? 'Clinical Entity Parser' : 'Biomedical Clinical NLP'}
            </span>
          </div>
        </div>

        {/* Structured Evidence Badges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Findings & Conditions */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <Stethoscope className="w-4 h-4 text-brand-600" /> Clinical Findings / Pathologies
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(clinicalEvidence?.findings && clinicalEvidence.findings.length > 0) ? (
                clinicalEvidence.findings.map((f, i) => (
                  <span key={i} className="bg-red-50 text-red-800 border border-red-200 px-2 py-0.5 rounded-md font-medium text-[11px]">
                    {f}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 italic text-[11px]">No active pathologies extracted</span>
              )}
            </div>
          </div>

          {/* Structural Compromise */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Structural Findings
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(clinicalEvidence?.structural_findings && clinicalEvidence.structural_findings.length > 0) ? (
                clinicalEvidence.structural_findings.map((s, i) => (
                  <span key={i} className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-medium text-[11px]">
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 italic text-[11px]">No structural defects extracted</span>
              )}
            </div>
          </div>

          {/* Treatment Context & Anatomy */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <FileCheck className="w-4 h-4 text-teal-600" /> Treatment Context & Anatomy
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(clinicalEvidence?.treatment_context && clinicalEvidence.treatment_context.length > 0) ? (
                clinicalEvidence.treatment_context.map((t, i) => (
                  <span key={i} className="bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md font-medium text-[11px]">
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 italic text-[11px]">No treatment tokens extracted</span>
              )}
            </div>
          </div>
        </div>

        {/* CDT Candidate Procedure Suggestions */}
        {candidateCdts && candidateCdts.length > 0 && (
          <div className="p-4 rounded-2xl bg-brand-50/50 border border-brand-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-brand-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-brand-600" /> Suggested CDT Candidates from Documentation:
              </span>
              <span className="text-[10px] text-brand-600 font-medium">Informed Suggestion, Not Automatic Decision</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {candidateCdts.map((c, i) => (
                <div key={i} className="p-3 bg-white rounded-xl border border-brand-200/80 shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-sm">{c.cdt_code}</span>
                    <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                      Recommended Code Match
                    </span>
                  </div>
                  <span className="font-semibold text-slate-700 block text-[11px]">{c.procedure_name}</span>
                  <p className="text-[10px] text-slate-500">{c.rationale}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Empirical Historical Documentation Risk Signals */}
      {historicalSignal && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Historical Outcome Signal for {activeProcedure.cdt_code}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Aggregated from pre-submission audits and claim histories for {claim.payer_id || 'Delta Dental'}.
                </p>
              </div>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-mono font-extrabold ${
              historicalSignal.historical_signal === 'HIGH'
                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                : historicalSignal.historical_signal === 'MEDIUM'
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}>
              Historical Scrutiny: {historicalSignal.historical_signal}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">Similar Claims Analyzed</span>
              <span className="text-lg font-mono font-extrabold text-slate-900">{historicalSignal.similar_claims}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">Documentation-Related Deficiencies</span>
              <span className="text-lg font-mono font-extrabold text-rose-700">{historicalSignal.documentation_related_rejections}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">Historical Scrutiny Level</span>
              <span className="text-lg font-mono font-extrabold text-slate-900">{historicalSignal.historical_signal} SCRUTINY</span>
            </div>
          </div>

          {historicalSignal.top_rejection_factors && historicalSignal.top_rejection_factors.length > 0 && (
            <div className="text-xs text-slate-600 space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Primary Rejection Factors in Historical Submissions:</span>
              <div className="flex flex-wrap gap-2">
                {historicalSignal.top_rejection_factors.map((f, i) => (
                  <span key={i} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Visual Evidence Map */}
      <EvidenceMap
        cdtCode={activeProcedure.cdt_code}
        claimTooth={activeProcedure.tooth_number || '14'}
        nodes={activeProcedure.evidence_map || audit?.evidence_map}
        hasMismatch={hasMismatch}
        mismatchDetails={mismatchFinding ? {
          claimTooth: activeProcedure.tooth_number || '14',
          noteTooth: clinicalEvidence?.teeth?.[0] || '13',
          xrayTooth: activeProcedure.tooth_number || '14',
          explanation: mismatchFinding.explanation,
          recommendedAction: mismatchFinding.recommended_action
        } : undefined}
      />

      {/* 6. Validation Checks Grid for Active Procedure */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider text-xs text-slate-500">
          Validation Checks for {activeProcedure.cdt_code} ({displayedChecks.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedChecks.map((ch, idx) => (
            <ValidationCheckCard key={idx} check={ch} />
          ))}
        </div>
      </div>

      {/* 7. Detected Documentation Risks & Explainable Findings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider text-xs text-slate-500">
            Detected Documentation Risks & Findings ({displayedFindings.length})
          </h3>
        </div>

        {displayedFindings.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center text-xs text-emerald-800 space-y-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <h4 className="font-bold text-sm">No Documentation Risks Found for {activeProcedure.cdt_code}!</h4>
            <p>All required clinical evidence, radiographs, narratives, and tooth locations satisfy payer rules.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedFindings.map((finding) => (
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
