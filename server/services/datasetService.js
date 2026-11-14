const mongoose = require('mongoose');
const Dataset = require('../models/Dataset');
const DatasetStaging = require('../models/DatasetStaging');
const College = require('../models/College');
const Cutoff = require('../models/Cutoff');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

const excelService = require('./excelService');
const pdfService = require('./pdfService');
const ocrService = require('./ocrService');
const { detectColumnMapping } = require('./normalizationService');
const { processRows } = require('./excelValidationService');

const SUPPORTED_EXTENSIONS = ['xlsx', 'xls', 'csv', 'pdf'];

function extOf(filename) {
  const parts = filename.split('.');
  return parts[parts.length - 1].toLowerCase();
}

async function parseFile(buffer, originalName) {
  const ext = extOf(originalName);
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new ApiError(400, `Unsupported file type ".${ext}". Allowed: ${SUPPORTED_EXTENSIONS.join(', ')}`);
  }

  if (ext === 'pdf') {
    const { pages } = await pdfService.extractTextByPage(buffer, env.ocr.parseTimeoutMs);
    const insufficientPageNums = pages
      .filter((p) => pdfService.isPageTextInsufficient(p.text))
      .map((p) => p.pageNum);

    let usedOcr = false;
    let finalPages = pages;

    if (insufficientPageNums.length > 0) {
      usedOcr = true;
      const ocrResults = await ocrService.ocrPdfPages(buffer, insufficientPageNums);
      const ocrByPage = new Map(ocrResults.map((r) => [r.pageNum, r.text]));
      finalPages = pages.map((p) => (ocrByPage.has(p.pageNum) ? { ...p, text: ocrByPage.get(p.pageNum) } : p));
    }

    const { headers, rows } = pdfService.pagesToRows(finalPages);
    if (rows.length === 0) {
      throw new ApiError(
        422,
        'Could not detect a tabular structure in this PDF. Try exporting the counselling data as Excel/CSV instead.'
      );
    }

    return { ext, headers, rows, usedOcr };
  }

  const { headers, rows } = excelService.parseExcelBuffer(buffer, originalName);
  return { ext, headers, rows, usedOcr: false };
}

// Full upload step: parse file -> auto-detect column mapping -> normalize
// + validate every row -> persist a draft Dataset + staged rows. Nothing
// is written to Cutoff/College yet.
async function uploadDataset({ buffer, originalName, meta = {}, adminId, autoPublish = false }) {
  const { ext, headers, rows, usedOcr } = await parseFile(buffer, originalName);
  const mapping = detectColumnMapping(headers);

  // Auto-detect year from filename or first row if not provided
  let year = meta.year ? Number(meta.year) : null;
  if (!year) {
    const filenameYearMatch = originalName.match(/(20\d\d)/);
    if (filenameYearMatch) {
      year = Number(filenameYearMatch[1]);
    } else if (rows[0] && mapping.year && rows[0][mapping.year]) {
      year = Number(rows[0][mapping.year]);
    }
    if (!year || !Number.isFinite(year)) year = new Date().getFullYear();
  }

  // Auto-detect round
  let round = meta.round;
  if (!round) {
    if (rows[0] && mapping.round && rows[0][mapping.round]) {
      round = String(rows[0][mapping.round]);
    } else {
      round = 'Round 1';
    }
  }

  // Auto-detect counsellingType & state
  let counsellingType = meta.counsellingType || 'AIQ';
  let state = meta.state || 'All India';

  const { STATE_ALIASES } = require('../config/constants');
  if (!meta.state || meta.state === 'All India') {
    const filenameLower = originalName.toLowerCase().replace(/[^a-z]/g, '');
    for (const [alias, canonicalState] of Object.entries(STATE_ALIASES)) {
      const aliasClean = alias.replace(/[^a-z]/g, '');
      if (aliasClean.length >= 4 && filenameLower.includes(aliasClean)) {
        state = canonicalState;
        if (!meta.counsellingType) counsellingType = 'State';
        break;
      }
    }
  }

  const dataset = await Dataset.create({
    name: `NEET ${year} ${counsellingType} ${round} (${originalName})`,
    year: Number(year),
    round,
    counsellingType,
    state,
    status: 'draft',
    sourceFileName: originalName,
    sourceFileType: ext,
    sourceUsedOcr: usedOcr,
    columnMapping: mapping,
    uploadedBy: adminId,
  });

  const { staged, summary } = processRows(rows, mapping, {
    year: Number(year),
    round,
    counsellingType,
    state,
    course: 'MBBS',
    category: meta.category || 'General',
    sourceFileName: originalName,
  });

  if (staged.length > 0) {
    const docs = staged.map((s) => ({ datasetId: dataset._id, ...s }));
    await DatasetStaging.insertMany(docs, { ordered: false });
  }

  dataset.totalRows = summary.totalRows;
  dataset.validRows = summary.validRows;
  dataset.invalidRows = summary.invalidRows;
  dataset.duplicateRows = summary.duplicateRows;
  dataset.warnings = summary.warnings;
  await dataset.save();

  if (autoPublish && summary.validRows > 0) {
    await importDataset(dataset._id);
    await publishDataset(dataset._id);
    const updated = await Dataset.findById(dataset._id);
    return { dataset: updated, summary, detectedHeaders: headers, autoPublished: true };
  }

  return { dataset, summary, detectedHeaders: headers, autoPublished: false };
}

