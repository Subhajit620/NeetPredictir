const PredictionRequest = require('../models/PredictionRequest');
const Cutoff = require('../models/Cutoff');
const College = require('../models/College');
const counsellingEngine = require('./counsellingEngine');

async function runPrediction(filters, userId) {
  const result = await counsellingEngine.predict(filters);

  await PredictionRequest.create({
    userId,
    rank: result.rank,
    state: filters.state,
    category: filters.category,
    quota: filters.quota,
    course: filters.course,
    collegeType: filters.collegeType,
    maxFees: filters.maxFees,
    round: filters.round,
    year: filters.year,
    datasetIds: result.datasetIds || [],
    resultCollegeIds: result.records.map((r) => r.collegeId?._id).filter(Boolean),
    resultCount: result.records.length,
  });

  return result;
}

async function getAvailableStates() {
  const publishedStates = await Cutoff.distinct('state', { published: true });
  const validStates = publishedStates
    .map((s) => (s ? s.trim() : ''))
    .filter(Boolean)
    .filter((s) => s.toLowerCase() !== 'all india' && s.toLowerCase() !== 'all');

  const sorted = Array.from(new Set(validStates)).sort((a, b) => a.localeCompare(b));

  const fallback = [
    'Arunachal Pradesh', 'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
    'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Puducherry', 'Rajasthan', 'Sikkim',
    'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Chandigarh', 'Andaman and Nicobar Islands', 'Ladakh'
  ];

  const statesList = sorted.length > 0 ? sorted : fallback;
  return ['All India', ...statesList];
}

const { normalizeState } = require('./normalizationService');

async function getAvailableCategories(state) {
  const match = { published: true };
  if (state && !/^(all(\s+india|\s+states)?|india)$/i.test(state)) {
    const normState = normalizeState(state) || state.trim();
    match.$or = [
      { state: { $regex: new RegExp(normState, 'i') } },
      { sourceFile: { $regex: new RegExp(normState, 'i') } },
      { counsellingAuthority: { $regex: new RegExp(normState, 'i') } },
    ];
  }

  const publishedCategories = await Cutoff.distinct('category', match);
  const validCategories = publishedCategories
    .map((c) => (c ? c.trim() : ''))
    .filter(Boolean);

  const STATE_CATEGORY_DEFAULTS = {
    'Arunachal Pradesh': ['APST', 'NON-APST', 'General', 'ST', 'PwD'],
    'Andhra Pradesh': ['General', 'OC', 'BCA', 'BCB', 'BCC', 'BCD', 'BCE', 'SC', 'ST', 'EWS', 'PwD'],
    'Telangana': ['General', 'OC', 'BCA', 'BCB', 'BCC', 'BCD', 'BCE', 'SC', 'ST', 'EWS', 'PwD'],
    'Kerala': ['State Merit', 'SEBC', 'EZ', 'MU', 'BH', 'LA', 'DV', 'VK', 'BX', 'KN', 'KU', 'SC', 'ST', 'EWS', 'PwD'],
  };

  const normState = state ? (normalizeState(state) || state.trim()) : null;
  const stateDefaults = (normState && STATE_CATEGORY_DEFAULTS[normState]) || ['General', 'OBC', 'EWS', 'SC', 'ST', 'PwD'];

  const merged = Array.from(new Set([...validCategories, ...stateDefaults]));
  return merged;
}

module.exports = { runPrediction, getAvailableStates, getAvailableCategories };

