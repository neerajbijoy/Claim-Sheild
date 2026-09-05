/**
 * Resilient In-Memory Data Store for Claim-Shield
 * Used as fallback or seed provider when Supabase credentials are missing or unreachable.
 */

const crypto = require('crypto');

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(36).substr(2, 9)}`;
}

// Initial Seed Data
const initialPayers = [
  {
    id: 'p-demo-delta',
    name: 'demo_delta',
    display_name: 'Demo Dental Insurance',
    created_at: new Date('2026-01-01').toISOString()
  },
  {
    id: 'p-apex-health',
    name: 'apex_health',
    display_name: 'Apex Health Dental Plan',
    created_at: new Date('2026-01-01').toISOString()
  }
];

const initialPayerRules = [
  {
    id: 'pr-1',
    payer_id: 'p-demo-delta',
    cdt_code: 'D2740',
    requirement_type: 'PROCEDURE',
    is_required: true,
    effective_date: '2026-01-01',
    created_at: new Date('2026-01-01').toISOString()
  },
  {
    id: 'pr-2',
    payer_id: 'p-demo-delta',
    cdt_code: 'D2740',
    requirement_type: 'TOOTH',
    is_required: true,
    effective_date: '2026-01-01',
    created_at: new Date('2026-01-01').toISOString()
  },
  {
    id: 'pr-3',
    payer_id: 'p-demo-delta',
    cdt_code: 'D2740',
    requirement_type: 'CLINICAL_NARRATIVE',
    is_required: true,
    effective_date: '2026-01-01',
    created_at: new Date('2026-01-01').toISOString()
  },
  {
    id: 'pr-4',
    payer_id: 'p-demo-delta',
    cdt_code: 'D2740',
    requirement_type: 'CLINICAL_JUSTIFICATION',
    is_required: true,
    effective_date: '2026-01-01',
    created_at: new Date('2026-01-01').toISOString()
  },
  {
    id: 'pr-5',
    payer_id: 'p-demo-delta',
    cdt_code: 'D2740',
    requirement_type: 'XRAY',
    is_required: true,
    effective_date: '2026-01-01',
    created_at: new Date('2026-01-01').toISOString()
  },
  {
    id: 'pr-6',
    payer_id: 'p-demo-delta',
    cdt_code: 'D2740',
    requirement_type: 'TREATMENT_PLAN',
    is_required: false,
    effective_date: '2026-01-01',
    created_at: new Date('2026-01-01').toISOString()
  }
];

const initialClaims = [
  {
    id: 'CLM-1001',
    claim_number: 'CLM-1001',
    patient_id: 'PT-10284',
    patient_name: 'John Mathew',
    date_of_birth: '1985-04-12',
    payer_id: 'p-demo-delta',
    date_of_service: '2026-08-28',
    claim_amount: 1250,
    clinical_narrative: 'Patient presents with recurrent decay under an existing restoration on tooth #14. Tooth structure is severely compromised and requires full coverage crown restoration.',
    readiness_score: 100,
    status: 'READY',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString()
  },
  {
    id: 'CLM-1002',
    claim_number: 'CLM-1002',
    patient_id: 'PT-10892',
    patient_name: 'Sarah Connor',
    date_of_birth: '1990-11-05',
    payer_id: 'p-demo-delta',
    date_of_service: '2026-09-01',
    claim_amount: 1450,
    clinical_narrative: 'Patient exhibits extensive mesial-occlusal breakdown on tooth #13 with recurrent decay.',
    readiness_score: 68,
    status: 'BLOCKED',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 3).toISOString()
  }
];

const initialProcedures = [
  {
    id: 'proc-1001',
    claim_id: 'CLM-1001',
    cdt_code: 'D2740',
    tooth_number: '14',
    amount: 1250,
    description: 'Crown - Porcelain/Ceramic Substrate',
    created_at: new Date('2026-08-28').toISOString()
  },
  {
    id: 'proc-1002',
    claim_id: 'CLM-1002',
    cdt_code: 'D2740',
    tooth_number: '14',
    amount: 1450,
    description: 'Crown - Porcelain/Ceramic Substrate',
    created_at: new Date('2026-09-01').toISOString()
  }
];

const initialDocuments = [
  {
    id: 'doc-1001-1',
    claim_id: 'CLM-1001',
    file_name: 'Clinical_Notes_Pt10284.pdf',
    document_type: 'Clinical Notes',
    storage_path: 'claim-documents/CLM-1001/Clinical_Notes_Pt10284.pdf',
    file_size: 1250000,
    mime_type: 'application/pdf',
    extracted_text: 'Clinical note for John Mathew (PT-10284). Recurrent decay noted on tooth #14 with loss of cusp support.',
    uploaded_at: new Date('2026-08-28T10:00:00Z').toISOString()
  },
  {
    id: 'doc-1001-2',
    claim_id: 'CLM-1001',
    file_name: 'Bitewing_XRay_14.jpg',
    document_type: 'X-Ray / Radiograph',
    storage_path: 'claim-documents/CLM-1001/Bitewing_XRay_14.jpg',
    file_size: 2400000,
    mime_type: 'image/jpeg',
    extracted_text: 'Pre-op radiograph taken on tooth #14 showing clear radiolucency beneath disto-occlusal margin.',
    uploaded_at: new Date('2026-08-28T10:05:00Z').toISOString()
  },
  {
    id: 'doc-1002-1',
    claim_id: 'CLM-1002',
    file_name: 'Clinical_Note_Pt10892.pdf',
    document_type: 'Clinical Notes',
    storage_path: 'claim-documents/CLM-1002/Clinical_Note_Pt10892.pdf',
    file_size: 1100000,
    mime_type: 'application/pdf',
    extracted_text: 'Clinical examination reveals severe decay on tooth #13.',
    uploaded_at: new Date('2026-09-01T09:00:00Z').toISOString()
  }
];

const initialAuditResults = [];
const initialFindings = [];

class LocalStore {
  constructor() {
    this.payers = [...initialPayers];
    this.payerRules = [...initialPayerRules];
    this.claims = [...initialClaims];
    this.procedures = [...initialProcedures];
    this.documents = [...initialDocuments];
    this.auditResults = [...initialAuditResults];
    this.findings = [...initialFindings];

    // Seed default audit for CLM-1001
    this.seedDefaultAudits();
  }

  seedDefaultAudits() {
    const auditId = 'audit-1001-v1';
    this.auditResults.push({
      id: auditId,
      claim_id: 'CLM-1001',
      readiness_score: 100,
      status: 'READY',
      total_checks: 5,
      passed_checks: 5,
      warning_checks: 0,
      failed_checks: 0,
      checks_json: [
        { type: 'PROCEDURE', status: 'PASSED', title: 'CDT Procedure D2740 Identified', message: 'Procedure code D2740 verified.' },
        { type: 'TOOTH', status: 'PASSED', title: 'Tooth #14 Specified', message: 'Valid tooth location assigned.' },
        { type: 'CLINICAL_NARRATIVE', status: 'PASSED', title: 'Clinical Narrative Present', message: 'Detailed narrative attached.' },
        { type: 'CLINICAL_JUSTIFICATION', status: 'PASSED', title: 'Clinical Indicators Detected', message: 'Recurrent decay & structural compromise identified (Confidence: 94%).' },
        { type: 'XRAY', status: 'PASSED', title: 'Supporting Radiograph Available', message: 'Pre-op X-Ray attached and verified for Tooth #14.' }
      ],
      created_at: new Date(Date.now() - 3600000).toISOString()
    });

    // Seed blocked audit for CLM-1002 (Tooth Mismatch)
    const auditId2 = 'audit-1002-v1';
    this.auditResults.push({
      id: auditId2,
      claim_id: 'CLM-1002',
      readiness_score: 68,
      status: 'BLOCKED',
      total_checks: 5,
      passed_checks: 4,
      warning_checks: 0,
      failed_checks: 1,
      checks_json: [
        { type: 'PROCEDURE', status: 'PASSED', title: 'CDT Procedure D2740 Identified', message: 'Procedure code D2740 verified.' },
        { type: 'TOOTH', status: 'PASSED', title: 'Tooth #14 Specified', message: 'Tooth #14 specified on claim.' },
        { type: 'CLINICAL_NARRATIVE', status: 'PASSED', title: 'Clinical Narrative Present', message: 'Clinical narrative present.' },
        { type: 'CLINICAL_JUSTIFICATION', status: 'PASSED', title: 'Clinical Justification Found', message: 'Decay indicators present.' },
        { type: 'CONSISTENCY', status: 'FAILED', title: 'Tooth Location Inconsistency', message: 'Claim lists Tooth #14 while clinical note references Tooth #13.' }
      ],
      created_at: new Date(Date.now() - 1800000).toISOString()
    });

    this.findings.push({
      id: 'f-1002-1',
      claim_id: 'CLM-1002',
      audit_result_id: auditId2,
      severity: 'HIGH',
      finding_type: 'DOCUMENTATION_MISMATCH',
      title: 'Tooth Number Mismatch Detected',
      explanation: 'The claim specifies tooth #14, while the clinical documentation references tooth #13.',
      evidence: 'Claim Tooth: #14 | Clinical Note: #13',
      confidence: 0.96,
      recommended_action: 'Verify the tooth number in the claim and clinical documentation before submission.',
      status: 'OPEN',
      created_at: new Date(Date.now() - 1800000).toISOString()
    });
  }
}

const mockStore = new LocalStore();
module.exports = { mockStore, generateId };
