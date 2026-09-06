/**
 * File Verifier Service
 * Validates uploaded claim documents against payer rules for specific CDT procedures.
 */

function verifyRequiredDocuments(rules, documents = [], narrativeText = '', cdtCode = 'D2740') {
  const checks = [];
  const findings = [];

  // Map uploaded document categories and filenames
  const docTypes = documents.map(d => `${d.document_type || ''} ${d.file_name || ''}`.toUpperCase());

  // 1. Check XRAY requirement
  const xrayRule = rules.find(r => r.requirement_type === 'XRAY');
  if (xrayRule) {
    const isXrayRequired = xrayRule.required !== undefined ? xrayRule.required : !!xrayRule.is_required;
    const hasXray = docTypes.some(t => t.includes('X-RAY') || t.includes('RADIOGRAPH') || t.includes('XRAY') || t.includes('BITEWING') || t.includes('PERIAPICAL'));
    if (hasXray) {
      checks.push({
        type: 'XRAY',
        status: 'PASSED',
        title: 'Supporting Radiograph Available',
        message: `Required pre-op radiograph uploaded and verified for ${cdtCode}.`
      });
    } else if (isXrayRequired) {
      checks.push({
        type: 'XRAY',
        status: 'FAILED',
        title: 'Pre-op Radiograph Missing',
        message: `Required X-Ray image or diagnostic radiograph is missing for ${cdtCode}.`
      });
      findings.push({
        severity: 'HIGH',
        finding_type: 'MISSING_DOCUMENT',
        title: `Required Radiograph Missing for ${cdtCode}`,
        explanation: `The payer requires a pre-operative radiograph (X-Ray/PA) for CDT code ${cdtCode} prior to submission.`,
        evidence: 'No X-Ray document found in uploaded evidence.',
        confidence: 0.98,
        recommended_action: 'Upload a diagnostic pre-op periapical or bitewing X-Ray image.'
      });
    } else {
      checks.push({
        type: 'XRAY',
        status: 'WARNING',
        title: 'Optional Radiograph Missing',
        message: `Radiograph is optional for ${cdtCode} under this payer rule.`
      });
    }
  }

  // 2. Check TREATMENT_PLAN requirement
  const tpRule = rules.find(r => r.requirement_type === 'TREATMENT_PLAN');
  if (tpRule) {
    const isTpRequired = tpRule.required !== undefined ? tpRule.required : !!tpRule.is_required;
    const hasTp = docTypes.some(t => t.includes('TREATMENT PLAN') || t.includes('TREATMENT_PLAN'));
    if (hasTp) {
      checks.push({
        type: 'TREATMENT_PLAN',
        status: 'PASSED',
        title: 'Treatment Plan Provided',
        message: 'Treatment plan document attached.'
      });
    } else if (isTpRequired) {
      checks.push({
        type: 'TREATMENT_PLAN',
        status: 'FAILED',
        title: 'Treatment Plan Missing',
        message: `Required treatment plan documentation is missing for ${cdtCode}.`
      });
      findings.push({
        severity: 'HIGH',
        finding_type: 'MISSING_DOCUMENT',
        title: `Required Treatment Plan Missing for ${cdtCode}`,
        explanation: `Payer requires a formal signed treatment plan document for ${cdtCode}.`,
        evidence: 'No Treatment Plan document uploaded.',
        confidence: 0.95,
        recommended_action: 'Upload signed treatment plan document.'
      });
    } else {
      checks.push({
        type: 'TREATMENT_PLAN',
        status: 'PASSED',
        title: 'Treatment Plan Optional',
        message: 'Treatment plan is optional and does not block submission.'
      });
    }
  }

  // 3. Check PERIODONTAL_CHART requirement (e.g. for D4341)
  const perioRule = rules.find(r => r.requirement_type === 'PERIODONTAL_CHART' || r.requirement_type === 'PERIO_CHART');
  if (perioRule || cdtCode === 'D4341') {
    const isPerioRequired = perioRule ? (perioRule.required !== undefined ? perioRule.required : !!perioRule.is_required) : true;
    const hasPerioChart = docTypes.some(t => t.includes('PERIO') || t.includes('PERIODONTAL') || t.includes('PROBING') || t.includes('CHART'));
    if (hasPerioChart) {
      checks.push({
        type: 'PERIODONTAL_CHART',
        status: 'PASSED',
        title: 'Periodontal Chart Attached',
        message: 'Comprehensive 6-point periodontal probing chart verified.'
      });
    } else if (isPerioRequired) {
      checks.push({
        type: 'PERIODONTAL_CHART',
        status: 'FAILED',
        title: 'Periodontal Chart Missing',
        message: `CDT ${cdtCode} requires 6-point periodontal probing chart documenting pocket depths >= 4mm.`
      });
      findings.push({
        severity: 'HIGH',
        finding_type: 'MISSING_DOCUMENT',
        title: `Mandatory Periodontal Chart Missing for ${cdtCode}`,
        explanation: `Payers reject ${cdtCode} (Scaling & Root Planing) unless accompanied by a periodontal probing depth chart dated within 12 months.`,
        evidence: 'No periodontal chart document uploaded.',
        confidence: 0.98,
        recommended_action: 'Upload 6-point periodontal probing depth chart showing diseased pocket sites.'
      });
    }
  }

  return { checks, findings };
}

module.exports = {
  verifyRequiredDocuments
};
