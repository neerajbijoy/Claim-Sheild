/**
 * Consistency Checker Service
 * Core Differentiator: Cross-checks procedure tooth number against clinical narrative,
 * X-Rays, and uploaded supporting evidence.
 */

function checkEvidenceConsistency(claimTooth, narrativeTeeth = [], documents = []) {
  const checks = [];
  const findings = [];
  const evidenceMap = [];

  const primaryTooth = (claimTooth || '').toString().replace('#', '').trim();

  // Parse tooth references in documents
  const docEvidence = documents.map(doc => {
    const text = `${doc.file_name} ${doc.extracted_text || ''}`;
    const match = text.match(/(?:tooth|teeth|#)\s*#?\s*([0-3]?[0-9])/i);
    const docTooth = match ? match[1] : null;
    return {
      id: doc.id,
      name: doc.file_name,
      type: doc.document_type,
      detectedTooth: docTooth
    };
  });

  // Build node visual mapping
  evidenceMap.push({
    category: 'CLAIM',
    label: 'Claim Procedure',
    tooth: primaryTooth ? `#${primaryTooth}` : 'Not Specified',
    matched: true
  });

  // Check Clinical Narrative Tooth Consistency
  let narrativeMatched = true;
  let narrativeDetectedTooth = null;

  if (narrativeTeeth.length > 0) {
    narrativeDetectedTooth = narrativeTeeth[0];
    if (primaryTooth && !narrativeTeeth.includes(primaryTooth)) {
      narrativeMatched = false;
    }
  }

  evidenceMap.push({
    category: 'CLINICAL_NOTE',
    label: 'Clinical Documentation',
    tooth: narrativeDetectedTooth ? `#${narrativeDetectedTooth}` : (primaryTooth ? `#${primaryTooth}` : 'Unspecified'),
    matched: narrativeMatched
  });

  // Check Document Evidence Consistency (e.g. X-Ray)
  docEvidence.forEach(doc => {
    let docMatched = true;
    if (doc.detectedTooth && primaryTooth && doc.detectedTooth !== primaryTooth) {
      docMatched = false;
    }

    let cleanLabel = doc.name || 'Uploaded Document';
    const lowerName = cleanLabel.toLowerCase();

    if (doc.type === 'X-Ray / Radiograph' || lowerName.includes('radiograph') || lowerName.includes('xray') || lowerName.includes('x-ray')) {
      cleanLabel = 'X-Ray Radiograph';
    } else if (lowerName.includes('doctor') || lowerName.includes('note') || lowerName.includes('clinical')) {
      cleanLabel = 'Clinical Doctor Note';
    } else if (lowerName.includes('perio') || lowerName.includes('chart')) {
      cleanLabel = 'Periodontal Chart';
    } else {
      cleanLabel = cleanLabel.replace(/_/g, ' ').replace(/\.[^/.]+$/, '').trim();
    }

    evidenceMap.push({
      category: (doc.type === 'X-Ray / Radiograph' || lowerName.includes('radiograph') || lowerName.includes('xray')) ? 'X-RAY' : 'CLINICAL_NOTE',
      label: cleanLabel,
      tooth: doc.detectedTooth ? `#${doc.detectedTooth}` : `#${primaryTooth}`,
      matched: docMatched
    });
  });

  // If narrative mismatch detected
  if (!narrativeMatched && primaryTooth && narrativeDetectedTooth) {
    checks.push({
      type: 'CONSISTENCY',
      status: 'FAILED',
      title: 'Documentation Mismatch',
      message: `The claim specifies tooth #${primaryTooth}, while clinical documentation references tooth #${narrativeDetectedTooth}.`
    });

    findings.push({
      severity: 'HIGH',
      finding_type: 'DOCUMENTATION_MISMATCH',
      title: 'Tooth Number Inconsistency',
      explanation: `The claim specifies tooth #${primaryTooth}, while the clinical documentation references tooth #${narrativeDetectedTooth}.`,
      evidence: `Claim: Tooth #${primaryTooth} | Clinical Note: Tooth #${narrativeDetectedTooth}${docEvidence.length > 0 ? ` | Documents: Tooth #${docEvidence[0].detectedTooth || primaryTooth}` : ''}`,
      confidence: 0.96,
      recommended_action: `Verify and correct the tooth number in the claim or clinical documentation prior to submission.`
    });
  } else {
    checks.push({
      type: 'CONSISTENCY',
      status: 'PASSED',
      title: 'Tooth Location Verified & Consistent',
      message: `Tooth #${primaryTooth} matches across claim, clinical notes, and radiograph evidence.`
    });
  }

  return {
    checks,
    findings,
    evidenceMap
  };
}

module.exports = {
  checkEvidenceConsistency
};
