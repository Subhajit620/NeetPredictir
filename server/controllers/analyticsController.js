const asyncHandler = require('../utils/asyncHandler');
const analyticsService = require('../services/analyticsService');

const getDashboard = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDashboard();
  res.json({ success: true, ...data });
});

module.exports = { getDashboard };
