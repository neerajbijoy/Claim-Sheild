const db = require('../config/supabase');

async function uploadDocument(req, res, next) {
  try {
    const { id } = req.params;
    const documentType = req.body.document_type || req.body.documentType || 'Clinical Notes';
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const storagePath = `claim-documents/${id}/${Date.now()}_${file.originalname}`;
    
    // Upload file to Supabase Storage bucket `claim-documents`
    const publicUrl = await db.uploadToStorage(
      'claim-documents',
      storagePath,
      file.buffer,
      file.mimetype
    );

    // Save metadata into documents table
    const docRecord = await db.saveDocumentMetadata({
      claim_id: id,
      file_name: file.originalname,
      document_type: documentType,
      storage_path: storagePath,
      file_size: file.size,
      mime_type: file.mimetype,
      extracted_text: `Text content from ${file.originalname}`
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        ...docRecord,
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
    const docs = await db.getDocumentsByClaim(id);
    res.json({ success: true, count: docs.length, data: docs });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadDocument,
  getClaimDocuments
};
