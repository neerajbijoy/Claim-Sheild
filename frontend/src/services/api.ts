import { Claim, Payer, PayerRule, AuditResult, ClaimDocument, CdtKnowledgeEntry } from '../types';
import { searchFallbackCdtLibrary, FALLBACK_CDT_LIBRARY } from './cdtDataFallback';

const API_BASE = '/api';

async function handleResponse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const errorMsg = data.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }
  return data;
}

// Health & Status
export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return handleResponse(res);
}

// Payers CRUD
export async function fetchPayers(): Promise<Payer[]> {
  const res = await fetch(`${API_BASE}/payers`);
  const data = await handleResponse(res);
  return data.data || [];
}

export async function createPayerApi(payerPayload: Partial<Payer>): Promise<Payer> {
  const res = await fetch(`${API_BASE}/payers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payerPayload)
  });
  const data = await handleResponse(res);
  return data.data;
}

export async function updatePayerApi(id: string, updatePayload: Partial<Payer>): Promise<Payer> {
  const res = await fetch(`${API_BASE}/payers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatePayload)
  });
  const data = await handleResponse(res);
  return data.data;
}

export async function deletePayerApi(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/payers/${id}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

// Payer Rules CRUD
export async function fetchPayerRules(payerId: string): Promise<PayerRule[]> {
  const res = await fetch(`${API_BASE}/payers/${payerId}/rules`);
  const data = await handleResponse(res);
  return data.data || [];
}

export async function createPayerRuleApi(payerId: string, rulePayload: Partial<PayerRule>): Promise<PayerRule> {
  const res = await fetch(`${API_BASE}/payers/${payerId}/rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rulePayload)
  });
  const data = await handleResponse(res);
  return data.data;
}

export async function deletePayerRuleApi(ruleId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/payers/rules/${ruleId}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

// Claims CRUD
export async function fetchClaims(params?: { status?: string; search?: string; payer_id?: string }): Promise<Claim[]> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== 'ALL') query.append('status', params.status);
  if (params?.search) query.append('search', params.search);
  if (params?.payer_id) query.append('payer_id', params.payer_id);

  const res = await fetch(`${API_BASE}/claims?${query.toString()}`);
  const data = await handleResponse(res);
  return data.data || [];
}

export async function fetchClaimById(id: string): Promise<Claim> {
  const res = await fetch(`${API_BASE}/claims/${id}`);
  const data = await handleResponse(res);
  return data.data;
}

export async function createClaimApi(claimPayload: any): Promise<Claim> {
  const res = await fetch(`${API_BASE}/claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(claimPayload)
  });
  const data = await handleResponse(res);
  return data.data;
}

export async function updateClaimApi(id: string, updatePayload: any): Promise<Claim> {
  const res = await fetch(`${API_BASE}/claims/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatePayload)
  });
  const data = await handleResponse(res);
  return data.data;
}

export async function deleteClaimApi(id: string): Promise<{ success: boolean; message: string; data: { id: string } }> {
  const res = await fetch(`${API_BASE}/claims/${id}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

// Documents CRUD
export async function uploadDocumentApi(claimId: string, file: File, documentType: string): Promise<ClaimDocument> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);

  const res = await fetch(`${API_BASE}/claims/${claimId}/documents`, {
    method: 'POST',
    body: formData
  });
  const data = await handleResponse(res);
  return data.data;
}

export async function deleteDocumentApi(claimId: string, docId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/claims/${claimId}/documents/${docId}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

// Audits Execution
export async function runAuditApi(claimId: string): Promise<AuditResult> {
  const res = await fetch(`${API_BASE}/claims/${claimId}/audit`, {
    method: 'POST'
  });
  const data = await handleResponse(res);
  return data.data;
}

export async function reAuditApi(claimId: string): Promise<{ data: AuditResult; progression: any }> {
  const res = await fetch(`${API_BASE}/claims/${claimId}/audit/re-audit`, {
    method: 'POST'
  });
  const data = await handleResponse(res);
  return {
    data: data.data,
    progression: data.progression
  };
}

export async function extractClinicalApi(payload: {
  narrativeText?: string;
  narrative?: string;
  documents?: any[];
}): Promise<any> {
  const res = await fetch(`${API_BASE}/audit/extract-clinical`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await handleResponse(res);
  return data.data;
}

export async function fetchClaimProceduresApi(claimId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/claims/${claimId}/procedures`);
  const data = await handleResponse(res);
  return data.data || [];
}

export async function fetchClaimClinicalEvidenceApi(claimId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/claims/${claimId}/clinical-evidence`);
  const data = await handleResponse(res);
  return data.data;
}

export async function fetchClaimRiskPriorityApi(claimId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/claims/${claimId}/risk-priority`);
  const data = await handleResponse(res);
  return data;
}

// CDT Knowledge Base & Explorer API
export async function fetchCdtLibrary(params?: {
  category?: string;
  search?: string;
  risk?: string;
}): Promise<CdtKnowledgeEntry[]> {
  try {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'ALL') query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.risk && params.risk !== 'ALL') query.append('risk', params.risk);

    const res = await fetch(`${API_BASE}/cdt?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        return data.data;
      }
    }
  } catch (err) {
    // Graceful fallback to client knowledge store
  }
  return searchFallbackCdtLibrary(params);
}

