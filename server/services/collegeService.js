const College = require('../models/College');
const Cutoff = require('../models/Cutoff');
const ApiError = require('../utils/ApiError');
const { normalizeState } = require('./normalizationService');

function escapeRegex(str) {
  return String(str || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function listColleges({ state, course, collegeType, search, page = 1, limit = 20 }) {
  const cutoffMatch = { published: true };
  if (state && !/^(all(\s+india|\s+states)?|india)$/i.test(state)) {
    const normState = normalizeState(state) || state.trim();
    cutoffMatch.state = { $regex: new RegExp(`^${escapeRegex(normState)}$`, 'i') };
  }
  if (course && !/^(all|all\s+courses)$/i.test(course)) {
    cutoffMatch.course = { $regex: new RegExp(`^${escapeRegex(course.trim())}$`, 'i') };
  }

  const collegeIds = await Cutoff.distinct('collegeId', cutoffMatch);
  if (collegeIds.length === 0) return { colleges: [], total: 0, page: Number(page), limit: Number(limit) };

  const query = { _id: { $in: collegeIds } };
  if (collegeType) query.collegeType = { $regex: new RegExp(`^${escapeRegex(collegeType.trim())}$`, 'i') };
  
  if (search && search.trim()) {
    const s = escapeRegex(search.trim());
    query.$or = [
      { name: { $regex: s, $options: 'i' } },
      { state: { $regex: s, $options: 'i' } },
      { city: { $regex: s, $options: 'i' } },
      { district: { $regex: s, $options: 'i' } },
      { collegeCode: { $regex: s, $options: 'i' } },
    ];
  }

  const total = await College.countDocuments(query);
  const colleges = await College.find(query)
    .sort({ name: 1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  return { colleges, total, page: Number(page), limit: Number(limit) };
}

async function getCollegeSuggestions(search, limit = 10) {
  if (!search || !search.trim()) return [];
  const s = escapeRegex(search.trim());
  const query = {
    $or: [
      { name: { $regex: s, $options: 'i' } },
      { state: { $regex: s, $options: 'i' } },
      { city: { $regex: s, $options: 'i' } },
    ],
  };
  const colleges = await College.find(query)
    .select('name state city collegeType')
    .limit(limit)
    .lean();
  return colleges;
}

async function getCollegeDetail(collegeId) {
  const college = await College.findById(collegeId);
  if (!college) throw new ApiError(404, 'College not found.');

  const cutoffs = await Cutoff.find({ collegeId, published: true })
    .sort({ year: -1, round: 1 })
    .lean();

  if (cutoffs.length === 0) {
    return { college, cutoffs: [], message: 'No published historical records found for this college.' };
  }

  return { college, cutoffs };
}

module.exports = { listColleges, getCollegeSuggestions, getCollegeDetail };
