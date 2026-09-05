const db = require('../config/supabase');

async function createClaim(req, res, next) {
  try {
    const {
      claim_number,
      patient_id,
      patient_name,
      date_of_birth,
      payer_id,
      date_of_service,
      claim_amount,
      clinical_narrative,
      procedures
    } = req.body;

    if (!patient_name || !payer_id) {
      return res.status(400).json({ success: false, message: 'patient_name and payer_id are required' });
    }

    const created = await db.createClaim(
      { claim_number, patient_id, patient_name, date_of_birth, payer_id, date_of_service, claim_amount, clinical_narrative },
      procedures || [{ cdt_code: 'D2740', tooth_number: '14', amount: claim_amount || 1250 }]
    );

    res.status(201).json({
      success: true,
      message: 'Claim created successfully',
      data: created
    });
  } catch (err) {
    next(err);
  }
}

async function getClaims(req, res, next) {
  try {
    const { status, payer_id, search } = req.query;
    const claims = await db.getClaims({ status, payer_id, search });
    res.json({ success: true, count: claims.length, data: claims });
  } catch (err) {
    next(err);
  }
}

async function getClaimById(req, res, next) {
  try {
    const { id } = req.params;
    const claim = await db.getClaimById(id);
    if (!claim) {
      return res.status(404).json({ success: false, message: `Claim ${id} not found` });
    }
    res.json({ success: true, data: claim });
  } catch (err) {
    next(err);
  }
}

async function updateClaim(req, res, next) {
  try {
    const { id } = req.params;
    const { clinical_narrative, tooth_number, procedures, status } = req.body;

    const claim = await db.getClaimById(id);
    if (!claim) {
      return res.status(404).json({ success: false, message: `Claim ${id} not found` });
    }

    const updateFields = {};
    if (clinical_narrative !== undefined) updateFields.clinical_narrative = clinical_narrative;
    if (status !== undefined) updateFields.status = status;

    const updated = await db.updateClaim(id, updateFields);

    // Update procedure tooth number if provided
    if (tooth_number && claim.procedures && claim.procedures.length > 0) {
      claim.procedures[0].tooth_number = tooth_number;
    }

    res.json({
      success: true,
      message: 'Claim updated successfully',
      data: { ...updated, procedures: claim.procedures }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createClaim,
  getClaims,
  getClaimById,
  updateClaim
};
