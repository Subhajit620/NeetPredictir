const asyncHandler = require('../utils/asyncHandler');
const collegeService = require('../services/collegeService');

const listColleges = asyncHandler(async (req, res) => {
  const result = await collegeService.listColleges(req.query);
  res.json({ success: true, ...result });
});

const getCollege = asyncHandler(async (req, res) => {
  const result = await collegeService.getCollegeDetail(req.params.id);
  res.json({ success: true, ...result });
});

const getSuggestions = asyncHandler(async (req, res) => {
  const suggestions = await collegeService.getCollegeSuggestions(req.query.search || req.query.q, req.query.limit);
  res.json({ success: true, suggestions });
});

module.exports = { listColleges, getSuggestions, getCollege };

