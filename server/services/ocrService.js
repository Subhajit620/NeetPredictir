const env = require('../config/env');
const ApiError = require('../utils/ApiError');

let pdfjsLib;
let canvasLib;
let tesseract;
let loadError = null;

function loadDeps() {
  if (pdfjsLib && canvasLib && tesseract) return;
  try {
    pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    canvasLib = require('@napi-rs/canvas');
    tesseract = require('tesseract.js');
  } catch (err) {
    loadError = err;
  }
}

// Renders one PDF page to a PNG buffer via pdfjs-dist + node-canvas.
async function renderPageToPng(pdfDocument, pageNum, scale = 2) {
  const page = await pdfDocument.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = canvasLib.createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');

  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.toBuffer('image/png');
}

// OCRs up to PDF_OCR_MAX_PAGES of a PDF buffer for the given page numbers.
// Returns { pageNum, text }[]. Throws a clear ApiError if OCR isn't
// available (disabled via env, or the optional deps failed to load) rather
// than silently returning empty text.
async function ocrPdfPages(buffer, pageNumbers) {
  if (!env.ocr.enabled) {
    throw new ApiError(422, 'This PDF appears to be scanned, but OCR fallback is disabled (PDF_OCR_ENABLED=false).');
  }

  loadDeps();
  if (loadError) {
    throw new ApiError(
      500,
      `OCR fallback is unavailable because its dependencies failed to load: ${loadError.message}`
    );
  }

  const pagesToOcr = pageNumbers.slice(0, env.ocr.maxPages);
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdfDocument = await loadingTask.promise;

  const worker = await tesseract.createWorker('eng');
  const results = [];

  try {
    for (const pageNum of pagesToOcr) {
      const pngBuffer = await renderPageToPng(pdfDocument, pageNum);
      const {
        data: { text },
      } = await worker.recognize(pngBuffer);
      results.push({ pageNum, text });
    }
  } finally {
    await worker.terminate();
  }

  return results;
}

module.exports = { ocrPdfPages };