// Generates comprehensive sample NEET counselling datasets for instant testing
async function seedSampleData(adminId) {
  const XLSX = require('xlsx');

  const sampleRows = [
    // ==========================================
    // 1. ALL INDIA INSTITUTES (AIIMS / CENTRAL)
    // ==========================================
    { 'College Name': 'AIIMS New Delhi', State: 'Delhi', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1, 'Closing Rank': 57, 'Allotted Rank': 52, Fees: 1628, 'College Type': 'Central' },
    { 'College Name': 'AIIMS New Delhi', State: 'Delhi', Category: 'OBC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 58, 'Closing Rank': 255, 'Allotted Rank': 230, Fees: 1628, 'College Type': 'Central' },
    { 'College Name': 'AIIMS New Delhi', State: 'Delhi', Category: 'EWS', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 70, 'Closing Rank': 280, 'Allotted Rank': 260, Fees: 1628, 'College Type': 'Central' },
    { 'College Name': 'AIIMS New Delhi', State: 'Delhi', Category: 'SC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 150, 'Closing Rank': 980, 'Allotted Rank': 890, Fees: 1628, 'College Type': 'Central' },
    { 'College Name': 'AIIMS New Delhi', State: 'Delhi', Category: 'ST', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 800, 'Closing Rank': 1850, 'Allotted Rank': 1720, Fees: 1628, 'College Type': 'Central' },

    { 'College Name': 'AIIMS Raipur', State: 'Chhattisgarh', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 450, 'Closing Rank': 1250, 'Allotted Rank': 1100, Fees: 5856, 'College Type': 'Central' },
    { 'College Name': 'AIIMS Raipur', State: 'Chhattisgarh', Category: 'OBC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1100, 'Closing Rank': 2350, 'Allotted Rank': 2100, Fees: 5856, 'College Type': 'Central' },
    { 'College Name': 'AIIMS Raipur', State: 'Chhattisgarh', Category: 'EWS', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1300, 'Closing Rank': 2700, 'Allotted Rank': 2500, Fees: 5856, 'College Type': 'Central' },
    { 'College Name': 'AIIMS Raipur', State: 'Chhattisgarh', Category: 'SC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 8000, 'Closing Rank': 18500, 'Allotted Rank': 17000, Fees: 5856, 'College Type': 'Central' },
    { 'College Name': 'AIIMS Raipur', State: 'Chhattisgarh', Category: 'ST', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 22000, 'Closing Rank': 42000, 'Allotted Rank': 39000, Fees: 5856, 'College Type': 'Central' },

    { 'College Name': 'AIIMS Rishikesh', State: 'Uttarakhand', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 350, 'Closing Rank': 890, 'Allotted Rank': 810, Fees: 5856, 'College Type': 'Central' },
    { 'College Name': 'AIIMS Rishikesh', State: 'Uttarakhand', Category: 'OBC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 850, 'Closing Rank': 1750, 'Allotted Rank': 1600, Fees: 5856, 'College Type': 'Central' },

    { 'College Name': 'AIIMS Bhubaneswar', State: 'Odisha', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 200, 'Closing Rank': 580, 'Allotted Rank': 510, Fees: 5856, 'College Type': 'Central' },
    { 'College Name': 'AIIMS Bhubaneswar', State: 'Odisha', Category: 'OBC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 600, 'Closing Rank': 1400, 'Allotted Rank': 1280, Fees: 5856, 'College Type': 'Central' },

    { 'College Name': 'AIIMS Jodhpur', State: 'Rajasthan', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 180, 'Closing Rank': 520, 'Allotted Rank': 470, Fees: 5856, 'College Type': 'Central' },
    { 'College Name': 'AIIMS Jodhpur', State: 'Rajasthan', Category: 'OBC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 550, 'Closing Rank': 1200, 'Allotted Rank': 1050, Fees: 5856, 'College Type': 'Central' },

    { 'College Name': 'AIIMS Bhopal', State: 'Madhya Pradesh', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 250, 'Closing Rank': 620, 'Allotted Rank': 560, Fees: 5856, 'College Type': 'Central' },
    { 'College Name': 'AIIMS Bhopal', State: 'Madhya Pradesh', Category: 'OBC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 700, 'Closing Rank': 1350, 'Allotted Rank': 1220, Fees: 5856, 'College Type': 'Central' },

    { 'College Name': 'AIIMS Patna', State: 'Bihar', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 600, 'Closing Rank': 1600, 'Allotted Rank': 1450, Fees: 5856, 'College Type': 'Central' },
    { 'College Name': 'AIIMS Patna', State: 'Bihar', Category: 'OBC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1400, 'Closing Rank': 2600, 'Allotted Rank': 2400, Fees: 5856, 'College Type': 'Central' },

    { 'College Name': 'AIIMS Nagpur', State: 'Maharashtra', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 500, 'Closing Rank': 1300, 'Allotted Rank': 1180, Fees: 5856, 'College Type': 'Central' },
    { 'College Name': 'AIIMS Nagpur', State: 'Maharashtra', Category: 'OBC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1200, 'Closing Rank': 2400, 'Allotted Rank': 2250, Fees: 5856, 'College Type': 'Central' },

    { 'College Name': 'JIPMER Puducherry', State: 'Puducherry', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 30, 'Closing Rank': 220, 'Allotted Rank': 190, Fees: 7620, 'College Type': 'Central' },
    { 'College Name': 'JIPMER Puducherry', State: 'Puducherry', Category: 'OBC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 230, 'Closing Rank': 650, 'Allotted Rank': 590, Fees: 7620, 'College Type': 'Central' },

    { 'College Name': 'Institute of Medical Sciences, BHU Varanasi', State: 'Uttar Pradesh', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 300, 'Closing Rank': 880, 'Allotted Rank': 790, Fees: 14890, 'College Type': 'Central' },
    { 'College Name': 'Institute of Medical Sciences, BHU Varanasi', State: 'Uttar Pradesh', Category: 'OBC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 850, 'Closing Rank': 1800, 'Allotted Rank': 1650, Fees: 14890, 'College Type': 'Central' },

    // ==========================================
    // 2. CHHATTISGARH STATE (2025, 2024, 2023)
    // ==========================================
    // Pt. JNM Raipur
    { 'College Name': 'Pt. Jawahar Lal Nehru Memorial Medical College', State: 'Chhattisgarh', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 12000, 'Closing Rank': 24500, 'Allotted Rank': 22000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Pt. Jawahar Lal Nehru Memorial Medical College', State: 'Chhattisgarh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 21000, 'Closing Rank': 36500, 'Allotted Rank': 34000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Pt. Jawahar Lal Nehru Memorial Medical College', State: 'Chhattisgarh', Category: 'EWS', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 24000, 'Closing Rank': 42000, 'Allotted Rank': 39000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Pt. Jawahar Lal Nehru Memorial Medical College', State: 'Chhattisgarh', Category: 'SC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 75000, 'Closing Rank': 125000, 'Allotted Rank': 118000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Pt. Jawahar Lal Nehru Memorial Medical College', State: 'Chhattisgarh', Category: 'ST', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 150000, 'Closing Rank': 240000, 'Allotted Rank': 230000, Fees: 50000, 'College Type': 'Government' },

    // CIMS Bilaspur
    { 'College Name': 'Chhattisgarh Institute of Medical Sciences (CIMS)', State: 'Chhattisgarh', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 22000, 'Closing Rank': 38000, 'Allotted Rank': 35000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Chhattisgarh Institute of Medical Sciences (CIMS)', State: 'Chhattisgarh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 32000, 'Closing Rank': 48000, 'Allotted Rank': 46000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Chhattisgarh Institute of Medical Sciences (CIMS)', State: 'Chhattisgarh', Category: 'EWS', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 36000, 'Closing Rank': 54000, 'Allotted Rank': 51000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Chhattisgarh Institute of Medical Sciences (CIMS)', State: 'Chhattisgarh', Category: 'SC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 95000, 'Closing Rank': 148000, 'Allotted Rank': 142000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Chhattisgarh Institute of Medical Sciences (CIMS)', State: 'Chhattisgarh', Category: 'ST', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 180000, 'Closing Rank': 275000, 'Allotted Rank': 260000, Fees: 50000, 'College Type': 'Government' },

    // Late Baliram Kashyap GMC Jagdalpur
    { 'College Name': 'Late Shri Baliram Kashyap Memorial GMC', State: 'Chhattisgarh', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 28000, 'Closing Rank': 46000, 'Allotted Rank': 44000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Late Shri Baliram Kashyap Memorial GMC', State: 'Chhattisgarh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 38000, 'Closing Rank': 56000, 'Allotted Rank': 54000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Late Shri Baliram Kashyap Memorial GMC', State: 'Chhattisgarh', Category: 'SC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 110000, 'Closing Rank': 165000, 'Allotted Rank': 160000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Late Shri Baliram Kashyap Memorial GMC', State: 'Chhattisgarh', Category: 'ST', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 210000, 'Closing Rank': 310000, 'Allotted Rank': 295000, Fees: 50000, 'College Type': 'Government' },

    // ABV GMC Rajnandgaon
    { 'College Name': 'Bharat Ratna Late Atal Bihari Vajpayee Memorial GMC', State: 'Chhattisgarh', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 30000, 'Closing Rank': 49500, 'Allotted Rank': 48000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Bharat Ratna Late Atal Bihari Vajpayee Memorial GMC', State: 'Chhattisgarh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 41000, 'Closing Rank': 59000, 'Allotted Rank': 57000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Bharat Ratna Late Atal Bihari Vajpayee Memorial GMC', State: 'Chhattisgarh', Category: 'SC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 115000, 'Closing Rank': 172000, 'Allotted Rank': 168000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Bharat Ratna Late Atal Bihari Vajpayee Memorial GMC', State: 'Chhattisgarh', Category: 'ST', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 225000, 'Closing Rank': 325000, 'Allotted Rank': 310000, Fees: 50000, 'College Type': 'Government' },

    // GMC Ambikapur & Raigarh & Mahasamund & Kanker & Korba
    { 'College Name': 'Government Medical College, Ambikapur', State: 'Chhattisgarh', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 34000, 'Closing Rank': 53000, 'Allotted Rank': 51000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Government Medical College, Ambikapur', State: 'Chhattisgarh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 44000, 'Closing Rank': 62000, 'Allotted Rank': 60000, Fees: 50000, 'College Type': 'Government' },

    { 'College Name': 'Late Lakhiram Agrawal Memorial GMC, Raigarh', State: 'Chhattisgarh', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 32000, 'Closing Rank': 51000, 'Allotted Rank': 49000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Late Lakhiram Agrawal Memorial GMC, Raigarh', State: 'Chhattisgarh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 42000, 'Closing Rank': 61000, 'Allotted Rank': 58500, Fees: 50000, 'College Type': 'Government' },

    { 'College Name': 'Government Medical College, Mahasamund', State: 'Chhattisgarh', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 38000, 'Closing Rank': 58000, 'Allotted Rank': 56000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Government Medical College, Mahasamund', State: 'Chhattisgarh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 48000, 'Closing Rank': 66000, 'Allotted Rank': 64000, Fees: 50000, 'College Type': 'Government' },

    { 'College Name': 'Government Medical College, Korba', State: 'Chhattisgarh', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 40000, 'Closing Rank': 60000, 'Allotted Rank': 58000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Government Medical College, Korba', State: 'Chhattisgarh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 50000, 'Closing Rank': 68000, 'Allotted Rank': 66000, Fees: 50000, 'College Type': 'Government' },

    { 'College Name': 'Government Medical College, Kanker', State: 'Chhattisgarh', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 42000, 'Closing Rank': 62000, 'Allotted Rank': 60000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Government Medical College, Kanker', State: 'Chhattisgarh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 52000, 'Closing Rank': 70000, 'Allotted Rank': 68000, Fees: 50000, 'College Type': 'Government' },

    // Chhattisgarh BDS & Private
    { 'College Name': 'Government Dental College, Raipur', State: 'Chhattisgarh', Category: 'General', Quota: 'State', Course: 'BDS', Round: 'Round 1', Year: 2026, 'Opening Rank': 65000, 'Closing Rank': 110000, 'Allotted Rank': 105000, Fees: 25000, 'College Type': 'Government' },
    { 'College Name': 'Government Dental College, Raipur', State: 'Chhattisgarh', Category: 'OBC', Quota: 'State', Course: 'BDS', Round: 'Round 1', Year: 2026, 'Opening Rank': 85000, 'Closing Rank': 135000, 'Allotted Rank': 128000, Fees: 25000, 'College Type': 'Government' },

    { 'College Name': 'Raipur Institute of Medical Sciences (RIMS)', State: 'Chhattisgarh', Category: 'General', Quota: 'Management', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 120000, 'Closing Rank': 260000, 'Allotted Rank': 245000, Fees: 750000, 'College Type': 'Private' },

    // Chhattisgarh Multi-Year (2024 & 2023)
    { 'College Name': 'Pt. Jawahar Lal Nehru Memorial Medical College', State: 'Chhattisgarh', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2024, 'Opening Rank': 11000, 'Closing Rank': 22500, 'Allotted Rank': 21000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Pt. Jawahar Lal Nehru Memorial Medical College', State: 'Chhattisgarh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2024, 'Opening Rank': 19000, 'Closing Rank': 34500, 'Allotted Rank': 33000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Chhattisgarh Institute of Medical Sciences (CIMS)', State: 'Chhattisgarh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2024, 'Opening Rank': 30000, 'Closing Rank': 45000, 'Allotted Rank': 43000, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Late Shri Baliram Kashyap Memorial GMC', State: 'Chhattisgarh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2024, 'Opening Rank': 36000, 'Closing Rank': 52000, 'Allotted Rank': 50000, Fees: 50000, 'College Type': 'Government' },

    { 'College Name': 'Pt. Jawahar Lal Nehru Memorial Medical College', State: 'Chhattisgarh', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2023, 'Opening Rank': 10500, 'Closing Rank': 21000, 'Allotted Rank': 19500, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Pt. Jawahar Lal Nehru Memorial Medical College', State: 'Chhattisgarh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2023, 'Opening Rank': 18000, 'Closing Rank': 32000, 'Allotted Rank': 30500, Fees: 50000, 'College Type': 'Government' },
    { 'College Name': 'Chhattisgarh Institute of Medical Sciences (CIMS)', State: 'Chhattisgarh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2023, 'Opening Rank': 28000, 'Closing Rank': 42000, 'Allotted Rank': 40000, Fees: 50000, 'College Type': 'Government' },

    // ==========================================
    // 3. DELHI STATE
    // ==========================================
    { 'College Name': 'Maulana Azad Medical College (MAMC)', State: 'Delhi', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1, 'Closing Rank': 85, 'Allotted Rank': 72, Fees: 3000, 'College Type': 'Government' },
    { 'College Name': 'Maulana Azad Medical College (MAMC)', State: 'Delhi', Category: 'OBC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 80, 'Closing Rank': 340, 'Allotted Rank': 295, Fees: 3000, 'College Type': 'Government' },
    { 'College Name': 'Maulana Azad Medical College (MAMC)', State: 'Delhi', Category: 'EWS', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 110, 'Closing Rank': 420, 'Allotted Rank': 380, Fees: 3000, 'College Type': 'Government' },
    { 'College Name': 'Maulana Azad Medical College (MAMC)', State: 'Delhi', Category: 'SC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 500, 'Closing Rank': 2100, 'Allotted Rank': 1900, Fees: 3000, 'College Type': 'Government' },
    { 'College Name': 'Maulana Azad Medical College (MAMC)', State: 'Delhi', Category: 'ST', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1800, 'Closing Rank': 4800, 'Allotted Rank': 4300, Fees: 3000, 'College Type': 'Government' },

    { 'College Name': 'Vardhman Mahavir Medical College (VMMC)', State: 'Delhi', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 45, 'Closing Rank': 140, 'Allotted Rank': 120, Fees: 42000, 'College Type': 'Government' },
    { 'College Name': 'Vardhman Mahavir Medical College (VMMC)', State: 'Delhi', Category: 'OBC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 150, 'Closing Rank': 480, 'Allotted Rank': 420, Fees: 42000, 'College Type': 'Government' },

    { 'College Name': 'Lady Hardinge Medical College (LHMC)', State: 'Delhi', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 150, 'Closing Rank': 490, 'Allotted Rank': 430, Fees: 1400, 'College Type': 'Government' },
    { 'College Name': 'Lady Hardinge Medical College (LHMC)', State: 'Delhi', Category: 'OBC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 500, 'Closing Rank': 1250, 'Allotted Rank': 1100, Fees: 1400, 'College Type': 'Government' },

    { 'College Name': 'University College of Medical Sciences (UCMS)', State: 'Delhi', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 120, 'Closing Rank': 380, 'Allotted Rank': 340, Fees: 7000, 'College Type': 'Government' },
    { 'College Name': 'University College of Medical Sciences (UCMS)', State: 'Delhi', Category: 'OBC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 400, 'Closing Rank': 1150, 'Allotted Rank': 1050, Fees: 7000, 'College Type': 'Government' },

    { 'College Name': 'Dr. Baba Saheb Ambedkar Medical College', State: 'Delhi', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 800, 'Closing Rank': 2400, 'Allotted Rank': 2150, Fees: 105000, 'College Type': 'Government' },
    { 'College Name': 'Dr. Baba Saheb Ambedkar Medical College', State: 'Delhi', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 2500, 'Closing Rank': 6200, 'Allotted Rank': 5800, Fees: 105000, 'College Type': 'Government' },

    // ==========================================
    // 4. UTTAR PRADESH STATE
    // ==========================================
    { 'College Name': 'King George Medical University (KGMU)', State: 'Uttar Pradesh', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 850, 'Closing Rank': 2100, 'Allotted Rank': 1950, Fees: 54600, 'College Type': 'Government' },
    { 'College Name': 'King George Medical University (KGMU)', State: 'Uttar Pradesh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1800, 'Closing Rank': 3800, 'Allotted Rank': 3600, Fees: 54600, 'College Type': 'Government' },
    { 'College Name': 'King George Medical University (KGMU)', State: 'Uttar Pradesh', Category: 'EWS', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 2000, 'Closing Rank': 4100, 'Allotted Rank': 3900, Fees: 54600, 'College Type': 'Government' },
    { 'College Name': 'King George Medical University (KGMU)', State: 'Uttar Pradesh', Category: 'SC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 18000, 'Closing Rank': 38000, 'Allotted Rank': 35000, Fees: 54600, 'College Type': 'Government' },
    { 'College Name': 'King George Medical University (KGMU)', State: 'Uttar Pradesh', Category: 'ST', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 55000, 'Closing Rank': 95000, 'Allotted Rank': 88000, Fees: 54600, 'College Type': 'Government' },

    { 'College Name': 'Dr. Ram Manohar Lohia Institute of Medical Sciences', State: 'Uttar Pradesh', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 2100, 'Closing Rank': 4500, 'Allotted Rank': 4200, Fees: 65000, 'College Type': 'Government' },
    { 'College Name': 'Dr. Ram Manohar Lohia Institute of Medical Sciences', State: 'Uttar Pradesh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 3600, 'Closing Rank': 6800, 'Allotted Rank': 6400, Fees: 65000, 'College Type': 'Government' },

    { 'College Name': 'GSVM Medical College, Kanpur', State: 'Uttar Pradesh', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 3800, 'Closing Rank': 6900, 'Allotted Rank': 6500, Fees: 36000, 'College Type': 'Government' },
    { 'College Name': 'GSVM Medical College, Kanpur', State: 'Uttar Pradesh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 5500, 'Closing Rank': 9800, 'Allotted Rank': 9200, Fees: 36000, 'College Type': 'Government' },

    { 'College Name': 'LLRM Medical College, Meerut', State: 'Uttar Pradesh', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 4500, 'Closing Rank': 8200, 'Allotted Rank': 7800, Fees: 36000, 'College Type': 'Government' },
    { 'College Name': 'LLRM Medical College, Meerut', State: 'Uttar Pradesh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 6800, 'Closing Rank': 11500, 'Allotted Rank': 10800, Fees: 36000, 'College Type': 'Government' },

    { 'College Name': 'Motilal Nehru Medical College (MLN), Prayagraj', State: 'Uttar Pradesh', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 4800, 'Closing Rank': 8800, 'Allotted Rank': 8400, Fees: 36000, 'College Type': 'Government' },
    { 'College Name': 'Motilal Nehru Medical College (MLN), Prayagraj', State: 'Uttar Pradesh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 7200, 'Closing Rank': 12200, 'Allotted Rank': 11600, Fees: 36000, 'College Type': 'Government' },

    { 'College Name': 'SN Medical College, Agra', State: 'Uttar Pradesh', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 6000, 'Closing Rank': 10500, 'Allotted Rank': 9900, Fees: 36000, 'College Type': 'Government' },
    { 'College Name': 'SN Medical College, Agra', State: 'Uttar Pradesh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 8800, 'Closing Rank': 14200, 'Allotted Rank': 13600, Fees: 36000, 'College Type': 'Government' },

    { 'College Name': 'BRD Medical College, Gorakhpur', State: 'Uttar Pradesh', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 7000, 'Closing Rank': 11800, 'Allotted Rank': 11200, Fees: 36000, 'College Type': 'Government' },
    { 'College Name': 'BRD Medical College, Gorakhpur', State: 'Uttar Pradesh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 9500, 'Closing Rank': 15500, 'Allotted Rank': 14800, Fees: 36000, 'College Type': 'Government' },

    // ==========================================
    // 5. MAHARASHTRA STATE
    // ==========================================
    { 'College Name': 'Seth GS Medical College & KEM Hospital', State: 'Maharashtra', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 250, 'Closing Rank': 1150, 'Allotted Rank': 1020, Fees: 135000, 'College Type': 'Government' },
    { 'College Name': 'Seth GS Medical College & KEM Hospital', State: 'Maharashtra', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1200, 'Closing Rank': 2800, 'Allotted Rank': 2550, Fees: 135000, 'College Type': 'Government' },

    { 'College Name': 'Grant Medical College & Sir JJ Group of Hospitals', State: 'Maharashtra', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 800, 'Closing Rank': 2600, 'Allotted Rank': 2350, Fees: 135000, 'College Type': 'Government' },
    { 'College Name': 'Grant Medical College & Sir JJ Group of Hospitals', State: 'Maharashtra', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 2400, 'Closing Rank': 5200, 'Allotted Rank': 4850, Fees: 135000, 'College Type': 'Government' },

    { 'College Name': 'BJ Government Medical College, Pune', State: 'Maharashtra', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 650, 'Closing Rank': 2200, 'Allotted Rank': 1980, Fees: 135000, 'College Type': 'Government' },
    { 'College Name': 'BJ Government Medical College, Pune', State: 'Maharashtra', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 2100, 'Closing Rank': 4600, 'Allotted Rank': 4300, Fees: 135000, 'College Type': 'Government' },

    { 'College Name': 'Lokmanya Tilak Municipal Medical College (Sion)', State: 'Maharashtra', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1100, 'Closing Rank': 3200, 'Allotted Rank': 2950, Fees: 135000, 'College Type': 'Government' },
    { 'College Name': 'Lokmanya Tilak Municipal Medical College (Sion)', State: 'Maharashtra', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 2900, 'Closing Rank': 6100, 'Allotted Rank': 5700, Fees: 135000, 'College Type': 'Government' },

    { 'College Name': 'Government Medical College, Nagpur', State: 'Maharashtra', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 2200, 'Closing Rank': 5800, 'Allotted Rank': 5400, Fees: 135000, 'College Type': 'Government' },
    { 'College Name': 'Government Medical College, Nagpur', State: 'Maharashtra', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 4500, 'Closing Rank': 8900, 'Allotted Rank': 8400, Fees: 135000, 'College Type': 'Government' },

    // ==========================================
    // 6. BIHAR STATE
    // ==========================================
    { 'College Name': 'Patna Medical College (PMCH)', State: 'Bihar', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1800, 'Closing Rank': 4800, 'Allotted Rank': 4500, Fees: 15000, 'College Type': 'Government' },
    { 'College Name': 'Patna Medical College (PMCH)', State: 'Bihar', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 3800, 'Closing Rank': 7500, 'Allotted Rank': 7100, Fees: 15000, 'College Type': 'Government' },
    { 'College Name': 'Patna Medical College (PMCH)', State: 'Bihar', Category: 'EWS', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 4200, 'Closing Rank': 8100, 'Allotted Rank': 7700, Fees: 15000, 'College Type': 'Government' },
    { 'College Name': 'Patna Medical College (PMCH)', State: 'Bihar', Category: 'SC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 35000, 'Closing Rank': 65000, 'Allotted Rank': 61000, Fees: 15000, 'College Type': 'Government' },

    { 'College Name': 'Indira Gandhi Institute of Medical Sciences (IGIMS)', State: 'Bihar', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 3200, 'Closing Rank': 7200, 'Allotted Rank': 6800, Fees: 125000, 'College Type': 'Government' },
    { 'College Name': 'Indira Gandhi Institute of Medical Sciences (IGIMS)', State: 'Bihar', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 6500, 'Closing Rank': 11800, 'Allotted Rank': 11200, Fees: 125000, 'College Type': 'Government' },

    { 'College Name': 'Nalanda Medical College (NMCH), Patna', State: 'Bihar', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 4500, 'Closing Rank': 8900, 'Allotted Rank': 8400, Fees: 15000, 'College Type': 'Government' },
    { 'College Name': 'Nalanda Medical College (NMCH), Patna', State: 'Bihar', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 7800, 'Closing Rank': 13500, 'Allotted Rank': 12900, Fees: 15000, 'College Type': 'Government' },

    { 'College Name': 'Darbhanga Medical College (DMCH)', State: 'Bihar', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 5800, 'Closing Rank': 10500, 'Allotted Rank': 9900, Fees: 15000, 'College Type': 'Government' },
    { 'College Name': 'Darbhanga Medical College (DMCH)', State: 'Bihar', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 9200, 'Closing Rank': 15200, 'Allotted Rank': 14600, Fees: 15000, 'College Type': 'Government' },

    // ==========================================
    // 7. RAJASTHAN STATE
    // ==========================================
    { 'College Name': 'SMS Medical College, Jaipur', State: 'Rajasthan', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 450, 'Closing Rank': 1650, 'Allotted Rank': 1520, Fees: 33500, 'College Type': 'Government' },
    { 'College Name': 'SMS Medical College, Jaipur', State: 'Rajasthan', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1500, 'Closing Rank': 3100, 'Allotted Rank': 2850, Fees: 33500, 'College Type': 'Government' },
    { 'College Name': 'SMS Medical College, Jaipur', State: 'Rajasthan', Category: 'SC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 15000, 'Closing Rank': 32000, 'Allotted Rank': 29500, Fees: 33500, 'College Type': 'Government' },

    { 'College Name': 'Sardar Patel Medical College (SPMC), Bikaner', State: 'Rajasthan', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 2200, 'Closing Rank': 4900, 'Allotted Rank': 4600, Fees: 33500, 'College Type': 'Government' },
    { 'College Name': 'Sardar Patel Medical College (SPMC), Bikaner', State: 'Rajasthan', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 4200, 'Closing Rank': 7800, 'Allotted Rank': 7400, Fees: 33500, 'College Type': 'Government' },

    { 'College Name': 'Dr. SN Medical College, Jodhpur', State: 'Rajasthan', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1800, 'Closing Rank': 4200, 'Allotted Rank': 3950, Fees: 33500, 'College Type': 'Government' },
    { 'College Name': 'Dr. SN Medical College, Jodhpur', State: 'Rajasthan', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 3600, 'Closing Rank': 6900, 'Allotted Rank': 6500, Fees: 33500, 'College Type': 'Government' },

    { 'College Name': 'RNT Medical College, Udaipur', State: 'Rajasthan', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 2800, 'Closing Rank': 5800, 'Allotted Rank': 5400, Fees: 33500, 'College Type': 'Government' },
    { 'College Name': 'RNT Medical College, Udaipur', State: 'Rajasthan', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 5200, 'Closing Rank': 9100, 'Allotted Rank': 8600, Fees: 33500, 'College Type': 'Government' },

    // ==========================================
    // 8. KARNATAKA STATE (AIQ & State Quotas)
    // ==========================================
    { 'College Name': 'Bangalore Medical College and Research Institute (BMCRI)', State: 'Karnataka', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 450, 'Closing Rank': 1850, 'Allotted Rank': 1650, Fees: 60000, 'College Type': 'Government' },
    { 'College Name': 'Bangalore Medical College and Research Institute (BMCRI)', State: 'Karnataka', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 650, 'Closing Rank': 2150, 'Allotted Rank': 1950, Fees: 60000, 'College Type': 'Government' },
    { 'College Name': 'Bangalore Medical College and Research Institute (BMCRI)', State: 'Karnataka', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 2200, 'Closing Rank': 4800, 'Allotted Rank': 4500, Fees: 60000, 'College Type': 'Government' },
    { 'College Name': 'Bangalore Medical College and Research Institute (BMCRI)', State: 'Karnataka', Category: 'SC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 18000, 'Closing Rank': 38000, 'Allotted Rank': 35000, Fees: 60000, 'College Type': 'Government' },

    { 'College Name': 'Mysore Medical College and Research Institute', State: 'Karnataka', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1500, 'Closing Rank': 4200, 'Allotted Rank': 3900, Fees: 60000, 'College Type': 'Government' },
    { 'College Name': 'Mysore Medical College and Research Institute', State: 'Karnataka', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 2400, 'Closing Rank': 5600, 'Allotted Rank': 5200, Fees: 60000, 'College Type': 'Government' },
    { 'College Name': 'Mysore Medical College and Research Institute', State: 'Karnataka', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 4800, 'Closing Rank': 8900, 'Allotted Rank': 8400, Fees: 60000, 'College Type': 'Government' },

    { 'College Name': 'Karnataka Institute of Medical Sciences (KIMS), Hubballi', State: 'Karnataka', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 2200, 'Closing Rank': 6500, 'Allotted Rank': 6100, Fees: 60000, 'College Type': 'Government' },
    { 'College Name': 'Karnataka Institute of Medical Sciences (KIMS), Hubballi', State: 'Karnataka', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 3800, 'Closing Rank': 8800, 'Allotted Rank': 8300, Fees: 60000, 'College Type': 'Government' },
    { 'College Name': 'Karnataka Institute of Medical Sciences (KIMS), Hubballi', State: 'Karnataka', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 6200, 'Closing Rank': 11500, 'Allotted Rank': 10900, Fees: 60000, 'College Type': 'Government' },

    { 'College Name': 'ESIC Medical College, Rajajinagar, Bangalore', State: 'Karnataka', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1100, 'Closing Rank': 4500, 'Allotted Rank': 4100, Fees: 100000, 'College Type': 'Government' },
    { 'College Name': 'ESIC Medical College, Rajajinagar, Bangalore', State: 'Karnataka', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 2800, 'Closing Rank': 6900, 'Allotted Rank': 6500, Fees: 100000, 'College Type': 'Government' },

    { 'College Name': 'St. John’s Medical College, Bangalore', State: 'Karnataka', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 3500, 'Closing Rank': 14500, 'Allotted Rank': 13800, Fees: 680000, 'College Type': 'Private' },
    { 'College Name': 'Kasturba Medical College (KMC), Manipal', State: 'Karnataka', Category: 'General', Quota: 'Management', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 12000, 'Closing Rank': 48000, 'Allotted Rank': 44000, Fees: 1780000, 'College Type': 'Deemed' },
    { 'College Name': 'JSS Medical College, Mysuru', State: 'Karnataka', Category: 'General', Quota: 'Management', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 18000, 'Closing Rank': 58000, 'Allotted Rank': 54000, Fees: 1850000, 'College Type': 'Deemed' },

    // ==========================================
    // 9. TAMIL NADU STATE (AIQ 15% & State Quota 85%)
    // ==========================================
    // AIIMS Madurai (Central / AIQ)
    { 'College Name': 'AIIMS Madurai', State: 'Tamil Nadu', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 850, 'Closing Rank': 2400, 'Allotted Rank': 2100, Fees: 5856, 'College Type': 'Central' },
    { 'College Name': 'AIIMS Madurai', State: 'Tamil Nadu', Category: 'OBC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1900, 'Closing Rank': 3800, 'Allotted Rank': 3500, Fees: 5856, 'College Type': 'Central' },
    { 'College Name': 'AIIMS Madurai', State: 'Tamil Nadu', Category: 'SC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 14000, 'Closing Rank': 28000, 'Allotted Rank': 26000, Fees: 5856, 'College Type': 'Central' },

    // Madras Medical College (MMC) - AIQ 15% & State Quota 85%
    { 'College Name': 'Madras Medical College (MMC), Chennai', State: 'Tamil Nadu', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 400, 'Closing Rank': 1450, 'Allotted Rank': 1300, Fees: 18000, 'College Type': 'Government' },
    { 'College Name': 'Madras Medical College (MMC), Chennai', State: 'Tamil Nadu', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 650, 'Closing Rank': 2800, 'Allotted Rank': 2500, Fees: 18000, 'College Type': 'Government' },
    { 'College Name': 'Madras Medical College (MMC), Chennai', State: 'Tamil Nadu', Category: 'OBC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1100, 'Closing Rank': 2600, 'Allotted Rank': 2350, Fees: 18000, 'College Type': 'Government' },
    { 'College Name': 'Madras Medical College (MMC), Chennai', State: 'Tamil Nadu', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1500, 'Closing Rank': 4200, 'Allotted Rank': 3900, Fees: 18000, 'College Type': 'Government' },
    { 'College Name': 'Madras Medical College (MMC), Chennai', State: 'Tamil Nadu', Category: 'SC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 18000, 'Closing Rank': 42000, 'Allotted Rank': 39000, Fees: 18000, 'College Type': 'Government' },

    // Stanley Medical College - AIQ 15% & State Quota 85%
    { 'College Name': 'Stanley Medical College, Chennai', State: 'Tamil Nadu', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1200, 'Closing Rank': 3800, 'Allotted Rank': 3500, Fees: 18000, 'College Type': 'Government' },
    { 'College Name': 'Stanley Medical College, Chennai', State: 'Tamil Nadu', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1800, 'Closing Rank': 5200, 'Allotted Rank': 4800, Fees: 18000, 'College Type': 'Government' },
    { 'College Name': 'Stanley Medical College, Chennai', State: 'Tamil Nadu', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 3900, 'Closing Rank': 7800, 'Allotted Rank': 7300, Fees: 18000, 'College Type': 'Government' },

    // Kilpauk Medical College, Chennai
    { 'College Name': 'Govt Kilpauk Medical College, Chennai', State: 'Tamil Nadu', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 2200, 'Closing Rank': 5600, 'Allotted Rank': 5100, Fees: 18000, 'College Type': 'Government' },
    { 'College Name': 'Govt Kilpauk Medical College, Chennai', State: 'Tamil Nadu', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 3200, 'Closing Rank': 7600, 'Allotted Rank': 7100, Fees: 18000, 'College Type': 'Government' },
    { 'College Name': 'Govt Kilpauk Medical College, Chennai', State: 'Tamil Nadu', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 4500, 'Closing Rank': 9200, 'Allotted Rank': 8800, Fees: 18000, 'College Type': 'Government' },

    // Coimbatore Medical College
    { 'College Name': 'Coimbatore Medical College, Coimbatore', State: 'Tamil Nadu', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1900, 'Closing Rank': 4900, 'Allotted Rank': 4600, Fees: 18000, 'College Type': 'Government' },
    { 'College Name': 'Coimbatore Medical College, Coimbatore', State: 'Tamil Nadu', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 2900, 'Closing Rank': 6800, 'Allotted Rank': 6400, Fees: 18000, 'College Type': 'Government' },
    { 'College Name': 'Coimbatore Medical College, Coimbatore', State: 'Tamil Nadu', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 4200, 'Closing Rank': 8800, 'Allotted Rank': 8300, Fees: 18000, 'College Type': 'Government' },

    // Madurai Medical College
    { 'College Name': 'Madurai Medical College, Madurai', State: 'Tamil Nadu', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 2600, 'Closing Rank': 6200, 'Allotted Rank': 5800, Fees: 18000, 'College Type': 'Government' },
    { 'College Name': 'Madurai Medical College, Madurai', State: 'Tamil Nadu', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 3800, 'Closing Rank': 8400, 'Allotted Rank': 7900, Fees: 18000, 'College Type': 'Government' },
    { 'College Name': 'Madurai Medical College, Madurai', State: 'Tamil Nadu', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 5200, 'Closing Rank': 10500, 'Allotted Rank': 9900, Fees: 18000, 'College Type': 'Government' },

    // Chengalpattu & Tirunelveli Government Medical Colleges
    { 'College Name': 'Chengalpattu Government Medical College', State: 'Tamil Nadu', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 4800, 'Closing Rank': 9800, 'Allotted Rank': 9400, Fees: 18000, 'College Type': 'Government' },
    { 'College Name': 'Chengalpattu Government Medical College', State: 'Tamil Nadu', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 6500, 'Closing Rank': 12800, 'Allotted Rank': 12200, Fees: 18000, 'College Type': 'Government' },
    { 'College Name': 'Tirunelveli Medical College, Tirunelveli', State: 'Tamil Nadu', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 5200, 'Closing Rank': 10500, 'Allotted Rank': 9900, Fees: 18000, 'College Type': 'Government' },
    { 'College Name': 'Tirunelveli Medical College, Tirunelveli', State: 'Tamil Nadu', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 7100, 'Closing Rank': 13600, 'Allotted Rank': 13000, Fees: 18000, 'College Type': 'Government' },

    // Private Colleges in Tamil Nadu (State Quota & Management Quota)
    { 'College Name': 'PSG Institute of Medical Sciences and Research, Coimbatore', State: 'Tamil Nadu', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 8500, 'Closing Rank': 24000, 'Allotted Rank': 22500, Fees: 450000, 'College Type': 'Private' },
    { 'College Name': 'PSG Institute of Medical Sciences and Research, Coimbatore', State: 'Tamil Nadu', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 12500, 'Closing Rank': 34000, 'Allotted Rank': 31000, Fees: 450000, 'College Type': 'Private' },
    { 'College Name': 'PSG Institute of Medical Sciences and Research, Coimbatore', State: 'Tamil Nadu', Category: 'General', Quota: 'Management', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 25000, 'Closing Rank': 88000, 'Allotted Rank': 82000, Fees: 1350000, 'College Type': 'Private' },

    { 'College Name': 'KMCH Institute of Health Sciences and Research, Coimbatore', State: 'Tamil Nadu', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 12000, 'Closing Rank': 32000, 'Allotted Rank': 30000, Fees: 450000, 'College Type': 'Private' },
    { 'College Name': 'KMCH Institute of Health Sciences and Research, Coimbatore', State: 'Tamil Nadu', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 16000, 'Closing Rank': 42000, 'Allotted Rank': 39000, Fees: 450000, 'College Type': 'Private' },
    { 'College Name': 'KMCH Institute of Health Sciences and Research, Coimbatore', State: 'Tamil Nadu', Category: 'General', Quota: 'Management', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 35000, 'Closing Rank': 115000, 'Allotted Rank': 108000, Fees: 1350000, 'College Type': 'Private' },

    { 'College Name': 'SRI VENKATESWARAA MEDICAL COLLEGE HOSPITAL AND RESEARCH INSTITUTE, CHENNAI', State: 'Tamil Nadu', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 18000, 'Closing Rank': 48000, 'Allotted Rank': 45000, Fees: 450000, 'College Type': 'Private' },
    { 'College Name': 'SRI VENKATESWARAA MEDICAL COLLEGE HOSPITAL AND RESEARCH INSTITUTE, CHENNAI', State: 'Tamil Nadu', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 22000, 'Closing Rank': 58000, 'Allotted Rank': 54000, Fees: 450000, 'College Type': 'Private' },

    // ==========================================
    // 10. WEST BENGAL STATE
    // ==========================================
    { 'College Name': 'Medical College, Kolkata', State: 'West Bengal', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1100, 'Closing Rank': 3400, 'Allotted Rank': 3100, Fees: 9000, 'College Type': 'Government' },
    { 'College Name': 'Medical College, Kolkata', State: 'West Bengal', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 3200, 'Closing Rank': 6800, 'Allotted Rank': 6350, Fees: 9000, 'College Type': 'Government' },

    { 'College Name': 'IPGMER and SSKM Hospital, Kolkata', State: 'West Bengal', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1600, 'Closing Rank': 4200, 'Allotted Rank': 3900, Fees: 9000, 'College Type': 'Government' },
    { 'College Name': 'IPGMER and SSKM Hospital, Kolkata', State: 'West Bengal', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 4100, 'Closing Rank': 8200, 'Allotted Rank': 7700, Fees: 9000, 'College Type': 'Government' },

    // ==========================================
    // 11. MADHYA PRADESH & GUJARAT STATES
    // ==========================================
    { 'College Name': 'Gandhi Medical College (GMC), Bhopal', State: 'Madhya Pradesh', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 2800, 'Closing Rank': 6800, 'Allotted Rank': 6400, Fees: 114000, 'College Type': 'Government' },
    { 'College Name': 'Gandhi Medical College (GMC), Bhopal', State: 'Madhya Pradesh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 5600, 'Closing Rank': 10800, 'Allotted Rank': 10200, Fees: 114000, 'College Type': 'Government' },

    { 'College Name': 'Mahatma Gandhi Memorial Medical College (MGM), Indore', State: 'Madhya Pradesh', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1900, 'Closing Rank': 5100, 'Allotted Rank': 4750, Fees: 114000, 'College Type': 'Government' },
    { 'College Name': 'Mahatma Gandhi Memorial Medical College (MGM), Indore', State: 'Madhya Pradesh', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 4200, 'Closing Rank': 8900, 'Allotted Rank': 8350, Fees: 114000, 'College Type': 'Government' },

    { 'College Name': 'BJ Medical College, Ahmedabad', State: 'Gujarat', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 500, 'Closing Rank': 1950, 'Allotted Rank': 1800, Fees: 25000, 'College Type': 'Government' },
    { 'College Name': 'BJ Medical College, Ahmedabad', State: 'Gujarat', Category: 'OBC', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1800, 'Closing Rank': 4500, 'Allotted Rank': 4200, Fees: 25000, 'College Type': 'Government' },

    // ==========================================
    // 12. HARYANA STATE (AIQ & State Quota)
    // ==========================================
    { 'College Name': 'Pt. B.D. Sharma Post Graduate Institute of Medical Sciences (PGIMS)', State: 'Haryana', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 450, 'Closing Rank': 2850, 'Allotted Rank': 2500, Fees: 80000, 'College Type': 'Government' },
    { 'College Name': 'Pt. B.D. Sharma Post Graduate Institute of Medical Sciences (PGIMS)', State: 'Haryana', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 2500, 'Closing Rank': 7500, 'Allotted Rank': 7100, Fees: 80000, 'College Type': 'Government' },
    { 'College Name': 'Pt. B.D. Sharma Post Graduate Institute of Medical Sciences (PGIMS)', State: 'Haryana', Category: 'OBC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1800, 'Closing Rank': 4900, 'Allotted Rank': 4600, Fees: 80000, 'College Type': 'Government' },
    { 'College Name': 'Pt. B.D. Sharma Post Graduate Institute of Medical Sciences (PGIMS)', State: 'Haryana', Category: 'EWS', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 2200, 'Closing Rank': 5600, 'Allotted Rank': 5200, Fees: 80000, 'College Type': 'Government' },
    { 'College Name': 'Pt. B.D. Sharma Post Graduate Institute of Medical Sciences (PGIMS)', State: 'Haryana', Category: 'SC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 18000, 'Closing Rank': 38000, 'Allotted Rank': 35000, Fees: 80000, 'College Type': 'Government' },

    { 'College Name': 'BPS Government Medical College for Women, Khanpur Kalan', State: 'Haryana', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 3200, 'Closing Rank': 8900, 'Allotted Rank': 8400, Fees: 80000, 'College Type': 'Government' },
    { 'College Name': 'BPS Government Medical College for Women, Khanpur Kalan', State: 'Haryana', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 6500, 'Closing Rank': 13500, 'Allotted Rank': 12800, Fees: 80000, 'College Type': 'Government' },
    { 'College Name': 'BPS Government Medical College for Women, Khanpur Kalan', State: 'Haryana', Category: 'OBC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 5500, 'Closing Rank': 11500, 'Allotted Rank': 10900, Fees: 80000, 'College Type': 'Government' },

    { 'College Name': 'Kalpana Chawla Government Medical College, Karnal', State: 'Haryana', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 2800, 'Closing Rank': 7200, 'Allotted Rank': 6800, Fees: 80000, 'College Type': 'Government' },
    { 'College Name': 'Kalpana Chawla Government Medical College, Karnal', State: 'Haryana', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 5200, 'Closing Rank': 11200, 'Allotted Rank': 10600, Fees: 80000, 'College Type': 'Government' },
    { 'College Name': 'Kalpana Chawla Government Medical College, Karnal', State: 'Haryana', Category: 'OBC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 4800, 'Closing Rank': 9800, 'Allotted Rank': 9300, Fees: 80000, 'College Type': 'Government' },

    { 'College Name': 'ESIC Medical College and Hospital, Faridabad', State: 'Haryana', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 1200, 'Closing Rank': 4800, 'Allotted Rank': 4300, Fees: 100000, 'College Type': 'Government' },
    { 'College Name': 'ESIC Medical College and Hospital, Faridabad', State: 'Haryana', Category: 'OBC', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 3400, 'Closing Rank': 7900, 'Allotted Rank': 7400, Fees: 100000, 'College Type': 'Government' },

    { 'College Name': 'Shaheed Hasan Khan Mewati GMC, Nalhar', State: 'Haryana', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 4500, 'Closing Rank': 10500, 'Allotted Rank': 9900, Fees: 80000, 'College Type': 'Government' },
    { 'College Name': 'Shaheed Hasan Khan Mewati GMC, Nalhar', State: 'Haryana', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 8200, 'Closing Rank': 15800, 'Allotted Rank': 15100, Fees: 80000, 'College Type': 'Government' },

    { 'College Name': 'Maharaja Agrasen Medical College, Agroha', State: 'Haryana', Category: 'General', Quota: 'AIQ', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 5200, 'Closing Rank': 12000, 'Allotted Rank': 11400, Fees: 180000, 'College Type': 'Government-Aided' },
    { 'College Name': 'Maharaja Agrasen Medical College, Agroha', State: 'Haryana', Category: 'General', Quota: 'State', Course: 'MBBS', Round: 'Round 1', Year: 2026, 'Opening Rank': 9500, 'Closing Rank': 17500, 'Allotted Rank': 16800, Fees: 180000, 'College Type': 'Government-Aided' },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cutoffs');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return uploadDataset({
    buffer,
    originalName: 'NEET_All_India_State_Counselling_Cutoffs_2023_2026.xlsx',
    meta: { year: 2026, round: 'Round 1', counsellingType: 'AIQ', state: 'All India' },
    adminId,
    autoPublish: true,
  });
}

async function getValidationReport(datasetId) {
  let dataset = await Dataset.findById(datasetId);
  if (!dataset) throw new ApiError(404, 'Dataset not found.');

  // If draft has 0 valid rows, re-run validation with updated normalizers & category defaults
  if (dataset.status === 'draft' && dataset.validRows === 0) {
    const stagedDocs = await DatasetStaging.find({ datasetId }).lean();
    if (stagedDocs.length > 0) {
      const rawRows = stagedDocs.map((d) => d.raw);
      const { staged, summary } = processRows(rawRows, dataset.columnMapping || {}, {
        year: dataset.year,
        round: dataset.round,
        counsellingType: dataset.counsellingType,
        state: dataset.state,
        course: 'MBBS',
        category: 'General',
        sourceFileName: dataset.sourceFileName,
      });

      const bulkOps = staged.map((s, idx) => ({
        updateOne: {
          filter: { _id: stagedDocs[idx]._id },
          update: {
            $set: {
              normalized: s.normalized,
              isValid: s.isValid,
              isDuplicate: s.isDuplicate,
              errors: s.errors,
              warnings: s.warnings,
            },
          },
        },
      }));
      if (bulkOps.length > 0) await DatasetStaging.bulkWrite(bulkOps);

      dataset.totalRows = summary.totalRows;
      dataset.validRows = summary.validRows;
      dataset.invalidRows = summary.invalidRows;
      dataset.duplicateRows = summary.duplicateRows;
      dataset.warnings = summary.warnings;
      await dataset.save();
    }
  }

  const errorRows = await DatasetStaging.find({ datasetId, errors: { $ne: [] } })
    .limit(500)
    .select('rowIndex raw normalized errors warnings')
    .lean();

  const previewRows = await DatasetStaging.find({ datasetId, isValid: true })
    .limit(20)
    .select('rowIndex normalized')
    .lean();

  let detectedHeaders = [];
  const anyStaging = await DatasetStaging.findOne({ datasetId }).lean();
  if (anyStaging && anyStaging.raw) {
    detectedHeaders = Object.keys(anyStaging.raw);
  }

  return { dataset, errorRows, previewRows, detectedHeaders };
}

// Admin corrects the auto-detected mapping; re-runs normalization +
// validation against the still-staged raw rows without re-uploading.
async function updateMapping(datasetId, mapping) {
  const dataset = await Dataset.findById(datasetId);
  if (!dataset) throw new ApiError(404, 'Dataset not found.');
  if (dataset.status !== 'draft') {
    throw new ApiError(400, 'Only draft datasets can have their column mapping changed.');
  }

  const stagedDocs = await DatasetStaging.find({ datasetId }).lean();
  if (stagedDocs.length === 0) throw new ApiError(400, 'No staged rows found for this dataset.');

  const rawRows = stagedDocs.map((d) => d.raw);
  const { staged, summary } = processRows(rawRows, mapping, {
    year: dataset.year,
    round: dataset.round,
    counsellingType: dataset.counsellingType,
    state: dataset.state,
    course: 'MBBS',
    category: 'General',
    sourceFileName: dataset.sourceFileName,
  });

  const bulkOps = staged.map((s, idx) => ({
    updateOne: {
      filter: { _id: stagedDocs[idx]._id },
      update: {
        $set: {
          normalized: s.normalized,
          isValid: s.isValid,
          isDuplicate: s.isDuplicate,
          errors: s.errors,
          warnings: s.warnings,
        },
      },
    },
  }));
  if (bulkOps.length > 0) await DatasetStaging.bulkWrite(bulkOps);

  dataset.columnMapping = mapping;
  dataset.totalRows = summary.totalRows;
  dataset.validRows = summary.validRows;
  dataset.invalidRows = summary.invalidRows;
  dataset.duplicateRows = summary.duplicateRows;
  dataset.warnings = summary.warnings;
  await dataset.save();

  return { dataset, summary };
}

// Writes all valid staged rows into Cutoff (+ upserts College docs), then
// marks the dataset 'validated' and clears staging. Does NOT publish.
async function importDataset(datasetId) {
  const dataset = await Dataset.findById(datasetId);
  if (!dataset) throw new ApiError(404, 'Dataset not found.');
  if (dataset.status !== 'draft') {
    return dataset; // Already imported
  }

  let validRows = await DatasetStaging.find({ datasetId, isValid: true }).lean();

  // If no rows are currently marked valid, re-evaluate all staged rows with current rules
  if (validRows.length === 0) {
    const stagedDocs = await DatasetStaging.find({ datasetId }).lean();
    if (stagedDocs.length > 0) {
      const rawRows = stagedDocs.map((d) => d.raw);
      const { staged, summary } = processRows(rawRows, dataset.columnMapping || {}, {
        year: dataset.year,
        round: dataset.round,
        counsellingType: dataset.counsellingType,
        state: dataset.state,
        course: 'MBBS',
        category: 'General',
        sourceFileName: dataset.sourceFileName,
      });

      const bulkOps = staged.map((s, idx) => ({
        updateOne: {
          filter: { _id: stagedDocs[idx]._id },
          update: {
            $set: {
              normalized: s.normalized,
              isValid: s.isValid,
              isDuplicate: s.isDuplicate,
              errors: s.errors,
              warnings: s.warnings,
            },
          },
        },
      }));
      if (bulkOps.length > 0) await DatasetStaging.bulkWrite(bulkOps);

      dataset.totalRows = summary.totalRows;
      dataset.validRows = summary.validRows;
      dataset.invalidRows = summary.invalidRows;
      dataset.duplicateRows = summary.duplicateRows;
      dataset.warnings = summary.warnings;
      await dataset.save();

      validRows = await DatasetStaging.find({ datasetId, isValid: true }).lean();
    }
  }

  if (validRows.length === 0) {
    throw new ApiError(400, 'No valid rows to import. Please check column mappings and re-validate.');
  }

  const collegeCache = new Map();

  async function resolveCollegeId(normalized) {
    const cacheKey = `${normalized.collegeName.toLowerCase()}|${normalized.state.toLowerCase()}`;
    if (collegeCache.has(cacheKey)) return collegeCache.get(cacheKey);

    const college = await College.findOneAndUpdate(
      { name: normalized.collegeName, state: normalized.state },
      {
        $setOnInsert: {
          name: normalized.collegeName,
          state: normalized.state,
          city: normalized.district || '',
          district: normalized.district || '',
          course: normalized.course || 'MBBS',
          collegeType: normalized.collegeType || '',
          ownership: normalized.collegeType || '',
          isActive: true,
        },
      },
      { upsert: true, new: true }
    );
    collegeCache.set(cacheKey, college._id);
    return college._id;
  }

  const cutoffDocs = [];
  for (const row of validRows) {
    const n = row.normalized;
    const collegeId = await resolveCollegeId(n);
    cutoffDocs.push({
      collegeId,
      collegeName: n.collegeName,
      state: n.state,
      city: n.district || '',
      district: n.district || '',
      category: n.category,
      course: n.course || 'MBBS',
      year: n.year,
      round: n.round,
      quota: n.quota || '',
      openingRank: n.openingRank ?? null,
      closingRank: n.closingRank ?? null,
      allottedRank: n.allottedRank ?? n.allotmentRank ?? null,
      allotmentRank: n.allottedRank ?? n.allotmentRank ?? null,
      sourceDatasetId: dataset._id,
      sourceFile: n.sourceFile || dataset.sourceFileName || '',
      published: false,
      fees: n.fees ?? null,
      collegeType: n.collegeType || '',
      seatCount: n.seatCount ?? null,
      gender: n.gender || 'All',
      counsellingAuthority: n.counsellingAuthority || '',
    });
  }

  await Cutoff.insertMany(cutoffDocs, { ordered: false });
  await DatasetStaging.deleteMany({ datasetId });

  dataset.status = 'validated';
  dataset.recordCount = cutoffDocs.length;
  await dataset.save();

  return dataset;
}

async function publishDataset(datasetId) {
  let dataset = await Dataset.findById(datasetId);
  if (!dataset) throw new ApiError(404, 'Dataset not found.');

  // If dataset is still in draft state, automatically import valid staged rows first
  if (dataset.status === 'draft') {
    dataset = await importDataset(datasetId);
  }

  dataset.status = 'published';
  dataset.publishedAt = new Date();
  await dataset.save();
  await Cutoff.updateMany({ sourceDatasetId: dataset._id }, { $set: { published: true } });
  return dataset;
}

async function archiveDataset(datasetId) {
  const dataset = await Dataset.findById(datasetId);
  if (!dataset) throw new ApiError(404, 'Dataset not found.');
  dataset.status = 'archived';
  dataset.archivedAt = new Date();
  await dataset.save();
  await Cutoff.updateMany({ sourceDatasetId: dataset._id }, { $set: { published: false } });
  return dataset;
}

async function deleteDataset(datasetId, { confirmPublished } = {}) {
  const dataset = await Dataset.findById(datasetId);
  if (!dataset) throw new ApiError(404, 'Dataset not found.');

  if (dataset.status === 'published' && !confirmPublished) {
    throw new ApiError(400, 'This dataset is published. Pass confirm=true to delete it and its cutoff records.');
  }

  try {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Cutoff.deleteMany({ sourceDatasetId: datasetId }).session(session);
        await DatasetStaging.deleteMany({ datasetId }).session(session);
        await Dataset.deleteOne({ _id: datasetId }).session(session);
      });
    } finally {
      session.endSession();
    }
  } catch (err) {
    // Fallback for standalone MongoDB (no replica set transactions)
    await Cutoff.deleteMany({ sourceDatasetId: datasetId });
    await DatasetStaging.deleteMany({ datasetId });
    await Dataset.deleteOne({ _id: datasetId });
  }
}

async function listDatasets(filters = {}) {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.year) query.year = Number(filters.year);
  if (filters.counsellingType) query.counsellingType = filters.counsellingType;
  if (filters.search) {
    const escaped = String(filters.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.name = { $regex: escaped, $options: 'i' };
  }

  return Dataset.find(query).sort({ uploadedAt: -1 }).populate('uploadedBy', 'name email');
}

module.exports = {
  uploadDataset,
  seedSampleData,
  getValidationReport,
  updateMapping,
  importDataset,
  publishDataset,
  archiveDataset,
  deleteDataset,
  listDatasets,
};
