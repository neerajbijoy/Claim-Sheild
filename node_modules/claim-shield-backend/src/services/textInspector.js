/**
 * Text Inspector Service
 * Evaluates clinical narrative completeness and evidence indicators.
 */

function inspectClinicalText(rules, narrativeText, extractedEvidence) {
  const checks = [];
  const findings = [];

  const narrativeRule = rules.find(r => r.requirement_type === 'CLINICAL_NARRATIVE');
  const justificationRule = rules.find(r => r.requirement_type === 'CLINICAL_JUSTIFICATION');

  const hasNarrative = narrativeText && narrativeText.trim().length > 10;

  if (narrativeRule) {
    const isNarrativeRequired = narrativeRule.required !== undefined ? narrativeRule.required : !!narrativeRule.is_required;
    if (hasNarrative) {
      checks.push({
        type: 'CLINICAL_NARRATIVE',
        status: 'PASSED',
        title: 'Clinical Narrative Verified',
        message: 'Detailed clinical narrative is attached to claim.'
      });
    } else if (isNarrativeRequired) {
      checks.push({
        type: 'CLINICAL_NARRATIVE',
        status: 'FAILED',
        title: 'Clinical Narrative Missing',
        message: 'Required clinical narrative is empty or missing.'
      });
      findings.push({
        severity: 'HIGH',
        finding_type: 'MISSING_DOCUMENT',
        title: 'Required Clinical Narrative Missing',
        explanation: 'Required clinical narrative documentation is missing.',
        evidence: 'Claim clinical_narrative field is blank.',
        confidence: 0.99,
        recommended_action: 'Enter a comprehensive clinical narrative detailing diagnosis, existing tooth condition, and treatment necessity.'
      });
    }
  }

  if (justificationRule && hasNarrative) {
    const isJustificationRequired = justificationRule.required !== undefined ? justificationRule.required : !!justificationRule.is_required;
    if (extractedEvidence.clinical_justification_detected) {
      checks.push({
        type: 'CLINICAL_JUSTIFICATION',
        status: 'PASSED',
        title: 'Clinical Support Identified',
        message: `Supporting clinical indicators detected (${extractedEvidence.conditions.join(', ') || 'crown necessity'}) with ${Math.round(extractedEvidence.confidence * 100)}% confidence.`
      });
    } else if (isJustificationRequired) {
      checks.push({
        type: 'CLINICAL_JUSTIFICATION',
        status: 'WARNING',
        title: 'Weak Clinical Justification',
        message: 'Narrative present but lacks explicit clinical necessity terms (e.g. decay, fracture, breakdown).'
      });
      findings.push({
        severity: 'MEDIUM',
        finding_type: 'CLINICAL_SUPPORT_MISSING',
        title: 'Weak Clinical Support in Narrative',
        explanation: 'The narrative does not clearly specify structural breakdown or medical necessity for a full crown.',
        evidence: `Narrative: "${narrativeText.substring(0, 80)}..."`,
        confidence: 0.85,
        recommended_action: 'Revise clinical narrative to explicitly describe decay depth, structural loss, or cusp fracture.'
      });
    }
  }

  return { checks, findings };
}

module.exports = {
  inspectClinicalText
};
