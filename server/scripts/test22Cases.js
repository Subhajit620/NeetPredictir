/**
 * Complete Regression Test Suite for all 22 required cases
 */
const { deterministicAnalyzeQuery } = require('../services/queryUnderstandingService')
const { createQueryPlan } = require('../services/queryPlannerService')
const { analyzeRankFit } = require('../services/counsellingEngine')

const results = []

function runTest(num, name, fn) {
  try {
    fn()
    console.log(`Test ${num}: PASS (${name})`)
    results.push({ num, name, status: 'PASS' })
  } catch (err) {
    console.error(`Test ${num}: FAIL (${name}) - ${err.message}`)
    results.push({ num, name, status: 'FAIL', error: err.message })
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

console.log('====================================================')
console.log('RUNNING ALL 22 REGRESSION TESTS SPECIFIED IN PROMPT')
console.log('====================================================\n')

// TEST 1: hi -> GREETING
runTest(1, 'hi -> GREETING', () => {
  const r = deterministicAnalyzeQuery('hi', {})
  assert(r.intent === 'GREETING', `Expected GREETING, got ${r.intent}`)
  assert(r.studentProfile.air === null, 'AIR should not be required or extracted')
})

// TEST 2: hello -> GREETING
runTest(2, 'hello -> GREETING', () => {
  const r = deterministicAnalyzeQuery('hello', {})
  assert(r.intent === 'GREETING', `Expected GREETING, got ${r.intent}`)
  assert(r.studentProfile.air === null, 'AIR should not be required or extracted')
})

// TEST 3: my name is subha -> studentName = Subha, intent = UPDATE_PROFILE
runTest(3, 'my name is subha -> studentName = Subha, intent = UPDATE_PROFILE', () => {
  const r = deterministicAnalyzeQuery('my name is subha', {})
  assert(r.studentProfile.studentName?.toLowerCase() === 'subha', `Expected Subha, got ${r.studentProfile.studentName}`)
  assert(r.intent === 'UPDATE_PROFILE', `Expected UPDATE_PROFILE, got ${r.intent}`)
})

// TEST 4: my rank is 40000 -> air = 40000
runTest(4, 'my rank is 40000 -> air = 40000', () => {
  const r = deterministicAnalyzeQuery('my rank is 40000', {})
  assert(r.studentProfile.air === 40000, `Expected 40000, got ${r.studentProfile.air}`)
})

// TEST 5: my name is subha my rank is 40000 -> studentName = Subha, air = 40000
runTest(5, 'my name is subha my rank is 40000 -> studentName = Subha, air = 40000', () => {
  const r = deterministicAnalyzeQuery('my name is subha my rank is 40000', {})
  assert(r.studentProfile.studentName?.toLowerCase() === 'subha', `Expected Subha, got ${r.studentProfile.studentName}`)
  assert(r.studentProfile.air === 40000, `Expected 40000, got ${r.studentProfile.air}`)
})

// TEST 6: my AIR is 40k -> air = 40000
runTest(6, 'my AIR is 40k -> air = 40000', () => {
  const r = deterministicAnalyzeQuery('my AIR is 40k', {})
  assert(r.studentProfile.air === 40000, `Expected 40000, got ${r.studentProfile.air}`)
})

// TEST 7: I scored 600 -> neetScore = 600, air = null
runTest(7, 'I scored 600 -> neetScore = 600, air = null', () => {
  const r = deterministicAnalyzeQuery('I scored 600', {})
  assert(r.studentProfile.neetScore === 600, `Expected score 600, got ${r.studentProfile.neetScore}`)
  assert(r.studentProfile.air === null, `Expected air null, got ${r.studentProfile.air}`)
})

// TEST 8: my category rank is 2000 -> categoryRank = 2000, air = null
runTest(8, 'my category rank is 2000 -> categoryRank = 2000, air = null', () => {
  const r = deterministicAnalyzeQuery('my category rank is 2000', {})
  assert(r.studentProfile.categoryRank === 2000, `Expected categoryRank 2000, got ${r.studentProfile.categoryRank}`)
  assert(r.studentProfile.air === null, `Expected air null, got ${r.studentProfile.air}`)
})

// TEST 9: my rank is 40000 and I am OBC from West Bengal
runTest(9, 'my rank is 40000 and I am OBC from West Bengal', () => {
  const r = deterministicAnalyzeQuery('my rank is 40000 and I am OBC from West Bengal', {})
  assert(r.studentProfile.air === 40000, `Expected air 40000, got ${r.studentProfile.air}`)
  assert(r.studentProfile.category === 'OBC', `Expected category OBC, got ${r.studentProfile.category}`)
  assert(r.studentProfile.domicileState === 'West Bengal', `Expected domicile West Bengal, got ${r.studentProfile.domicileState}`)
})

// TEST 10: my rank is 40000 and I am OBC from West Bengal and I want MBBS colleges in Delhi
runTest(10, 'my rank is 40000 and I am OBC from West Bengal and I want MBBS colleges in Delhi', () => {
  const r = deterministicAnalyzeQuery('my rank is 40000 and I am OBC from West Bengal and I want MBBS colleges in Delhi', {})
  assert(r.studentProfile.air === 40000, `Expected air 40000, got ${r.studentProfile.air}`)
  assert(r.studentProfile.category === 'OBC', `Expected category OBC, got ${r.studentProfile.category}`)
  assert(r.studentProfile.domicileState === 'West Bengal', `Expected domicile West Bengal, got ${r.studentProfile.domicileState}`)
  assert(r.searchContext.targetStates?.includes('Delhi'), `Expected targetStates Delhi, got ${JSON.stringify(r.searchContext.targetStates)}`)
  assert(r.searchContext.course === 'MBBS', `Expected course MBBS, got ${r.searchContext.course}`)
})

// Context setup for Turn-by-Turn tests
const baseContext = {
  studentProfile: { studentName: 'Subhajit', air: 40000, category: 'OBC', domicileState: 'West Bengal' },
  searchContext: { targetStates: ['Delhi'], course: 'MBBS', quota: 'State', round: 'Round 1', year: 2024 },
  previousResults: [
    { collegeName: 'AIIMS Delhi', openingRank: 1, closingRank: 50 },
    { collegeName: 'VMMC Delhi', openingRank: 51, closingRank: 150 },
    { collegeName: 'MAMC Delhi', openingRank: 151, closingRank: 300 }
  ]
}

// TEST 11: only AIQ -> only quota changes
runTest(11, 'only AIQ -> only quota changes', () => {
  const r = deterministicAnalyzeQuery('only AIQ', baseContext)
  assert(r.searchContext.quota === 'AIQ', `Expected quota AIQ, got ${r.searchContext.quota}`)
  assert(r.studentProfile.air === null, 'AIR unchanged in delta')
})

// TEST 12: now Bihar -> only target state changes
runTest(12, 'now Bihar -> only target state changes', () => {
  const r = deterministicAnalyzeQuery('now Bihar', baseContext)
  assert(r.searchContext.targetStates?.includes('Bihar'), `Expected targetStates Bihar, got ${JSON.stringify(r.searchContext.targetStates)}`)
})

// TEST 13: show round 2 -> only round changes
runTest(13, 'show round 2 -> only round changes', () => {
  const r = deterministicAnalyzeQuery('show round 2', baseContext)
  assert(r.searchContext.round === 'Round 2', `Expected round Round 2, got ${r.searchContext.round}`)
})

// TEST 14: show 2025 -> only year changes
runTest(14, 'show 2025 -> only year changes', () => {
  const r = deterministicAnalyzeQuery('show 2025', baseContext)
  assert(r.searchContext.year === 2025, `Expected year 2025, got ${r.searchContext.year}`)
})

// TEST 15: compare the first three -> uses previous results
runTest(15, 'compare the first three -> uses previous results', () => {
  const r = deterministicAnalyzeQuery('compare the first three', baseContext)
  assert(r.intent === 'COLLEGE_COMPARISON', `Expected COLLEGE_COMPARISON, got ${r.intent}`)
  assert(r.resolvedReferences.referencedIndices?.length === 3, `Expected 3 referenced indices, got ${r.resolvedReferences.referencedIndices?.length}`)
})

// TEST 16: actually my rank is 25000 -> updates AIR and reruns
runTest(16, 'actually my rank is 25000 -> updates AIR and reruns', () => {
  const r = deterministicAnalyzeQuery('actually my rank is 25000', baseContext)
  assert(r.studentProfile.air === 25000, `Expected air 25000, got ${r.studentProfile.air}`)
})

// TEST 17: 850480012000250004500065000120000 -> rejected as suspicious/invalid
runTest(17, '850480012000250004500065000120000 -> rejected as suspicious/invalid input', () => {
  const r = deterministicAnalyzeQuery('850480012000250004500065000120000', {})
  assert(r.isInvalidNoise === true, 'Expected isInvalidNoise = true')
  assert(r.studentProfile.air === null, 'AIR should be null')
})

// TEST 18: AIR = 10, Opening = 186, Closing = 245 -> BETTER_THAN_OPENING
runTest(18, 'AIR = 10, Opening = 186, Closing = 245 -> BETTER_THAN_OPENING', () => {
  const res = analyzeRankFit(10, 186, 245)
  assert(res.status === 'BETTER_THAN_OPENING' || res.classification === 'BETTER_THAN_OPENING', `Expected BETTER_THAN_OPENING, got ${res.status}`)
})

// TEST 19: AIR = 200, Opening = 186, Closing = 245 -> WITHIN_HISTORICAL_RANGE
runTest(19, 'AIR = 200, Opening = 186, Closing = 245 -> WITHIN_HISTORICAL_RANGE', () => {
  const res = analyzeRankFit(200, 186, 245)
  assert(res.status === 'WITHIN_HISTORICAL_RANGE' || res.classification === 'WITHIN_HISTORICAL_RANGE', `Expected WITHIN_HISTORICAL_RANGE, got ${res.status}`)
})

// TEST 20: AIR = 246, Opening = 186, Closing = 245 -> BEYOND_HISTORICAL_CLOSING
runTest(20, 'AIR = 246, Opening = 186, Closing = 245 -> BEYOND_HISTORICAL_CLOSING', () => {
  const res = analyzeRankFit(246, 186, 245)
  assert(res.status === 'BEYOND_HISTORICAL_CLOSING' || res.classification === 'BEYOND_HISTORICAL_CLOSING', `Expected BEYOND_HISTORICAL_CLOSING, got ${res.status}`)
})

// TEST 21: AIR = 186, Opening = 186, Closing = 245 -> WITHIN_HISTORICAL_RANGE
runTest(21, 'AIR = 186, Opening = 186, Closing = 245 -> WITHIN_HISTORICAL_RANGE', () => {
  const res = analyzeRankFit(186, 186, 245)
  assert(res.status === 'WITHIN_HISTORICAL_RANGE' || res.classification === 'WITHIN_HISTORICAL_RANGE', `Expected WITHIN_HISTORICAL_RANGE, got ${res.status}`)
})

// TEST 22: AIR = 245, Opening = 186, Closing = 245 -> WITHIN_HISTORICAL_RANGE
runTest(22, 'AIR = 245, Opening = 186, Closing = 245 -> WITHIN_HISTORICAL_RANGE', () => {
  const res = analyzeRankFit(245, 186, 245)
  assert(res.status === 'WITHIN_HISTORICAL_RANGE' || res.classification === 'WITHIN_HISTORICAL_RANGE', `Expected WITHIN_HISTORICAL_RANGE, got ${res.status}`)
})

console.log('\n====================================================')
const failed = results.filter(r => r.status === 'FAIL')
if (failed.length > 0) {
  console.error(`❌ ${failed.length} / 22 TESTS FAILED`)
  process.exit(1)
} else {
  console.log(`🎉 ALL 22 / 22 REGRESSION TESTS PASSED!`)
  process.exit(0)
}
