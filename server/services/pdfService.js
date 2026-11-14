const pdfParse = require('pdf-parse');
const ApiError = require('../utils/ApiError');

// Extracts text AND per-item positions for each page. pdf-parse's
// `pagerender` hook lets us capture each page individually instead of one
// concatenated blob. Positions matter because many real counselling PDFs
// do not store text runs in visual reading order — the content stream can
// emit column-by-column rather than row-by-row, so naively concatenating
// `item.str` in stream order scrambles rows together. Reconstructing rows
// from each item's actual X/Y coordinates (see pagesToRowsByPosition) is
// the only reliable way to recover the table.
async function extractTextByPage(buffer, timeoutMs) {
  const pages = [];

  const options = {
    pagerender: async (pageData) => {
      const textContent = await pageData.getTextContent();
      const items = textContent.items
        .filter((item) => item.str && item.str.trim())
        .map((item) => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width || 0,
        }));
      const text = items.map((i) => i.text).join(' ');
      pages.push({ pageNum: pages.length + 1, text, items });
      return text;
    },
  };

  const withTimeout = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new ApiError(408, 'PDF parsing timed out.')), timeoutMs);
    pdfParse(buffer, options)
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });

  let result;
  try {
    result = await withTimeout;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(400, `Could not read PDF: ${err.message}`);
  }

  return { numPages: result.numpages, pages };
}

// A page is "insufficient text" if it has very little extractable text
// relative to its length — typical of a scanned/image-only page.
function isPageTextInsufficient(text, minChars = 40) {
  return !text || text.replace(/\s/g, '').length < minChars;
}

const ROW_Y_TOLERANCE = 3; // points; items within this of each other are the same visual row
const CELL_GAP_THRESHOLD = 6; // points; a bigger x-gap than this starts a new cell

// Clusters text items into visual rows using their Y coordinate (PDF
// coordinates are bottom-up, so higher y = higher on the page), then sorts
// each row's items left-to-right by X. This is order-independent: it does
// not matter what order the PDF content stream emitted the items in.
function groupItemsIntoRows(items, yTolerance = ROW_Y_TOLERANCE) {
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const rows = [];
  let current = null;

  for (const item of sorted) {
    if (!current || Math.abs(current.y - item.y) > yTolerance) {
      current = { y: item.y, items: [] };
      rows.push(current);
    }
    current.items.push(item);
    current.y = (current.y * (current.items.length - 1) + item.y) / current.items.length;
  }

  for (const row of rows) row.items.sort((a, b) => a.x - b.x);
  return rows;
}

// Merges adjacent same-row items into cells: consecutive items separated by
// only a small x-gap are parts of the same word/cell (PDF text is often
// split into many small runs); a larger gap marks a genuine column break.
// Drops cells that are pure visual noise (table border/rule glyphs with no
// alphanumeric content).
function rowItemsToCells(rowItems, gapThreshold = CELL_GAP_THRESHOLD) {
  const cells = [];
  let lastRight = null;

  for (const item of rowItems) {
    const startsNewCell = lastRight === null || item.x - lastRight > gapThreshold;
    if (startsNewCell) {
      cells.push({ text: item.text, xStart: item.x, xEnd: item.x + item.width });
    } else {
      const cell = cells[cells.length - 1];
      cell.text += ` ${item.text}`;
      cell.xEnd = item.x + item.width;
    }
    lastRight = item.x + item.width;
  }

  return cells
    .map((c) => ({ text: c.text.trim(), xStart: c.xStart, xCenter: (c.xStart + c.xEnd) / 2 }))
    .filter((c) => /[a-zA-Z0-9]/.test(c.text)); // drop border/rule-glyph noise
}

const { COLUMN_ALIASES } = require('../config/constants');
const { slugifyHeader } = require('./normalizationService');

const KNOWN_HEADER_SLUGS = new Set();
for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
  for (const alias of aliases) {
    KNOWN_HEADER_SLUGS.add(slugifyHeader(alias));
  }
  KNOWN_HEADER_SLUGS.add(slugifyHeader(canonical));
}

function countHeaderMatchesInCells(cells) {
  if (!Array.isArray(cells)) return 0;
  let matches = 0;
  for (const cell of cells) {
    const slug = slugifyHeader(cell.text);
    if (KNOWN_HEADER_SLUGS.has(slug)) {
      matches++;
    }
  }
  return matches;
}

// Looks at the first few rows of a page for a plausible header row (the row
// with the most distinct cells that match known cutoff headers).
function detectHeaderRow(rows, minCells = 3, searchRows = 10) {
  let best = null;
  let bestMatches = 0;
  for (const row of rows.slice(0, searchRows)) {
    const cells = rowItemsToCells(row.items);
    const matches = countHeaderMatchesInCells(cells);
    if (matches >= 2 && matches > bestMatches) {
      bestMatches = matches;
      best = { row, cells };
    } else if (!best && cells.length >= minCells) {
      best = { row, cells };
    }
  }
  return best;
}

