/**
 * Score Calculator Service
 * Calculates Readiness Score (0-100%) and determines status (READY, REVIEW, BLOCKED).
 */

function calculateReadinessScore(allChecks = [], allFindings = []) {
  let score = 0;

  // Base Check Weightings (5 core areas x 20 points)
  const procedureCheck = allChecks.find(c => c.type === 'PROCEDURE');
  const toothCheck = allChecks.find(c => c.type === 'TOOTH');
  const narrativeCheck = allChecks.find(c => c.type === 'CLINICAL_NARRATIVE');
  const justificationCheck = allChecks.find(c => c.type === 'CLINICAL_JUSTIFICATION');
  const xrayCheck = allChecks.find(c => c.type === 'XRAY');

  if (procedureCheck && procedureCheck.status === 'PASSED') score += 20;
  if (toothCheck && toothCheck.status === 'PASSED') score += 20;
  if (narrativeCheck && narrativeCheck.status === 'PASSED') score += 20;
  if (justificationCheck && justificationCheck.status === 'PASSED') score += 20;
  if (xrayCheck && xrayCheck.status === 'PASSED') score += 20;

  // Calculate penalties for findings
  const highSeverityCount = allFindings.filter(f => f.severity === 'HIGH' && f.status !== 'RESOLVED' && f.status !== 'OVERRIDDEN').length;
  const mediumSeverityCount = allFindings.filter(f => f.severity === 'MEDIUM' && f.status !== 'RESOLVED' && f.status !== 'OVERRIDDEN').length;

  // Deduction logic
  let penalty = (highSeverityCount * 32) + (mediumSeverityCount * 12);
  score = Math.max(0, Math.min(100, score - penalty));

  // Status assignment logic
  let status = 'READY';
  if (highSeverityCount > 0 || score < 70) {
    status = 'BLOCKED';
  } else if (mediumSeverityCount > 0 || score < 90) {
    status = 'REVIEW';
  }

  // Risk Breakdown Percentages
  const riskBreakdown = {
    documentation: narrativeCheck?.status === 'PASSED' ? 100 : 0,
    evidence: xrayCheck?.status === 'PASSED' ? 100 : 0,
    consistency: allChecks.some(c => c.type === 'CONSISTENCY' && c.status === 'FAILED') ? 0 : 100,
    clinicalSupport: justificationCheck?.status === 'PASSED' ? 100 : (justificationCheck?.status === 'WARNING' ? 60 : 0)
  };

  return {
    readiness_score: score,
    status,
    riskBreakdown
  };
}

module.exports = {
  calculateReadinessScore
};
