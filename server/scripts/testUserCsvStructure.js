const { parse } = require('csv-parse/sync');
const { detectColumnMapping } = require('../services/normalizationService');
const { normalizeRow, validateRow } = require('../services/excelValidationService');

const csvData = `College Name,State,Category,Quota,Course,Round,Year,Opening Rank,Closing Rank,Allotted Rank,Your Rank,Status
"AIIMS Raipur","Chhattisgarh",SC,AIQ,MBBS,Round 1,2025,8000,18500,17000,4,HISTORICALLY_WITHIN_CLOSING
"Pt. Jawahar Lal Nehru Memorial Medical College","Chhattisgarh",SC,State,MBBS,Round 1,2025,75000,125000,118000,4,HISTORICALLY_WITHIN_CLOSING
"Chhattisgarh Institute of Medical Sciences (CIMS)","Chhattisgarh",SC,State,MBBS,Round 1,2025,95000,148000,142000,4,HISTORICALLY_WITHIN_CLOSING
"Late Shri Baliram Kashyap Memorial GMC","Chhattisgarh",SC,State,MBBS,Round 1,2025,110000,165000,160000,4,HISTORICALLY_WITHIN_CLOSING
"Bharat Ratna Late Atal Bihari Vajpayee Memorial GMC","Chhattisgarh",SC,State,MBBS,Round 1,2025,115000,172000,168000,4,HISTORICALLY_WITHIN_CLOSING`;

const records = parse(csvData, { columns: true, skip_empty_lines: true });
const headers = Object.keys(records[0]);
console.log('Headers found:', headers);

const mapping = detectColumnMapping(headers);
console.log('Detected Column Mapping:', mapping);

const defaults = { year: 2025, round: 'Round 1', counsellingType: 'State', state: 'Chhattisgarh', course: 'MBBS' };

records.forEach((row, idx) => {
  const norm = normalizeRow(row, mapping, defaults);
  const validation = validateRow(norm);
  console.log(`\nRow ${idx + 1} [${norm.collegeName}]:`);
  console.log('  Normalized Fields:', {
    collegeName: norm.collegeName,
    state: norm.state,
    course: norm.course,
    category: norm.category,
    quota: norm.quota,
    openingRank: norm.openingRank,
    closingRank: norm.closingRank,
    allottedRank: norm.allottedRank,
    year: norm.year,
    round: norm.round
  });
  console.log('  Status:', validation.errors.length === 0 ? '✅ VALID (0 Errors)' : '❌ INVALID');
  if (validation.errors.length > 0) console.log('  Errors:', validation.errors);
  if (validation.warnings.length > 0) console.log('  Warnings:', validation.warnings);
});
