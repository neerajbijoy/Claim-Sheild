/**
 * Rule Engine Service
 * Dynamically queries payer rules from database for a specific payer and CDT procedure code.
 */

const db = require('../config/supabase');

async function getPayerRulesForProcedure(payerId, cdtCode) {
  const allRules = await db.getPayerRules(payerId);
  // Filter by CDT code or wildcard '*'
  const matchedRules = allRules.filter(r => r.cdt_code === cdtCode || r.cdt_code === '*');
  return matchedRules;
}

module.exports = {
  getPayerRulesForProcedure
};
