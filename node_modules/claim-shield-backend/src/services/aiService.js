/**
 * AI Service for Clinical Evidence Extraction
 * Integrates Hugging Face d4data/biomedical-ner-all local microservice (port 8001)
 * with the Dental Normalization Layer, CDT Knowledge Base, and a graceful
 * deterministic fallback engine.
 */

const { normalizeDentalEntities } = require('./dentalNormalizer');
const { identifyCdtCandidates } = require('./cdtKnowledgeBase');

const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://127.0.0.1:8001/extract';

async function extractClinicalEvidence(narrativeText = '', documents = []) {
  const combinedText = [
    narrativeText || '',
    ...documents.map(d => {
      if (typeof d === 'string') return d;
      return d.extracted_text || d.file_name || '';
    })
  ].filter(Boolean).join('\n').trim();

  if (!combinedText) {
    return {
      teeth: [],
      conditions: [],
      structural_findings: [],
      treatment_context: [],
      anatomical_sites: [],
      severity: [],
      clinical_justification_detected: false,
      confidence: 0.0,
      raw_entities: [],
      suggested_codes: [],
      source: 'NOT_DETECTED',
      model: 'None'
    };
  }

  // 1. Attempt Clinical NLP Entity Extraction via local Hugging Face microservice
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(NLP_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: combinedText }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.success && Array.isArray(data.entities)) {
        // Pass entities to Dental Normalization Layer
        const normalized = normalizeDentalEntities(data.entities, combinedText);
        const suggestedCodes = identifyCdtCandidates(normalized, combinedText);

        const avgConfidence = data.entities.length > 0
          ? data.entities.reduce((acc, e) => acc + (e.confidence || 0.9), 0) / data.entities.length
          : (normalized.has_clinical_justification ? 0.94 : 0.40);

        return {
          tooth: normalized.tooth,
          teeth: normalized.teeth,
          conditions: normalized.findings,
          findings: normalized.findings,
          structural_findings: normalized.structural_findings,
          treatment_context: normalized.treatment_context,
          anatomical_sites: normalized.anatomical_sites,
          severity: normalized.severity,
          clinical_justification_detected: normalized.has_clinical_justification,
          confidence: Math.round(avgConfidence * 100) / 100,
          raw_entities: data.entities,
          suggested_codes: suggestedCodes,
          source: 'HUGGINGFACE_NLP (d4data/biomedical-ner-all)',
          model: data.model || 'd4data/biomedical-ner-all'
        };
      }
    }
  } catch (err) {
    // Expected when service is starting or running in lightweight standalone mode
    // Fall through to deterministic terminology layer
    console.info(`[AI Service] NLP service at ${NLP_SERVICE_URL} unavailable (${err.message}). Using deterministic clinical terminology fallback.`);
  }

  // 2. Deterministic Terminology Fallback Parser
  return parseNarrativeDeterministic(combinedText);
}

function parseNarrativeDeterministic(text) {
  const normalized = normalizeDentalEntities([], text);
  const suggestedCodes = identifyCdtCandidates(normalized, text);

  return {
    tooth: normalized.tooth,
    teeth: normalized.teeth,
    conditions: normalized.findings,
    findings: normalized.findings,
    structural_findings: normalized.structural_findings,
    treatment_context: normalized.treatment_context,
    anatomical_sites: normalized.anatomical_sites,
    severity: normalized.severity,
    clinical_justification_detected: normalized.has_clinical_justification,
    confidence: normalized.has_clinical_justification ? 0.92 : 0.40,
    raw_entities: [],
    suggested_codes: suggestedCodes,
    source: 'DETERMINISTIC_TERMINOLOGY_FALLBACK',
    model: 'Dental Terminology Rule Engine'
  };
}

module.exports = {
  extractClinicalEvidence,
  parseNarrativeDeterministic
};
