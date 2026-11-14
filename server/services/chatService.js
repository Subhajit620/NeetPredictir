const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const predictionService = require('./predictionService');
const chatAnalyticsService = require('./chatAnalyticsService');
const counsellingEngine = require('./counsellingEngine');
const aiService = require('./aiService');
const { normalizeState, normalizeCategory } = require('./normalizationService');

const CONTEXT_FIELDS = [
  'studentName',
  'name',
  'air',
  'rank',
  'neetScore',
  'score',
  'percentile',
  'domicileState',
  'targetStates',
  'targetState',
  'state',
  'category',
  'quota',
  'course',
  'collegeType',
  'maxFees',
  'round',
  'year',
  'pwd',
  'ews',
  'minority',
  'nri',
  'specialCategory',
  'previousResults',
  'selectedColleges',
];

async function getOrCreateSession(sessionId, userId) {
  if (sessionId) {
    const existing = await ChatSession.findOne({
      _id: sessionId,
      $or: [{ userId }, { userId: null }, { userId: { $exists: false } }],
    });
    if (existing) {
      if (userId && !existing.userId) {
        existing.userId = userId;
        await existing.save();
      }
      return existing;
    }
  }

  let userProfile = null;
  if (userId) {
    const User = require('../models/User');
    userProfile = await User.findById(userId).lean();
  }

  return ChatSession.create({
    userId,
    context: {
      studentName: userProfile?.name || null,
      name: userProfile?.name || null,
      air: userProfile?.air || null,
      rank: userProfile?.air || null,
      neetScore: userProfile?.score || null,
      score: userProfile?.score || null,
      percentile: userProfile?.percentile || null,
      domicileState: userProfile?.domicileState || null,
      targetStates: userProfile?.targetStates || [],
      targetState: userProfile?.targetStates?.[0] || null,
      state: userProfile?.targetStates?.[0] || userProfile?.domicileState || null,
      category: userProfile?.category || null,
      quota: userProfile?.quota && userProfile.quota !== 'All Quotas' ? userProfile.quota : null,
      course: userProfile?.course || 'MBBS',
      collegeType: userProfile?.collegeType && userProfile.collegeType !== 'All' ? userProfile.collegeType : null,
      maxFees: userProfile?.maxFees || null,
      round: null,
      year: null,
      pwd: userProfile?.isPwd || null,
      ews: null,
      minority: userProfile?.isMinority || null,
      nri: userProfile?.isNri || null,
      specialCategory: null,
      previousResults: [],
      selectedColleges: [],
    },
  });
}

