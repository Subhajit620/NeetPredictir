const XLSX = require('xlsx');
const ApiError = require('../utils/ApiError');
const { COLUMN_ALIASES } = require('../config/constants');
const { slugifyHeader } = require('./normalizationService');

const KNOWN_HEADER_SLUGS = new Set();
for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
  for (const alias of aliases) {
    KNOWN_HEADER_SLUGS.add(slugifyHeader(alias));
  }
  KNOWN_HEADER_SLUGS.add(slugifyHeader(canonical));
}

// Scores a row based on how many column headers match known NEET cutoff fields
function countHeaderMatches(rowArray) {
  if (!Array.isArray(rowArray)) return 0;
  let matches = 0;
  for (const cell of rowArray) {
    if (!cell) continue;
    const slug = slugifyHeader(String(cell));
    if (KNOWN_HEADER_SLUGS.has(slug)) {
      matches++;
    }
  }
  return matches;
}

// Parses an .xlsx/.xls/.csv file buffer into { headers, rows } with auto-detection
// of the real table header row (skipping banner titles, notes, and empty rows).
function parseExcelBuffer(buffer, originalName) {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch (err) {
    throw new ApiError(400, `Could not read spreadsheet "${originalName}": ${err.message}`);
  }

  let bestSheetName = workbook.SheetNames[0];
  let bestHeaderRowIndex = 0;
  let bestMatchCount = -1;
  let bestMatrix = null;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    if (!matrix || matrix.length === 0) continue;

    for (let r = 0; r < Math.min(matrix.length, 25); r++) {
      const row = matrix[r];
      const matches = countHeaderMatches(row);
      if (matches > bestMatchCount) {
        bestMatchCount = matches;
        bestHeaderRowIndex = r;
        bestSheetName = sheetName;
        bestMatrix = matrix;
      }
    }
  }

  if (!bestMatrix) {
    const defaultSheet = workbook.Sheets[workbook.SheetNames[0]];
    bestMatrix = XLSX.utils.sheet_to_json(defaultSheet, { header: 1, defval: '', raw: false });
  }

  if (!bestMatrix || bestMatrix.length === 0) {
    throw new ApiError(400, `"${originalName}" has no data rows.`);
  }

  const rawHeaderRow = bestMatrix[bestHeaderRowIndex] || [];
  const headers = rawHeaderRow.map((h, i) => {
    const val = String(h || '').trim();
    return val || `Column_${i + 1}`;
  });

  const rows = [];
  for (let r = bestHeaderRowIndex + 1; r < bestMatrix.length; r++) {
    const rowArray = bestMatrix[r];
    if (!rowArray || rowArray.length === 0) continue;

    const nonEmptyCells = rowArray.filter((c) => c !== '' && c !== null && c !== undefined);
    if (nonEmptyCells.length === 0) continue;

    // Filter out standalone note/source/footer rows
    if (
      nonEmptyCells.length <= 2 &&
      typeof nonEmptyCells[0] === 'string' &&
      (nonEmptyCells[0].toLowerCase().startsWith('source') ||
        nonEmptyCells[0].toLowerCase().startsWith('opening and closing') ||
        nonEmptyCells[0].toLowerCase().startsWith('note') ||
        nonEmptyCells[0].toLowerCase().startsWith('pwd allotments') ||
        nonEmptyCells[0].toLowerCase().includes('excludes pwd') ||
        nonEmptyCells[0].toLowerCase().includes('all rights reserved'))
    ) {
      continue;
    }

    const rowObj = {};
    let hasValue = false;
    headers.forEach((h, idx) => {
      const cellVal = rowArray[idx] !== undefined ? rowArray[idx] : '';
      rowObj[h] = cellVal;
      if (cellVal !== '' && cellVal !== null && cellVal !== undefined) {
        hasValue = true;
      }
    });

    if (hasValue) {
      rows.push(rowObj);
    }
  }

  if (rows.length === 0) {
    throw new ApiError(400, `"${originalName}" has no data rows.`);
  }

  return { headers, rows, sheetName: bestSheetName };
}

module.exports = { parseExcelBuffer };
