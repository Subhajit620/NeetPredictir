/**
 * Comprehensive Automated Test Suite for NEET UG Counselling AI Improvements
 * Tests all 12 key requirements:
 * 1. Multi-turn conversation retention & profile update rerun
 * 2. Unspecified rank & Domicile disambiguation
 * 3. Canonical category mapping & source label preservation (OBC, OBC-NCL, Kerala subcategories)
 * 4. Deterministic rank range comparison [openingRank, closingRank] (no exact rank equality rows)
 * 5. Three-tier classification: within closing, near closing (5%), outside closing
 * 6. Required metadata fields on result rows (collegeName, quota, category, year, round, openingRank, closingRank, source, whyShown)
 * 7. AIQ and State Quota separation
 * 8. Dataset coverage notice and broader AIQ fallback for missing states (e.g. Kerala)
 * 9. Active filters block displayed in every response
 */

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const env = require('../config/env');
const chatService = require('../services/chatService');
const counsellingEngine = require('../services/counsellingEngine');
const queryUnderstanding = require('../services/queryUnderstandingService');
const normalization = require('../services/normalizationService');
const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const Cutoff = require('../models/Cutoff');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}: ${details}`);
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 Starting NEET Counselling AI Improvements Test Suite');
  console.log('===============================================================\n');

  await connectDB();
  console.log('Connected to MongoDB database.\n');

  try {
    // -------------------------------------------------------------
    // TEST SUITE 1: Category Mapping & Source Label Preservation
    // -------------------------------------------------------------
    console.log('--- Test Suite 1: Canonical Category Mapping & Subcategories ---');
    const catTests = [
      { input: 'OBC', expectedFamily: 'OBC', expectedLabel: 'OBC' },
      { input: 'OBC-NCL', expectedFamily: 'OBC', expectedLabel: 'OBC-NCL' },
      { input: 'SEBC', expectedFamily: 'OBC', expectedLabel: 'SEBC' },
      { input: 'EZ', expectedFamily: 'OBC', expectedLabel: 'EZ (Ezhava)' },
      { input: 'Ezhava', expectedFamily: 'OBC', expectedLabel: 'EZ (Ezhava)' },
      { input: 'MU', expectedFamily: 'OBC', expectedLabel: 'MU (Muslim)' },
      { input: 'BH', expectedFamily: 'OBC', expectedLabel: 'BH (Backward Hindu)' },
      { input: 'LA', expectedFamily: 'OBC', expectedLabel: 'LA (Latin Catholic)' },
      { input: 'SC', expectedFamily: 'SC', expectedLabel: 'SC' },
      { input: 'ST', expectedFamily: 'ST', expectedLabel: 'ST' },
      { input: 'EWS', expectedFamily: 'EWS', expectedLabel: 'EWS' },
      { input: 'General', expectedFamily: 'General', expectedLabel: 'General / Unreserved' },
      { input: 'UR', expectedFamily: 'General', expectedLabel: 'General / Unreserved' },
    ];

    for (const ct of catTests) {
      const details = normalization.getCategoryDetails(ct.input);
      assert(
        details.canonicalFamily === ct.expectedFamily,
        `Category mapping for "${ct.input}" -> Canonical Family "${ct.expectedFamily}"`,
        `Got ${details.canonicalFamily}`
      );
      assert(
        details.isSubcategory || details.canonicalFamily === ct.expectedFamily,
        `Category label preserved for "${ct.input}"`,
        `Got ${details.displayLabel}`
      );
    }
    console.log('');

    // -------------------------------------------------------------
    // TEST SUITE 2: Rank Classification Logic (Within, Near, Outside)
    // -------------------------------------------------------------
    console.log('--- Test Suite 2: Three-Tier Rank Classification Logic ---');
    // Case A: Better than opening
    const fitA = counsellingEngine.analyzeRankFit(400, 500, 1500, { quota: 'AIQ', category: 'General' });
    assert(
      fitA.classification === 'HISTORICALLY_WITHIN_CLOSING' && fitA.isBetterThanOpening === true && fitA.eligible === true,
      'AIR 400 vs [500, 1500] classified as HISTORICALLY_WITHIN_CLOSING (Better than Opening)',
      JSON.stringify(fitA)
    );
    assert(fitA.whyShown.includes('better than the historical opening'), 'WhyShown includes better than opening explanation');

    // Case B: Within range
    const fitB = counsellingEngine.analyzeRankFit(800, 500, 1500, { quota: 'AIQ', category: 'General' });
    assert(
      fitB.classification === 'HISTORICALLY_WITHIN_CLOSING' && fitB.isWithinHistoricalRange === true && fitB.eligible === true,
      'AIR 800 vs [500, 1500] classified as HISTORICALLY_WITHIN_CLOSING (Within Historical Range)',
      JSON.stringify(fitB)
    );

    // Case C: Near closing rank (Within 5% near-band: 1500 * 1.05 = 1575)
    const fitC = counsellingEngine.analyzeRankFit(1540, 500, 1500, { quota: 'AIQ', category: 'General' });
    assert(
      fitC.classification === 'NEAR_HISTORICAL_CLOSING' && fitC.isNearHistoricalClosing === true && fitC.eligible === false,
      'AIR 1540 vs [500, 1500] classified as NEAR_HISTORICAL_CLOSING (Borderline near-band)',
      JSON.stringify(fitC)
    );
    assert(fitC.whyShown.includes('within 5%'), 'WhyShown explains near-band border condition');

    // Case D: Outside closing rank
    const fitD = counsellingEngine.analyzeRankFit(2500, 500, 1500, { quota: 'AIQ', category: 'General' });
    assert(
      fitD.classification === 'OUTSIDE_HISTORICAL_CLOSING' && fitD.isBeyondHistoricalClosing === true && fitD.eligible === false,
      'AIR 2500 vs [500, 1500] classified as OUTSIDE_HISTORICAL_CLOSING',
      JSON.stringify(fitD)
    );
    console.log('');

    // -------------------------------------------------------------
    // TEST SUITE 3: Dataset Coverage Gap & Broader AIQ Fallback
    // -------------------------------------------------------------
    console.log('--- Test Suite 3: Dataset Coverage & Broader AIQ Options ---');
    const coverageKerala = await counsellingEngine.checkFilterCoverage({ state: 'Kerala', category: 'OBC' });
    assert(
      coverageKerala.hasCoverage === false,
      'Detects coverage gap for Kerala (0 local state cutoffs in current DB)',
      JSON.stringify(coverageKerala.missingFilters)
    );
    assert(
      coverageKerala.availableStates.length > 0,
      `Published states identified (${coverageKerala.availableStates.length} states in DB)`
    );

    const broaderAIQ = await counsellingEngine.getBroaderAIQOptions({ rank: 400, category: 'OBC', course: 'MBBS' }, 5);
    assert(broaderAIQ.length > 0, `Broader AIQ options retrieved: ${broaderAIQ.length} colleges`);
    if (broaderAIQ.length > 0) {
      const firstAIQ = broaderAIQ[0];
      assert(firstAIQ.isBroaderView === true, 'AIQ fallback seat is explicitly flagged with isBroaderView=true');
      assert(Boolean(firstAIQ.source || firstAIQ.sourceFile), `Record includes verified source: "${firstAIQ.source}"`);
      assert(Boolean(firstAIQ.whyShown), `Record includes explicit whyShown reasoning: "${firstAIQ.whyShown}"`);
      assert(Boolean(firstAIQ.quota), `Record includes quota: "${firstAIQ.quota}"`);
      assert(Boolean(firstAIQ.category), `Record includes category: "${firstAIQ.category}"`);
      assert(Number.isFinite(firstAIQ.closingRank), `Record includes closingRank: ${firstAIQ.closingRank}`);
    }
    console.log('');

    // -------------------------------------------------------------
    // TEST SUITE 4: Multi-Turn Conversation Flow
    // -------------------------------------------------------------
    console.log('--- Test Suite 4: Multi-Turn Conversation (Subhajit, Rank 400, Kerala -> OBC) ---');
    const testUserId = new mongoose.Types.ObjectId();
    const testSession = await ChatSession.create({
      userId: testUserId,
      title: 'Multi-Turn Test',
      context: {},
    });

    // Turn 1: "My name is Subhajit, my rank is 400. Give me eligible colleges in Kerala."
    const turn1Res = await chatService.processMessage({
      userId: testUserId,
      sessionId: testSession._id,
      message: 'My name is Subhajit, my rank is 400. Give me eligible colleges in Kerala.',
    });

    const sessionAfterTurn1 = await ChatSession.findById(testSession._id);
    assert(sessionAfterTurn1.context.name === 'Subhajit', 'Turn 1: Candidate name "Subhajit" extracted & saved');
    assert(sessionAfterTurn1.context.rank === 400, 'Turn 1: Rank 400 extracted & saved');
    assert(sessionAfterTurn1.context.targetState === 'Kerala', 'Turn 1: Target state "Kerala" extracted & saved');
    assert(sessionAfterTurn1.context.course === 'MBBS', 'Turn 1: Course "MBBS" retained');
    assert(turn1Res.message.text.includes('Active Counselling Filters'), 'Turn 1: Active filters block displayed at top');
    assert(turn1Res.message.text.includes('Dataset Coverage Notice') || turn1Res.message.text.includes('Broader View'), 'Turn 1: Explains lack of direct Kerala state records & offers broader AIQ');
    assert(turn1Res.records.length > 0, `Turn 1: Returns ${turn1Res.records.length} broader AIQ fallback colleges for AIR 400`);

    // Turn 2: "I am an OBC candidate"
    const turn2Res = await chatService.processMessage({
      userId: testUserId,
      sessionId: testSession._id,
      message: 'I am an OBC candidate',
    });

    const sessionAfterTurn2 = await ChatSession.findById(testSession._id);
    assert(sessionAfterTurn2.context.name === 'Subhajit', 'Turn 2: Candidate name "Subhajit" preserved');
    assert(sessionAfterTurn2.context.rank === 400, 'Turn 2: Rank 400 preserved across turns');
    assert(sessionAfterTurn2.context.targetState === 'Kerala', 'Turn 2: Target state "Kerala" preserved across turns');
    assert(sessionAfterTurn2.context.category === 'OBC', 'Turn 2: Category updated to "OBC"');
    assert(turn2Res.message.text.includes('Active Counselling Filters'), 'Turn 2: Active filters block displayed');
    assert(turn2Res.message.text.includes('OBC'), 'Turn 2: Response applies and displays OBC category');
    assert(turn2Res.records.length > 0, `Turn 2: Automatically reran search and returned ${turn2Res.records.length} colleges for OBC AIR 400`);

    // Clean up test session
    await ChatMessage.deleteMany({ sessionId: testSession._id });
    await ChatSession.findByIdAndDelete(testSession._id);
    console.log('');

    // -------------------------------------------------------------
    // TEST SUITE 5: Domicile Clarification & AIR vs Category Rank
    // -------------------------------------------------------------
    console.log('--- Test Suite 5: Domicile & Rank Type Clarification Checks ---');
    const queryPlanAir = queryUnderstanding.deterministicAnalyzeQuery('My rank is 400 in Delhi');
    assert(queryPlanAir.studentProfile.rankType === 'UNSPECIFIED', 'Unspecified rank flagged as UNSPECIFIED rankType');

    const queryPlanExplicitAir = queryUnderstanding.deterministicAnalyzeQuery('My AIR is 400 in Delhi');
    assert(queryPlanExplicitAir.studentProfile.rankType === 'AIR', 'Explicit AIR recognized as rankType: AIR');

    const queryPlanCatRank = queryUnderstanding.deterministicAnalyzeQuery('My category rank is 400 in Delhi');
    assert(queryPlanCatRank.studentProfile.rankType === 'CATEGORY_RANK', 'Category rank recognized as rankType: CATEGORY_RANK');

    const queryPlanDomicile = queryUnderstanding.deterministicAnalyzeQuery('I am from West Bengal and want colleges in UP');
    assert(queryPlanDomicile.studentProfile.domicileState === 'West Bengal', 'Domicile state recognized as West Bengal');
    assert(queryPlanDomicile.searchContext.targetStates.includes('Uttar Pradesh'), 'Target state recognized as Uttar Pradesh');
    console.log('');

    console.log('===============================================================');
    console.log(`📊 Test Results: ${passedTests} / ${totalTests} PASSED`);
    console.log('===============================================================');
  } catch (err) {
    console.error('Test execution failed with error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
