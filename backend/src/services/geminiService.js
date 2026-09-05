/**
 * Google Gemini AI Service for Dental Claims & Payer Website Policy Analysis
 * 
 * Provides:
 * 1. Deep dental clinical narrative understanding, entity extraction, and CDT candidate matching.
 * 2. Insurance website & policy document reading, rule extraction, and approval chance analysis.
 * 3. Graceful fallback to deterministic dental ontology if API key is not yet configured.
 */

const fs = require('fs');
const path = require('path');

// In-memory key override
let inMemoryApiKey = null;

function getGeminiApiKey() {
  return inMemoryApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
}

function setGeminiApiKey(key) {
  inMemoryApiKey = key ? key.trim() : null;
  // Attempt to persist to backend/.env for developer convenience
  if (inMemoryApiKey) {
    try {
      const envPath = path.resolve(__dirname, '../../.env');
      if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, 'utf-8');
        if (content.includes('GEMINI_API_KEY=')) {
          content = content.replace(/GEMINI_API_KEY=.*(\r?\n|$)/, `GEMINI_API_KEY=${inMemoryApiKey}$1`);
        } else {
          content += `\n# Google Gemini API Key\nGEMINI_API_KEY=${inMemoryApiKey}\n`;
        }
        fs.writeFileSync(envPath, content, 'utf-8');
      }
    } catch (err) {
      console.warn('[Gemini Service] Could not write API key to .env:', err.message);
    }
  }
}

function isGeminiConfigured() {
  return !!getGeminiApiKey();
}

/**
 * Low-level call to Gemini REST API with automatic model fallback
 */
async function callGeminiApi(prompt, systemInstruction = '') {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please supply an API key in backend/.env or via the settings.');
  }

  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000); // 18s timeout

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API error (${model} HTTP ${res.status}): ${errText}`);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return rawText;
    } catch (err) {
      lastError = err;
      // If error is not a 404/not found, still attempt fallback model
      console.warn(`[Gemini Service] Model ${model} failed, trying next:`, err.message);
    }
  }

  throw lastError || new Error('All Gemini models failed.');
}

/**
 * Helper to clean and parse JSON returned from LLMs
 */
function safeParseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    // Attempt markdown block extraction ```json ... ```
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (err2) {}
    }
    // Attempt curly braces slice
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1));
      } catch (err3) {}
    }
    throw new Error(`Could not parse JSON from Gemini response: ${text.slice(0, 150)}...`);
  }
}

/**
 * 1. WEBSITE / POLICY URL READING & CHANCE ANALYSIS
 * Reads the scraped webpage policy content and analyzes the claim's approval/rejection chances.
 */
async function analyzePayerPolicyWithGemini({ url, pageContent, procedureInfo = {}, clinicalEvidence = {} }) {
  const systemInstruction = `You are a certified senior dental insurance billing auditor and legal medical necessity specialist. 
Your job is to read scraped insurance provider policy documents/guidelines, extract clinical criteria, and compute an explainable approval chance analysis for a dental claim.
Always respond in strictly valid JSON format.`;

  const truncatedContent = (pageContent || '').slice(0, 25000); // Keep within reasonable context

  const prompt = `
Analyze this dental insurance payer policy document from URL: "${url}".

CURRENT CLAIM PROCEDURE CONTEXT:
- CDT Code: ${procedureInfo.cdt_code || 'Unspecified (General Restorative/Periodontic/Surgical)'}
- Tooth Number: #${procedureInfo.tooth_number || 'Unspecified'}
- Procedure Name: ${procedureInfo.procedure_name || 'Not provided'}
- Amount Charged: ${procedureInfo.amount_charged ? `$${procedureInfo.amount_charged}` : 'Not provided'}
- Clinical Evidence Provided: ${JSON.stringify(clinicalEvidence)}

WEBPAGE / POLICY TEXT CONTENT:
"""
${truncatedContent}
"""

