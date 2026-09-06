/**
 * Dental Normalization Layer
 * Converts raw NLP entity spans and clinical narrative text into a standardized
 * intermediate dental representation.
 */

function extractToothNumbers(text) {
  const teeth = new Set();
  if (!text) return [];

  // Match #14, tooth 14, tooth #14, teeth 14, 15, # 14
  const toothRegex = /(?:tooth|teeth|#)\s*#?\s*([0-3]?[0-9])\b/gi;
  let match;
  while ((match = toothRegex.exec(text)) !== null) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 32) {
      teeth.add(num.toString());
    }
  }

  // Also handle comma separated lists after tooth/teeth, e.g. "teeth 14, 15"
  const multiRegex = /(?:teeth|tooth)\s*#?\s*([0-3]?[0-9])(?:\s*,\s*#?\s*([0-3]?[0-9]))+/gi;
  let multiMatch;
  while ((multiMatch = multiRegex.exec(text)) !== null) {
    for (let i = 1; i < multiMatch.length; i++) {
      if (multiMatch[i]) {
        const n = parseInt(multiMatch[i], 10);
        if (n >= 1 && n <= 32) teeth.add(n.toString());
      }
    }
  }

  return Array.from(teeth);
}

function normalizeDentalEntities(rawEntities = [], rawText = '') {
  const teethSet = new Set(extractToothNumbers(rawText));
  const findings = new Set();
  const structuralFindings = new Set();
  const treatmentContext = new Set();
  const anatomicalSites = new Set();
  const severityModifiers = new Set();

  const lowerText = (rawText || '').toLowerCase();

  // 1. Process NLP Entities from model
  rawEntities.forEach(ent => {
    const entityText = (ent.text || '').trim();
    const lowerEnt = entityText.toLowerCase();
    const type = (ent.type || '').toUpperCase();

    // Check if entity is a tooth reference
    const toothNums = extractToothNumbers(entityText);
    toothNums.forEach(t => teethSet.add(t));

    // Categorize by entity type & semantics
    if (
      lowerEnt.includes('compromis') ||
      lowerEnt.includes('fractur') ||
      lowerEnt.includes('breakdown') ||
      lowerEnt.includes('missing wall') ||
      lowerEnt.includes('coronal structure') ||
      lowerEnt.includes('cracked')
    ) {
      structuralFindings.add(entityText);
    } else if (
      type.includes('SYMPTOM') ||
      type.includes('SIGN') ||
      lowerEnt.includes('caries') ||
      lowerEnt.includes('decay') ||
      lowerEnt.includes('radiolucency') ||
      lowerEnt.includes('abscess') ||
      lowerEnt.includes('periodont') ||
      lowerEnt.includes('pocket') ||
      lowerEnt.includes('mobility') ||
      lowerEnt.includes('bone loss')
    ) {
      findings.add(entityText);
    } else if (
      type.includes('PROCEDURE') ||
      type.includes('TREATMENT') ||
      lowerEnt.includes('crown') ||
      lowerEnt.includes('buildup') ||
      lowerEnt.includes('planing') ||
      lowerEnt.includes('scaling') ||
      lowerEnt.includes('extract') ||
      lowerEnt.includes('restoration')
    ) {
      if (!/^\d+$/.test(entityText)) {
        treatmentContext.add(entityText);
      }
    } else if (
      type.includes('STRUCTURE') ||
      type.includes('ANATOMY') ||
      lowerEnt.includes('dentin') ||
      lowerEnt.includes('enamel') ||
      lowerEnt.includes('pulp') ||
      lowerEnt.includes('cusp') ||
      lowerEnt.includes('root') ||
      lowerEnt.includes('coronal')
    ) {
      anatomicalSites.add(entityText);
    } else if (
      type.includes('SEVERITY') ||
      lowerEnt.includes('extending') ||
      lowerEnt.includes('severe') ||
      lowerEnt.includes('deep') ||
      lowerEnt.includes('non-restorable')
    ) {
      severityModifiers.add(entityText);
    }
  });

  // 2. High-precision clinical keyword augmentation (dental domain ontology)
  const clinicalOntology = [
    {
      category: 'findings',
      patterns: [
        /recurrent (?:caries|decay)/i,
        /carious lesion/i,
        /decay (?:into|extending into|involving) dentin/i,
        /periapical radiolucency/i,
        /apical periodontitis/i,
        /abscess/i,
        /subgingival calculus/i,
        /radiographic bone loss/i,
        /pocket depths? (?:>=|greater than|measuring)?\s*[4-9]\s*mm/i,
        /failing restoration/i,
        /marginal breakdown/i
      ]
    },
    {
      category: 'structural_findings',
      patterns: [
        /compromised coronal structure/i,
        /insufficient (?:sound )?tooth structure/i,
        /cusp(?:al)? fracture/i,
        /fractured cusp/i,
        /cracked tooth/i,
        /loss of coronal integrity/i,
        /extensive (?:structural )?breakdown/i
      ]
    },
    {
      category: 'treatment_context',
      patterns: [
        /full coverage crown(?: recommended)?/i,
        /porcelain(?:\/ceramic)? crown/i,
        /core buildup/i,
        /direct restoration (?:is )?not indicated/i,
        /scaling and root planing/i,
        /surgical extraction/i,
        /tooth removal/i
      ]
    },
    {
      category: 'severity',
      patterns: [
        /extending into dentin/i,
        /non-restorable/i,
        /hopeless prognosis/i,
        /severe mobility/i,
        /pulpal involvement/i
      ]
    }
  ];

  clinicalOntology.forEach(group => {
    group.patterns.forEach(pat => {
      const m = lowerText.match(pat);
      if (m) {
        if (group.category === 'findings') findings.add(m[0]);
        if (group.category === 'structural_findings') structuralFindings.add(m[0]);
        if (group.category === 'treatment_context') treatmentContext.add(m[0]);
        if (group.category === 'severity') severityModifiers.add(m[0]);
      }
    });
  });

  const teeth = Array.from(teethSet);
  const primaryTooth = teeth.length > 0 ? teeth[0] : null;

  return {
    tooth: primaryTooth,
    teeth,
    findings: Array.from(findings),
    structural_findings: Array.from(structuralFindings),
    treatment_context: Array.from(treatmentContext),
    anatomical_sites: Array.from(anatomicalSites),
    severity: Array.from(severityModifiers),
    has_clinical_justification: findings.size > 0 || structuralFindings.size > 0
  };
}

module.exports = {
  extractToothNumbers,
  normalizeDentalEntities
};
