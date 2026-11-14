/**
 * Regression & Conversational Flow Test Suite
 * Tests query understanding heuristics, context merging, query planning, and rank analysis.
 */
const { deterministicAnalyzeQuery } = require('../services/queryUnderstandingService')
const { createQueryPlan } = require('../services/queryPlannerService')
const { analyzeRankFit } = require('../services/counsellingEngine')

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`)
    process.exit(1)
  }
  console.log(`✅ PASSED: ${message}`)
}

async function runTests() {
  console.log('--- Starting Conversational Flow & Heuristic Tests ---\n')

  // Test 1: Simple greeting
  const t1 = deterministicAnalyzeQuery('hi', {})
  assert(t1.intent === 'GENERAL_NEET_QUESTION' || t1.intent === 'GREETING', 'Test 1: "hi" is classified as GREETING/GENERAL_NEET_QUESTION')

  // Test 2: Name extraction
  const t2 = deterministicAnalyzeQuery('my name is Subhajit', {})
  assert(t2.studentProfile.studentName === 'Subhajit', 'Test 2: Extracted studentName "Subhajit"')

  // Test 3: Rank extraction
  const t3 = deterministicAnalyzeQuery('my rank is 4000', {})
  assert(t3.studentProfile.air === 4000, 'Test 3: Extracted air = 4000')

  // Test 4: Compound query "my name is subhajit my rank is 2000 i want up college"
  const t4 = deterministicAnalyzeQuery('my name is subhajit my rank is 2000 i want up college', {})
  assert(t4.studentProfile.studentName?.toLowerCase() === 'subhajit', 'Test 4: Extracted name from compound query')
  assert(t4.studentProfile.air === 2000, 'Test 4: Extracted AIR 2000 from compound query')
  assert(t4.searchContext.targetStates?.includes('Uttar Pradesh'), 'Test 4: Extracted Uttar Pradesh state from compound query')

  // Test 5: "My AIR is 5666. I prefer Delhi MBBS colleges. Which college is suitable for me?"
  const t5 = deterministicAnalyzeQuery('My AIR is 5666. I prefer Delhi MBBS colleges. Which college is suitable for me?', {})
  assert(t5.studentProfile.air === 5666, 'Test 5: AIR is 5666')
  assert(t5.searchContext.targetStates?.includes('Delhi'), 'Test 5: Target state includes Delhi')
  assert(t5.searchContext.course === 'MBBS', 'Test 5: Course is MBBS')

  // Test 6: Preserving context & State update ("now Bihar")
  const priorContext = {
    studentProfile: { studentName: 'Subhajit', air: 5666, category: 'OBC' },
    searchContext: { targetStates: ['Delhi'], course: 'MBBS', quota: 'AIQ' },
  }
  const t6 = deterministicAnalyzeQuery('now Bihar', priorContext)
  assert(t6.searchContext.targetStates?.includes('Bihar'), 'Test 6: State updated to Bihar')

  // Test 7: Quota filter update ("only AIQ")
  const t7 = deterministicAnalyzeQuery('only AIQ', priorContext)
  assert(t7.searchContext.quota === 'AIQ', 'Test 7: Quota set to AIQ')

  // Test 8: Relative reference ("compare the first three")
  const priorWithResults = {
    ...priorContext,
    previousResults: [{ collegeName: 'AIIMS Delhi' }, { collegeName: 'VMMC Delhi' }, { collegeName: 'MAMC Delhi' }]
  }
  const t8 = deterministicAnalyzeQuery('compare the first three', priorWithResults)
  assert(t8.intent === 'COLLEGE_COMPARISON', 'Test 8: Intent is COLLEGE_COMPARISON')
  assert(Array.isArray(t8.resolvedReferences.referencedIndices) && t8.resolvedReferences.referencedIndices.length === 3, 'Test 8: Identified relativeIndices for first 3')

  // Test 9: Update rank ("actually my rank is 7000")
  const t9 = deterministicAnalyzeQuery('actually my rank is 7000', priorContext)
  assert(t9.studentProfile.air === 7000, 'Test 9: Rank updated to 7000')

  // Test 10: Concatenated noise rejection
  const t10 = deterministicAnalyzeQuery('850480012000250004500065000120000', {})
  assert(t10.studentProfile.air === null, 'Test 10: Concatenated garbage number is NOT parsed as valid AIR')

  // Test 11: Query Plan Generation
  const queryAnalysis = {
    intent: 'BEST_MATCH_ANALYSIS',
    analysisRequirements: { needsDatabase: true, needsRankComparison: true },
    operations: ['FILTER_DATABASE', 'COMPARE_AIR_WITH_CUTOFF'],
  }
  const sessionContext = {
    studentProfile: { air: 5666, category: 'UR' },
    searchContext: { targetStates: ['Delhi'], course: 'MBBS' },
  }
  const plan = createQueryPlan({ queryAnalysis, sessionContext })
  assert(plan.isExecutable === true, 'Test 11: Query Plan is executable')
  assert(plan.operations.includes('FILTER_DATABASE'), 'Test 11: Plan contains FILTER_DATABASE')
  assert(plan.operations.includes('COMPARE_AIR_WITH_CUTOFF'), 'Test 11: Plan contains COMPARE_AIR_WITH_CUTOFF')
  assert(plan.filters.air === 5666, 'Test 11: Filter air is 5666')

  // Test 12: Rank Analysis Fit - Within Historical Range
  const fitWithin = analyzeRankFit(5666, 1200, 6100)
  assert(fitWithin.status === 'WITHIN_HISTORICAL_RANGE', 'Test 12: 5666 in [1200, 6100] is WITHIN_HISTORICAL_RANGE')
  assert(fitWithin.eligible === true, 'Test 12: eligible = true')
  assert(fitWithin.rankDifference === 434, 'Test 12: gap is 434 ranks')

  // Test 13: Rank Analysis Fit - Better than Opening
  const fitBetter = analyzeRankFit(5666, 6000, 10000)
  assert(fitBetter.status === 'BETTER_THAN_OPENING', 'Test 13: 5666 < 6000 is BETTER_THAN_OPENING')
  assert(fitBetter.eligible === true, 'Test 13: eligible = true')

  // Test 14: Rank Analysis Fit - Beyond Historical Closing
  const fitBeyond = analyzeRankFit(5666, 100, 4000)
  assert(fitBeyond.status === 'BEYOND_HISTORICAL_CLOSING', 'Test 14: 5666 > 4000 is BEYOND_HISTORICAL_CLOSING')
  assert(fitBeyond.eligible === false, 'Test 14: eligible = false')
  assert(fitBeyond.rankDifference === 1666, 'Test 14: gap is 1666 ranks beyond closing')

  console.log('\n🎉 ALL 14 TESTS COMPLETED SUCCESSFULLY!')
}

runTests().catch(err => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
