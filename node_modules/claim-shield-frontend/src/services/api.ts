import { Claim, Payer, PayerRule, AuditResult, ClaimDocument, Finding } from '../types';

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchPayers(): Promise<Payer[]> {
  const res = await fetch(`${API_BASE}/payers`);
  const data = await res.json();
  return data.data || [];
}

export async function fetchPayerRules(payerId: string): Promise<PayerRule[]> {
  const res = await fetch(`${API_BASE}/payers/${payerId}/rules`);
  const data = await res.json();
  return data.data || [];
}

export async function fetchClaims(params?: { status?: string; search?: string; payer_id?: string }): Promise<Claim[]> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== 'ALL') query.append('status', params.status);
  if (params?.search) query.append('search', params.search);
  if (params?.payer_id) query.append('payer_id', params.payer_id);

  const res = await fetch(`${API_BASE}/claims?${query.toString()}`);
  const data = await res.json();
  return data.data || [];
}

export async function fetchClaimById(id: string): Promise<Claim> {
  const res = await fetch(`${API_BASE}/claims/${id}`);
  const data = await res.json();
  return data.data;
}

export async function createClaimApi(claimPayload: any): Promise<Claim> {
  const res = await fetch(`${API_BASE}/claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(claimPayload)
  });
  const data = await res.json();
  return data.data;
}

export async function updateClaimApi(id: string, updatePayload: any): Promise<Claim> {
  const res = await fetch(`${API_BASE}/claims/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatePayload)
  });
  const data = await res.json();
  return data.data;
}

export async function uploadDocumentApi(claimId: string, file: File, documentType: string): Promise<ClaimDocument> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);

  const res = await fetch(`${API_BASE}/claims/${claimId}/documents`, {
    method: 'POST',
    body: formData
  });
  const data = await res.json();
  return data.data;
}

export async function runAuditApi(claimId: string): Promise<AuditResult> {
  const res = await fetch(`${API_BASE}/claims/${claimId}/audit`, {
    method: 'POST'
  });
  const data = await res.json();
  return data.data;
}

export async function reAuditApi(claimId: string): Promise<{ data: AuditResult; progression: any }> {
  const res = await fetch(`${API_BASE}/claims/${claimId}/audit/re-audit`, {
    method: 'POST'
  });
  const data = await res.json();
  return {
    data: data.data,
    progression: data.progression
  };
}
