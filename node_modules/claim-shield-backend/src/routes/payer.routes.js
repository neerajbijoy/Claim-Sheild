const express = require('express');
const router = express.Router();
const payerController = require('../controllers/payer.controller');

// Payers CRUD Routes
router.get('/', payerController.getPayers);
router.post('/', payerController.createPayer);
router.put('/:id', payerController.updatePayer);
router.patch('/:id', payerController.updatePayer);
router.delete('/:id', payerController.deletePayer);

// Payer Rules CRUD Routes
router.get('/:id/rules', payerController.getPayerRules);
router.post('/:id/rules', payerController.createPayerRule);
router.delete('/rules/:ruleId', payerController.deletePayerRule);

module.exports = router;