export async function matchCdtCodesApi(clinicalText: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/cdt/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinical_text: clinicalText })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        return data.data;
      }
    }
  } catch (err) {
    // Client-side fallback matching
  }
  
  const text = clinicalText.toLowerCase();
  const matched = FALLBACK_CDT_LIBRARY.filter(entry => {
    return (
      entry.synonyms.some(s => text.includes(s.toLowerCase())) ||
      entry.clinical_concepts.some(c => text.includes(c.toLowerCase()))
    );
  }).map(entry => ({
    cdt_code: entry.cdt_code,
    procedure_name: entry.procedure_name,
    category: entry.category,
    risk_level: entry.risk_level,
    confidence: 0.85,
    rationale: `Matched clinical keywords: ${entry.clinical_concepts.filter(c => text.includes(c.toLowerCase())).slice(0, 3).join(', ') || entry.procedure_name}`,
    required_evidence: entry.required_evidence
  }));

  return matched;
}

// Smart Claim Assessment API Client
export async function extractAssessmentDocumentsApi(
  files: File[],
  clinicalNote: string = '',
  docTypes: Record<string, string> = {}
): Promise<{ documents: any[]; extracted_info: any; cdt_candidates: any[] }> {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
    if (docTypes[file.name]) {
      formData.append(`doc_type_${file.name}`, docTypes[file.name]);
    }
  });
  if (clinicalNote) {
    formData.append('clinical_note', clinicalNote);
  }

  const res = await fetch(`${API_BASE}/assessment/extract`, {
    method: 'POST',
    body: formData
  });
  const data = await handleResponse(res);
  return data.data;
}

export async function verifyPayerUrlApi(
  url: string,
  payerName?: string,
  context?: { procedure?: any; clinical_evidence?: any }
): Promise<any> {
  const res = await fetch(`${API_BASE}/assessment/verify-payer-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      payer_name: payerName,
      procedure: context?.procedure,
      clinical_evidence: context?.clinical_evidence
    })
  });
  const data = await handleResponse(res);
  return data;
}

export async function fetchAssessmentHistoricalApi(params: {
  payer_name?: string;
  payer_id?: string;
  cdt_code?: string;
}): Promise<any> {
  const query = new URLSearchParams();
  if (params.payer_name) query.append('payer_name', params.payer_name);
  if (params.payer_id) query.append('payer_id', params.payer_id);
  if (params.cdt_code) query.append('cdt_code', params.cdt_code);

  const res = await fetch(`${API_BASE}/assessment/historical?${query.toString()}`);
  const data = await handleResponse(res);
  return data;
}

export async function runSmartAssessmentApi(payload: {
  patient: any;
  insurance: any;
  procedure: any;
  documents?: any[];
  clinical_text?: string;
  verified_policy?: any;
  previous_audit?: any;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/assessment/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await handleResponse(res);
  return data.data;
}

export async function saveSmartAssessmentApi(payload: {
  assessment_data: any;
  claim_info: any;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/assessment/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse(res);
}

export async function fetchGeminiStatusApi(): Promise<{ configured: boolean; model: string }> {
  try {
    const res = await fetch(`${API_BASE}/assessment/gemini-status`);
    if (res.ok) {
      const data = await res.json();
      return { configured: !!data.configured, model: data.model || 'gemini-2.5-flash' };
    }
  } catch (err) {}
  return { configured: false, model: 'gemini-2.5-flash' };
}

export async function saveGeminiApiKeyApi(apiKey: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/assessment/gemini-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey })
  });
  return handleResponse(res);
}




