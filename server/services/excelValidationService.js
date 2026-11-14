const {
  REQUIRED_FIELDS,
  CATEGORY_VALUES,
  QUOTA_VALUES,
} = require('../config/constants');
const {
  normalizeText,
  normalizeCategory,
  normalizeQuota,
  normalizeCollegeType,
  normalizeNumber,
  normalizeRound,
  normalizeState,
} = require('./normalizationService');

// Turns one raw row (object keyed by original header names) into a
// normalized row (canonical fields) using the column mapping, then
// validates it. Dataset-level defaults (year/round/counsellingType/state
// chosen at upload time) are used when a row doesn't carry its own value;
// counsellingType (AIQ/State, picked at upload time) becomes the fallback
// quota when a row has no quota column of its own.
function normalizeRow(raw, mapping, defaults = {}) {
  const get = (field) => {
    if (mapping && mapping[field] && raw[mapping[field]] !== undefined) return raw[mapping[field]];
    if (raw[field] !== undefined) return raw[field];
    return undefined;
  };

  const rawCat = get('category') || raw['Category'] || raw['category'] || raw['Seat Category'] || raw['seatCategory'] || raw['SeatCategory'];
  const normalizedCat = normalizeCategory(rawCat);

  const rawCollege = get('collegeName') || raw['Medical College'] || raw['medicalCollege'] || raw['College'] || raw['collegeName'] || raw['Institute Name'];
  const rawState = get('state') || raw['State'] || raw['state'] || raw['Institute State'];
  const rawQuota = get('quota') || raw['Quota'] || raw['quota'] || raw['Seat Type'];
  const rawCollegeType = get('collegeType') || raw['College Type'] || raw['collegeType'] || raw['Type'] || raw['Ownership'];
  const rawOpening = get('openingRank') || raw['Opening AIR'] || raw['Opening Rank'] || raw['OR'];
  const rawClosing = get('closingRank') || raw['Closing AIR'] || raw['Closing Rank'] || raw['CR'] || raw['Cutoff'];
  const rawAllotted = get('allottedRank') || get('allotmentRank') || raw['Allotted AIR'] || raw['Allotted Rank'] || raw['Allotment Rank'] || raw['Rank'];

  const normalized = {
    collegeName: normalizeText(rawCollege),
    collegeCode: normalizeText(get('collegeCode') || raw['Code']),
    state: normalizeState(rawState) || defaults.state || 'All India',
    district: normalizeText(get('district') || raw['District']),
    course: normalizeText(get('course') || raw['Course']) || defaults.course || 'MBBS',
    category: normalizedCat || defaults.category || 'General',
    quota: normalizeQuota(rawQuota) || defaults.counsellingType || 'State',
    openingRank: normalizeNumber(rawOpening),
    closingRank: normalizeNumber(rawClosing),
    allottedRank: normalizeNumber(rawAllotted),
    allotmentRank: normalizeNumber(rawAllotted),
    fees: normalizeNumber(get('fees') || raw['Fees'] || raw['Fee']),
    collegeType: normalizeCollegeType(rawCollegeType),
    seatCount: normalizeNumber(get('seatCount') || raw['Seat Count'] || raw['Seats'] || raw['Allotments'] || raw['N']),
    gender: normalizeText(get('gender') || raw['Gender']) || 'All',
    counsellingAuthority: normalizeText(get('counsellingAuthority') || raw['Authority']),
    year: normalizeNumber(get('year') || raw['Year']) || defaults.year || 2026,
    round: normalizeText(get('round') || raw['Round']) ? normalizeRound(get('round') || raw['Round']) : (defaults.round || 'Round 1'),
    sourceFile: normalizeText(get('source') || raw['Source']) || defaults.sourceFileName || '',
  };

  return normalized;
}

