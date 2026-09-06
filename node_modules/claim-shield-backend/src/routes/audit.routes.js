const express = require('express');
const router = express.Router({ mergeParams: true });
const auditController = require('../controllers/audit.controller');

router.post('/', auditController.triggerAudit);
router.get('/', auditController.getLatestAudit);
router.get('/findings', auditController.getClaimFindings);
router.post('/re-audit', auditController.triggerReAudit);
router.post('/extract-clinical', auditController.extractClinical);
router.get('/procedures', auditController.getClaimProcedures);
router.get('/clinical-evidence', auditController.getClaimClinicalEvidence);
router.get('/risk-priority', auditController.getClaimRiskPriority);

module.exports = router;
