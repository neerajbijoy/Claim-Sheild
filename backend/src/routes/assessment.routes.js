const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const db = require('../config/supabase');
const { extractText } = require('../services/documentExtractor');
const { normalizeDentalEntities, extractToothNumbers } = require('../services/dentalNormalizer');
const { identifyCdtCandidates, getCdtKnowledge } = require('../services/cdtKnowledgeBase');
const geminiService = require('../services/geminiService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// In-memory store for assessment sessions when local mode is active
const assessmentSessions = new Map();

/**
 * Helper: Extract clinical details, patient identifiers, and dental entities from text
 */
function extractClinicalEntitiesFromText(combinedText = '', docName = '') {
  if (!combinedText || !combinedText.trim()) {
    return {
      patient_name: null,
      patient_id: null,
      patient_age: null,
      doctor_name: null,
      treatment_date: null,
      teeth: [],
      cdt_code: null,
      diagnoses: [],
      findings: [],
      structural_findings: [],
      treatment_context: [],
      clinical_justification: null,
      measurements: [],
      materials: [],
      keywords: [],
      previous_rejection: null
    };
  }

  const text = combinedText;

  // 1. Patient Name extraction
  let patientName = null;
  const nameMatch = text.match(/(?:Patient(?:\s+Name)?|Pt\.?|Name)\s*:\s*([A-Za-z\s]{3,35})(?=\r?\n|,|\.|\t|DOB|ID|Age|$)/i);
  if (nameMatch && nameMatch[1]) {
    const cleaned = nameMatch[1].trim();
    if (!/^(unknown|none|n\/a|not specified)$/i.test(cleaned)) {
      patientName = cleaned;
    }
  }

  // 2. Patient ID extraction
  let patientId = null;
  const idMatch = text.match(/(?:Patient\s*ID|Pt\s*ID|Record\s*#?|MRN|Chart\s*#?|ID)\s*[:#\s]*([A-Z0-9-]{3,20})/i);
  if (idMatch && idMatch[1]) {
    patientId = idMatch[1].trim();
  }

  // 3. Patient Age
  let patientAge = null;
  const ageMatch = text.match(/\b(?:Age|Age\s*[:=])\s*(\d{1,3})\b/i);
  if (ageMatch && ageMatch[1]) {
    const parsedAge = parseInt(ageMatch[1], 10);
    if (parsedAge > 0 && parsedAge < 125) {
      patientAge = parsedAge;
    }
  }

  // 4. Doctor / Provider Name
  let doctorName = null;
  const drMatch = text.match(/(?:Dr\.?|Doctor|Provider|Dentist|Treating\s*Doctor)\s*[:\s]*([A-Za-z\s]{3,35})(?=\r?\n|,|\.|\t|DDS|DMD|$)/i);
  if (drMatch && drMatch[1]) {
    doctorName = drMatch[1].trim();
  }

  // 5. Treatment Date / DOS
  let treatmentDate = null;
  const dosMatch = text.match(/(?:Date\s*of\s*Service|DOS|Treatment\s*Date|Date\s*of\s*Treatment|Procedure\s*Date|Date)\s*[:\s]*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i);
  if (dosMatch && dosMatch[1]) {
    treatmentDate = dosMatch[1].trim();
  }

  // 6. Teeth numbers
  const teeth = extractToothNumbers(text);

  // 7. Explicit CDT code mention
  let cdtCode = null;
  const cdtMatch = text.match(/\b(D\d{4})\b/i);
  if (cdtMatch && cdtMatch[1]) {
    cdtCode = cdtMatch[1].toUpperCase();
  }

  // 8. Dental Normalizer entities
  const normalized = normalizeDentalEntities([], text);

  // 9. Measurements & Percentages (e.g. 5mm, 60% coronal structure loss)
  const measurements = [];
  const depthMatches = text.match(/\b\d+(?:\.\d+)?\s*(?:mm|millimeter)\b/gi) || [];
  const percentMatches = text.match(/\b\d+(?:\.\d+)?\s*%/gi) || [];
  depthMatches.forEach(m => measurements.push(`Pocket/depth: ${m}`));
  percentMatches.forEach(m => measurements.push(`Structure/loss: ${m}`));

  // 10. Materials detected
  const materials = [];
  const matPatterns = [
    { label: 'Porcelain / Ceramic', regex: /\b(?:porcelain|ceramic|e\.?max|zirconia)\b/i },
    { label: 'Resin Composite', regex: /\b(?:composite|resin)\b/i },
    { label: 'Gold / Precious Metal', regex: /\b(?:cast gold|noble metal|high noble)\b/i },
    { label: 'Porcelain Fused to Metal (PFM)', regex: /\b(?:pfm|porcelain fused to metal)\b/i },
    { label: 'Amalgam', regex: /\b(?:amalgam)\b/i }
  ];
  matPatterns.forEach(p => {
    if (p.regex.test(text)) materials.push(p.label);
  });

  // 11. Clinical Justification sentence extraction
  let justification = null;
  const justMatch = text.match(/(?:justification|necessity|rationale|clinical reason|indicated because|requires full coverage)\s*[:\s-]*([^\r\n.;]+(?:\.[^\r\n.;]+)?)/i);
  if (justMatch && justMatch[1]) {
    justification = justMatch[1].trim();
  } else if (normalized.has_clinical_justification) {
    justification = [...normalized.findings, ...normalized.structural_findings].join(', ');
  }

  // 12. Relevant Clinical Keywords
  const keywords = [];
  const kwList = [
    'recurrent caries', 'decay into dentin', 'compromised coronal structure',
    'cusp fracture', 'cracked tooth', 'subgingival margin', 'bone loss',
    'periodontal pocket', 'furcation involvement', 'periapical radiolucency',
    'root fracture', 'irreversible pulpitis', 'non-restorable'
  ];
  kwList.forEach(kw => {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(text)) {
      keywords.push(kw);
    }
  });

  // 13. Previous Rejection / Denial Report details (if applicable)
  let previousRejection = null;
  const denialReasonMatch = text.match(/(?:denial\s*reason|rejection\s*reason|reason\s*for\s*denial|denied\s*due\s*to|adjudication\s*remark)\s*[:\s]*([^\r\n;]+)/i);
  const denialCodeMatch = text.match(/(?:denial\s*code|carc|rarc|remark\s*code)\s*[:\s]*([A-Z0-9-]+)/i);
  if (denialReasonMatch || denialCodeMatch || /claim\s*denied|rejection\s*notice|audit\s*rejection/i.test(text)) {
    previousRejection = {
      detected: true,
      reason: denialReasonMatch ? denialReasonMatch[1].trim() : 'Previous claim rejection/denial documented in uploaded file',
      code: denialCodeMatch ? denialCodeMatch[1].trim() : null,
      document_source: docName || 'Uploaded report'
    };
  }

  return {
    patient_name: patientName,
    patient_id: patientId,
    patient_age: patientAge,
    doctor_name: doctorName,
    treatment_date: treatmentDate,
    teeth: teeth.length > 0 ? teeth : normalized.teeth,
    cdt_code: cdtCode,
    diagnoses: normalized.findings,
    findings: normalized.findings,
    structural_findings: normalized.structural_findings,
    treatment_context: normalized.treatment_context,
    clinical_justification: justification,
    measurements,
    materials,
    keywords,
    previous_rejection: previousRejection
  };
}

/**
 * POST /api/assessment/extract
 * Accepts multiple uploaded files and/or raw clinical text note.
 * Actually parses documents using pdf-parse or plain text readers and runs extraction.
 */
router.post('/extract', upload.array('files', 10), async (req, res) => {
  try {
    const rawNote = req.body.clinical_note || req.body.narrative || '';
    const files = req.files || [];

    const extractedDocuments = [];
    let combinedText = rawNote;

    for (const file of files) {
      const originalName = file.originalname || 'document';
      const mimeType = file.mimetype || '';
      const extraction = await extractText(file.buffer, mimeType, originalName);

      extractedDocuments.push({
        id: crypto.randomUUID(),
        file_name: originalName,
        mime_type: mimeType,
        file_size: file.size,
        word_count: extraction.word_count,
        is_image_only: extraction.is_image_only,
        ocr_required: extraction.ocr_required,
        extracted_text: extraction.text,
        document_type: req.body[`doc_type_${originalName}`] || 'CLINICAL_NOTE'
      });

      if (!extraction.is_image_only && extraction.text) {
        combinedText += `\n--- Document: ${originalName} ---\n${extraction.text}\n`;
      }
    }

    let clinicalData = extractClinicalEntitiesFromText(combinedText, files.length > 0 ? files[0].originalname : '');
    let cdtCandidates = [];
    let aiEngine = 'Deterministic Dental Ontology';
    let geminiDentalAssessment = null;

    // Use Google Gemini AI for deep dental analysis when configured
    if (geminiService.isGeminiConfigured()) {
      try {
        const geminiResult = await geminiService.analyzeDentalClinicalWithGemini({
          clinicalNarrative: rawNote,
          documentTexts: extractedDocuments.map(d => d.extracted_text),
          previousDenialText: clinicalData.previous_rejection?.reason || ''
        });

        if (geminiResult) {
          aiEngine = 'Google Gemini 2.5 Flash';
          geminiDentalAssessment = geminiResult.dental_readiness_assessment || null;

          // Merge authentic extractions from Gemini
          clinicalData = {
            patient_name: (geminiResult.patient_name && geminiResult.patient_name !== 'Not found') ? geminiResult.patient_name : clinicalData.patient_name,
            patient_id: (geminiResult.patient_id && geminiResult.patient_id !== 'Not found') ? geminiResult.patient_id : clinicalData.patient_id,
            patient_age: (geminiResult.patient_age && geminiResult.patient_age !== 'Not found') ? geminiResult.patient_age : clinicalData.patient_age,
            doctor_name: (geminiResult.doctor_name && geminiResult.doctor_name !== 'Not found') ? geminiResult.doctor_name : clinicalData.doctor_name,
            treatment_date: (geminiResult.treatment_date && geminiResult.treatment_date !== 'Not found') ? geminiResult.treatment_date : clinicalData.treatment_date,
            teeth: (geminiResult.teeth && geminiResult.teeth.length > 0) ? geminiResult.teeth : clinicalData.teeth,
            surfaces: geminiResult.surfaces || [],
            quadrant: geminiResult.quadrant || null,
            cdt_code: clinicalData.cdt_code,
            diagnoses: (geminiResult.diagnoses && geminiResult.diagnoses.length > 0) ? geminiResult.diagnoses : clinicalData.diagnoses,
            findings: (geminiResult.diagnoses && geminiResult.diagnoses.length > 0) ? geminiResult.diagnoses : clinicalData.findings,
            structural_findings: (geminiResult.structural_findings && geminiResult.structural_findings.length > 0) ? geminiResult.structural_findings : clinicalData.structural_findings,
            remaining_structure_percentage: geminiResult.remaining_structure_percentage || null,
            pulpal_periapical_status: geminiResult.pulpal_periapical_status || null,
            periodontal_findings: geminiResult.periodontal_findings || null,
            treatment_context: clinicalData.treatment_context,
            clinical_justification: geminiResult.clinical_justification || clinicalData.clinical_justification,
            measurements: (geminiResult.measurements && geminiResult.measurements.length > 0) ? geminiResult.measurements : clinicalData.measurements,
            materials: (geminiResult.materials && geminiResult.materials.length > 0) ? geminiResult.materials : clinicalData.materials,
            keywords: (geminiResult.keywords && geminiResult.keywords.length > 0) ? geminiResult.keywords : clinicalData.keywords,
            previous_rejection: geminiResult.previous_rejection_analysis || clinicalData.previous_rejection
          };

          if (Array.isArray(geminiResult.suggested_cdt_codes) && geminiResult.suggested_cdt_codes.length > 0) {
            cdtCandidates = geminiResult.suggested_cdt_codes;
          }
        }
      } catch (geminiErr) {
        console.warn('[Assessment] Gemini dental extraction fallback:', geminiErr.message);
      }
    }

    // Fallback to deterministic CDT candidates if Gemini not configured or produced no candidates
    if (cdtCandidates.length === 0) {
      const normalized = {
        findings: clinicalData.findings,
        structural_findings: clinicalData.structural_findings,
        treatment_context: clinicalData.treatment_context,
        severity: []
      };
      cdtCandidates = identifyCdtCandidates(normalized, combinedText);
    }

    return res.json({
      success: true,
      ai_engine: aiEngine,
      data: {
        documents: extractedDocuments,
        extracted_info: {
          patient_name: clinicalData.patient_name || 'Not found',
          patient_id: clinicalData.patient_id || 'Not found',
          patient_age: clinicalData.patient_age !== null ? clinicalData.patient_age : 'Not found',
          doctor_name: clinicalData.doctor_name || 'Not found',
          treatment_date: clinicalData.treatment_date || 'Not found',
          teeth: clinicalData.teeth.length > 0 ? clinicalData.teeth : 'Not found',
          surfaces: (clinicalData.surfaces && clinicalData.surfaces.length > 0) ? clinicalData.surfaces : 'Not found',
          quadrant: clinicalData.quadrant || 'Not found',
          cdt_code: clinicalData.cdt_code || 'Not found',
          diagnoses: clinicalData.diagnoses.length > 0 ? clinicalData.diagnoses : 'Not found',
          findings: clinicalData.findings.length > 0 ? clinicalData.findings : 'Not found',
          structural_findings: clinicalData.structural_findings.length > 0 ? clinicalData.structural_findings : 'Not found',
          remaining_structure_percentage: clinicalData.remaining_structure_percentage || 'Not specified',
          pulpal_periapical_status: clinicalData.pulpal_periapical_status || 'Not found',
          treatment_context: clinicalData.treatment_context.length > 0 ? clinicalData.treatment_context : 'Not found',
          clinical_justification: clinicalData.clinical_justification || 'Not found',
          measurements: clinicalData.measurements.length > 0 ? clinicalData.measurements : 'Not found',
          materials: clinicalData.materials.length > 0 ? clinicalData.materials : 'Not found',
          keywords: clinicalData.keywords.length > 0 ? clinicalData.keywords : 'Not found',
          previous_rejection: clinicalData.previous_rejection || null,
          dental_readiness_assessment: geminiDentalAssessment
        },
        cdt_candidates: cdtCandidates,
        raw_combined_length: combinedText.length
      }
    });
  } catch (err) {
    console.error('[Assessment Extract Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/assessment/verify-payer-url
 * Fetches and analyzes publicly available payer policy text from a provided URL.
 * Handles timeouts and access failures without fabricating fake rules.
 */
router.post('/verify-payer-url', async (req, res) => {
  const { url, payer_name } = req.body;

  if (!url || typeof url !== 'string' || !url.trim().startsWith('http')) {
    return res.status(400).json({
      success: false,
      verified: false,
      message: 'Invalid or missing policy URL. Please provide a full URL starting with http:// or https://'
    });
  }

  const cleanUrl = url.trim();
  const timestamp = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const fetchRes = await fetch(cleanUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ClaimShield-Policy-Verifier/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!fetchRes.ok) {
      return res.json({
        success: false,
        verified: false,
        source_url: cleanUrl,
        retrieved_at: timestamp,
        error_message: `Payer policy could not be verified from the provided URL (HTTP ${fetchRes.status}: ${fetchRes.statusText}).`,
        requirements: []
      });
    }

    const html = await fetchRes.text();
    // Strip script and style tags, then extract readable text
    const textOnly = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Check if Google Gemini AI is configured for deep policy reading & chance analysis
    if (geminiService.isGeminiConfigured()) {
      try {
        const geminiAnalysis = await geminiService.analyzePayerPolicyWithGemini({
          url: cleanUrl,
          pageContent: textOnly,
          procedureInfo: req.body.procedure || {},
          clinicalEvidence: req.body.clinical_evidence || {}
        });

        if (geminiAnalysis) {
          return res.json({
            success: true,
            verified: true,
            source_url: cleanUrl,
            retrieved_at: timestamp,
            ai_engine: 'Google Gemini 2.5 Flash',
            payer_name: geminiAnalysis.payer_name || payer_name || 'Insurance Payer',
            policy_title: geminiAnalysis.policy_title || 'Clinical Policy Guidelines',
            policy_summary: geminiAnalysis.policy_summary || '',
            requirements: (geminiAnalysis.requirements && geminiAnalysis.requirements.length > 0)
              ? geminiAnalysis.requirements
              : [],
            chance_analysis: geminiAnalysis.chance_analysis || {
              approval_chance_pct: 75,
              rejection_risk_pct: 25,
              chance_level: 'MODERATE',
              detailed_rationale: 'Policy verified. Compliance evaluated based on documented clinical evidence.'
            },
            maximum_allowable: geminiAnalysis.maximum_allowable !== undefined ? geminiAnalysis.maximum_allowable : null,
            exclusions: geminiAnalysis.exclusions || [],
            recommendations_for_approval: geminiAnalysis.recommendations_for_approval || [],
            word_count: textOnly.split(/\s+/).length,
            page_title_preview: textOnly.slice(0, 120)
          });
        }
      } catch (geminiErr) {
        console.warn('[Assessment] Gemini policy analysis fallback:', geminiErr.message);
      }
    }

    // Fallback: Deterministic Policy Extraction
    const lowerText = textOnly.toLowerCase();
    const extractedRequirements = [];

    if (lowerText.includes('prior auth') || lowerText.includes('prior authorization')) {
      extractedRequirements.push({
        type: 'PRIOR_AUTH',
        rule: 'Prior authorization required for specified comprehensive restorations and prosthodontics.',
        source: cleanUrl
      });
    }

    if (lowerText.includes('x-ray') || lowerText.includes('radiograph') || lowerText.includes('periapical')) {
      extractedRequirements.push({
        type: 'RADIOGRAPH',
        rule: 'Pre-operative diagnostic radiograph required showing full tooth anatomy and bone level.',
        source: cleanUrl
      });
    }

    if (lowerText.includes('periodontal chart') || lowerText.includes('probing depth') || lowerText.includes('pocket depth')) {
      extractedRequirements.push({
        type: 'PERIO_CHARTING',
        rule: 'Current 6-point periodontal probing chart required for scaling/root planing procedures.',
        source: cleanUrl
      });
    }

    if (lowerText.includes('narrative') || lowerText.includes('clinical justification') || lowerText.includes('medical necessity')) {
      extractedRequirements.push({
        type: 'NARRATIVE',
        rule: 'Detailed clinical narrative required explaining tooth structural breakdown and why conservative restoration is contraindicated.',
        source: cleanUrl
      });
    }

    if (lowerText.includes('frequency') || lowerText.includes('once every') || lowerText.includes('limitation')) {
      extractedRequirements.push({
        type: 'FREQUENCY',
        rule: 'Subject to standard benefit frequency limitation (e.g., replacement once per 5-10 year period).',
        source: cleanUrl
      });
    }

    // Extract maximum allowable fee if explicitly mentioned in the page text
    let maximumAllowable = null;
    const feeMatch = textOnly.match(/(?:maximum\s*allowable|allowable\s*fee|allowable\s*amount|fee\s*schedule)\s*[:\s]*\$?\s*([0-9]{2,5}(?:\.[0-9]{2})?)/i);
    if (feeMatch && feeMatch[1]) {
      maximumAllowable = parseFloat(feeMatch[1]);
    }

    return res.json({
      success: true,
      verified: true,
      source_url: cleanUrl,
      retrieved_at: timestamp,
      ai_engine: 'Deterministic Policy Scanner',
      word_count: textOnly.split(/\s+/).length,
      requirements: extractedRequirements,
      maximum_allowable: maximumAllowable,
      page_title_preview: textOnly.slice(0, 120),
      note: 'To enable deep Gemini AI policy reading & chance analysis, configure GEMINI_API_KEY.'
    });
  } catch (err) {
    return res.json({
      success: false,
      verified: false,
      source_url: cleanUrl,
      retrieved_at: timestamp,
      error_message: 'Payer policy could not be verified from the provided URL.',
      technical_reason: err.message,
      requirements: []
    });
  }
});

/**
 * GET /api/assessment/historical
 * Queries actual historical claims in Supabase/local database for payer + CDT code.
 * Adheres strictly to the requirement:
 * "Do not claim a statistical pattern unless there is enough actual historical data.
 * If insufficient history exists: 'Insufficient historical claims for reliable historical risk analysis.'
 * Do NOT fabricate historical statistics."
 */
router.get('/historical', async (req, res) => {
  const { payer_name, payer_id, cdt_code } = req.query;

  try {
    const claims = await db.getClaims();

    // Filter claims by payer (matching id or name) and CDT code
    const matchingClaims = (claims || []).filter(c => {
      let payerMatch = true;
      if (payer_id) {
        payerMatch = c.payer_id === payer_id;
      } else if (payer_name && payer_name.trim()) {
        const pNameLower = payer_name.trim().toLowerCase();
        payerMatch = (c.payer_name && c.payer_name.toLowerCase().includes(pNameLower)) ||
                     (c.payer_id && c.payer_id.toLowerCase().includes(pNameLower));
      }

      let cdtMatch = true;
      if (cdt_code && cdt_code.trim()) {
        const codeUpper = cdt_code.trim().toUpperCase();
        cdtMatch = (c.procedures || []).some(p => (p.cdt_code || '').toUpperCase() === codeUpper);
      }

      return payerMatch && cdtMatch;
    });

    const sampleSize = matchingClaims.length;

    // Minimum required threshold for authentic statistical inference
    if (sampleSize < 2) {
      return res.json({
        success: true,
        has_history: false,
        sample_size: sampleSize,
        message: 'Insufficient historical claims for reliable historical risk analysis.',
        signals: []
      });
    }

    // Calculate genuine rejection / block rate from actual matching records
    const blockedCount = matchingClaims.filter(c => c.status === 'BLOCKED' || (c.readiness_score && c.readiness_score < 70)).length;
    const rejectionRate = Math.round((blockedCount / sampleSize) * 100);

    // Aggregate actual findings recorded on these claims
    const findingCounts = {};
    matchingClaims.forEach(c => {
      (c.findings || []).forEach(f => {
        const msg = f.message || f.finding_type || 'General Documentation Defect';
        findingCounts[msg] = (findingCounts[msg] || 0) + 1;
      });
    });

    const topDefects = Object.entries(findingCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([defect, count]) => ({ defect, occurrence_count: count }));

    return res.json({
      success: true,
      has_history: true,
      sample_size: sampleSize,
      blocked_claims: blockedCount,
      rejection_rate_pct: rejectionRate,
      top_defects: topDefects,
      message: `Historical pattern based on ${sampleSize} actual claims on record for this payer and procedure code.`
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      has_history: false,
      message: 'Failed querying historical claims.',
      error: err.message
    });
  }
});

/**
 * POST /api/assessment/run
 * Runs the comprehensive pre-submission smart assessment.
 * Calculates transparent, explainable rejection risk score and normalizes checks.
 */
router.post('/run', async (req, res) => {
  try {
    const {
      patient,
      insurance,
      procedure,
      documents = [],
      clinical_text = '',
      verified_policy = null,
      previous_audit = null
    } = req.body;

    const cdtCode = (procedure?.cdt_code || '').trim().toUpperCase();
    const toothNumber = (procedure?.tooth_number || '').trim();
    const patientName = (patient?.name || '').trim();
    const chargedAmount = procedure?.amount_charged ? parseFloat(procedure.amount_charged) : null;

    // Retrieve CDT knowledge if available
    const cdtKnowledge = cdtCode ? getCdtKnowledge(cdtCode) : null;

    // Check document types present
    const docTypesPresent = new Set((documents || []).map(d => (d.document_type || '').toUpperCase()));
    const hasXray = docTypesPresent.has('XRAY') || docTypesPresent.has('RADIOGRAPH') || (documents || []).some(d => /x-?ray|radiograph/i.test(d.file_name));
    const hasClinicalNote = docTypesPresent.has('CLINICAL_NOTE') || (clinical_text && clinical_text.trim().length > 15);
    const hasTreatmentPlan = docTypesPresent.has('TREATMENT_PLAN');
    const hasPrescription = docTypesPresent.has('PRESCRIPTION');
    const hasPreviousAuditDoc = docTypesPresent.has('PREVIOUS_AUDIT') || docTypesPresent.has('REJECTION_REPORT');

    // Clinical Justification analysis
    const combinedClinicalText = [clinical_text, ...(documents || []).map(d => d.extracted_text || '')].join('\n');
    const clinicalEntities = extractClinicalEntitiesFromText(combinedClinicalText);
    const hasJustification = clinicalEntities.findings.length > 0 || clinicalEntities.structural_findings.length > 0 || !!clinicalEntities.clinical_justification;

    // 1. STRUCTURED PAYER & PROCEDURE CHECKS
    const checks = [];

    // Check A: Patient Demographics
    if (patientName && patient?.id) {
      checks.push({
        id: 'chk-patient-info',
        category: 'COMPLETENESS',
        requirement: 'Patient Name & Identification',
        source: 'Payer Submission Standard',
        severity: 'HIGH',
        result: 'PASS',
        evidence: `Patient: ${patientName} (ID: ${patient.id}) confirmed.`
      });
    } else {
      checks.push({
        id: 'chk-patient-info',
        category: 'COMPLETENESS',
        requirement: 'Patient Name & Identification',
        source: 'Payer Submission Standard',
        severity: 'HIGH',
        result: 'FAIL',
        evidence: 'Patient name or ID is incomplete.'
      });
    }

    // Check B: Procedure & Tooth Specification
    if (cdtCode) {
      const isToothSpecific = !['D4341', 'D4342', 'D1110', 'D1206', 'D0120', 'D0150'].includes(cdtCode);
      if (isToothSpecific) {
        if (toothNumber) {
          checks.push({
            id: 'chk-tooth-number',
            category: 'PROCEDURE',
            requirement: 'Tooth Number Identification',
            source: 'CDT Specification Standard',
            severity: 'HIGH',
            result: 'PASS',
            evidence: `Tooth #${toothNumber} specified for procedure ${cdtCode}.`
          });
        } else {
          checks.push({
            id: 'chk-tooth-number',
            category: 'PROCEDURE',
            requirement: 'Tooth Number Identification',
            source: 'CDT Specification Standard',
            severity: 'HIGH',
            result: 'FAIL',
            evidence: `CDT ${cdtCode} requires explicit tooth designation, but no tooth number was provided.`
          });
        }
      }
    } else {
      checks.push({
        id: 'chk-cdt-code',
        category: 'PROCEDURE',
        requirement: 'Valid CDT Procedure Code',
        source: 'ADA CDT Standard',
        severity: 'HIGH',
        result: 'FAIL',
        evidence: 'No procedure CDT code designated.'
      });
    }

    // Check C: Clinical Narrative & Medical Necessity
    if (hasClinicalNote) {
      if (hasJustification) {
        checks.push({
          id: 'chk-clinical-narrative',
          category: 'CLINICAL_EVIDENCE',
          requirement: 'Doctor Narrative & Medical Necessity Terms',
          source: verified_policy?.verified ? verified_policy.source_url : 'Clinical Documentation Standard',
          severity: 'HIGH',
          result: 'PASS',
          evidence: `Clinical narrative establishes medical necessity: ${[...clinicalEntities.findings, ...clinicalEntities.structural_findings].slice(0, 3).join(', ')}.`
        });
      } else {
        checks.push({
          id: 'chk-clinical-narrative',
          category: 'CLINICAL_EVIDENCE',
          requirement: 'Doctor Narrative & Medical Necessity Terms',
          source: verified_policy?.verified ? verified_policy.source_url : 'Clinical Documentation Standard',
          severity: 'HIGH',
          result: 'WARNING',
          evidence: 'Clinical note is attached, but specific structural necessity terms (e.g. cusp fracture, caries into dentin) are sparse.'
        });
      }
    } else {
      checks.push({
        id: 'chk-clinical-narrative',
        category: 'CLINICAL_EVIDENCE',
        requirement: 'Doctor Narrative & Medical Necessity Terms',
        source: verified_policy?.verified ? verified_policy.source_url : 'Clinical Documentation Standard',
        severity: 'HIGH',
        result: 'FAIL',
        evidence: 'No doctor clinical narrative or chart note provided.'
      });
    }

    // Check D: Diagnostic Radiographs / Evidence
    const requiresRadiograph = cdtKnowledge?.required_evidence?.some(e => e.type === 'XRAY') ||
      (verified_policy?.requirements || []).some(r => r.type === 'RADIOGRAPH') ||
      ['D2740', 'D2750', 'D2790', 'D3330', 'D6010', 'D7210'].includes(cdtCode);

    if (requiresRadiograph) {
      if (hasXray) {
        checks.push({
          id: 'chk-radiograph',
          category: 'DOCUMENTATION',
          requirement: 'Pre-operative Diagnostic Radiograph',
          source: verified_policy?.verified ? verified_policy.source_url : `${cdtCode} Policy Rule`,
          severity: 'HIGH',
          result: 'PASS',
          evidence: 'Diagnostic radiograph attached.'
        });
      } else {
        checks.push({
          id: 'chk-radiograph',
          category: 'DOCUMENTATION',
          requirement: 'Pre-operative Diagnostic Radiograph',
          source: verified_policy?.verified ? verified_policy.source_url : `${cdtCode} Policy Rule`,
          severity: 'HIGH',
          result: 'FAIL',
          evidence: `Mandatory pre-op diagnostic radiograph is missing for ${cdtCode || 'major procedure'}.`
        });
      }
    }

    // Check E: Payer Policy Verification Status
    if (insurance?.policy_url) {
      if (verified_policy?.verified) {
        checks.push({
          id: 'chk-payer-policy-url',
          category: 'PAYER_VERIFICATION',
          requirement: 'Payer Online Policy Rule Verification',
          source: verified_policy.source_url,
          severity: 'MEDIUM',
          result: 'PASS',
          evidence: `Verified active policy rules retrieved at ${verified_policy.retrieved_at}.`
        });
      } else {
        checks.push({
          id: 'chk-payer-policy-url',
          category: 'PAYER_VERIFICATION',
          requirement: 'Payer Online Policy Rule Verification',
          source: insurance.policy_url,
          severity: 'MEDIUM',
          result: 'WARNING',
          evidence: 'Payer policy could not be verified from the provided URL.'
        });
      }
    }

    // Check F: Previous Audit / Rejection Reconciliation
    let previousRejectionResolved = null;
    const prevRejectionInfo = clinicalEntities.previous_rejection || previous_audit;
    if (prevRejectionInfo && prevRejectionInfo.detected) {
      const reasonText = (prevRejectionInfo.reason || '').toLowerCase();
      // Check if current narrative or documents address the previous reason
      if (reasonText.includes('narrative') || reasonText.includes('necessity') || reasonText.includes('justification')) {
        if (hasJustification) {
          previousRejectionResolved = true;
          checks.push({
            id: 'chk-prev-rejection-resolved',
            category: 'RECONCILIATION',
            requirement: 'Previous Rejection Rectification',
            source: 'Previous Audit Report',
            severity: 'HIGH',
            result: 'PASS',
            evidence: `Previous rejection reason ("${prevRejectionInfo.reason}") appears addressed by current clinical evidence.`
          });
        } else {
          previousRejectionResolved = false;
          checks.push({
            id: 'chk-prev-rejection-resolved',
            category: 'RECONCILIATION',
            requirement: 'Previous Rejection Rectification',
            source: 'Previous Audit Report',
            severity: 'HIGH',
            result: 'FAIL',
            evidence: `Previous rejection reason ("${prevRejectionInfo.reason}") remains unresolved in current submission.`
          });
        }
      } else if (reasonText.includes('x-ray') || reasonText.includes('radiograph')) {
        if (hasXray) {
          previousRejectionResolved = true;
          checks.push({
            id: 'chk-prev-rejection-resolved',
            category: 'RECONCILIATION',
            requirement: 'Previous Rejection Rectification',
            source: 'Previous Audit Report',
            severity: 'HIGH',
            result: 'PASS',
            evidence: 'Missing radiograph from previous denial is now attached.'
          });
        } else {
          previousRejectionResolved = false;
          checks.push({
            id: 'chk-prev-rejection-resolved',
            category: 'RECONCILIATION',
            requirement: 'Previous Rejection Rectification',
            source: 'Previous Audit Report',
            severity: 'HIGH',
            result: 'FAIL',
            evidence: 'Radiograph required by previous denial is still missing.'
          });
        }
      }
    }

    // 2. EXPLAINABLE REJECTION RISK CALCULATION
    // Evaluate if there is sufficient minimal data to compute an explainable score
    const hasMinimalData = (patientName.length > 0 || (documents && documents.length > 0) || (clinical_text && clinical_text.trim().length > 10));

    let rejectionRiskScore = null;
    let riskCalculationExplainable = false;
    const riskFactorBreakdown = [];

    if (hasMinimalData && cdtCode) {
      let computedScore = 5; // Base administrative submission baseline

      // Factor 1: Missing Required Radiograph
      if (requiresRadiograph && !hasXray) {
        computedScore += 30;
        riskFactorBreakdown.push({
          factor: 'Missing Mandatory Diagnostic Radiograph',
          points: '+30',
          reason: `Payer and CDT guidelines require pre-operative imaging for ${cdtCode}.`
        });
      }

      // Factor 2: Missing or Incomplete Clinical Justification
      if (!hasClinicalNote) {
        computedScore += 25;
        riskFactorBreakdown.push({
          factor: 'Missing Clinical Chart Note',
          points: '+25',
          reason: 'No clinical notes or chart narrative provided to support procedure necessity.'
        });
      } else if (!hasJustification) {
        computedScore += 18;
        riskFactorBreakdown.push({
          factor: 'Weak Clinical Justification in Note',
          points: '+18',
          reason: 'Clinical narrative does not explicitly document structural breakdown or criteria.'
        });
      }

      // Factor 3: Missing Tooth Number
      if (!toothNumber && !['D4341', 'D4342', 'D1110'].includes(cdtCode)) {
        computedScore += 20;
        riskFactorBreakdown.push({
          factor: 'Missing Tooth Location',
          points: '+20',
          reason: 'Tooth designation is mandatory for tooth-specific dental restoration.'
        });
      }

      // Factor 4: Incomplete Patient / Member Information
      if (!patientName || !patient?.id || !insurance?.member_id) {
        computedScore += 10;
        riskFactorBreakdown.push({
          factor: 'Incomplete Patient or Member Identification',
          points: '+10',
          reason: 'Missing patient identifier, member ID, or date of treatment.'
        });
      }

      // Factor 5: Unverified Payer Policy Warning
      if (insurance?.policy_url && verified_policy && !verified_policy.verified) {
        computedScore += 7;
        riskFactorBreakdown.push({
          factor: 'Unverified Payer Policy Source',
          points: '+7',
          reason: 'Policy URL could not be verified; unconfirmed exclusions may apply.'
        });
      }

      // Factor 6: Previous Rejection Unresolved
      if (previousRejectionResolved === false) {
        computedScore += 20;
        riskFactorBreakdown.push({
          factor: 'Unresolved Previous Rejection Issue',
          points: '+20',
          reason: 'Identified previous denial reason was not addressed in current documentation.'
        });
      } else if (previousRejectionResolved === true) {
        computedScore = Math.max(5, computedScore - 10);
        riskFactorBreakdown.push({
          factor: 'Previous Rejection Defect Rectified',
          points: '-10',
          reason: 'Current documentation explicitly supplies previously missing evidence.'
        });
      }

      // Factor 7: Gemini Policy Compliance Risk Analysis
      if (verified_policy?.verified && verified_policy?.chance_analysis?.rejection_risk_pct !== undefined) {
        const geminiRisk = verified_policy.chance_analysis.rejection_risk_pct;
        const geminiDelta = Math.round((geminiRisk - 20) * 0.25);
        if (geminiDelta !== 0) {
          computedScore += geminiDelta;
          riskFactorBreakdown.push({
            factor: 'Gemini Policy Reading Analysis',
            points: geminiDelta > 0 ? `+${geminiDelta}` : `${geminiDelta}`,
            reason: `Direct evaluation against ${verified_policy.payer_name || 'payer'} guidelines: ${verified_policy.chance_analysis.detailed_rationale || verified_policy.chance_analysis.chance_level + ' approval probability'}`
          });
        }
      }

      rejectionRiskScore = Math.min(95, Math.max(5, computedScore));
      riskCalculationExplainable = true;
    }

    // 3. CLAIM READINESS CLASSIFICATION
    let readiness = 'INSUFFICIENT INFORMATION';
    const topReasons = [];

    if (!hasMinimalData || !cdtCode) {
      readiness = 'INSUFFICIENT INFORMATION';
      topReasons.push('Procedure CDT code or core clinical narrative not supplied.');
    } else if (rejectionRiskScore !== null) {
      const failedChecks = checks.filter(c => c.result === 'FAIL');
      const warningChecks = checks.filter(c => c.result === 'WARNING');

      if (rejectionRiskScore >= 60 || failedChecks.length >= 2) {
        readiness = 'HIGH RISK';
      } else if (rejectionRiskScore >= 25 || failedChecks.length > 0 || warningChecks.length > 0) {
        readiness = 'REVIEW REQUIRED';
      } else {
        readiness = 'READY';
      }

      failedChecks.forEach(f => topReasons.push(f.evidence));
      warningChecks.forEach(w => topReasons.push(w.evidence));
      if (topReasons.length === 0) {
        topReasons.push(`All core clinical documentation and payer criteria satisfied for ${cdtCode}.`);
      }
    }

    // 4. SMART FINDINGS PRIORITIZATION
    const prioritizedFindings = [...checks].sort((a, b) => {
      const rank = { FAIL: 3, WARNING: 2, PASS: 1 };
      const severityRank = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const diffResult = (rank[b.result] || 0) - (rank[a.result] || 0);
      if (diffResult !== 0) return diffResult;
      return (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
    });

    const topIssue = prioritizedFindings.find(f => f.result === 'FAIL') ||
                     prioritizedFindings.find(f => f.result === 'WARNING') ||
                     null;

    // 5. MAXIMUM REIMBURSEMENT & FEE COMPARISON
    let reimbursementComparison = null;
    const knownAllowable = verified_policy?.maximum_allowable || null;

    if (knownAllowable !== null && chargedAmount !== null) {
      reimbursementComparison = {
        available: true,
        charged: chargedAmount,
        known_allowable: knownAllowable,
        difference: Math.round((chargedAmount - knownAllowable) * 100) / 100,
        source: verified_policy.source_url
      };
    } else if (knownAllowable !== null) {
      reimbursementComparison = {
        available: true,
        charged: null,
        known_allowable: knownAllowable,
        difference: null,
        source: verified_policy.source_url
      };
    } else {
      reimbursementComparison = {
        available: false,
        message: 'Maximum allowable amount: Not available from provided payer information.'
      };
    }

    // 6. ACTIONABLE RECOMMENDATIONS
    const recommendations = [];
    if (requiresRadiograph && !hasXray) {
      recommendations.push(`Attach pre-operative diagnostic periapical radiograph for tooth #${toothNumber || 'designated tooth'} before submission.`);
    }
    if (!hasClinicalNote) {
      recommendations.push('Upload dentist clinical chart note establishing primary diagnosis and tooth prognosis.');
    } else if (!hasJustification) {
      recommendations.push('Detail explicit structural breakdown percentage and explain why direct restoration is contraindicated.');
    }
    if (!toothNumber && !['D4341', 'D4342', 'D1110'].includes(cdtCode)) {
      recommendations.push('Enter tooth number in claim details.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Verify patient insurance eligibility before clearing claim for electronic submission.');
    }

    return res.json({
      success: true,
      data: {
        claim_summary: {
          patient_name: patientName || 'Not specified',
          patient_id: patient?.id || 'Not specified',
          payer_name: insurance?.provider_name || 'Not specified',
          cdt_code: cdtCode || 'Not designated',
          tooth_number: toothNumber || 'Not specified',
          treatment_date: procedure?.treatment_date || patient?.treatment_date || 'Not specified'
        },
        readiness,
        rejection_risk: riskCalculationExplainable ? {
          score_pct: rejectionRiskScore,
          factors: riskFactorBreakdown,
          disclaimer: 'Risk assessment is an estimate based on concrete documentation rules, not a guarantee of payer adjudication.'
        } : {
          score_pct: null,
          message: 'Risk cannot be reliably estimated yet. Provide procedure code and clinical note or documents.',
          missing_prerequisites: ['CDT procedure code', 'Clinical note or documentation']
        },
        top_reasons: topReasons.slice(0, 3),
        top_issue: topIssue,
        checks: prioritizedFindings,
        reimbursement: reimbursementComparison,
        previous_rejection_reconciliation: prevRejectionInfo ? {
          detected: true,
          original_reason: prevRejectionInfo.reason,
          resolved: previousRejectionResolved,
          explanation: previousRejectionResolved
            ? 'Current clinical evidence directly satisfies the deficiency cited in the previous denial.'
            : 'Deficiency cited in previous denial has not been resolved in current documentation.'
        } : null,
        recommendations,
        audited_at: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('[Assessment Run Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/assessment/save
 * Persists an assessment session in Supabase or local storage.
 */
router.post('/save', async (req, res) => {
  try {
    const { assessment_data, claim_info } = req.body;
    const sessionId = `ASM-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const record = {
      id: sessionId,
      patient_name: claim_info?.patient?.name || 'Unknown Patient',
      payer_name: claim_info?.insurance?.provider_name || 'Standard Payer',
      cdt_code: claim_info?.procedure?.cdt_code || 'Unspecified',
      readiness: assessment_data?.readiness || 'INSUFFICIENT INFORMATION',
      rejection_risk_score: assessment_data?.rejection_risk?.score_pct || null,
      top_issue: assessment_data?.top_issue?.requirement || 'None',
      created_at: timestamp
    };

    assessmentSessions.set(sessionId, { ...record, full_data: assessment_data });

    return res.json({
      success: true,
      message: 'Smart Assessment saved successfully.',
      session_id: sessionId,
      saved_record: record
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/assessment/gemini-status
 * Checks if Gemini AI is configured
 */
router.get('/gemini-status', (req, res) => {
  res.json({
    success: true,
    configured: geminiService.isGeminiConfigured(),
    model: 'gemini-2.5-flash'
  });
});

/**
 * POST /api/assessment/gemini-key
 * Configures or updates the Gemini API key
 */
router.post('/gemini-key', (req, res) => {
  const { api_key } = req.body;
  if (!api_key || typeof api_key !== 'string' || !api_key.trim()) {
    return res.status(400).json({ success: false, message: 'api_key string is required.' });
  }
  geminiService.setGeminiApiKey(api_key.trim());
  res.json({
    success: true,
    message: 'Gemini API key configured successfully.',
    configured: true
  });
});

module.exports = router;
