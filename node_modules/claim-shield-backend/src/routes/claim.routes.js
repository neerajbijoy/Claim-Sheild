const express = require('express');
const router = express.Router();
const claimController = require('../controllers/claim.controller');

router.post('/', claimController.createClaim);
router.get('/', claimController.getClaims);
router.get('/:id', claimController.getClaimById);
router.put('/:id', claimController.updateClaim);

module.exports = router;