function mergeContext(existing = {}, extracted = {}) {
  const merged = { ...(existing.toObject ? existing.toObject() : existing) };

  // 1. studentName / name
  if (extracted.studentName && typeof extracted.studentName === 'string' && extracted.studentName.trim() !== '') {
    merged.studentName = extracted.studentName.trim();
    merged.name = extracted.studentName.trim();
  } else if (extracted.name && typeof extracted.name === 'string' && extracted.name.trim() !== '') {
    merged.studentName = extracted.name.trim();
    merged.name = extracted.name.trim();
  }

  // 2. air / rank (Do not permanently overwrite if this is a temporary what-if query)
  if (!extracted.isWhatIf) {
    if (extracted.air !== undefined && extracted.air !== null && Number(extracted.air) > 0) {
      const r = Number(extracted.air);
      merged.air = r;
      merged.rank = r;
    } else if (extracted.rank !== undefined && extracted.rank !== null && Number(extracted.rank) > 0) {
      const r = Number(extracted.rank);
      merged.air = r;
      merged.rank = r;
    } else if (merged.air || merged.rank) {
      const r = Number(merged.air || merged.rank);
      merged.air = r;
      merged.rank = r;
    }
  }

  // 2b. rankType & categoryRank
  if (extracted.rankType) {
    merged.rankType = extracted.rankType;
  } else if (!merged.rankType && (extracted.air || extracted.rank)) {
    merged.rankType = 'UNSPECIFIED';
  }
  if (extracted.categoryRank !== undefined && extracted.categoryRank !== null && Number(extracted.categoryRank) > 0) {
    merged.categoryRank = Number(extracted.categoryRank);
  }

  // 3. neetScore / score
  if (extracted.neetScore !== undefined && extracted.neetScore !== null && Number(extracted.neetScore) > 0) {
    merged.neetScore = Number(extracted.neetScore);
    merged.score = Number(extracted.neetScore);
  } else if (extracted.score !== undefined && extracted.score !== null && Number(extracted.score) > 0) {
    merged.neetScore = Number(extracted.score);
    merged.score = Number(extracted.score);
  }

  // 4. percentile
  if (extracted.percentile !== undefined && extracted.percentile !== null) {
    merged.percentile = Number(extracted.percentile);
  }

  // 5. category
  if (extracted.category && typeof extracted.category === 'string' && extracted.category.trim() !== '') {
    merged.category = normalizeCategory(extracted.category) || extracted.category.trim();
  }

  // 6. domicileState
  if (extracted.domicileState && typeof extracted.domicileState === 'string' && extracted.domicileState.trim() !== '') {
    merged.domicileState = normalizeState(extracted.domicileState) || extracted.domicileState.trim();
  } else if (extracted.domicile && typeof extracted.domicile === 'string' && extracted.domicile.trim() !== '') {
    merged.domicileState = normalizeState(extracted.domicile) || extracted.domicile.trim();
  }

  // 7. targetStates / targetState / state
  if (Array.isArray(extracted.targetStates) && extracted.targetStates.length > 0) {
    merged.targetStates = extracted.targetStates.map((s) => normalizeState(s) || s);
    merged.targetState = merged.targetStates[0];
    merged.state = merged.targetStates[0];
  } else if (extracted.targetState && typeof extracted.targetState === 'string' && extracted.targetState.trim() !== '') {
    const norm = normalizeState(extracted.targetState) || extracted.targetState.trim();
    merged.targetState = norm;
    merged.state = norm;
    merged.targetStates = [norm];
  } else if (extracted.state && typeof extracted.state === 'string' && extracted.state.trim() !== '') {
    const norm = normalizeState(extracted.state) || extracted.state.trim();
    merged.targetState = norm;
    merged.state = norm;
    merged.targetStates = [norm];
  } else if (Array.isArray(merged.targetStates) && merged.targetStates.length > 0) {
    merged.targetState = merged.targetStates[0];
    merged.state = merged.targetStates[0];
  } else if (merged.state || merged.targetState) {
    const st = merged.targetState || merged.state;
    merged.targetState = st;
    merged.state = st;
    merged.targetStates = [st];
  }

  // 8. course
  if (extracted.course && typeof extracted.course === 'string' && extracted.course.trim() !== '') {
    merged.course = extracted.course.trim().toUpperCase();
  }
  if (!merged.course) {
    merged.course = 'MBBS';
  }

  // 9. quota
  if (extracted.quota && typeof extracted.quota === 'string' && extracted.quota.trim() !== '') {
    merged.quota = extracted.quota.trim();
  }

  // 10. collegeType
  if (extracted.collegeType && typeof extracted.collegeType === 'string' && extracted.collegeType.trim() !== '') {
    merged.collegeType = extracted.collegeType.trim();
  }

  // 11. maxFees
  if (extracted.maxFees !== undefined && extracted.maxFees !== null) {
    merged.maxFees = Number(extracted.maxFees);
  }

  // 12. round
  if (extracted.round !== undefined && extracted.round !== null && extracted.round !== '') {
    merged.round = String(extracted.round).trim();
  }

  // 13. year
  if (extracted.year !== undefined && extracted.year !== null) {
    merged.year = Number(extracted.year);
  }

  // 14. Special category flags
  if (extracted.pwd !== undefined && extracted.pwd !== null && extracted.pwd !== '') merged.pwd = extracted.pwd;
  if (extracted.ews !== undefined && extracted.ews !== null && extracted.ews !== '') merged.ews = extracted.ews;
  if (extracted.minority !== undefined && extracted.minority !== null && extracted.minority !== '') merged.minority = extracted.minority;
  if (extracted.nri !== undefined && extracted.nri !== null && extracted.nri !== '') merged.nri = extracted.nri;
  if (extracted.specialCategory !== undefined && extracted.specialCategory !== null && extracted.specialCategory !== '') merged.specialCategory = extracted.specialCategory;

  // 15. Clear explicit requested fields
  for (const field of extracted.clearFields || []) {
    if (field === 'targetStates' || field === 'targetState' || field === 'state') {
      merged.targetStates = [];
      merged.targetState = null;
      merged.state = null;
    } else if (field === 'air' || field === 'rank') {
      merged.air = null;
      merged.rank = null;
    } else if (field in merged) {
      merged[field] = null;
    }
  }

  return merged;
}

