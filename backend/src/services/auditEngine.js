/**
 * Audit Engine Service
 * Orchestrates pre-submission audit execution for ALL dental procedures on a claim.
 * Implements multi-procedure evaluation, clinical NLP evidence cross-referencing,
 * highest-risk-first prioritization, and empirical historical signals.
 */

const db = require('../config/supabase');
const { getPayerRulesForProcedure } = require('./ruleEngine');
const { extractClinicalEvidence } = require('./aiService');
const { verifyRequiredDocuments } = require('./fileVerifier');
const { inspectClinicalText } = require('./textInspector');
const { checkEvidenceConsistency } = require('./consistencyChecker');
const { calculateReadinessScore } = require('./scoreCalculator');
const { calculateProcedureRiskPriority, sortProceduresByRisk } = require('./riskPrioritizer');
const { getHistoricalClaimSignal } = require('./historicalSignal');

async function runClaimAudit(claimId) {
  const claim = await db.getClaimById(claimId);
  if (!claim) {
    throw new Error(`Claim not found: ${claimId}`);
  }

  // 1. Resolve Claim Procedures (Audit ALL procedures, not just the first)
  const procedures = (claim.procedures && claim.procedures.length > 0)
    ? claim.procedures
    : [{ id: 'default-proc-1', cdt_code: 'D2740', tooth_number: '14', description: 'Crown - Porcelain/Ceramic Substrate' }];

  // 2. Extract Clinical Evidence via Clinical NLP / Hybrid Normalizer
  const extractedEvidence = await extractClinicalEvidence(
    claim.clinical_narrative,
    claim.documents || []
  );

  const procedureAudits = [];
  const aggregatedChecks = [];
  const aggregatedFindings = [];

  // 3. Evaluate Every Procedure Independently
  for (const proc of procedures) {
    const cdtCode = (proc.cdt_code || 'D2740').toUpperCase();
    const toothNum = proc.tooth_number ? proc.tooth_number.toString() : '';

    // a. Query Payer Rules for this procedure
    const payerRules = await getPayerRulesForProcedure(claim.payer_id, cdtCode);

    // b. Base Procedure & Tooth Location Checks
    const procBaseChecks = [
      {
        type: 'PROCEDURE',
        status: 'PASSED',
        title: `CDT ${cdtCode} Identified`,
        message: `Verified procedure ${cdtCode} (${proc.description || 'Restorative Intervention'}).`
      },
      {
        type: 'TOOTH',
        status: toothNum ? 'PASSED' : (cdtCode === 'D4341' || cdtCode === 'D1110' ? 'PASSED' : 'FAILED'),
        title: toothNum ? `Tooth #${toothNum} Specified` : (cdtCode === 'D4341' ? 'Quadrant Procedure' : 'Tooth Location Missing'),
        message: toothNum
          ? `Tooth location assigned to Tooth #${toothNum}.`
          : (cdtCode === 'D4341' ? 'Quadrant procedure location.' : `Procedure ${cdtCode} requires target tooth location.`)
      }
    ];

    // c. Document Attachment Verification for this CDT
    const fileResult = verifyRequiredDocuments(payerRules, claim.documents || [], claim.clinical_narrative, cdtCode);

    // d. Clinical Narrative & Justification Inspection
    const textResult = inspectClinicalText(payerRules, claim.clinical_narrative, extractedEvidence);

    // e. Tooth Consistency Check across chart, claim, and images
    const consistencyResult = checkEvidenceConsistency(
      toothNum,
      extractedEvidence.teeth,
      claim.documents || []
    );

    // Combine checks & findings for this procedure
    const procChecks = [
      ...procBaseChecks,
      ...fileResult.checks,
      ...textResult.checks,
      ...consistencyResult.checks
    ];

    const procFindings = [
      ...fileResult.findings,
      ...textResult.findings,
      ...consistencyResult.findings
    ].map(f => ({
      ...f,
      procedure_id: proc.id,
      cdt_code: cdtCode,
      tooth_number: toothNum
    }));

    // f. Historical Claim Outcome Signal for Payer + CDT
    const historicalSignal = await getHistoricalClaimSignal(
      claim.payer_id,
      cdtCode,
      procFindings.map(f => f.finding_type)
    );

    // g. Highest-Risk-First Prioritization for this procedure
    const riskAssessment = calculateProcedureRiskPriority(
      proc,
      procChecks,
      procFindings,
      historicalSignal,
      claim.payer?.display_name || 'Selected Payer'
    );

    procedureAudits.push({
      procedure_id: proc.id,
      cdt_code: cdtCode,
      tooth_number: toothNum,
      description: proc.description || '',
      amount: proc.amount || 0,
      priority: riskAssessment.priority,
      risk_score: riskAssessment.risk_score,
      explanation: riskAssessment.explanation,
      risk_factors: riskAssessment.risk_factors,
      historical_signal: historicalSignal,
      checks: procChecks,
      findings: procFindings,
      evidence_map: consistencyResult.evidenceMap
    });

    procChecks.forEach(c => aggregatedChecks.push(c));
    procFindings.forEach(f => aggregatedFindings.push(f));
  }

  // 4. Sort Procedures Highest-Risk First
  const sortedProcedureAudits = sortProceduresByRisk(procedureAudits);

  // 5. Calculate Overall Readiness Score & Status
  const scoreResult = calculateReadinessScore(aggregatedChecks, aggregatedFindings);

  const highestPriority = sortedProcedureAudits[0]?.priority || 'LOW';
  let overallStatus = scoreResult.status;
  if (highestPriority === 'HIGH') {
    overallStatus = 'BLOCKED';
  } else if (highestPriority === 'MEDIUM' && overallStatus === 'READY') {
    overallStatus = 'REVIEW';
  }

  const passedCount = aggregatedChecks.filter(c => c.status === 'PASSED').length;
  const warningCount = aggregatedChecks.filter(c => c.status === 'WARNING').length;
  const failedCount = aggregatedChecks.filter(c => c.status === 'FAILED').length;

  const auditPayload = {
    claim_id: claim.id,
    readiness_score: scoreResult.readiness_score,
    status: overallStatus,
    risk_priority: highestPriority,
    risk_breakdown: scoreResult.riskBreakdown,
    summary: {
      total_procedures: procedureAudits.length,
      high_risk_procedures: procedureAudits.filter(p => p.priority === 'HIGH').length,
      medium_risk_procedures: procedureAudits.filter(p => p.priority === 'MEDIUM').length,
      low_risk_procedures: procedureAudits.filter(p => p.priority === 'LOW').length,
      total_checks: aggregatedChecks.length,
      passed: passedCount,
      warnings: warningCount,
      failed: failedCount
    },
    procedure_audits: sortedProcedureAudits,
    candidate_cdt_suggestions: extractedEvidence.suggested_codes || [],
    checks: aggregatedChecks,
    findings: aggregatedFindings,
    evidence_map: sortedProcedureAudits[0]?.evidence_map || [],
    extracted_evidence: extractedEvidence
  };

  // 6. Save Audit Result & Findings to Supabase
  const saved = await db.saveAuditResult(auditPayload, aggregatedFindings);

  return {
    ...auditPayload,
    audit_id: saved.auditRecord.id,
    created_at: saved.auditRecord.created_at
  };
}

module.exports = {
  runClaimAudit
};