function validateRow(normalized) {
  const errors = [];
  const warnings = [];

  for (const field of REQUIRED_FIELDS) {
    if (normalized[field] === '' || normalized[field] === null || normalized[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Either a closing rank or an allotment rank is needed as the comparison
  // rank for prediction — a row with neither can't be matched against a
  // student's rank at all.
  const hasClosingRank = normalized.closingRank !== null && normalized.closingRank !== undefined;
  const hasAllotmentRank = normalized.allotmentRank !== null && normalized.allotmentRank !== undefined;
  if (!hasClosingRank && !hasAllotmentRank) {
    errors.push('Missing both closing rank and allotment rank');
  }
  if (hasClosingRank && (!Number.isFinite(normalized.closingRank) || normalized.closingRank <= 0)) {
    errors.push('Invalid closing rank value');
  }
  if (hasAllotmentRank && (!Number.isFinite(normalized.allotmentRank) || normalized.allotmentRank <= 0)) {
    errors.push('Invalid allotment rank value');
  }

  if (
    normalized.openingRank !== null &&
    normalized.closingRank !== null &&
    normalized.openingRank !== undefined &&
    normalized.closingRank !== undefined &&
    Number.isFinite(normalized.openingRank) &&
    Number.isFinite(normalized.closingRank) &&
    normalized.openingRank > normalized.closingRank
  ) {
    warnings.push('Opening rank is greater than closing rank');
  }

  if (!normalized.fees && normalized.fees !== 0) {
    warnings.push('Missing fees');
  }

  if (normalized.category && !CATEGORY_VALUES.includes(normalized.category)) {
    warnings.push(`Unknown category: ${normalized.category}`);
  }

  if (normalized.quota && !QUOTA_VALUES.includes(normalized.quota)) {
    warnings.push(`Unknown quota: ${normalized.quota}`);
  }

  if (!normalized.year) {
    errors.push('Missing year');
  }

  if (!normalized.round) {
    errors.push('Missing round');
  }

  return { errors, warnings };
}

function duplicateKey(normalized) {
  return [
    (normalized.collegeName || '').toLowerCase(),
    (normalized.state || '').toLowerCase(),
    (normalized.course || '').toLowerCase(),
    (normalized.category || '').toLowerCase(),
    (normalized.quota || '').toLowerCase(),
    (normalized.gender || '').toLowerCase(),
    normalized.year || '',
    normalized.round || '',
    normalized.openingRank ?? '',
    normalized.closingRank ?? '',
    normalized.allottedRank ?? normalized.allotmentRank ?? '',
  ].join('|');
}

// rows: array of raw objects keyed by original header. Returns per-row
// staging entries plus an aggregate summary for the validation report.
function processRows(rows, mapping, defaults) {
  const seen = new Map();
  const staged = [];
  const warningCounts = {};

  rows.forEach((raw, index) => {
    const normalized = normalizeRow(raw, mapping, defaults);
    const { errors, warnings } = validateRow(normalized);
    const key = duplicateKey(normalized);
    const isDuplicate = errors.length === 0 && seen.has(key);
    if (errors.length === 0) seen.set(key, true);

    for (const w of warnings) {
      warningCounts[w] = (warningCounts[w] || 0) + 1;
    }
    if (isDuplicate) {
      warningCounts['Duplicate record'] = (warningCounts['Duplicate record'] || 0) + 1;
    }

    staged.push({
      rowIndex: index,
      raw,
      normalized,
      isValid: errors.length === 0 && !isDuplicate,
      isDuplicate,
      errors,
      warnings,
    });
  });

  const totalRows = staged.length;
  const invalidRows = staged.filter((r) => r.errors.length > 0).length;
  const duplicateRows = staged.filter((r) => r.isDuplicate).length;
  const validRows = totalRows - invalidRows - duplicateRows;

  return {
    staged,
    summary: {
      totalRows,
      validRows,
      invalidRows,
      duplicateRows,
      warnings: warningCounts,
    },
  };
}

module.exports = { normalizeRow, validateRow, processRows, duplicateKey };
