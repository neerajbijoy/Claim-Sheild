const db = require('../config/supabase');
const { runClaimAudit } = require('../services/auditEngine');
const { extractClinicalEvidence } = require('../services/aiService');

async function triggerAudit(req, res, next) {
  try {
    const { id } = req.params;
    const auditResult = await runClaimAudit(id);

    res.json({
      success: true,
      message: 'Claim audit executed successfully',
      data: auditResult
    });
  } catch (err) {
    next(err);
  }
}

async function getLatestAudit(req, res, next) {
  try {
    const { id } = req.params;
    const claim = await db.getClaimById(id);
    if (!claim) {
      return res.status(404).json({ success: false, message: `Claim ${id} not found` });
    }

    if (!claim.latest_audit) {
      // If no prior audit, run audit automatically
      const freshAudit = await runClaimAudit(id);
      return res.json({ success: true, data: freshAudit });
    }

    res.json({ success: true, data: claim.latest_audit });
  } catch (err) {
    next(err);
  }
}

async function getClaimFindings(req, res, next) {
  try {
    const { id } = req.params;
    const claim = await db.getClaimById(id);
    if (!claim) {
      return res.status(404).json({ success: false, message: `Claim ${id} not found` });
    }

    res.json({ success: true, count: (claim.findings || []).length, data: claim.findings || [] });
  } catch (err) {
    next(err);
  }
}

async function triggerReAudit(req, res, next) {
  try {
    const { id } = req.params;
    const previousClaim = await db.getClaimById(id);
    const previousScore = previousClaim?.readiness_score || 0;
    const previousFindingsCount = (previousClaim?.findings || []).filter(f => f.status === 'OPEN').length;

    // Run new audit
    const newAuditResult = await runClaimAudit(id);

    const newScore = newAuditResult.readiness_score;
    const newFindingsCount = (newAuditResult.findings || []).filter(f => f.status === 'OPEN').length;
    const resolvedIssues = Math.max(0, previousFindingsCount - newFindingsCount);

    res.json({
      success: true,
      message: 'Re-audit completed',
      progression: {
        previous_score: previousScore,
        new_score: newScore,
        score_diff: newScore - previousScore,
        resolved_issues: resolvedIssues
      },
      data: newAuditResult
    });
  } catch (err) {
    next(err);
  }
}

async function extractClinical(req, res, next) {
  try {
    const { narrativeText = '', narrative = '', documents = [] } = req.body;
    const textToAnalyze = narrativeText || narrative || '';
    const evidence = await extractClinicalEvidence(textToAnalyze, documents);
    res.json({
      success: true,
      data: evidence
    });
  } catch (err) {
    next(err);
  }
}

async function getClaimProcedures(req, res, next) {
  try {
    const { id } = req.params;
    const claim = await db.getClaimById(id);
    if (!claim) {
      return res.status(404).json({ success: false, message: `Claim ${id} not found` });
    }

    const audit = claim.latest_audit || await runClaimAudit(id);
    res.json({
      success: true,
      count: (audit.procedure_audits || []).length,
      data: audit.procedure_audits || claim.procedures || []
    });
  } catch (err) {
    next(err);
  }
}

async function getClaimClinicalEvidence(req, res, next) {
  try {
    const { id } = req.params;
    const claim = await db.getClaimById(id);
    if (!claim) {
      return res.status(404).json({ success: false, message: `Claim ${id} not found` });
    }

    const evidence = await extractClinicalEvidence(claim.clinical_narrative, claim.documents || []);
    res.json({
      success: true,
      claim_id: claim.id,
      claim_number: claim.claim_number,
      data: evidence
    });
  } catch (err) {
    next(err);
  }
}

async function getClaimRiskPriority(req, res, next) {
  try {
    const { id } = req.params;
    const claim = await db.getClaimById(id);
    if (!claim) {
      return res.status(404).json({ success: false, message: `Claim ${id} not found` });
    }

    const audit = claim.latest_audit || await runClaimAudit(id);
    res.json({
      success: true,
      claim_id: claim.id,
      overall_priority: audit.risk_priority || 'LOW',
      readiness_score: audit.readiness_score,
      status: audit.status,
      procedures: (audit.procedure_audits || []).map(p => ({
        procedure_id: p.procedure_id,
        cdt_code: p.cdt_code,
        tooth_number: p.tooth_number,
        priority: p.priority,
        risk_score: p.risk_score,
        explanation: p.explanation,
        risk_factors: p.risk_factors,
        historical_signal: p.historical_signal
      }))
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  triggerAudit,
  getLatestAudit,
  getClaimFindings,
  triggerReAudit,
  extractClinical,
  getClaimProcedures,
  getClaimClinicalEvidence,
  getClaimRiskPriority
};
