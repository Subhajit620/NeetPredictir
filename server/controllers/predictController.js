const asyncHandler = require('../utils/asyncHandler');
const predictionService = require('../services/predictionService');

const predict = asyncHandler(async (req, res) => {
  const result = await predictionService.runPrediction(req.body, req.user._id);
  res.json({ success: true, ...result });
});

const getStates = asyncHandler(async (req, res) => {
  const states = await predictionService.getAvailableStates();
  res.json({ success: true, states });
});

const getCategories = asyncHandler(async (req, res) => {
  const categories = await predictionService.getAvailableCategories(req.query.state);
  res.json({ success: true, categories });
});

module.exports = { predict, getStates, getCategories };

