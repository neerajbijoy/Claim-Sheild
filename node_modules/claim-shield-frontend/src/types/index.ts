export type ClaimStatus = 'READY' | 'REVIEW' | 'BLOCKED' | 'DRAFT';
export type Severity = 'HIGH' | 'MEDIUM' | 'LOW';
export type FindingStatus = 'OPEN' | 'RESOLVED' | 'OVERRIDDEN';

export interface Procedure {
  id?: string;
  claim_id?: string;
  cdt_code: string;
  tooth_number: string;
  amount: number;
  description?: string;
}

export interface ClaimDocument {
  id: string;
  claim_id: string;
  file_name: string;
  document_type: string;
  storage_path: string;
  file_size?: number;
  mime_type?: string;
  extracted_text?: string;
  uploaded_at: string;
  public_url?: string;
}

export interface Payer {
  id: string;
  name: string;
  display_name: string;
  created_at?: string;
}

export interface PayerRule {
  id: string;
  payer_id: string;
  cdt_code: string;
  requirement_type: 'PROCEDURE' | 'TOOTH' | 'CLINICAL_NARRATIVE' | 'CLINICAL_JUSTIFICATION' | 'XRAY' | 'TREATMENT_PLAN';
  is_required: boolean;
  effective_date?: string;
}

export interface CheckItem {
  type: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  title: string;
  message: string;
}

export interface Finding {
  id: string;
  claim_id: string;
  audit_result_id?: string;
  severity: Severity;
  finding_type: string;
  title: string;
  explanation: string;
  evidence: string;
  confidence: number;
  recommended_action: string;
  status: FindingStatus;
  created_at: string;
}

export interface EvidenceMapNode {
  category: string;
  label: string;
  tooth: string;
  matched: boolean;
}

export interface AuditResult {
  id?: string;
  audit_id?: string;
  claim_id: string;
  readiness_score: number;
  status: ClaimStatus;
  summary: {
    total_checks: number;
    passed: number;
    warnings: number;
    failed: number;
  };
  checks: CheckItem[];
  findings: Finding[];
  evidence_map?: EvidenceMapNode[];
  risk_breakdown?: {
    documentation: number;
    evidence: number;
    consistency: number;
    clinicalSupport: number;
  };
  created_at?: string;
}

export interface Claim {
  id: string;
  claim_number: string;
  patient_id: string;
  patient_name: string;
  date_of_birth: string;
  payer_id: string;
  date_of_service: string;
  claim_amount: number;
  clinical_narrative: string;
  readiness_score: number;
  status: ClaimStatus;
  created_at: string;
  updated_at: string;
  procedures?: Procedure[];
  documents?: ClaimDocument[];
  latest_audit?: AuditResult | null;
  findings?: Finding[];
  audit_results?: AuditResult[];
}
