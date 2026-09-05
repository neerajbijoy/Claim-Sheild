const express = require('express');
const router = express.Router();
const payerController = require('../controllers/payer.controller');

router.get('/', payerController.getPayers);
router.get('/:id/rules', payerController.getPayerRules);

module.exports = router;
