/**
 * File Verifier Service
 * Validates uploaded claim documents against payer rules.
 */

function verifyRequiredDocuments(rules, documents = [], narrativeText = '') {
  const checks = [];
  const findings = [];

  // Map uploaded document categories
  const docTypes = documents.map(d => (d.document_type || '').toUpperCase());

  // Check XRAY requirement
  const xrayRule = rules.find(r => r.requirement_type === 'XRAY');
  if (xrayRule) {
    const hasXray = docTypes.some(t => t.includes('X-RAY') || t.includes('RADIOGRAPH') || t.includes('XRAY'));
    if (hasXray) {
      checks.push({
        type: 'XRAY',
        status: 'PASSED',
        title: 'Supporting Radiograph Available',
        message: 'Required pre-op radiograph uploaded and verified.'
      });
    } else if (xrayRule.is_required) {
      checks.push({
        type: 'XRAY',
        status: 'FAILED',
        title: 'Pre-op Radiograph Missing',
        message: 'Required X-Ray image or radiograph is missing from claim evidence.'
      });
      findings.push({
        severity: 'HIGH',
        finding_type: 'MISSING_DOCUMENT',
        title: 'Required Radiograph Missing',
        explanation: 'The payer requires a pre-operative radiograph (X-Ray) for CDT code D2740 prior to submission.',
        evidence: 'No X-Ray document found in uploaded evidence.',
        confidence: 0.98,
        recommended_action: 'Upload a diagnostic pre-op X-Ray or intraoral radiograph image.'
      });
    } else {
      checks.push({
        type: 'XRAY',
        status: 'WARNING',
        title: 'Optional Radiograph Missing',
        message: 'Radiograph is optional for this payer rule.'
      });
    }
  }

  // Check TREATMENT_PLAN requirement
  const tpRule = rules.find(r => r.requirement_type === 'TREATMENT_PLAN');
  if (tpRule) {
    const hasTp = docTypes.some(t => t.includes('TREATMENT PLAN') || t.includes('TREATMENT_PLAN'));
    if (hasTp) {
      checks.push({
        type: 'TREATMENT_PLAN',
        status: 'PASSED',
        title: 'Treatment Plan Provided',
        message: 'Treatment plan document attached.'
      });
    } else if (tpRule.is_required) {
      checks.push({
        type: 'TREATMENT_PLAN',
        status: 'FAILED',
        title: 'Treatment Plan Missing',
        message: 'Required treatment plan document is missing.'
      });
      findings.push({
        severity: 'HIGH',
        finding_type: 'MISSING_DOCUMENT',
        title: 'Required Treatment Plan Missing',
        explanation: 'Payer requires a formal treatment plan documentation for full coverage crown claims.',
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

  return { checks, findings };
}

module.exports = {
  verifyRequiredDocuments
};
