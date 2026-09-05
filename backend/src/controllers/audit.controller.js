const db = require('../config/supabase');
const { runClaimAudit } = require('../services/auditEngine');

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

module.exports = {
  triggerAudit,
  getLatestAudit,
  getClaimFindings,
  triggerReAudit
};
