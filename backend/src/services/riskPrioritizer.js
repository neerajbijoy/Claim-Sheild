/**
 * Risk Prioritizer Service
 * Evaluates risk factors across all CDT procedures on a claim and determines
 * priority (HIGH, MEDIUM, LOW) with transparent, explainable rationales.
 */

function calculateProcedureRiskPriority(procedure, checks = [], findings = [], historicalSignal = null, payerName = 'Payer') {
  const cdtCode = (procedure.cdt_code || '').toUpperCase();
  const tooth = procedure.tooth_number || 'unspecified';

  const riskFactors = [];
  let riskScore = 0; // 0 (lowest risk) to 100 (highest risk)

  const highFindings = findings.filter(f => f.severity === 'HIGH' && f.status !== 'RESOLVED');
  const mediumFindings = findings.filter(f => f.severity === 'MEDIUM' && f.status !== 'RESOLVED');

  // 1. Missing Required Evidence / Attachments
  const missingDocFinding = findings.find(f => f.finding_type === 'MISSING_DOCUMENT' && f.status !== 'RESOLVED');
  if (missingDocFinding) {
    riskScore += 45;
    riskFactors.push(`Missing required attachment or evidence for ${cdtCode} (${missingDocFinding.title || 'Diagnostic radiograph'}).`);
  }

  // 2. Documentation Mismatch (Conflicting Tooth Number)
  const mismatchFinding = findings.find(f => f.finding_type === 'DOCUMENTATION_MISMATCH' && f.status !== 'RESOLVED');
  if (mismatchFinding) {
    riskScore += 40;
    riskFactors.push(`Conflicting tooth documentation: claim specifies Tooth #${tooth}, but evidence references an inconsistent location.`);
  }

  // 3. Weak or Missing Clinical Justification
  const supportFinding = findings.find(f => f.finding_type === 'CLINICAL_SUPPORT_MISSING' && f.status !== 'RESOLVED');
  if (supportFinding) {
    riskScore += 25;
    riskFactors.push(`Clinical justification lacks sufficient structural breakdown or medical necessity terms required by ${payerName}.`);
  }

  // 4. Missing Tooth Number
  if (!procedure.tooth_number && cdtCode !== 'D4341' && cdtCode !== 'D1110') {
    riskScore += 30;
    riskFactors.push(`Tooth location is missing for tooth-specific procedure ${cdtCode}.`);
  }

  // 5. Historical Rejection Signal
  if (historicalSignal && historicalSignal.historical_signal === 'HIGH') {
    riskScore += 20;
    riskFactors.push(`High historical audit scrutiny: ${historicalSignal.documentation_related_rejections || 'multiple'} similar ${cdtCode} submissions had documentation deficiencies.`);
  } else if (historicalSignal && historicalSignal.historical_signal === 'MEDIUM') {
    riskScore += 10;
  }

  // 6. Overall Severity Tally
  if (highFindings.length > 0) {
    riskScore = Math.max(riskScore, 75);
  } else if (mediumFindings.length > 0) {
    riskScore = Math.max(riskScore, 40);
  }

  // Assign Priority Level
  let priority = 'LOW';
  if (riskScore >= 60 || highFindings.length > 0) {
    priority = 'HIGH';
  } else if (riskScore >= 30 || mediumFindings.length > 0) {
    priority = 'MEDIUM';
  }

  // Construct Plain-English Primary Explanation
  let explanation = '';
  if (priority === 'HIGH') {
    explanation = riskFactors.length > 0
      ? `High audit risk because ${riskFactors[0]}`
      : `High audit risk because ${cdtCode} has critical unresolved documentation issues prior to submission.`;
  } else if (priority === 'MEDIUM') {
    explanation = riskFactors.length > 0
      ? `Medium audit risk: ${riskFactors[0]}`
      : `Medium audit risk: recommended clinical justification or documentation parameters can be strengthened.`;
  } else {
    explanation = `Low risk: Procedure ${cdtCode} (Tooth #${tooth}) satisfies all documentation, evidence, and clinical requirements for ${payerName}.`;
  }

  return {
    procedure_id: procedure.id,
    cdt_code: cdtCode,
    tooth_number: tooth,
    priority, // 'HIGH' | 'MEDIUM' | 'LOW'
    risk_score: Math.min(100, riskScore),
    explanation,
    risk_factors: riskFactors.length > 0 ? riskFactors : ['All core documentation criteria satisfied'],
    findings_count: findings.length,
    high_findings_count: highFindings.length,
    medium_findings_count: mediumFindings.length
  };
}

/**
 * Sorts procedure audit results highest-risk first
 */
function sortProceduresByRisk(prioritizedProcedures) {
  const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  return [...prioritizedProcedures].sort((a, b) => {
    const diff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    if (diff !== 0) return diff;
    return (b.risk_score || 0) - (a.risk_score || 0);
  });
}

module.exports = {
  calculateProcedureRiskPriority,
  sortProceduresByRisk
};
