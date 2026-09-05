const db = require('../config/supabase');

async function createClaim(req, res, next) {
  try {
    const {
      claim_number,
      claimNumber,
      patient_id,
      patientId,
      patient_name,
      patientName,
      date_of_birth,
      dateOfBirth,
      payer_id,
      payerId,
      date_of_service,
      dateOfService,
      claim_amount,
      claimAmount,
      amount,
      clinical_narrative,
      clinicalNarrative,
      procedures
    } = req.body;

    const resolvedPatientName = patient_name || patientName;
    const resolvedPayerId = payer_id || payerId;

    if (!resolvedPatientName || !resolvedPayerId) {
      return res.status(400).json({
        success: false,
        message: 'patient_name and payer_id are required fields.'
      });
    }

    const claimPayload = {
      claim_number: claim_number || claimNumber,
      patient_id: patient_id || patientId,
      patient_name: resolvedPatientName,
      date_of_birth: date_of_birth || dateOfBirth,
      payer_id: resolvedPayerId,
      date_of_service: date_of_service || dateOfService,
      claim_amount: claim_amount !== undefined ? claim_amount : (claimAmount !== undefined ? claimAmount : amount),
      clinical_narrative: clinical_narrative || clinicalNarrative
    };

    const resolvedProcedures = procedures && procedures.length > 0
      ? procedures
      : [{
          cdt_code: 'D2740',
          tooth_number: '14',
          amount: parseFloat(claimPayload.claim_amount) || 1250,
          description: 'Crown - Porcelain/Ceramic Substrate'
        }];

    const created = await db.createClaim(claimPayload, resolvedProcedures);

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
    const { status, payer_id, payerId, search } = req.query;
    const claims = await db.getClaims({
      status,
      payer_id: payer_id || payerId,
      search
    });
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
    const existing = await db.getClaimById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: `Claim ${id} not found` });
    }

    const {
      clinical_narrative,
      clinicalNarrative,
      tooth_number,
      toothNumber,
      procedures,
      status,
      patient_name,
      patientName,
      claim_amount,
      claimAmount,
      amount
    } = req.body;

    const updateFields = {};
    if (clinical_narrative !== undefined) updateFields.clinical_narrative = clinical_narrative;
    if (clinicalNarrative !== undefined) updateFields.clinical_narrative = clinicalNarrative;
    if (status !== undefined) updateFields.status = status;
    if (patient_name !== undefined) updateFields.patient_name = patient_name;
    if (patientName !== undefined) updateFields.patient_name = patientName;
    if (claim_amount !== undefined) updateFields.claim_amount = parseFloat(claim_amount);
    if (claimAmount !== undefined) updateFields.claim_amount = parseFloat(claimAmount);
    if (amount !== undefined) updateFields.claim_amount = parseFloat(amount);

    const updated = await db.updateClaim(id, updateFields);

    // Update procedure tooth number if specified
    const targetTooth = tooth_number || toothNumber;
    if (targetTooth && existing.procedures && existing.procedures.length > 0) {
      existing.procedures[0].tooth_number = targetTooth.toString();
    }

    res.json({
      success: true,
      message: 'Claim updated successfully',
      data: {
        ...(updated || existing),
        procedures: existing.procedures
      }
    });
  } catch (err) {
    next(err);
  }
}

async function deleteClaim(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await db.getClaimById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: `Claim ${id} not found` });
    }

    const deleted = await db.deleteClaim(id);
    res.json({
      success: true,
      message: 'Claim deleted successfully',
      data: {
        id: existing.id,
        claim_number: existing.claim_number
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createClaim,
  getClaims,
  getClaimById,
  updateClaim,
  deleteClaim
};
