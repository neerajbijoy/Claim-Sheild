const db = require('../config/supabase');

async function getPayers(req, res, next) {
  try {
    const payers = await db.getPayers();
    res.json({ success: true, data: payers });
  } catch (err) {
    next(err);
  }
}

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

module.exports = {
  getPayers,
  getPayerRules
};