// Turns header cell X positions into column "bands" (boundaries at the
// midpoint between adjacent header cells), so later rows can be mapped to
// the right column purely by X position even when a row is missing a
// value in the middle.
function computeColumnBands(headerCells) {
  const sorted = [...headerCells].sort((a, b) => a.xStart - b.xStart);
  const seen = new Map();
  return sorted.map((cell, i) => {
    const count = seen.get(cell.text) || 0;
    seen.set(cell.text, count + 1);
    const header = count === 0 ? cell.text : `${cell.text} (${count + 1})`;
    return {
      header,
      start: i === 0 ? -Infinity : (sorted[i - 1].xStart + cell.xStart) / 2,
      end: i === sorted.length - 1 ? Infinity : (cell.xStart + sorted[i + 1].xStart) / 2,
    };
  });
}

function rowCellsToRecord(cells, bands) {
  const record = {};
  bands.forEach((b) => {
    record[b.header] = '';
  });
  for (const cell of cells) {
    const band = bands.find((b) => cell.xCenter >= b.start && cell.xCenter < b.end);
    if (band) {
      record[band.header] = record[band.header] ? `${record[band.header]} ${cell.text}` : cell.text;
    }
  }
  return record;
}

function looksLikeHeaderRepeat(cells, bands) {
  if (cells.length === 0 || !bands) return false;
  const headerTexts = bands.map((b) => b.header.toLowerCase());
  const matches = cells.filter((c) => headerTexts.includes(c.text.toLowerCase())).length;
  return matches >= Math.min(2, cells.length);
}

function isNoiseOrHeaderFooter(combinedText) {
  const t = (combinedText || '').trim().toLowerCase();
  if (!t) return true;
  if (/^wb\s*ug\s*medical/i.test(t)) return true;
  if (/counselling\s*20\d\d.*page\s*\d+/i.test(t)) return true;
  if (/^page\s*\d+(\s*of\s*\d+)?$/i.test(t)) return true;
  if (/^median\s*air\s*=/i.test(t)) return true;
  if (/^source\s*:/i.test(t)) return true;
  if (/^source\s*(&|and)\s*limitation/i.test(t)) return true;
  if (/^how\s*to\s*read\s*this\s*report/i.test(t)) return true;
  if (/^important\s*data\s*rule/i.test(t)) return true;
  if (/^opening\s*and\s*closing\s*ranks\s*are/i.test(t)) return true;
  if (/college-wise\s*air/i.test(t)) return true;
  if (/west\s*bengal\s*mbbs.*round/i.test(t)) return true;
  if (/^neet\s*(ug)?\s*20\d\d/i.test(t) && /counselling|cutoff|opening/i.test(t)) return true;
  return false;
}

