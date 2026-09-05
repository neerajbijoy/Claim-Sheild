/**
 * AI Service for Clinical Narrative & Evidence Extraction
 * Uses Gemini API if configured or deterministic regex/NLP parser fallback.
 */

const { GoogleGenAI } = (() => {
  try {
    return require('@google/genai');
  } catch (e) {
    return {};
  }
})();

async function extractClinicalEvidence(narrativeText, documents = []) {
  const combinedText = [
    narrativeText || '',
    ...documents.map(d => d.extracted_text || d.file_name || '')
  ].join('\n');

  // Check if GEMINI_API_KEY is configured
  if (process.env.GEMINI_API_KEY && GoogleGenAI) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Analyze the following clinical narrative and dental documents text.
Return a valid JSON object with EXACTLY this structure:
{
  "teeth": ["string tooth numbers found, e.g. '14'"],
  "conditions": ["string clinical conditions found, e.g. 'recurrent decay', 'structural compromise'"],
  "clinical_justification_detected": true/false,
  "confidence": 0.0 to 1.0 score
}

Text:
"${combinedText}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      if (response && response.text) {
        const cleaned = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return {
          ...parsed,
          source: 'AI_EXTRACTED'
        };
      }
    } catch (err) {
      console.warn('[AI Service] Gemini API extraction failed, using deterministic fallback:', err.message);
    }
  }

  // Deterministic Fallback Parser
  return parseNarrativeDeterministic(combinedText);
}

function parseNarrativeDeterministic(text) {
  const normalized = text.toLowerCase();

  // Extract tooth numbers: #14, tooth 14, tooth #14, teeth 13, 14, 15
  const teethMatches = new Set();
  const toothRegex = /(?:tooth|teeth|#)\s*#?\s*([0-3]?[0-9])/gi;
  let match;
  while ((match = toothRegex.exec(text)) !== null) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 32) {
      teethMatches.add(num.toString());
    }
  }

  // Conditions detection
  const conditions = [];
  const conditionPatterns = [
    { pattern: /recurrent decay/i, label: 'recurrent decay' },
    { pattern: /structural(?:ly)? compromise/i, label: 'structural compromise' },
    { pattern: /cusp(?:al)? fracture|broken cusp/i, label: 'cusp fracture' },
    { pattern: /extensive breakdown|decay under/i, label: 'extensive breakdown' },
    { pattern: /periapical radiolucency|abscess/i, label: 'periapical radiolucency' },
    { pattern: /loss of retention|failing crown/i, label: 'failing restoration' }
  ];

  conditionPatterns.forEach(cp => {
    if (cp.pattern.test(text)) {
      conditions.push(cp.label);
    }
  });

  const justificationDetected = conditions.length > 0 || normalized.includes('full coverage') || normalized.includes('crown');

  return {
    teeth: Array.from(teethMatches),
    conditions,
    clinical_justification_detected: justificationDetected,
    confidence: justificationDetected ? 0.94 : 0.45,
    source: 'DETERMINISTIC_EXTRACTION'
  };
}

module.exports = {
  extractClinicalEvidence
};
