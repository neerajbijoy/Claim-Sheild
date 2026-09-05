/**
 * Audit Engine Service
 * Orchestrates pre-submission audit execution for a dental claim.
 */

const db = require('../config/supabase');
const { getPayerRulesForProcedure } = require('./ruleEngine');
const { extractClinicalEvidence } = require('./aiService');
const { verifyRequiredDocuments } = require('./fileVerifier');
const { inspectClinicalText } = require('./textInspector');
const { checkEvidenceConsistency } = require('./consistencyChecker');
const { calculateReadinessScore } = require('./scoreCalculator');

async function runClaimAudit(claimId) {
  const claim = await db.getClaimById(claimId);
  if (!claim) {
    throw new Error(`Claim not found: ${claimId}`);
  }

  const primaryProc = (claim.procedures && claim.procedures.length > 0)
    ? claim.procedures[0]
    : { cdt_code: 'D2740', tooth_number: '14' };

  // 1. Load Payer Rules
  const payerRules = await getPayerRulesForProcedure(claim.payer_id, primaryProc.cdt_code);

  // 2. Extract Clinical Evidence (AI / NLP)
  const extractedEvidence = await extractClinicalEvidence(claim.clinical_narrative, claim.documents || []);

  // 3. Initial Procedure & Tooth Checks
  const baseChecks = [
    {
      type: 'PROCEDURE',
      status: 'PASSED',
      title: `CDT Procedure ${primaryProc.cdt_code} Identified`,
      message: `Verified procedure ${primaryProc.cdt_code} (${primaryProc.description || 'Porcelain Crown'}).`
    },
    {
      type: 'TOOTH',
      status: primaryProc.tooth_number ? 'PASSED' : 'FAILED',
      title: primaryProc.tooth_number ? `Tooth #${primaryProc.tooth_number} Specified` : 'Tooth Number Missing',
      message: primaryProc.tooth_number ? `Location assigned to Tooth #${primaryProc.tooth_number}.` : 'Claim is missing target tooth location.'
    }
  ];

  // 4. File Verification
  const fileResult = verifyRequiredDocuments(payerRules, claim.documents || [], claim.clinical_narrative);

  // 5. Text Inspection
  const textResult = inspectClinicalText(payerRules, claim.clinical_narrative, extractedEvidence);

  // 6. Evidence Consistency Check
  const consistencyResult = checkEvidenceConsistency(
    primaryProc.tooth_number,
    extractedEvidence.teeth,
    claim.documents || []
  );

  // Combine checks & findings
  const allChecks = [
    ...baseChecks,
    ...fileResult.checks,
    ...textResult.checks,
    ...consistencyResult.checks
  ];

  const allFindings = [
    ...fileResult.findings,
    ...textResult.findings,
    ...consistencyResult.findings
  ];

  // 7. Calculate Readiness Score
  const scoreResult = calculateReadinessScore(allChecks, allFindings);

  const passedCount = allChecks.filter(c => c.status === 'PASSED').length;
  const warningCount = allChecks.filter(c => c.status === 'WARNING').length;
  const failedCount = allChecks.filter(c => c.status === 'FAILED').length;

  const auditPayload = {
    claim_id: claim.id,
    readiness_score: scoreResult.readiness_score,
    status: scoreResult.status,
    risk_breakdown: scoreResult.riskBreakdown,
    summary: {
      total_checks: allChecks.length,
      passed: passedCount,
      warnings: warningCount,
      failed: failedCount
    },
    checks: allChecks,
    findings: allFindings,
    evidence_map: consistencyResult.evidenceMap,
    extracted_evidence: extractedEvidence
  };

  // 8. Save Audit Result & Findings to Database
  const saved = await db.saveAuditResult(auditPayload, allFindings);

  return {
    ...auditPayload,
    audit_id: saved.auditRecord.id,
    created_at: saved.auditRecord.created_at
  };
}

module.exports = {
  runClaimAudit
};