// Position-based reconstruction of a multi-page tabular PDF: detects headers
// per-section / per-page, tracks section metadata (Quota, Category, College Type),
// and filters running headers/footers cleanly.
function pagesToRowsByPosition(pages) {
  let activeBands = null;
  const records = [];
  const allHeadersSet = new Set();

  let currentQuota = 'State';
  let currentCollegeType = 'Government';
  let currentSectionCategory = 'General';

  for (const page of pages) {
    if (!page.items || page.items.length === 0) continue;
    const rows = groupItemsIntoRows(page.items);
    if (rows.length === 0) continue;

    for (let i = 0; i < rows.length; i += 1) {
      const cells = rowItemsToCells(rows[i].items);
      if (cells.length === 0) continue;

      const combinedText = cells.map((c) => c.text).join(' ').trim();
      if (isNoiseOrHeaderFooter(combinedText)) {
        // Even if noise, check if it conveys section category or quota
        if (/ur-general|ur\b|open|general/i.test(combinedText)) {
          currentSectionCategory = 'General';
        } else if (/obc-ncl|obc\s*ncl|obc/i.test(combinedText)) {
          currentSectionCategory = 'OBC';
        } else if (/ews/i.test(combinedText)) {
          currentSectionCategory = 'EWS';
        } else if (/sc\b|scheduled\s*caste/i.test(combinedText)) {
          currentSectionCategory = 'SC';
        } else if (/st\b|scheduled\s*tribe/i.test(combinedText)) {
          currentSectionCategory = 'ST';
        } else if (/pwd|ph\b/i.test(combinedText)) {
          currentSectionCategory = 'PwD';
        }
        continue;
      }

      // Detect Section Titles (e.g., "A. Government Medical Colleges - State Quota (Overall)", "C. Private Medical Colleges - Management Quota", "West Bengal MBBS 2026 Round 1 | UR-General college-wise AIR")
      if (
        /college-wise\s*air/i.test(combinedText) ||
        /^[a-g]\.\s+/i.test(combinedText) ||
        /(government|private)\s+colleges/i.test(combinedText) ||
        (/round\s*\d/i.test(combinedText) && /(ur|general|obc|sc|st|ews|pwd)/i.test(combinedText))
      ) {
        if (/ur-general|ur\b|open|general/i.test(combinedText)) {
          currentSectionCategory = 'General';
        } else if (/obc-ncl|obc\s*ncl|obc/i.test(combinedText)) {
          currentSectionCategory = 'OBC';
        } else if (/ews/i.test(combinedText)) {
          currentSectionCategory = 'EWS';
        } else if (/sc\b|scheduled\s*caste/i.test(combinedText)) {
          currentSectionCategory = 'SC';
        } else if (/st\b|scheduled\s*tribe/i.test(combinedText)) {
          currentSectionCategory = 'ST';
        } else if (/pwd|ph\b/i.test(combinedText)) {
          currentSectionCategory = 'PwD';
        }

        if (/management\s*quota/i.test(combinedText)) {
          currentQuota = 'Management';
        } else if (/state\s*quota/i.test(combinedText) || /state/i.test(combinedText)) {
          currentQuota = 'State';
        }

        if (/private/i.test(combinedText)) {
          currentCollegeType = 'Private';
        } else if (/government|govt/i.test(combinedText)) {
          currentCollegeType = 'Government';
        }

        continue;
      }

      // Check if this row is a column header row
      const headerMatches = countHeaderMatchesInCells(cells);
      if (headerMatches >= 2 && cells.length >= 3) {
        activeBands = computeColumnBands(cells);
        activeBands.forEach((b) => allHeadersSet.add(b.header));
        continue;
      }

      if (!activeBands) continue;
      if (looksLikeHeaderRepeat(cells, activeBands)) continue;

      const record = rowCellsToRecord(cells, activeBands);
      const filledCount = Object.values(record).filter((v) => v && String(v).trim()).length;
      if (filledCount >= 2) {
        // Discard banner titles that might have slipped into cells
        const collegeVal = String(record['Medical College'] || record['College'] || record['collegeName'] || Object.values(record)[0] || '');
        if (
          /college-wise\s*air/i.test(collegeVal) ||
          /round\s*\d.*air/i.test(collegeVal) ||
          /opening\s*and\s*closing/i.test(collegeVal)
        ) {
          continue;
        }

        // Must contain at least one numeric rank/value
        const hasNumericRank = Object.values(record).some((v) => /^\d{2,}$/.test(String(v).replace(/[,\s]/g, '')));
        if (!hasNumericRank) {
          continue;
        }

        // Enrich record with section defaults if not explicitly present in row
        if (!record.Quota && !record.quota) {
          record.Quota = currentQuota;
        }
        if (!record['College Type'] && !record['collegeType'] && !record['CollegeType']) {
          record['College Type'] = currentCollegeType;
        }
        if (!record.Category && !record['Seat Category'] && !record.category && !record['SeatCategory']) {
          record.Category = currentSectionCategory;
        }
        records.push(record);
      }
    }
  }

  if (records.length === 0) return { headers: [], rows: [] };

  allHeadersSet.add('Quota');
  allHeadersSet.add('College Type');
  allHeadersSet.add('Category');

  return { headers: Array.from(allHeadersSet), rows: records };
}

// Fallback whitespace-based splitting, used only if position-based
// reconstruction can't find a header (e.g. a page with no position data).
// Splits on runs of 2+ spaces, tabs, or pipe characters as column
// delimiters — works only when the PDF already emits text in reading
// order and lines are visually aligned in the extracted string.
function pageTextToRows(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return { headers: [], rows: [] };

  const splitLine = (line) => line.split(/\s{2,}|\t|\|/).map((c) => c.trim()).filter((c) => c.length > 0);

  let headerIndex = -1;
  let headers = [];
  for (let i = 0; i < Math.min(lines.length, 5); i += 1) {
    const cols = splitLine(lines[i]);
    if (cols.length >= 3) {
      headers = cols;
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) return { headers: [], rows: [] };

  const rows = [];
  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const cols = splitLine(lines[i]);
    if (cols.length === 0) continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] !== undefined ? cols[idx] : '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

// Combines multiple pages into one row set. Tries position-based
// reconstruction first (handles out-of-order text streams); falls back to
// whitespace-based line splitting only if that finds nothing.
function pagesToRows(pages) {
  const byPosition = pagesToRowsByPosition(pages);
  if (byPosition.rows.length > 0) return byPosition;

  let headers = [];
  const rows = [];

  pages.forEach(({ text }) => {
    if (headers.length === 0) {
      const detected = pageTextToRows(text);
      headers = detected.headers;
      rows.push(...detected.rows);
      return;
    }

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const splitLine = (line) => line.split(/\s{2,}|\t|\|/).map((c) => c.trim()).filter((c) => c.length > 0);

    lines.forEach((line) => {
      const cols = splitLine(line);
      if (cols.length === 0) return;
      const isHeaderRepeat = cols.every((c, i) => headers[i] && c.toLowerCase() === headers[i].toLowerCase());
      if (isHeaderRepeat) return;
      const row = {};
      headers.forEach((h, i) => {
        row[h] = cols[i] !== undefined ? cols[i] : '';
      });
      rows.push(row);
    });
  });

  return { headers, rows };
}

module.exports = {
  extractTextByPage,
  isPageTextInsufficient,
  pageTextToRows,
  pagesToRows,
  pagesToRowsByPosition,
  groupItemsIntoRows,
  rowItemsToCells,
};
