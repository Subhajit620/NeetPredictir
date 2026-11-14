const {
  COLUMN_ALIASES,
  CATEGORY_ALIASES,
  CATEGORY_METADATA,
  QUOTA_ALIASES,
  COLLEGE_TYPE_ALIASES,
  STATE_ALIASES,
} = require('../config/constants');

// "College Name" / "college_name" / "COLLEGE-NAME" -> "collegename"
function slugifyHeader(header) {
  return String(header || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Builds { canonicalField: originalHeaderName } by matching each uploaded
// header against the alias dictionary. Unmatched headers are left out of
// the mapping (admin can map them manually via PUT /mapping).
function detectColumnMapping(headers) {
  const mapping = {};
  const slugToCanonical = {};

  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      slugToCanonical[slugifyHeader(alias)] = canonical;
    }
    slugToCanonical[slugifyHeader(canonical)] = canonical;
  }

  for (const header of headers) {
    const slug = slugifyHeader(header);
    const canonical = slugToCanonical[slug];
    if (canonical && !mapping[canonical]) {
      mapping[canonical] = header;
    }
  }

  return mapping;
}

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/^[^\w]+/, '')
    .trim();
}

function normalizeFromAliasMap(value, aliasMap) {
  const text = normalizeText(value);
  if (!text) return '';
  const key = text.toLowerCase().trim();
  return aliasMap[key] || text;
}

function normalizeCategory(value) {
  return normalizeFromAliasMap(value, CATEGORY_ALIASES);
}

function getCategoryDetails(value) {
  const original = normalizeText(value);
  if (!original) return null;
  const canonical = normalizeCategory(original);
  const meta = CATEGORY_METADATA[canonical] || {
    canonical,
    family: canonical,
    label: original,
  };
  return {
    originalCategory: original,
    canonicalCategory: meta.canonical || canonical,
    canonicalFamily: meta.family || canonical,
    family: meta.family || canonical,
    displayLabel: meta.label || canonical,
    label: meta.label || canonical,
    state: meta.state || null,
  };
}

function normalizeQuota(value) {
  return normalizeFromAliasMap(value, QUOTA_ALIASES);
}

function normalizeCollegeType(value) {
  return normalizeFromAliasMap(value, COLLEGE_TYPE_ALIASES);
}

// Accepts "55,200", "55200", 55200, " 55200 ", "52K"/"52k" (-> 52000).
// Anything else non-numeric is left unparseable (null) rather than guessed,
// so it gets flagged as an invalid/missing value downstream instead of
// silently converting a suspicious value.
function normalizeNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const cleaned = String(value).trim().replace(/[,\s₹]/g, '');
  if (!cleaned) return null;

  const kMatch = cleaned.match(/^(\d+(?:\.\d+)?)[kK]$/);
  if (kMatch) {
    const num = Number(kMatch[1]) * 1000;
    return Number.isFinite(num) ? num : null;
  }

  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    return null;
  }

  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function normalizeRound(value) {
  const text = normalizeText(value);
  if (!text) return '';
  const match = text.match(/(\d+)/);
  if (match) return `Round ${match[1]}`;
  if (/mop.?up/i.test(text)) return 'Mop-Up Round';
  if (/stray/i.test(text)) return 'Stray Vacancy Round';
  return text;
}

// "UP" / "U.P." / "Uttar Pradesh" -> "Uttar Pradesh". Unknown values are
// left as typed (never guessed) so validation/admin review can catch them.
function normalizeState(value) {
  return normalizeFromAliasMap(value, STATE_ALIASES);
}

module.exports = {
  slugifyHeader,
  detectColumnMapping,
  normalizeText,
  normalizeCategory,
  getCategoryDetails,
  normalizeQuota,
  normalizeCollegeType,
  normalizeNumber,
  normalizeRound,
  normalizeState,
};
