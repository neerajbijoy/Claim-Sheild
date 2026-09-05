/**
 * Document Extractor Service
 * Extracts real clinical and textual information from uploaded documents (PDF, Text, Images).
 * Identifies scanned/image-only documents that require OCR without fabricating fake extractions.
 */

const pdfParse = require('pdf-parse');

class ExtractionResult {
  constructor({ text = '', is_image_only = false, ocr_required = false, word_count = 0, document_name = '' }) {
    this.text = text;
    this.is_image_only = is_image_only;
    this.ocr_required = ocr_required;
    this.word_count = word_count;
    this.document_name = document_name;
  }

  toString() {
    return this.text;
  }
}

async function extractText(fileBuffer, mimeType = '', originalName = '') {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    return new ExtractionResult({ text: '', word_count: 0, document_name: originalName });
  }

  const lowerName = (originalName || '').toLowerCase();
  const lowerMime = (mimeType || '').toLowerCase();

  // 1. PDF Document Extraction
  if (lowerMime.includes('pdf') || lowerName.endsWith('.pdf')) {
    try {
      let rawText = '';
      if (typeof pdfParse === 'function') {
        const data = await pdfParse(fileBuffer);
        rawText = data?.text || '';
      } else if (pdfParse && pdfParse.PDFParse) {
        const parser = new pdfParse.PDFParse({ data: fileBuffer });
        const res = await parser.getText();
        rawText = res?.text || (Array.isArray(res?.pages) ? res.pages.map(p => p.text).join('\n') : '');
      }

      const cleanText = (rawText || '')
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      // Detect scanned / image-only PDFs
      // If extracted text has fewer than 15 alphanumeric characters, it is an image-only/scanned document
      const alphaChars = cleanText.replace(/[^a-zA-Z0-9]/g, '');
      if (alphaChars.length < 15) {
        return new ExtractionResult({
          text: 'Image-only document — OCR required',
          is_image_only: true,
          ocr_required: true,
          word_count: 0,
          document_name: originalName
        });
      }

      const words = cleanText.split(/\s+/).filter(Boolean);
      return new ExtractionResult({
        text: cleanText,
        is_image_only: false,
        ocr_required: false,
        word_count: words.length,
        document_name: originalName
      });
    } catch (err) {
      console.warn(`[Document Extractor] PDF extraction error for ${originalName}:`, err.message);
      return new ExtractionResult({
        text: 'Image-only document — OCR required',
        is_image_only: true,
        ocr_required: true,
        word_count: 0,
        document_name: originalName
      });
    }
  }

  // 2. Plain Text / Markdown / CSV
  if (
    lowerMime.startsWith('text/') ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.csv')
  ) {
    try {
      const decoded = fileBuffer.toString('utf-8').trim();
      const words = decoded.split(/\s+/).filter(Boolean);
      return new ExtractionResult({
        text: decoded,
        is_image_only: false,
        ocr_required: false,
        word_count: words.length,
        document_name: originalName
      });
    } catch (err) {
      console.warn(`[Document Extractor] Text decode warning for ${originalName}:`, err.message);
      return new ExtractionResult({
        text: '',
        is_image_only: false,
        ocr_required: false,
        word_count: 0,
        document_name: originalName
      });
    }
  }

  // 3. Diagnostic Radiographs / Images (X-Rays, Intraoral Photos)
  if (
    lowerMime.startsWith('image/') ||
    ['.png', '.jpg', '.jpeg', '.webp', '.tiff', '.bmp'].some(ext => lowerName.endsWith(ext))
  ) {
    return new ExtractionResult({
      text: `[Diagnostic Radiograph / Image Evidence: ${originalName}]`,
      is_image_only: true,
      ocr_required: false,
      word_count: 0,
      document_name: originalName
    });
  }

  return new ExtractionResult({
    text: `[Attached Evidence: ${originalName}]`,
    is_image_only: false,
    ocr_required: false,
    word_count: 0,
    document_name: originalName
  });
}

module.exports = {
  extractText,
  ExtractionResult
};