const queryPlanner = require('./queryPlannerService');

async function processMessage({ userId, sessionId, message }) {
  const session = await getOrCreateSession(sessionId, userId);
  const history = await ChatMessage.find({ sessionId: session._id }).sort({ createdAt: 1 }).limit(20).lean();

  await ChatMessage.create({ sessionId: session._id, role: 'user', text: message });

  const extracted = await aiService.extractIntent({
    message,
    context: {
      ...session.context,
      studentProfile: session.studentProfile,
      searchContext: session.searchContext,
      previousResults: session.previousResults || [],
      selectedColleges: session.selectedColleges || [],
    },
    history: history.map((h) => ({ role: h.role, text: h.text })),
  });

  // Merge sticky search parameters (never blindly overwrite existing valid context)
  session.context = mergeContext(session.context, extracted);
  session.studentProfile = {
    studentName: session.context.studentName,
    name: session.context.studentName,
    air: session.context.air,
    rank: session.context.rank,
    rankType: session.context.rankType || 'UNSPECIFIED',
    neetScore: session.context.neetScore,
    score: session.context.score,
    percentile: session.context.percentile,
    categoryRank: session.context.categoryRank,
    category: session.context.category,
    domicileState: session.context.domicileState,
    pwd: Boolean(session.context.pwd),
    ews: Boolean(session.context.ews),
    minority: Boolean(session.context.minority),
    nri: Boolean(session.context.nri),
    specialCategory: session.context.specialCategory,
  };
  session.searchContext = {
    targetStates: session.context.targetStates || [],
    targetState: session.context.targetState,
    state: session.context.state,
    course: session.context.course || 'MBBS',
    quota: session.context.quota,
    year: session.context.year,
    round: session.context.round,
    collegeType: session.context.collegeType,
    maxFees: session.context.maxFees,
  };
  session.markModified('context');
  session.markModified('studentProfile');
  session.markModified('searchContext');

  // Construct deterministic Query Plan
  const plan = queryPlanner.createQueryPlan({ queryAnalysis: extracted, sessionContext: session });

  let intent = plan.intent;
  let askFor = null;
  let records = [];
  let total = 0;
  let comparisonData = null;
  let analyticsData = null;
  let queryResult = null;

  const studentName = session.context.studentName || session.context.name || null;
  const studentGreeting = studentName ? `Nice to meet you, **${studentName}**! ` : 'Got it! ';

  // Handle invalid noise input
  if (extracted.isInvalidNoise) {
    const replyText = `I couldn't identify a valid NEET rank from your input. Please enter your valid **NEET AIR (All India Rank)** between 1 and 25,00,000.`;
    const assistantMsg = await ChatMessage.create({
      sessionId: session._id,
      role: 'assistant',
      text: replyText,
      filters: session.context,
    });
    session.lastMessageAt = new Date();
    await session.save();
    return {
      session,
      message: assistantMsg,
      records: [],
      total: 0,
      askFor: 'rank',
      suggestedFollowUps: ['AIR 2000', 'AIR 5000', 'AIR 15000', 'AIR 25000'],
    };
  }

  // Handle pure score input when AIR is missing
  if (extracted.neetScore && !session.context.rank && !session.context.air) {
    askFor = 'rank';
    const replyText = `${studentGreeting}You mentioned a score of **${extracted.neetScore} marks**. In NEET counselling, historical cutoffs and seat allotments are published strictly on the basis of **NEET AIR (All India Rank)**.\n\nPlease share your **NEET AIR** so I can search the verified counselling dataset for you.`;
    const assistantMsg = await ChatMessage.create({
      sessionId: session._id,
      role: 'assistant',
      text: replyText,
      filters: session.context,
    });
    session.lastMessageAt = new Date();
    await session.save();
    return {
      session,
      message: assistantMsg,
      records: [],
      total: 0,
      askFor: 'rank',
      suggestedFollowUps: ['AIR 2000', 'AIR 5000', 'AIR 15000', 'AIR 25000'],
    };
  }

  // 1. GREETING
  if (intent === 'GREETING' || extracted.isGreetingOrOffTopic) {
    queryResult = { topic: 'GREETING' };
  }

  // 2. UPDATE_PROFILE
  else if (intent === 'UPDATE_PROFILE') {
    if (session.context.rank || session.context.air) {
      // Rerun prediction immediately with the updated profile
      const searchFilter = { ...session.context };
      const coverage = await counsellingEngine.checkFilterCoverage(searchFilter);
      const prediction = await predictionService.runPrediction(searchFilter, userId);
      records = prediction.records || [];
      total = prediction.totalFiltered || prediction.total || records.length;

      let isBroaderView = false;
      if (records.length === 0 && (!coverage.hasCoverage || searchFilter.state === 'Kerala' || (searchFilter.targetStates && searchFilter.targetStates.includes('Kerala')))) {
        const broaderAIQ = await counsellingEngine.getBroaderAIQOptions(searchFilter, 10);
        if (broaderAIQ.length > 0) {
          records = broaderAIQ;
          total = broaderAIQ.length;
          isBroaderView = true;
        }
      }

      queryResult = {
        records: records.slice(0, 20),
        totalFiltered: total,
        withinRange: prediction.withinRange,
        betterThanOpening: prediction.betterThanOpening,
        beyondClosing: prediction.beyondClosing,
        counts: prediction.counts,
        coverage,
        isBroaderView,
        needsRankTypeClarification: plan.validation?.needsRankTypeClarification,
        needsDomicileClarification: plan.validation?.needsDomicileClarification,
      };
      intent = 'COLLEGE_PREDICTION';
    } else {
      queryResult = {
        topic: 'UPDATE_PROFILE',
        studentProfile: session.studentProfile,
        searchContext: session.searchContext,
      };
    }
  }

  // 3. DATASET QUESTION
  else if (intent === 'DATASET_QUESTION' || intent === 'DATASET_STATISTICS') {
    queryResult = await chatAnalyticsService.getDatasetStatistics();
    analyticsData = queryResult;
  }

  // 4. COUNSELLING EXPLANATION / GENERAL QUESTIONS
  else if (intent === 'COUNSELLING_EXPLANATION' || intent === 'GENERAL_NEET_QUESTION') {
    queryResult = { topic: message };
  }

  // 5. COLLEGE DETAILS
  else if (intent === 'COLLEGE_DETAILS' && (plan.filters.targetColleges?.length > 0 || message)) {
    const target = plan.filters.targetColleges?.[0] || message;
    queryResult = await chatAnalyticsService.getCollegeHistory(target, session.context);
    analyticsData = queryResult;
    if (queryResult.cutoffs?.length > 0) {
      records = queryResult.cutoffs.slice(0, 15);
      total = queryResult.totalRecords;
    }
  }

  // 6. COLLEGE COMPARISON
  else if (intent === 'COLLEGE_COMPARISON') {
    let collegesToCompare = plan.filters.targetColleges || [];
    if (collegesToCompare.length === 0 && session.context.lastResultCollegeIds?.length > 0) {
      const prevRecords = await predictionService.runPrediction(session.context, userId);
      collegesToCompare = prevRecords.records.slice(0, 3).map((r) => r.collegeName);
    }

    if (collegesToCompare.length > 0) {
      queryResult = await chatAnalyticsService.compareColleges(collegesToCompare, session.context);
      comparisonData = queryResult;
    } else {
      queryResult = { message: 'Please specify the college names you want to compare (e.g. "Compare AIIMS Delhi vs VMMC").' };
    }
  }

  // 7. STATE COMPARISON
  else if (intent === 'STATE_COMPARISON') {
    const states = plan.filters.targetStates?.length > 0 && !counsellingEngine.isAllStates(plan.filters.targetStates[0])
      ? plan.filters.targetStates
      : ['Uttar Pradesh', 'Bihar', 'Delhi', 'Haryana', 'Karnataka', 'Maharashtra'];
    queryResult = await chatAnalyticsService.compareStates(states, session.context);
    comparisonData = queryResult;
  }

  // 8. CATEGORY COMPARISON
  else if (intent === 'CATEGORY_COMPARISON') {
    queryResult = await chatAnalyticsService.compareCategories(plan.filters.targetCategories, session.context);
    comparisonData = queryResult;
  }

  // 9. QUOTA COMPARISON
  else if (intent === 'QUOTA_COMPARISON') {
    queryResult = await chatAnalyticsService.compareQuotas(plan.filters.targetQuotas, session.context);
    comparisonData = queryResult;
  }

  // 10. ROUND COMPARISON
  else if (intent === 'ROUND_COMPARISON') {
    queryResult = await chatAnalyticsService.compareRounds(plan.filters.targetRounds, session.context);
    comparisonData = queryResult;
  }

  // 11. YEAR COMPARISON
  else if (intent === 'YEAR_COMPARISON') {
    queryResult = await chatAnalyticsService.compareYears(plan.filters.targetYears, session.context);
    comparisonData = queryResult;
  }

  // 12. WHAT-IF ANALYSIS (Temporary Simulation without overwriting saved profile)
  else if (intent === 'WHAT_IF_ANALYSIS') {
    const tempAir = extracted.air || extracted.rank || session.context.air;
    const tempCategory = extracted.category || session.context.category;
    const tempFilter = { ...session.context, air: tempAir, rank: tempAir, category: tempCategory };
    const prediction = await predictionService.runPrediction(tempFilter, userId);
    records = prediction.records || [];
    total = prediction.totalFiltered || prediction.total || records.length;
    queryResult = {
      isWhatIf: true,
      currentRank: session.context.air,
      simulatedRank: tempAir,
      simulatedCategory: tempCategory,
      records: records.slice(0, 20),
      totalFiltered: total,
      withinRange: prediction.withinRange,
      betterThanOpening: prediction.betterThanOpening,
      beyondClosing: prediction.beyondClosing,
      counts: prediction.counts,
    };
  }

  // 13. TREND ANALYSIS
  else if (intent === 'TREND_ANALYSIS') {
    queryResult = await chatAnalyticsService.analyzeTrends(session.context);
    analyticsData = queryResult;
  }

  // 14. HISTORICAL ANALYSIS / WHY SHOWN
  else if (intent === 'HISTORICAL_ANALYSIS') {
    const topCollege = session.previousResults?.[0]?.collegeName || plan.filters.targetColleges?.[0];
    if (topCollege) {
      queryResult = await chatAnalyticsService.getCollegeHistory(topCollege, session.context);
      analyticsData = queryResult;
      records = queryResult.cutoffs?.slice(0, 15) || [];
      total = queryResult.totalRecords || records.length;
    } else {
      queryResult = {
        message: 'This college is shown because its historical category, quota, and state cutoffs matched your criteria.',
      };
    }
  }

  // 15. RANK ANALYSIS
  else if (intent === 'RANK_ANALYSIS') {
    if (!session.context.rank && !session.context.air) {
      askFor = 'rank';
      queryResult = { message: 'Please share your NEET AIR to analyze your historical rank fit.' };
    } else {
      queryResult = await chatAnalyticsService.analyzeRank(session.context.rank || session.context.air, session.context);
      analyticsData = queryResult;
      records = [...(queryResult.betterThanOpeningColleges || []), ...(queryResult.withinRangeColleges || [])].slice(0, 20);
      total = queryResult.stats?.totalMatching || records.length;
    }
  }

  // 13. COLLEGE SEARCH (Can search without AIR, or with AIR)
  else if (intent === 'COLLEGE_SEARCH' && (!session.context.rank && !session.context.air)) {
    const searchRes = await counsellingEngine.searchCutoffs(session.context);
    records = searchRes.records || [];
    total = searchRes.totalFiltered || records.length;
    queryResult = {
      records: records.slice(0, 20),
      totalFiltered: total,
      state: session.context.state || session.context.targetState || 'All India',
      course: session.context.course || 'MBBS',
    };
  }

  // 14. BEST MATCH / COLLEGE PREDICTION / RANK ANALYSIS
  else if (plan.requiresAIR || (session.context.rank || session.context.air)) {
    if (!session.context.rank && !session.context.air) {
      askFor = 'rank';
      const replyText = `${studentGreeting}To evaluate matching colleges against historical cutoffs for this specific query, please share your **NEET AIR (All India Rank)**.`;
      const assistantMsg = await ChatMessage.create({
        sessionId: session._id,
        role: 'assistant',
        text: replyText,
        filters: session.context,
      });
      session.lastMessageAt = new Date();
      await session.save();
      return {
        session,
        message: assistantMsg,
        records: [],
        total: 0,
        askFor: 'rank',
        suggestedFollowUps: ['AIR 2000', 'AIR 5000', 'AIR 15000', 'AIR 25000'],
      };
    }

    if (!session.context.state && !session.context.targetState && (!session.context.targetStates || session.context.targetStates.length === 0) && intent !== 'BEST_MATCH_ANALYSIS') {
      askFor = 'state';
      const replyText = `${studentGreeting}Your NEET AIR is **${(session.context.rank || session.context.air).toLocaleString('en-IN')}**. Which target state or quota would you like to explore?`;
      const assistantMsg = await ChatMessage.create({
        sessionId: session._id,
        role: 'assistant',
        text: replyText,
        filters: session.context,
      });
      session.lastMessageAt = new Date();
      await session.save();
      return {
        session,
        message: assistantMsg,
        records: [],
        total: 0,
        askFor: 'state',
        suggestedFollowUps: ['All India Quota', 'Uttar Pradesh', 'Bihar', 'Delhi', 'Haryana', 'Karnataka', 'Kerala'],
      };
    }

    // Execute database search/prediction with AIR
    const searchFilter = { ...session.context };
    if (intent === 'BEST_MATCH_ANALYSIS' && (!searchFilter.targetStates || searchFilter.targetStates.length === 0)) {
      searchFilter.targetStates = ['All India'];
      searchFilter.state = 'All India';
    }

    const coverage = await counsellingEngine.checkFilterCoverage(searchFilter);
    const prediction = await predictionService.runPrediction(searchFilter, userId);
    records = prediction.records || [];
    total = prediction.totalFiltered || prediction.total || records.length;

    let isBroaderView = false;
    if (records.length === 0 && (!coverage.hasCoverage || searchFilter.state === 'Kerala' || (searchFilter.targetStates && searchFilter.targetStates.includes('Kerala')))) {
      const broaderAIQ = await counsellingEngine.getBroaderAIQOptions(searchFilter, 10);
      if (broaderAIQ.length > 0) {
        records = broaderAIQ;
        total = broaderAIQ.length;
        isBroaderView = true;
      }
    }

    queryResult = {
      records: records.slice(0, 20),
      totalFiltered: total,
      withinRange: prediction.withinRange,
      betterThanOpening: prediction.betterThanOpening,
      beyondClosing: prediction.beyondClosing,
      counts: prediction.counts,
      coverage,
      isBroaderView,
      needsRankTypeClarification: plan.validation?.needsRankTypeClarification,
      needsDomicileClarification: plan.validation?.needsDomicileClarification,
    };
  }

  // 15. GENERAL / SEARCH WITHOUT AIR FALLBACK
  else {
    if (plan.requiresDatabase) {
      const searchRes = await counsellingEngine.searchCutoffs(session.context);
      records = searchRes.records || [];
      total = searchRes.totalFiltered || records.length;
      queryResult = {
        records: records.slice(0, 20),
        totalFiltered: total,
        state: session.context.state || session.context.targetState || 'All India',
        course: session.context.course || 'MBBS',
      };
    } else {
      queryResult = { topic: message, intent };
    }
  }

  // Generate grounded AI explanation with recommendations & follow-ups
  const { explanation, suggestedFollowUps } = await aiService.generateIntelligentResponse({
    intent,
    userMessage: message,
    filters: session.context,
    queryResult,
    context: session.context,
  });

  const resultCollegeIds = records.map((r) => r.collegeId?._id || r.collegeId).filter(Boolean);

  const assistantMsg = await ChatMessage.create({
    sessionId: session._id,
    role: 'assistant',
    text: explanation,
    filters: session.context,
    resultCollegeIds,
    meta: {
      total,
      intent,
      records: records.slice(0, 12),
      comparisonData,
      analyticsData,
      suggestedFollowUps,
    },
  });

  session.context.lastResultCollegeIds = resultCollegeIds;
  session.previousResults = records.slice(0, 10).map((r) => ({
    collegeName: r.collegeName,
    state: r.state,
    closingRank: r.closingRank,
    category: r.category,
    quota: r.quota,
    fees: r.fees,
  }));
  session.lastMessageAt = new Date();
  if (session.title === 'New Chat') {
    session.title = message.slice(0, 50);
  }
  session.markModified('context');
  session.markModified('previousResults');
  await session.save();

  return {
    session,
    message: assistantMsg,
    records,
    total,
    comparisonData,
    analyticsData,
    suggestedFollowUps,
    askFor,
  };
}

async function listSessions(userId) {
  return ChatSession.find({ userId }).sort({ lastMessageAt: -1 }).limit(50);
}

async function getSessionMessages(userId, sessionId) {
  try {
    const session = await ChatSession.findOne({
      _id: sessionId,
      $or: [{ userId }, { userId: null }, { userId: { $exists: false } }],
    });
    if (!session) return null;
    const messages = await ChatMessage.find({ sessionId: session._id }).sort({ createdAt: 1 });
    return { session, messages };
  } catch (err) {
    return null;
  }
}

async function deleteSession(userId, sessionId) {
  try {
    const session = await ChatSession.findOne({
      _id: sessionId,
      $or: [{ userId }, { userId: null }, { userId: { $exists: false } }],
    });
    if (!session) return false;

    await ChatMessage.deleteMany({ sessionId: session._id });
    await ChatSession.deleteOne({ _id: session._id });
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = { processMessage, listSessions, getSessionMessages, deleteSession, mergeContext };

