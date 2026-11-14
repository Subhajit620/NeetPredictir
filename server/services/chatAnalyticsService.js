const Cutoff = require('../models/Cutoff');
const College = require('../models/College');
const counsellingEngine = require('./counsellingEngine');
const { normalizeState, normalizeCategory } = require('./normalizationService');

function escapeRegex(str) {
  return String(str || '')
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 1. searchColleges(filters)
 * Queries colleges and classifies by rank using counsellingEngine.
 */
async function searchColleges(filters) {
  return counsellingEngine.predict(filters);
}

/**
 * 2. getCollegeHistory(collegeNameOrQuery, filters)
 * Fetches historical cutoffs across all years and rounds for a specific college.
 */
async function getCollegeHistory(collegeNameOrQuery, filters = {}) {
  const query = { published: true };
  const namePattern = escapeRegex(collegeNameOrQuery);
  query.collegeName = { $regex: new RegExp(namePattern, 'i') };

  if (filters.state && !counsellingEngine.isAllStates(filters.state)) {
    const normState = normalizeState(filters.state) || filters.state;
    query.state = { $regex: new RegExp(`^${escapeRegex(normState)}$`, 'i') };
  }

  if (filters.course) {
    query.course = { $regex: new RegExp(`^${escapeRegex(filters.course)}$`, 'i') };
  }

  if (filters.category && !counsellingEngine.isAllCategories(filters.category)) {
    const normCategory = normalizeCategory(filters.category) || filters.category;
    query.category = { $regex: new RegExp(`^${escapeRegex(normCategory)}$`, 'i') };
  }

  const cutoffs = await Cutoff.find(query)
    .populate('collegeId', 'name state city collegeType ownership website facilities courses')
    .sort({ year: -1, round: 1, closingRank: 1 })
    .lean();

  const collegeInfo = cutoffs[0]?.collegeId || null;
  const collegeName = cutoffs[0]?.collegeName || collegeNameOrQuery;
  const state = cutoffs[0]?.state || null;

  const studentRank = Number(filters.rank);
  const enrichedCutoffs = cutoffs.map((c) => {
    let classification = null;
    let eligible = false;
    if (Number.isFinite(studentRank) && studentRank > 0) {
      const res = counsellingEngine.classifyRank(studentRank, c.openingRank, c.closingRank);
      classification = res.classification;
      eligible = res.eligible;
    }
    return {
      year: c.year,
      round: c.round,
      category: c.category,
      quota: c.quota,
      course: c.course,
      openingRank: c.openingRank,
      closingRank: c.closingRank,
      allottedRank: c.allottedRank || c.allotmentRank,
      fees: c.fees,
      classification,
      eligible,
    };
  });

  const validClosing = enrichedCutoffs.map((c) => c.closingRank).filter((r) => Number.isFinite(r));
  const lowestClosing = validClosing.length > 0 ? Math.min(...validClosing) : null;
  const highestClosing = validClosing.length > 0 ? Math.max(...validClosing) : null;
  const years = [...new Set(enrichedCutoffs.map((c) => c.year))].sort((a, b) => b - a);
  const categories = [...new Set(enrichedCutoffs.map((c) => c.category))];
  const quotas = [...new Set(enrichedCutoffs.map((c) => c.quota).filter(Boolean))];

  return {
    collegeName,
    state,
    collegeInfo,
    cutoffs: enrichedCutoffs,
    totalRecords: enrichedCutoffs.length,
    summary: {
      years,
      categories,
      quotas,
      lowestClosing,
      highestClosing,
      fees: cutoffs[0]?.fees || null,
    },
  };
}

/**
 * 3. compareColleges(collegeNames, filters)
 * Compares 2 or more colleges across cutoffs, fees, location, and category ranks.
 */
async function compareColleges(collegeNames = [], filters = {}) {
  const results = [];
  const studentRank = Number(filters.rank);

  for (const name of collegeNames) {
    if (!name || !name.trim()) continue;
    const history = await getCollegeHistory(name.trim(), filters);
    if (history.cutoffs.length > 0) {
      const latestYear = history.summary.years[0];
      const latestCutoffs = history.cutoffs.filter((c) => c.year === latestYear);

      // Group latest closing ranks by category
      const categoryCutoffs = {};
      for (const c of latestCutoffs) {
        if (!categoryCutoffs[c.category] || (c.closingRank && c.closingRank > categoryCutoffs[c.category])) {
          categoryCutoffs[c.category] = c.closingRank;
        }
      }

      const bestClassification = Number.isFinite(studentRank)
        ? history.cutoffs.find((c) => c.eligible)?.classification || 'BEYOND_HISTORICAL_CLOSING'
        : null;

      results.push({
        collegeName: history.collegeName,
        state: history.state,
        collegeType: history.collegeInfo?.collegeType || 'Medical College',
        ownership: history.collegeInfo?.ownership || 'N/A',
        website: history.collegeInfo?.website || null,
        fees: history.summary.fees,
        latestYear,
        categoryCutoffs,
        lowestClosing: history.summary.lowestClosing,
        highestClosing: history.summary.highestClosing,
        totalHistoricalCutoffs: history.totalRecords,
        bestClassification,
        sampleCutoffs: history.cutoffs.slice(0, 5),
      });
    }
  }

  return {
    comparisonType: 'COLLEGE_COMPARISON',
    colleges: results,
    studentRank: Number.isFinite(studentRank) ? studentRank : null,
  };
}

/**
 * 4. compareStates(states, filters)
 * Compares counselling cutoffs and college availability across 2 or more states.
 */
async function compareStates(states = [], filters = {}) {
  const stateList = states.length > 0 ? states : ['Uttar Pradesh', 'Bihar', 'Delhi', 'Haryana', 'Karnataka'];
  const comparison = [];
  const studentRank = Number(filters.rank);

  for (const st of stateList) {
    const normState = normalizeState(st) || st;
    const query = {
      published: true,
      state: { $regex: new RegExp(`^${escapeRegex(normState)}$`, 'i') },
    };

    if (filters.category && !counsellingEngine.isAllCategories(filters.category)) {
      const normCat = normalizeCategory(filters.category) || filters.category;
      query.category = { $regex: new RegExp(`^${escapeRegex(normCat)}$`, 'i') };
    }

    if (filters.course) {
      query.course = { $regex: new RegExp(`^${escapeRegex(filters.course)}$`, 'i') };
    }

    const cutoffs = await Cutoff.find(query).sort({ closingRank: 1 }).lean();

    if (cutoffs.length > 0) {
      const closingRanks = cutoffs.map((c) => c.closingRank).filter((r) => Number.isFinite(r));
      const minClosing = closingRanks.length > 0 ? Math.min(...closingRanks) : null;
      const maxClosing = closingRanks.length > 0 ? Math.max(...closingRanks) : null;
      const avgClosing = closingRanks.length > 0
        ? Math.round(closingRanks.reduce((a, b) => a + b, 0) / closingRanks.length)
        : null;

      const uniqueColleges = [...new Set(cutoffs.map((c) => c.collegeName))];

      let eligibleCollegesCount = 0;
      if (Number.isFinite(studentRank) && studentRank > 0) {
        eligibleCollegesCount = cutoffs.filter((c) => {
          const res = counsellingEngine.classifyRank(studentRank, c.openingRank, c.closingRank);
          return res.eligible;
        }).length;
      }

      comparison.push({
        state: normState,
        totalColleges: uniqueColleges.length,
        totalCutoffRecords: cutoffs.length,
        mostCompetitiveClosingRank: minClosing,
        easiestClosingRank: maxClosing,
        averageClosingRank: avgClosing,
        eligibleRecordsCount: eligibleCollegesCount,
        topColleges: uniqueColleges.slice(0, 4),
      });
    } else {
      comparison.push({
        state: normState,
        totalColleges: 0,
        totalCutoffRecords: 0,
        message: 'No published historical records available in the database for this state.',
      });
    }
  }

  return {
    comparisonType: 'STATE_COMPARISON',
    states: comparison,
    studentRank: Number.isFinite(studentRank) ? studentRank : null,
  };
}

/**
 * 5. compareCategories(categories, filters)
 * Compares cutoffs across categories (General, OBC, SC, ST, EWS) for a state or college.
 */
async function compareCategories(categories = [], filters = {}) {
  const defaultCategories = ['General', 'OBC', 'EWS', 'SC', 'ST'];
  const targetCategories = categories.length > 0 ? categories : defaultCategories;
  const studentRank = Number(filters.rank);

  const query = { published: true };
  if (filters.state && !counsellingEngine.isAllStates(filters.state)) {
    const normState = normalizeState(filters.state) || filters.state;
    query.state = { $regex: new RegExp(`^${escapeRegex(normState)}$`, 'i') };
  }
  if (filters.collegeName) {
    query.collegeName = { $regex: new RegExp(escapeRegex(filters.collegeName), 'i') };
  }

  const allCutoffs = await Cutoff.find(query).sort({ closingRank: 1 }).lean();
  const comparison = [];

  for (const cat of targetCategories) {
    const normCat = normalizeCategory(cat) || cat;
    const catCutoffs = allCutoffs.filter((c) => {
      const match = new RegExp(`^${escapeRegex(normCat)}$`, 'i').test(c.category || '');
      return match;
    });

    const closingRanks = catCutoffs.map((c) => c.closingRank).filter((r) => Number.isFinite(r));
    const minClosing = closingRanks.length > 0 ? Math.min(...closingRanks) : null;
    const maxClosing = closingRanks.length > 0 ? Math.max(...closingRanks) : null;
    const avgClosing = closingRanks.length > 0
      ? Math.round(closingRanks.reduce((a, b) => a + b, 0) / closingRanks.length)
      : null;

    let studentEligibleCount = 0;
    if (Number.isFinite(studentRank) && studentRank > 0) {
      studentEligibleCount = catCutoffs.filter((c) => {
        const res = counsellingEngine.classifyRank(studentRank, c.openingRank, c.closingRank);
        return res.eligible;
      }).length;
    }

    comparison.push({
      category: normCat,
      totalRecords: catCutoffs.length,
      openingCutoff: minClosing,
      closingCutoff: maxClosing,
      averageClosingRank: avgClosing,
      studentEligibleCount,
    });
  }

  return {
    comparisonType: 'CATEGORY_COMPARISON',
    targetState: filters.state || 'All India / All States',
    targetCollege: filters.collegeName || null,
    categories: comparison,
    studentRank: Number.isFinite(studentRank) ? studentRank : null,
  };
}

/**
 * 6. compareQuotas(quotas, filters)
 * Compares AIQ vs State quota cutoffs.
 */
async function compareQuotas(quotas = [], filters = {}) {
  const targetQuotas = quotas.length > 0 ? quotas : ['AIQ', 'State'];
  const studentRank = Number(filters.rank);

  const query = { published: true };
  if (filters.state && !counsellingEngine.isAllStates(filters.state)) {
    const normState = normalizeState(filters.state) || filters.state;
    query.state = { $regex: new RegExp(`^${escapeRegex(normState)}$`, 'i') };
  }
  if (filters.category && !counsellingEngine.isAllCategories(filters.category)) {
    const normCat = normalizeCategory(filters.category) || filters.category;
    query.category = { $regex: new RegExp(`^${escapeRegex(normCat)}$`, 'i') };
  }

  const allCutoffs = await Cutoff.find(query).lean();
  const quotaComparison = [];

  for (const q of targetQuotas) {
    const isAiq = /aiq|all\s*india/i.test(q);
    const quotaCutoffs = allCutoffs.filter((c) => {
      if (isAiq) return /aiq|all\s*india/i.test(c.quota || '');
      return /state/i.test(c.quota || '');
    });

    const closingRanks = quotaCutoffs.map((c) => c.closingRank).filter((r) => Number.isFinite(r));
    const minClosing = closingRanks.length > 0 ? Math.min(...closingRanks) : null;
    const maxClosing = closingRanks.length > 0 ? Math.max(...closingRanks) : null;
    const avgClosing = closingRanks.length > 0
      ? Math.round(closingRanks.reduce((a, b) => a + b, 0) / closingRanks.length)
      : null;

    let studentEligibleCount = 0;
    if (Number.isFinite(studentRank) && studentRank > 0) {
      studentEligibleCount = quotaCutoffs.filter((c) => {
        const res = counsellingEngine.classifyRank(studentRank, c.openingRank, c.closingRank);
        return res.eligible;
      }).length;
    }

    quotaComparison.push({
      quota: isAiq ? 'AIQ (15% All India Quota)' : 'State Quota (85%)',
      totalRecords: quotaCutoffs.length,
      openingCutoff: minClosing,
      closingCutoff: maxClosing,
      averageClosingRank: avgClosing,
      studentEligibleCount,
    });
  }

  return {
    comparisonType: 'QUOTA_COMPARISON',
    targetState: filters.state || 'All India / All States',
    quotas: quotaComparison,
    studentRank: Number.isFinite(studentRank) ? studentRank : null,
  };
}

/**
 * 7. compareRounds(rounds, filters)
 * Compares Round 1 vs Round 2 vs Mop-up / Stray rounds.
 */
async function compareRounds(rounds = [], filters = {}) {
  const query = { published: true };
  if (filters.state && !counsellingEngine.isAllStates(filters.state)) {
    const normState = normalizeState(filters.state) || filters.state;
    query.state = { $regex: new RegExp(`^${escapeRegex(normState)}$`, 'i') };
  }
  if (filters.category && !counsellingEngine.isAllCategories(filters.category)) {
    const normCat = normalizeCategory(filters.category) || filters.category;
    query.category = { $regex: new RegExp(`^${escapeRegex(normCat)}$`, 'i') };
  }

  const allCutoffs = await Cutoff.find(query).lean();
  const availableRounds = rounds.length > 0 ? rounds : ['Round 1', 'Round 2', 'Round 3', 'Mop-Up', 'Stray Vacancy'];
  const roundComparison = [];

  for (const r of availableRounds) {
    const rCutoffs = allCutoffs.filter((c) => {
      return new RegExp(escapeRegex(r), 'i').test(c.round || '');
    });

    if (rCutoffs.length > 0) {
      const closingRanks = rCutoffs.map((c) => c.closingRank).filter((val) => Number.isFinite(val));
      const minClosing = closingRanks.length > 0 ? Math.min(...closingRanks) : null;
      const maxClosing = closingRanks.length > 0 ? Math.max(...closingRanks) : null;
      const avgClosing = closingRanks.length > 0
        ? Math.round(closingRanks.reduce((a, b) => a + b, 0) / closingRanks.length)
        : null;

      roundComparison.push({
        round: r,
        totalRecords: rCutoffs.length,
        minClosing,
        maxClosing,
        avgClosing,
      });
    }
  }

  return {
    comparisonType: 'ROUND_COMPARISON',
    targetState: filters.state || 'All States',
    rounds: roundComparison,
  };
}

/**
 * 8. compareYears(years, filters)
 * Compares cutoffs across years.
 */
async function compareYears(years = [], filters = {}) {
  const query = { published: true };
  if (filters.state && !counsellingEngine.isAllStates(filters.state)) {
    const normState = normalizeState(filters.state) || filters.state;
    query.state = { $regex: new RegExp(`^${escapeRegex(normState)}$`, 'i') };
  }

  const allCutoffs = await Cutoff.find(query).lean();
  const distinctYears = years.length > 0 ? years : [...new Set(allCutoffs.map((c) => c.year))].sort();
  const yearComparison = [];

  for (const y of distinctYears) {
    const yCutoffs = allCutoffs.filter((c) => Number(c.year) === Number(y));
    if (yCutoffs.length > 0) {
      const closingRanks = yCutoffs.map((c) => c.closingRank).filter((val) => Number.isFinite(val));
      const minClosing = closingRanks.length > 0 ? Math.min(...closingRanks) : null;
      const maxClosing = closingRanks.length > 0 ? Math.max(...closingRanks) : null;
      const avgClosing = closingRanks.length > 0
        ? Math.round(closingRanks.reduce((a, b) => a + b, 0) / closingRanks.length)
        : null;

      yearComparison.push({
        year: y,
        totalRecords: yCutoffs.length,
        minClosing,
        maxClosing,
        avgClosing,
      });
    }
  }

  return {
    comparisonType: 'YEAR_COMPARISON',
    years: yearComparison,
  };
}

/**
 * 9. analyzeRank(rank, filters)
 * Provides detailed categorization: Safe, Target/Realistic, Ambitious, and advice.
 */
async function analyzeRank(rank, filters = {}) {
  const r = Number(rank);
  if (!Number.isFinite(r) || r <= 0) {
    return { error: 'Invalid NEET AIR provided' };
  }

  const prediction = await counsellingEngine.predict({ ...filters, rank: r, limit: 500 });
  const { records, totalFiltered, withinRange, betterThanOpening, beyondClosing } = prediction;

  const betterThanOpeningColleges = records.filter((rec) => rec.isBetterThanOpening);
  const withinRangeColleges = records.filter((rec) => rec.isWithinHistoricalRange);
  const beyondClosingColleges = records.filter((rec) => rec.isBeyondHistoricalClosing);
  const unavailableColleges = records.filter((rec) => rec.status === 'HISTORICAL_DATA_UNAVAILABLE');

  const govtCount = records.filter((rec) => /govt|government/i.test(rec.collegeType || '') && rec.eligible).length;
  const privateCount = records.filter((rec) => /private/i.test(rec.collegeType || '') && rec.eligible).length;

  return {
    analysisType: 'RANK_ANALYSIS',
    rank: r,
    filters: prediction.filters,
    stats: {
      totalMatching: totalFiltered,
      withinRangeCount: withinRangeColleges.length,
      betterThanOpeningCount: betterThanOpeningColleges.length,
      beyondClosingCount: beyondClosingColleges.length,
      unavailableCount: unavailableColleges.length,
      eligibleGovernmentColleges: govtCount,
      eligiblePrivateColleges: privateCount,
    },
    betterThanOpeningColleges: betterThanOpeningColleges.slice(0, 15),
    withinRangeColleges: withinRangeColleges.slice(0, 15),
    beyondClosingColleges: beyondClosingColleges.slice(0, 15),
  };
}

/**
 * 10. getDatasetStatistics()
 * Returns overall statistics of published counselling data.
 */
async function getDatasetStatistics() {
  const totalCutoffs = await Cutoff.countDocuments({ published: true });
  const totalColleges = await College.countDocuments({ isActive: true });
  const states = await Cutoff.distinct('state', { published: true });
  const categories = await Cutoff.distinct('category', { published: true });
  const quotas = await Cutoff.distinct('quota', { published: true });
  const courses = await Cutoff.distinct('course', { published: true });
  const years = await Cutoff.distinct('year', { published: true });
  const rounds = await Cutoff.distinct('round', { published: true });

  return {
    totalCutoffs,
    totalColleges,
    states: states.filter(Boolean).sort(),
    categories: categories.filter(Boolean),
    quotas: quotas.filter(Boolean),
    courses: courses.filter(Boolean),
    years: years.filter(Boolean).sort((a, b) => b - a),
    rounds: rounds.filter(Boolean),
  };
}

/**
 * 11. analyzeTrends(filters)
 * Identifies colleges whose closing cutoffs shifted over years (e.g. became easier/harder).
 */
async function analyzeTrends(filters = {}) {
  const query = { published: true };
  if (filters.state && !counsellingEngine.isAllStates(filters.state)) {
    const normState = normalizeState(filters.state) || filters.state;
    query.state = { $regex: new RegExp(`^${escapeRegex(normState)}$`, 'i') };
  }
  if (filters.course) {
    query.course = { $regex: new RegExp(`^${escapeRegex(filters.course)}$`, 'i') };
  }
  if (filters.category && !counsellingEngine.isAllCategories(filters.category)) {
    const normCategory = normalizeCategory(filters.category) || filters.category;
    query.category = { $regex: new RegExp(`^${escapeRegex(normCategory)}$`, 'i') };
  }

  const cutoffs = await Cutoff.find(query).sort({ collegeName: 1, year: 1 }).lean();

  const collegeMap = {};
  for (const c of cutoffs) {
    if (!collegeMap[c.collegeName]) {
      collegeMap[c.collegeName] = { collegeName: c.collegeName, state: c.state, years: {} };
    }
    if (Number.isFinite(c.closingRank)) {
      collegeMap[c.collegeName].years[c.year] = c.closingRank;
    }
  }

  const trends = [];
  for (const [name, info] of Object.entries(collegeMap)) {
    const yearsArr = Object.keys(info.years).map(Number).sort((a, b) => a - b);
    if (yearsArr.length >= 2) {
      const firstYear = yearsArr[0];
      const lastYear = yearsArr[yearsArr.length - 1];
      const firstClosing = info.years[firstYear];
      const lastClosing = info.years[lastYear];
      const change = lastClosing - firstClosing;
      trends.push({
        collegeName: name,
        state: info.state,
        firstYear,
        lastYear,
        firstClosing,
        lastClosing,
        closingChange: change,
        trendDirection: change > 0 ? 'HISTORICALLY_EASIER' : (change < 0 ? 'MORE_COMPETITIVE' : 'STABLE'),
      });
    }
  }

  trends.sort((a, b) => b.closingChange - a.closingChange);

  return {
    analysisType: 'TREND_ANALYSIS',
    totalCollegesAnalyzed: Object.keys(collegeMap).length,
    easierColleges: trends.filter((t) => t.closingChange > 0).slice(0, 10),
    competitiveColleges: trends.filter((t) => t.closingChange < 0).slice(0, 10),
    allTrends: trends.slice(0, 25),
  };
}

module.exports = {
  searchColleges,
  getCollegeHistory,
  compareColleges,
  compareStates,
  compareCategories,
  compareQuotas,
  compareRounds,
  compareYears,
  analyzeRank,
  analyzeTrends,
  getDatasetStatistics,
};