Please thoroughly evaluate this policy and return a JSON object with this exact structure:
{
  "verified": true,
  "payer_name": "Extracted or inferred payer name from policy",
  "policy_title": "Policy or Guideline title",
  "policy_summary": "Concise summary of the clinical coverage policy",
  "requirements": [
    {
      "type": "RADIOGRAPH" | "NARRATIVE" | "PERIO_CHARTING" | "PRIOR_AUTH" | "FREQUENCY" | "DOCUMENTATION",
      "rule": "Clear statement of the rule",
      "policy_quote": "Exact or near-verbatim quote from the text",
      "severity": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "chance_analysis": {
    "approval_chance_pct": 75, // Integer 0 to 100
    "rejection_risk_pct": 25,  // Integer 0 to 100 (must equal 100 - approval_chance_pct)
    "chance_level": "VERY HIGH" | "HIGH" | "MODERATE" | "LOW" | "VERY LOW",
    "detailed_rationale": "Clear plain-English explanation of why this claim has these chances under this payer's policy rules",
    "compliance_breakdown": [
      {
        "criterion": "Requirement name",
        "status": "SATISFIED" | "DEFICIENT" | "UNKNOWN",
        "analysis": "Specific explanation comparing current evidence to payer rule"
      }
    ]
  },
  "maximum_allowable": null, // Float dollar amount if stated in the text, otherwise null
  "exclusions": ["List any stated exclusions or non-covered conditions"],
  "recommendations_for_approval": [
    "Actionable step 1 for dental biller to maximize approval chance",
    "Actionable step 2"
  ]
}
`;

  const rawJson = await callGeminiApi(prompt, systemInstruction);
  return safeParseJson(rawJson);
}

/**
 * 2. DENTAL CLINICAL ENTITY & CHANCE ANALYSIS
 * Deep extraction of teeth, diagnoses, structural breakdown, CDT codes, and justification from clinical text.
 */
async function analyzeDentalClinicalWithGemini({ clinicalNarrative = '', documentTexts = [], previousDenialText = '' }) {
  const systemInstruction = `You are an expert board-certified dental reviewer and CDT procedure coding specialist for pre-submission dental claim auditing.
Analyze clinical notes, radiographs reports, and dental records with clinical precision.
Always respond in strictly valid JSON format.`;

  const combinedDocs = [clinicalNarrative, ...documentTexts].filter(Boolean).join('\n---\n').slice(0, 20000);

  const prompt = `
Analyze the following dental clinical chart notes and records:

DOCUMENTATION TEXT:
"""
${combinedDocs}
"""

${previousDenialText ? `PREVIOUS DENIAL / REJECTION NOTICE TEXT:\n"""\n${previousDenialText}\n"""\n` : ''}

Extract clinical details, identify accurate CDT codes, and evaluate claim necessity. Return this exact JSON structure:
{
  "patient_name": "Extracted name or 'Not found'",
  "patient_id": "Extracted patient/chart ID or 'Not found'",
  "patient_age": 45, // Number or 'Not found'
  "doctor_name": "Extracted doctor name or 'Not found'",
  "treatment_date": "YYYY-MM-DD or 'Not found'",
  "teeth": ["14"], // Array of tooth number strings 1-32
  "surfaces": ["MOD", "L"], // Mentioned surfaces (M, O, D, F, B, L, I) or empty array
  "quadrant": null, // "UR", "UL", "LL", "LR" or null
  "diagnoses": ["recurrent caries", "cuspal fracture"], // Explicit dental diagnoses
  "structural_findings": ["compromised coronal structure", "fractured disto-lingual cusp"], // Structural breakdown details
  "remaining_structure_percentage": 40, // Estimated remaining tooth structure percentage if mentioned or inferred, or null
  "pulpal_periapical_status": "vital / non-vital / irreversible pulpitis or null",
  "periodontal_findings": "Perio details (pocket depths, bone loss) or 'Not found'",
  "clinical_justification": "Clear clinical justification explaining why conservative/direct restoration is contraindicated and this procedure is medically necessary",
  "measurements": ["Pocket depth: 5-7mm", "Coronal loss: >50%"],
  "materials": ["Porcelain/Ceramic", "Zirconia"],
  "keywords": ["recurrent decay", "cusp fracture"],
  "suggested_cdt_codes": [
    {
      "cdt_code": "D2740",
      "procedure_name": "Crown - Porcelain/Ceramic Substrate",
      "confidence": 0.95,
      "rationale": "Clear documentation of recurrent caries with lost cuspal structural integrity requiring full coverage.",
      "required_evidence": ["Pre-op bitewing or PA radiograph", "Clinical narrative"]
    }
  ],
  "previous_rejection_analysis": ${previousDenialText ? `{
    "detected": true,
    "original_reason": "Summary of previous denial reason",
    "is_rectified": true, // Boolean: whether current documentation fixes the previous issue
    "explanation": "Detailed explanation of why current documentation resolves or fails to resolve the denial"
  }` : 'null'},
  "dental_readiness_assessment": {
    "readiness": "READY" | "REVIEW REQUIRED" | "HIGH RISK",
    "estimated_approval_chance_pct": 85,
    "key_strengths": ["Strong clinical justification", "Tooth number clearly documented"],
    "key_deficiencies": ["Pre-op radiograph missing from attachments"]
  },
  "recommendations": [
    "Recommendation 1 for dental biller",
    "Recommendation 2"
  ]
}
`;

  const rawJson = await callGeminiApi(prompt, systemInstruction);
  return safeParseJson(rawJson);
}

module.exports = {
  getGeminiApiKey,
  setGeminiApiKey,
  isGeminiConfigured,
  callGeminiApi,
  analyzePayerPolicyWithGemini,
  analyzeDentalClinicalWithGemini
};
