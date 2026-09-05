const express = require('express');
const router = express.Router({ mergeParams: true });
const multer = require('multer');
const documentController = require('../controllers/document.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// Documents CRUD Routes
router.post('/', upload.single('file'), documentController.uploadDocument);
router.get('/', documentController.getClaimDocuments);
router.delete('/:docId', documentController.deleteDocument);

module.exports = router;
