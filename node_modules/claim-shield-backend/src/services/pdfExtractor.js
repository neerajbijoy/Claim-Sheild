/**
 * PDF Text Extractor Service
 * Extracts raw text content from uploaded PDF file buffers.
 *
 * Uses pdf-parse v2 (PDFParse class wrapping pdfjs-dist).
 *
 * Return contract:
 *   success: true  → real embedded text extracted; `text` / `rawText` hold actual content
 *   success: false → no usable text; caller must NOT treat text as clinical evidence
 *     requiresOCR:      true  → parsed OK but no embedded text (scanned / image PDF)
 *     extractionFailed: true  → parse error or corrupted file
 */

const { PDFParse } = require('pdf-parse');

const MIN_MEANINGFUL_CHARS = 10;

/**
 * Extract all text from a PDF buffer via pdfjs page-level API.
 * Returns { text, pageCount } or throws.
 */
async function _extractTextViaPageApi(buf) {
  const parser = new PDFParse({ data: new Uint8Array(buf), verbosity: 0 });
  const doc = await parser.load();           // returns underlying pdfjs PDFDocumentProxy
  const numPages = doc.numPages;

  const pageTexts = [];
  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const tc   = await page.getTextContent();
    const text = (tc.items || []).map(item => item.str || '').join(' ').trim();
    pageTexts.push(text);
    page.cleanup && page.cleanup();
  }

  return { text: pageTexts.join('\n').trim(), pageCount: numPages };
}

async function extractPdfContent(fileBuffer, originalName) {
  // ── 1. Reject empty buffers immediately ─────────────────────────────────
  if (!fileBuffer || fileBuffer.length === 0) {
    return {
      success: false,
      extractionFailed: true,
      requiresOCR: false,
      error: 'Empty file buffer — no data received',
      text: null,
      rawText: null,
      pageCount: 0
    };
  }

  // ── 2. Attempt real text extraction ─────────────────────────────────────
  let rawText = '';
  let pageCount = 0;

  try {
    const result = await _extractTextViaPageApi(fileBuffer);
    rawText   = result.text;
    pageCount = result.pageCount;
  } catch (err) {
    console.warn(`[PDF Extractor] Failed to parse "${originalName}":`, err.message);
    return {
      success: false,
      extractionFailed: true,
      requiresOCR: false,
      error: `PDF parse error: ${err.message}`,
      text: null,
      rawText: null,
      pageCount: 0
    };
  }

  // ── 3. Distinguish scanned (no text) from text PDF ──────────────────────
  if (!rawText || rawText.length < MIN_MEANINGFUL_CHARS) {
    console.info(
      `[PDF Extractor] "${originalName}" has no embedded text (${rawText.length} chars). ` +
      `Likely a scanned or image-only PDF.`
    );
    return {
      success: false,
      extractionFailed: false,
      requiresOCR: true,
      error: 'No readable text found — document appears to be a scanned or image-only PDF',
      text: null,
      rawText: null,
      pageCount
    };
  }

  // ── 4. Clean and return real extracted text ──────────────────────────────
  const cleanedText = rawText
    .replace(/\r\n/g, '\n')
    .replace(/[^\x20-\x7E\n\t]/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return {
    success: true,
    extractionFailed: false,
    requiresOCR: false,
    error: null,
    text: cleanedText,
    rawText: cleanedText,
    pageCount
  };
}

module.exports = { extractPdfContent };
