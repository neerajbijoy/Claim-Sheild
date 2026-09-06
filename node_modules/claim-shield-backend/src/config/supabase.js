const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const path = require('path');
const { mockStore, generateId } = require('../services/mockStore');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

function isUuid(str) {
  return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function normalizeDocType(type) {
  if (!type) return 'OTHER';
  const u = type.toString().toUpperCase();
  if (u.includes('X-RAY') || u.includes('XRAY') || u.includes('RADIOGRAPH')) return 'XRAY';
  if (u.includes('TREATMENT')) return 'TREATMENT_PLAN';
  if (u.includes('PHOTO')) return 'INTRAORAL_PHOTO';
  if (u.includes('CLINICAL') || u.includes('NOTE')) return 'CLINICAL_NOTE';
  return 'OTHER';
}

let supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (supabaseUrl && !supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

let supabase = null;
let isConfigured = false;

if (
  supabaseUrl &&
  supabaseServiceKey &&
  !supabaseUrl.includes('your-supabase-project') &&
  !supabaseServiceKey.includes('your-supabase-service-role-key')
) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    isConfigured = true;
    console.log('[Supabase] Client initialized successfully with Service Role key.');
  } catch (err) {
    console.warn('[Supabase] Initialization failed, falling back to local database store:', err.message);
  }
} else {
  console.log('[Supabase] Credentials missing or default template detected. Operating in resilient local storage mode.');
}

