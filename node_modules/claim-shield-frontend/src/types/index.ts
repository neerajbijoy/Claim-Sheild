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
  file?: File;
}

export interface Payer {
  id: string;
  name: string;
  display_name: string;
  active?: boolean;
  created_at?: string;
}

export interface PayerRule {
  id: string;
  payer_id: string;
  cdt_code: string;
  requirement_type: 'PROCEDURE' | 'TOOTH' | 'CLINICAL_NARRATIVE' | 'CLINICAL_JUSTIFICATION' | 'XRAY' | 'TREATMENT_PLAN' | 'PERIODONTAL_CHART';
  is_required?: boolean;
  required?: boolean;
  requirement_description?: string;
  effective_date?: string;
  effective_from?: string;
  effective_to?: string;
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
  procedure_id?: string;
  cdt_code?: string;
  tooth_number?: string;
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

export interface HistoricalSignal {
  similar_claims: number;
  documentation_related_rejections: number;
  rejection_rate_pct: number;
  historical_signal: 'HIGH' | 'MEDIUM' | 'LOW';
  top_rejection_factors: string[];
  methodology?: string;
}

export interface ProcedureAudit {
  procedure_id?: string;
  cdt_code: string;
  tooth_number?: string;
  description?: string;
  amount?: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  risk_score: number;
  explanation: string;
  risk_factors: string[];
  historical_signal?: HistoricalSignal;
  checks: CheckItem[];
  findings: Finding[];
  evidence_map?: EvidenceMapNode[];
}

export interface CandidateCdt {
  cdt_code: string;
  procedure_name: string;
  code?: string;
  description?: string;
  category?: string;
  confidence: number;
  rationale: string;
  matched_concepts?: string[];
}

export interface ExtractedEvidence {
  tooth?: string;
  teeth: string[];
  conditions: string[];
  findings?: string[];
  structural_findings?: string[];
  treatment_context?: string[];
  anatomical_sites?: string[];
  severity?: string[];
  clinical_justification_detected: boolean;
  confidence: number;
  suggested_codes?: CandidateCdt[];
  raw_entities?: Array<{
    text: string;
    type: string;
    confidence: number;
    start: number;
    end: number;
  }>;
  source?: string;
  model?: string;
}

export interface AuditResult {
  id?: string;
  audit_id?: string;
  claim_id: string;
  readiness_score: number;
  status: ClaimStatus;
  risk_priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  summary: {
    total_procedures?: number;
    high_risk_procedures?: number;
    medium_risk_procedures?: number;
    low_risk_procedures?: number;
    total_checks: number;
    passed: number;
    warnings: number;
    failed: number;
  };
  procedure_audits?: ProcedureAudit[];
  candidate_cdt_suggestions?: CandidateCdt[];
  checks: CheckItem[];
  findings: Finding[];
  evidence_map?: EvidenceMapNode[];
  extracted_evidence?: ExtractedEvidence;
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

export interface CdtEvidenceRequirement {
  type: string;
  description: string;
  mandatory: boolean;
}

export interface CdtKnowledgeEntry {
  cdt_code: string;
  procedure_name: string;
  category: string;
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
  typical_fee_range?: string;
  description: string;
  clinical_concepts: string[];
  synonyms: string[];
  required_evidence: CdtEvidenceRequirement[];
  commonly_associated_documentation: string[];
  payer_specific_requirements?: Record<string, any>;
  risk_factors: string[];
  audit_tips?: string[];
}

