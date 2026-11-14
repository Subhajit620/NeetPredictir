const asyncHandler = require('../utils/asyncHandler');
const Cutoff = require('../models/Cutoff');

const listCutoffs = asyncHandler(async (req, res) => {
  const {
    state,
    course,
    category,
    quota,
    round,
    year,
    collegeId,
    search,
    maxRank,
    sort = 'closing_asc',
    page = 1,
    limit = 30,
  } = req.query;

  const query = { published: true };
  if (state && state !== 'All India') query.state = state;
  if (course && course !== 'All Courses') query.course = course;
  if (category && category !== 'All Categories') query.category = category;
  if (quota && quota !== 'All Quotas') query.quota = quota;
  if (round && round !== 'All Rounds') query.round = round;
  if (year && year !== 'All Years') query.year = Number(year);
  if (collegeId) query.collegeId = collegeId;

  if (maxRank && Number(maxRank) > 0) {
    query.closingRank = { $gte: Number(maxRank) };
  }

  if (search && String(search).trim()) {
    const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    query.$or = [
      { collegeName: regex },
      { state: regex },
      { category: regex },
      { quota: regex },
      { course: regex },
    ];
  }

  let sortSpec = { closingRank: 1 };
  if (sort === 'closing_desc') sortSpec = { closingRank: -1 };
  else if (sort === 'opening_asc') sortSpec = { openingRank: 1, closingRank: 1 };
  else if (sort === 'name_asc') sortSpec = { collegeName: 1, closingRank: 1 };
  else if (sort === 'fees_asc') sortSpec = { fees: 1, closingRank: 1 };

  const total = await Cutoff.countDocuments(query);
  const cutoffs = await Cutoff.find(query)
    .sort(sortSpec)
    .skip((Number(page) - 1) * Number(limit))
    .limit(Math.min(Number(limit), 5000));

  res.json({ success: true, cutoffs, total, page: Number(page), limit: Number(limit) });
});

module.exports = { listCutoffs };
