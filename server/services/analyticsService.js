const Dataset = require('../models/Dataset');
const College = require('../models/College');
const Cutoff = require('../models/Cutoff');
const User = require('../models/User');
const PredictionRequest = require('../models/PredictionRequest');

async function groupCount(field) {
  const rows = await Cutoff.aggregate([
    { $match: { published: true } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return rows.map((r) => ({ label: r._id || 'Unknown', count: r.count }));
}

async function getDashboard() {
  const [totalDatasets, publishedDatasets, totalColleges, totalCutoffRecords, totalUsers, totalPredictions, latestDataset] =
    await Promise.all([
      Dataset.countDocuments({}),
      Dataset.countDocuments({ status: 'published' }),
      College.countDocuments({ isActive: { $ne: false } }),
      Cutoff.countDocuments({ published: true }),
      User.countDocuments({}),
      PredictionRequest.countDocuments({}),
      Dataset.findOne({}).sort({ uploadedAt: -1 }).select('name year round status uploadedAt'),
    ]);

  const [byState, byYear, byRound, byCategory, byQuota] = await Promise.all([
    groupCount('state'),
    groupCount('year'),
    groupCount('round'),
    groupCount('category'),
    groupCount('quota'),
  ]);

  return {
    totalDatasets,
    publishedDatasets,
    totalColleges,
    totalCutoffRecords,
    totalUsers,
    totalPredictions,
    latestDataset,
    byState,
    byYear,
    byRound,
    byCategory,
    byQuota,
  };
}

module.exports = { getDashboard };
