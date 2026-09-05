const express = require('express');
const router = express.Router();
const claimController = require('../controllers/claim.controller');
const auditController = require('../controllers/audit.controller');

// Claims CRUD Routes
router.post('/', claimController.createClaim);
router.get('/', claimController.getClaims);
router.get('/:id', claimController.getClaimById);
router.put('/:id', claimController.updateClaim);
router.patch('/:id', claimController.updateClaim);
router.delete('/:id', claimController.deleteClaim);

// Procedure Audit Intelligence Routes
router.get('/:id/procedures', auditController.getClaimProcedures);
router.get('/:id/clinical-evidence', auditController.getClaimClinicalEvidence);
router.get('/:id/risk-priority', auditController.getClaimRiskPriority);
router.get('/:id/audit', auditController.getLatestAudit);
router.post('/:id/audit', auditController.triggerAudit);

module.exports = router;
