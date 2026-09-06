const db = require('../config/supabase');

// Payers CRUD
async function getPayers(req, res, next) {
  try {
    const payers = await db.getPayers();
    res.json({ success: true, data: payers });
  } catch (err) {
    next(err);
  }
}

async function createPayer(req, res, next) {
  try {
    const { name, display_name, displayName, active } = req.body;
    if (!name && !display_name && !displayName) {
      return res.status(400).json({ success: false, message: 'Payer name is required.' });
    }
    const newPayer = await db.createPayer({
      name: name || (display_name || displayName).toLowerCase().replace(/\s+/g, '_'),
      display_name: display_name || displayName || name,
      active: active !== undefined ? active : true
    });
    res.status(201).json({ success: true, message: 'Payer created successfully', data: newPayer });
  } catch (err) {
    next(err);
  }
}

async function updatePayer(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await db.updatePayer(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: `Payer ${id} not found.` });
    }
    res.json({ success: true, message: 'Payer updated successfully', data: updated });
  } catch (err) {
    next(err);
  }
}

async function deletePayer(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await db.deletePayer(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: `Payer ${id} not found.` });
    }
    res.json({ success: true, message: 'Payer deleted successfully', data: { id } });
  } catch (err) {
    next(err);
  }
}

// Rules CRUD
async function getPayerRules(req, res, next) {
  try {
    const { id } = req.params;
    const rules = await db.getPayerRules(id);
    res.json({
      success: true,
      payer_id: id,
      disclaimer: "Synthetic demonstration rules",
      data: rules
    });
  } catch (err) {
    next(err);
  }
}

async function createPayerRule(req, res, next) {
  try {
    const { id } = req.params;
    const {
      cdt_code,
      cdtCode,
      requirement_type,
      requirementType,
      requirement_description,
      requirementDescription,
      required,
      is_required,
      effective_from,
      effectiveDate
    } = req.body;

    const ruleData = {
      payer_id: id,
      cdt_code: cdt_code || cdtCode || 'D2740',
      requirement_type: requirement_type || requirementType || 'PROCEDURE',
      requirement_description: requirement_description || requirementDescription || '',
      required: required !== undefined ? required : (is_required !== undefined ? is_required : true),
      effective_from: effective_from || effectiveDate || new Date().toISOString().split('T')[0]
    };

    const newRule = await db.createPayerRule(ruleData);
    res.status(201).json({ success: true, message: 'Rule created successfully', data: newRule });
  } catch (err) {
    next(err);
  }
}

async function deletePayerRule(req, res, next) {
  try {
    const { ruleId } = req.params;
    const deleted = await db.deletePayerRule(ruleId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: `Rule ${ruleId} not found.` });
    }
    res.json({ success: true, message: 'Rule deleted successfully', data: { id: ruleId } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPayers,
  createPayer,
  updatePayer,
  deletePayer,
  getPayerRules,
  createPayerRule,
  deletePayerRule
};