// Unified Database Access Interface
const db = {
  isSupabaseConfigured: () => isConfigured,

  // Payers CRUD
  getPayers: async () => {
    if (isConfigured) {
      const { data, error } = await supabase.from('payers').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) return data;
      if (error) console.warn('[Supabase DB] getPayers error:', error.message);
    }
    return mockStore.payers;
  },

  createPayer: async (payerData) => {
    const payerUuid = isUuid(payerData.id) ? payerData.id : crypto.randomUUID();
    const newPayer = {
      id: payerUuid,
      name: payerData.name || 'custom_payer',
      display_name: payerData.display_name || payerData.displayName || 'Custom Dental Plan',
      active: payerData.active !== undefined ? payerData.active : true,
      created_at: new Date().toISOString()
    };
    if (isConfigured) {
      const { data, error } = await supabase.from('payers').insert(newPayer).select().maybeSingle();
      if (!error && data) return data;
      if (error) console.error('[Supabase DB] createPayer error:', error.message);
    }
    mockStore.payers.push(newPayer);
    return newPayer;
  },

  updatePayer: async (id, updateFields) => {
    const cleanFields = {};
    if (updateFields.name !== undefined) cleanFields.name = updateFields.name;
    if (updateFields.display_name !== undefined) cleanFields.display_name = updateFields.display_name;
    if (updateFields.displayName !== undefined) cleanFields.display_name = updateFields.displayName;
    if (updateFields.active !== undefined) cleanFields.active = updateFields.active;

    if (isConfigured) {
      const { data, error } = await supabase.from('payers').update(cleanFields).eq('id', id).select().maybeSingle();
      if (!error && data) return data;
      if (error) console.error('[Supabase DB] updatePayer error:', error.message);
    }
    const idx = mockStore.payers.findIndex(p => p.id === id);
    if (idx !== -1) {
      mockStore.payers[idx] = { ...mockStore.payers[idx], ...cleanFields };
      return mockStore.payers[idx];
    }
    return null;
  },

  deletePayer: async (id) => {
    if (isConfigured) {
      await supabase.from('payer_rules').delete().eq('payer_id', id);
      const { data, error } = await supabase.from('payers').delete().eq('id', id).select().maybeSingle();
      if (!error && data) return data;
      if (error) console.error('[Supabase DB] deletePayer error:', error.message);
    }
    const idx = mockStore.payers.findIndex(p => p.id === id);
    if (idx !== -1) {
      return mockStore.payers.splice(idx, 1)[0];
    }
    return null;
  },

  // Payer Rules CRUD
  getPayerRules: async (payerId) => {
    if (isConfigured) {
      let query = supabase.from('payer_rules').select('*');
      if (isUuid(payerId)) {
        query = query.eq('payer_id', payerId);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map(r => ({
          ...r,
          is_required: r.required !== undefined ? r.required : !!r.is_required
        }));
      }
      if (error) console.warn('[Supabase DB] getPayerRules error:', error.message);
    }
    return mockStore.payerRules.filter(r => r.payer_id === payerId || payerId === 'p-demo-delta');
  },

  createPayerRule: async (ruleData) => {
    const ruleUuid = isUuid(ruleData.id) ? ruleData.id : crypto.randomUUID();
    const newRule = {
      id: ruleUuid,
      payer_id: ruleData.payer_id || ruleData.payerId,
      cdt_code: (ruleData.cdt_code || ruleData.cdtCode || 'D2740').toUpperCase(),
      requirement_type: (ruleData.requirement_type || ruleData.requirementType || 'PROCEDURE').toUpperCase(),
      requirement_description: ruleData.requirement_description || ruleData.requirementDescription || '',
      required: ruleData.required !== undefined ? ruleData.required : (ruleData.is_required !== undefined ? ruleData.is_required : true),
      effective_from: ruleData.effective_from || ruleData.effectiveDate || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };
    if (isConfigured) {
      const { data, error } = await supabase.from('payer_rules').insert(newRule).select().maybeSingle();
      if (!error && data) return { ...data, is_required: data.required };
      if (error) console.error('[Supabase DB] createPayerRule error:', error.message);
    }
    mockStore.payerRules.push({ ...newRule, is_required: newRule.required });
    return { ...newRule, is_required: newRule.required };
  },

  deletePayerRule: async (ruleId) => {
    if (isConfigured) {
      const { data, error } = await supabase.from('payer_rules').delete().eq('id', ruleId).select().maybeSingle();
      if (!error && data) return data;
      if (error) console.error('[Supabase DB] deletePayerRule error:', error.message);
    }
    const idx = mockStore.payerRules.findIndex(r => r.id === ruleId);
    if (idx !== -1) {
      return mockStore.payerRules.splice(idx, 1)[0];
    }
    return null;
  },

  // Claims CRUD
  getClaims: async (filters = {}) => {
    if (isConfigured) {
      let query = supabase
        .from('claims')
        .select('*, procedures(*), documents(*), audit_results(*, findings(*))')
        .order('created_at', { ascending: false });

      if (filters.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status);
      }
      if (filters.payer_id && isUuid(filters.payer_id)) {
        query = query.eq('payer_id', filters.payer_id);
      }

      const { data, error } = await query;
      if (!error && data) {
        let list = data.map(c => {
          const sortedAudits = (c.audit_results || []).sort((a, b) => new Date(b.audited_at || b.created_at) - new Date(a.audited_at || a.created_at));
          const latestAudit = sortedAudits[0] || null;
          return {
            ...c,
            procedures: c.procedures || [],
            documents: c.documents || [],
            audit_results: sortedAudits,
            latest_audit: latestAudit,
            findings: latestAudit?.findings || []
          };
        });

        if (filters.search) {
          const s = filters.search.toLowerCase();
          list = list.filter(c =>
            (c.claim_number && c.claim_number.toLowerCase().includes(s)) ||
            (c.patient_name && c.patient_name.toLowerCase().includes(s)) ||
            (c.patient_id && c.patient_id.toLowerCase().includes(s))
          );
        }
        return list;
      }
      if (error) console.warn('[Supabase DB] getClaims error:', error.message);
    }

    let claims = [...mockStore.claims];
    if (filters.status && filters.status !== 'ALL') {
      claims = claims.filter(c => c.status === filters.status);
    }
    if (filters.payer_id) {
      claims = claims.filter(c => c.payer_id === filters.payer_id);
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      claims = claims.filter(c =>
        c.claim_number.toLowerCase().includes(s) ||
        c.patient_name.toLowerCase().includes(s) ||
        c.patient_id.toLowerCase().includes(s)
      );
    }
    return claims.map(claim => ({
      ...claim,
      procedures: mockStore.procedures.filter(p => p.claim_id === claim.id),
      documents: mockStore.documents.filter(d => d.claim_id === claim.id),
      latest_audit: mockStore.auditResults.filter(a => a.claim_id === claim.id).pop() || null,
      findings: mockStore.findings.filter(f => f.claim_id === claim.id)
    }));
  },

  getClaimById: async (id) => {
    if (isConfigured) {
      let query = supabase
        .from('claims')
        .select('*, procedures(*), documents(*), audit_results(*, findings(*))');

      if (isUuid(id)) {
        query = query.eq('id', id);
      } else {
        query = query.eq('claim_number', id);
      }

      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        const sortedAudits = (data.audit_results || []).sort((a, b) => new Date(b.audited_at || b.created_at) - new Date(a.audited_at || a.created_at));
        const latestAudit = sortedAudits[0] || null;
        return {
          ...data,
          procedures: data.procedures || [],
          documents: data.documents || [],
          audit_results: sortedAudits,
          latest_audit: latestAudit,
          findings: latestAudit?.findings || []
        };
      }
      if (error) console.warn('[Supabase DB] getClaimById error:', error.message);
    }

    const claim = mockStore.claims.find(c => c.id === id || c.claim_number === id);
    if (!claim) return null;

    const procedures = mockStore.procedures.filter(p => p.claim_id === claim.id);
    const documents = mockStore.documents.filter(d => d.claim_id === claim.id);
    const audit_results = mockStore.auditResults.filter(a => a.claim_id === claim.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const findings = mockStore.findings.filter(f => f.claim_id === claim.id);

    return {
      ...claim,
      procedures,
      documents,
      audit_results,
      latest_audit: audit_results[0] || null,
      findings
    };
  },

  createClaim: async (claimData, procedureData) => {
    const claimUuid = isUuid(claimData.id) ? claimData.id : crypto.randomUUID();
    const claimNumber = claimData.claim_number || claimData.claimNumber || `CLM-${Math.floor(1000 + Math.random() * 9000)}`;

    // Resolve valid UUID for payer_id
    let payerId = claimData.payer_id || claimData.payerId;
    if (!isUuid(payerId)) {
      if (isConfigured) {
        const { data: pData } = await supabase.from('payers').select('id').limit(1);
        if (pData && pData.length > 0) payerId = pData[0].id;
      }
      if (!isUuid(payerId)) {
        payerId = '5bcec0c7-9779-4ecb-b08d-3db1253f0865';
      }
    }

    const patientId = claimData.patient_id || claimData.patientId || `PT-${Math.floor(10000 + Math.random() * 90000)}`;
    const patientName = claimData.patient_name || claimData.patientName || 'Anonymous Patient';
    const dateOfBirth = claimData.date_of_birth || claimData.dateOfBirth || '1985-01-01';
    const dateOfService = claimData.date_of_service || claimData.dateOfService || new Date().toISOString().split('T')[0];
    const claimAmount = parseFloat(claimData.claim_amount !== undefined ? claimData.claim_amount : (claimData.amount !== undefined ? claimData.amount : 0)) || 0;
    const clinicalNarrative = claimData.clinical_narrative !== undefined ? claimData.clinical_narrative : (claimData.clinicalNarrative || '');

    const newClaim = {
      id: claimUuid,
      claim_number: claimNumber,
      patient_id: patientId,
      patient_name: patientName,
      date_of_birth: dateOfBirth,
      payer_id: payerId,
      date_of_service: dateOfService,
      claim_amount: claimAmount,
      clinical_narrative: clinicalNarrative,
      readiness_score: claimData.readiness_score || 0,
      status: claimData.status || 'DRAFT',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const newProcedures = (procedureData || []).map(p => ({
      id: crypto.randomUUID(),
      claim_id: claimUuid,
      cdt_code: (p.cdt_code || p.cdtCode || 'D2740').toUpperCase(),
      tooth_number: (p.tooth_number || p.toothNumber || '14').toString(),
      amount: parseFloat(p.amount) || newClaim.claim_amount,
      description: p.description || 'Crown - Porcelain/Ceramic Substrate',
      created_at: new Date().toISOString()
    }));

    if (isConfigured) {
      try {
        const { error: cErr } = await supabase.from('claims').insert(newClaim);
        if (cErr) {
          console.error('[Supabase DB] Error creating claim:', cErr.message);
        } else {
          // Omit 'description' as the procedures column does not exist in live Supabase schema
          const dbProcedures = newProcedures.map(({ description, ...rest }) => rest);
          const { error: pErr } = await supabase.from('procedures').insert(dbProcedures);
          if (pErr) console.error('[Supabase DB] Error creating procedures:', pErr.message);

          return { ...newClaim, procedures: newProcedures };
        }
      } catch (err) {
        console.error('[Supabase DB] Exception creating claim:', err.message);
      }
    }

    mockStore.claims.unshift(newClaim);
    newProcedures.forEach(p => mockStore.procedures.push(p));
    return { ...newClaim, procedures: newProcedures };
  },

  updateClaim: async (id, updateFields) => {
    const updatedAt = new Date().toISOString();
    const cleanFields = {};

    if (updateFields.patient_name !== undefined) cleanFields.patient_name = updateFields.patient_name;
    if (updateFields.patientName !== undefined) cleanFields.patient_name = updateFields.patientName;
    if (updateFields.patient_id !== undefined) cleanFields.patient_id = updateFields.patient_id;
    if (updateFields.patientId !== undefined) cleanFields.patient_id = updateFields.patientId;
    if (updateFields.claim_amount !== undefined) cleanFields.claim_amount = parseFloat(updateFields.claim_amount);
    if (updateFields.amount !== undefined) cleanFields.claim_amount = parseFloat(updateFields.amount);
    if (updateFields.clinical_narrative !== undefined) cleanFields.clinical_narrative = updateFields.clinical_narrative;
    if (updateFields.clinicalNarrative !== undefined) cleanFields.clinical_narrative = updateFields.clinicalNarrative;
    if (updateFields.status !== undefined) cleanFields.status = updateFields.status;
    if (updateFields.readiness_score !== undefined) cleanFields.readiness_score = updateFields.readiness_score;
    if (updateFields.readinessScore !== undefined) cleanFields.readiness_score = updateFields.readinessScore;
    if (updateFields.payer_id !== undefined && isUuid(updateFields.payer_id)) cleanFields.payer_id = updateFields.payer_id;
    if (updateFields.payerId !== undefined && isUuid(updateFields.payerId)) cleanFields.payer_id = updateFields.payerId;

    if (isConfigured) {
      let query = supabase.from('claims').update({ ...cleanFields, updated_at: updatedAt });
      if (isUuid(id)) {
        query = query.eq('id', id);
      } else {
        query = query.eq('claim_number', id);
      }
      const { data, error } = await query.select().maybeSingle();
      if (!error && data) return data;
      if (error) console.error('[Supabase DB] Error updating claim:', error.message);
    }

    const idx = mockStore.claims.findIndex(c => c.id === id || c.claim_number === id);
    if (idx !== -1) {
      mockStore.claims[idx] = { ...mockStore.claims[idx], ...cleanFields, updated_at: updatedAt };
      return mockStore.claims[idx];
    }
    return null;
  },

  deleteClaim: async (id) => {
    let deletedClaim = null;
    if (isConfigured) {
      let findQuery = supabase.from('claims').select('id, claim_number');
      if (isUuid(id)) {
        findQuery = findQuery.eq('id', id);
      } else {
        findQuery = findQuery.eq('claim_number', id);
      }
      const { data: claimRecord } = await findQuery.maybeSingle();
      if (claimRecord) {
        const claimUuid = claimRecord.id;
        // Delete child findings
        const { data: audits } = await supabase.from('audit_results').select('id').eq('claim_id', claimUuid);
        if (audits && audits.length > 0) {
          const auditIds = audits.map(a => a.id);
          await supabase.from('findings').delete().in('audit_id', auditIds);
        }
        await supabase.from('audit_results').delete().eq('claim_id', claimUuid);
        await supabase.from('procedures').delete().eq('claim_id', claimUuid);
        await supabase.from('documents').delete().eq('claim_id', claimUuid);
        const { data, error } = await supabase.from('claims').delete().eq('id', claimUuid).select().maybeSingle();
        if (!error && data) deletedClaim = data;
        if (error) console.error('[Supabase DB] Error deleting claim:', error.message);
      }
    }

    const idx = mockStore.claims.findIndex(c => c.id === id || c.claim_number === id);
    if (idx !== -1) {
      const removed = mockStore.claims.splice(idx, 1)[0];
      mockStore.procedures = mockStore.procedures.filter(p => p.claim_id !== id && p.claim_id !== removed.id);
      mockStore.documents = mockStore.documents.filter(d => d.claim_id !== id && d.claim_id !== removed.id);
      mockStore.auditResults = mockStore.auditResults.filter(a => a.claim_id !== id && a.claim_id !== removed.id);
      mockStore.findings = mockStore.findings.filter(f => f.claim_id !== id && f.claim_id !== removed.id);
      return deletedClaim || removed;
    }
    return deletedClaim;
  },

  // Documents CRUD
  saveDocumentMetadata: async (docData) => {
    const docUuid = isUuid(docData.id) ? docData.id : crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const dbDoc = {
      id: docUuid,
      claim_id: docData.claim_id,
      document_type: normalizeDocType(docData.document_type || docData.documentType),
      file_name: docData.file_name || docData.fileName || 'document.pdf',
      storage_path: docData.storage_path || docData.storagePath,
      mime_type: docData.mime_type || docData.mimeType || 'application/octet-stream',
      created_at: nowIso
    };

    const dbDocWithText = {
      ...dbDoc,
      extracted_text: docData.extracted_text || docData.extractedText || null,
      extraction_status: docData.extraction_status || docData.extractionStatus || 'SUCCESS'
    };

    if (isConfigured) {
      let { error } = await supabase.from('documents').insert(dbDocWithText);
      if (error && (error.message.includes('extracted_text') || error.code === 'PGRST204')) {
        // Fallback: Supabase table missing extracted_text column, insert standard fields only
        const { error: fallbackError } = await supabase.from('documents').insert(dbDoc);
        error = fallbackError;
      }
      if (error) {
        console.error('[Supabase DB] Error saving document metadata:', error.message);
      } else {
        const resultDoc = {
          ...dbDocWithText,
          file_size: docData.file_size || docData.fileSize || 0
        };
        const mIdx = mockStore.documents.findIndex(d => d.id === docUuid);
        if (mIdx !== -1) mockStore.documents[mIdx] = resultDoc;
        else mockStore.documents.push(resultDoc);
        return resultDoc;
      }
    }

    const fallbackDoc = {
      ...dbDocWithText,
      file_size: docData.file_size || docData.fileSize || 0,
      uploaded_at: nowIso
    };
    mockStore.documents.push(fallbackDoc);
    return fallbackDoc;
  },

  getDocumentsByClaim: async (claimId) => {
    const localDocs = mockStore.documents.filter(d => d.claim_id === claimId);
    if (isConfigured) {
      let claimUuid = claimId;
      if (!isUuid(claimId)) {
        const { data: claim } = await supabase.from('claims').select('id').eq('claim_number', claimId).maybeSingle();
        if (claim) claimUuid = claim.id;
      }
      let query = supabase.from('documents').select('*').eq('claim_id', claimUuid);
      const { data, error } = await query;
      if (!error && data) {
        return data.map(row => {
          const local = localDocs.find(d => d.id === row.id);
          return {
            ...row,
            extracted_text: (local && local.extracted_text) ? local.extracted_text : (row.extracted_text || null),
            extraction_status: (local && local.extraction_status) ? local.extraction_status : (row.extraction_status || 'SUCCESS')
          };
        });
      }
    }
    return localDocs;
  },

  deleteDocument: async (docId) => {
    if (isConfigured) {
      const { data: docRecord } = await supabase.from('documents').select('*').eq('id', docId).maybeSingle();
      if (docRecord) {
        if (docRecord.storage_path) {
          try {
            await supabase.storage.from('claim-documents').remove([docRecord.storage_path]);
          } catch (err) {
            console.warn('[Supabase Storage] Delete error:', err.message);
          }
        }
        const { data, error } = await supabase.from('documents').delete().eq('id', docId).select().maybeSingle();
        if (!error && data) return data;
      }
    }
    const idx = mockStore.documents.findIndex(d => d.id === docId);
    if (idx !== -1) {
      return mockStore.documents.splice(idx, 1)[0];
    }
    return null;
  },

  // Storage
  uploadToStorage: async (bucketName, path, fileBuffer, mimeType) => {
    if (isConfigured) {
      const { data, error } = await supabase.storage.from(bucketName).upload(path, fileBuffer, {
        contentType: mimeType,
        upsert: true
      });
      if (!error && data) {
        const { data: pubUrlData } = supabase.storage.from(bucketName).getPublicUrl(path);
        return pubUrlData ? pubUrlData.publicUrl : path;
      }
      console.warn('[Supabase Storage] Upload error, defaulting path:', error?.message);
    }
    return `mock-storage://${bucketName}/${path}`;
  },

  // Audits & Findings
  saveAuditResult: async (auditData, findingsData) => {
    const auditUuid = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const auditRecord = {
      id: auditUuid,
      claim_id: auditData.claim_id,
      readiness_score: auditData.readiness_score,
      status: auditData.status,
      audited_at: nowIso
    };

    const createdFindings = (findingsData || []).map(f => ({
      id: crypto.randomUUID(),
      audit_id: auditUuid,
      procedure_id: isUuid(f.procedure_id) ? f.procedure_id : null,
      severity: f.severity || 'LOW',
      finding_type: f.finding_type || 'GENERAL',
      message: (f.title ? f.title + ': ' : '') + (f.explanation || f.message || ''),
      confidence: f.confidence !== undefined ? f.confidence : 0.9,
      status: 'OPEN',
      created_at: nowIso
    }));

    if (isConfigured) {
      try {
        const { error: aErr } = await supabase.from('audit_results').insert(auditRecord);
        if (aErr) console.error('[Supabase DB] Error saving audit_result:', aErr.message);

        if (createdFindings.length > 0) {
          const { error: fErr } = await supabase.from('findings').insert(createdFindings);
          if (fErr) console.error('[Supabase DB] Error saving findings:', fErr.message);
        }

        const { error: uErr } = await supabase.from('claims').update({
          readiness_score: auditData.readiness_score,
          status: auditData.status,
          updated_at: nowIso
        }).eq('id', auditData.claim_id);
        if (uErr) console.error('[Supabase DB] Error updating claim status:', uErr.message);
      } catch (err) {
        console.error('[Supabase DB] Exception saving audit:', err.message);
      }
    }

    const richAuditRecord = {
      ...auditRecord,
      total_checks: auditData.summary?.total_checks || 0,
      passed_checks: auditData.summary?.passed || 0,
      warning_checks: auditData.summary?.warnings || 0,
      failed_checks: auditData.summary?.failed || 0,
      checks_json: auditData.checks || [],
      created_at: nowIso
    };
    mockStore.auditResults.push(richAuditRecord);
    createdFindings.forEach(f => mockStore.findings.push(f));

    return { auditRecord: richAuditRecord, findings: createdFindings };
  }
};

module.exports = db;
