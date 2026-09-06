const db = require('../config/supabase');
const { extractText } = require('../services/documentExtractor');

async function uploadDocument(req, res, next) {
  try {
    const id = req.params.id || req.body.claim_id || req.body.claimId;
    const documentType = req.body.document_type || req.body.documentType || 'Clinical Notes';
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    // Resolve the real claim UUID
    const claim = await db.getClaimById(id);
    if (!claim) {
      return res.status(404).json({ success: false, message: `Claim ${id} not found.` });
    }
    const claimUuid = claim.id;

    const storagePath = `claim-documents/${claimUuid}/${Date.now()}_${file.originalname}`;

    // Upload file to Supabase Storage bucket `claim-documents`
    const publicUrl = await db.uploadToStorage(
      'claim-documents',
      storagePath,
      file.buffer,
      file.mimetype
    );

    // Extract real text from file buffer (PDF, text, or image metadata)
    const realExtractedText = await extractText(file.buffer, file.mimetype, file.originalname);

    // Save metadata into documents table
    const docRecord = await db.saveDocumentMetadata({
      claim_id: claimUuid,
      file_name: file.originalname,
      document_type: documentType,
      storage_path: storagePath,
      file_size: file.size,
      mime_type: file.mimetype,
      extracted_text: realExtractedText
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        ...docRecord,
        extracted_text: realExtractedText,
        public_url: publicUrl
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getClaimDocuments(req, res, next) {
  try {
    const { id } = req.params;
    const claim = await db.getClaimById(id);
    if (!claim) {
      return res.status(404).json({ success: false, message: `Claim ${id} not found.` });
    }
    const docs = await db.getDocumentsByClaim(claim.id);
    res.json({ success: true, count: docs.length, data: docs });
  } catch (err) {
    next(err);
  }
}

async function deleteDocument(req, res, next) {
  try {
    const { docId } = req.params;
    const deleted = await db.deleteDocument(docId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: `Document ${docId} not found.` });
    }
    res.json({ success: true, message: 'Document deleted successfully', data: deleted });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadDocument,
  getClaimDocuments,
  deleteDocument
};
