const { normalizeState, normalizeCategory } = require('./normalizationService');
const counsellingEngine = require('./counsellingEngine');

/**
 * Validates entity inputs and constructs a deterministic query execution plan.
 */
function createQueryPlan({ queryAnalysis, sessionContext = {} }) {
  const intent = queryAnalysis.intent || 'COLLEGE_SEARCH';
  const profile = sessionContext.studentProfile || sessionContext.context?.studentProfile || queryAnalysis.studentProfile || sessionContext.context || {};
  const search = sessionContext.searchContext || sessionContext.context?.searchContext || queryAnalysis.searchContext || sessionContext.context || {};

  // Merged effective filters for execution
  const effectiveAir = Number(profile.air || profile.rank);
  const effectiveScore = Number(profile.neetScore || profile.score);

  const targetStates = (Array.isArray(search.targetStates) && search.targetStates.length > 0)
    ? search.targetStates
    : (search.targetState || search.state ? [search.targetState || search.state] : []);

  const normalizedStates = targetStates
    .map((s) => normalizeState(s) || s)
    .filter(Boolean);

  const effectiveCategory = search.category || profile.category || null;
  const normalizedCategory = effectiveCategory ? (normalizeCategory(effectiveCategory) || effectiveCategory) : null;

  const rankRequiredIntents = [
    'RANK_ANALYSIS',
    'COLLEGE_PREDICTION',
    'SAFE_RANGE_ANALYSIS',
    'STRETCH_RANGE_ANALYSIS',
    'WHAT_IF_ANALYSIS',
    'BEST_MATCH_ANALYSIS',
  ];

  const requiresAIR = rankRequiredIntents.includes(intent) ||
    Boolean(queryAnalysis.analysisRequirements?.needsRankComparison && queryAnalysis.isExplicitRankQuery);

  const requiresDatabase = !['GREETING', 'UPDATE_PROFILE', 'GENERAL_NEET_QUESTION'].includes(intent) &&
    Boolean(queryAnalysis.analysisRequirements?.needsDatabase ?? true);

  const plan = {
    intent,
    isExecutable: true,
    requiresAIR: Boolean(requiresAIR),
    requiresDatabase: Boolean(requiresDatabase),
    operations: queryAnalysis.operations || [],
    filters: {
      rank: Number.isFinite(effectiveAir) && effectiveAir > 0 ? effectiveAir : null,
      air: Number.isFinite(effectiveAir) && effectiveAir > 0 ? effectiveAir : null,
      rankType: profile.rankType || 'UNSPECIFIED',
      score: Number.isFinite(effectiveScore) && effectiveScore > 0 ? effectiveScore : null,
      category: normalizedCategory,
      targetStates: normalizedStates,
      targetState: normalizedStates[0] || null,
      state: normalizedStates[0] || null,
      course: search.course || 'MBBS',
      quota: search.quota || null,
      collegeType: search.collegeType || null,
      maxFees: search.maxFees || null,
      round: search.round || null,
      year: search.year || null,
      domicileState: profile.domicileState || null,
      pwd: Boolean(profile.pwd),
      ews: Boolean(profile.ews),
      minority: Boolean(profile.minority),
      nri: Boolean(profile.nri),
      defence: Boolean(profile.defence),
      specialCategory: profile.specialCategory || null,
      targetColleges: search.targetColleges || queryAnalysis.resolvedReferences?.referencedCollegeNames || [],
      targetCategories: search.targetCategories || [],
      targetQuotas: search.targetQuotas || [],
      targetRounds: search.targetRounds || [],
      targetYears: search.targetYears || [],
    },
    validation: {
      hasAir: Number.isFinite(effectiveAir) && effectiveAir > 0,
      rankType: profile.rankType || 'UNSPECIFIED',
      needsRankTypeClarification: Number.isFinite(effectiveAir) && effectiveAir > 0 && profile.rankType === 'UNSPECIFIED',
      needsDomicileClarification: normalizedStates.length > 0 && !profile.domicileState && (!search.quota || search.quota === 'State'),
      hasState: normalizedStates.length > 0,
      missingFields: [],
    },
  };

  // Determine missing fields if intent strictly requires rank or state
  if (requiresAIR && !plan.validation.hasAir) {
    plan.validation.missingFields.push('rank');
  }
  if (['COLLEGE_SEARCH', 'COLLEGE_PREDICTION', 'RANK_ANALYSIS'].includes(intent)) {
    if (!plan.validation.hasState && intent !== 'BEST_MATCH_ANALYSIS' && intent !== 'STATE_COMPARISON') {
      plan.validation.missingFields.push('state');
    }
  }

  return plan;
}

module.exports = {
  createQueryPlan,
};
