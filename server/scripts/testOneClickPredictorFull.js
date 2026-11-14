const {
  predictForProfile,
  calculateProfileHealth,
  computeAdmissionProbability,
} = require('../services/profilePredictionService');
const { classifyQuotaAndDomicile } = require('../services/counsellingEngine');
const connectDB = require('../config/db');
const mongoose = require('mongoose');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✅ [PASS] ${message}`);
  }
}

async function verifyOneClickPredictor() {
  console.log('===============================================================');
  console.log('🧪 Comprehensive 1-Click Predictor & Full Features Verification');
  console.log('===============================================================');

  // 1. Verify Profile Health & Completeness Meter
  console.log('\n--- 1. Profile Strength & Health Meter Verification ---');
  const emptyHealth = calculateProfileHealth({});
  assert(emptyHealth.score === 10, 'Empty profile has baseline score of 10');
  assert(emptyHealth.isComplete === false, 'Empty profile flagged as incomplete');
  assert(emptyHealth.missing.length > 0, 'Lists missing profile fields');

  const fullHealth = calculateProfileHealth({
    air: 5000,
    category: 'OBC',
    domicileState: 'Haryana',
    targetStates: ['Haryana', 'Delhi'],
    maxFees: 100000,
    collegeType: 'Government',
  });
  assert(fullHealth.score === 100, 'Complete profile scores 100%');
  assert(fullHealth.isComplete === true, 'Complete profile marked isComplete: true');
  assert(fullHealth.strengths.length >= 5, 'Populates strengths array with verified badges');

  // 2. Verify Admission Probability & Safety Index
  console.log('\n--- 2. Admission Probability & Safety Tiers Verification ---');
  // Safe: Rank < Opening
  const pSafe1 = computeAdmissionProbability(400, 500, 1200);
  assert(pSafe1.tier === 'SAFE' && pSafe1.probability === 99, 'AIR 400 < Opening 500 -> SAFE (99% Guaranteed)');

  // Safe: Rank well before closing (>20% margin)
  const pSafe2 = computeAdmissionProbability(800, 500, 1200);
  assert(pSafe2.tier === 'SAFE' && pSafe2.probability === 95, 'AIR 800 with 400 margin -> SAFE (95% Safety)');

  // Target: Rank within closing window (8%-20% margin)
  const pTarget1 = computeAdmissionProbability(1100, 500, 1200);
  assert(pTarget1.tier === 'TARGET' && pTarget1.probability === 85, 'AIR 1100 near closing -> TARGET (85% Realistic)');

  // Ambitious: Rank slightly above closing (within 5% reach)
  const pAmbitious = computeAdmissionProbability(1230, 500, 1200);
  assert(pAmbitious.tier === 'AMBITIOUS' && pAmbitious.probability === 45, 'AIR 1230 (+2.5% over closing) -> AMBITIOUS (45% Stretch)');

  // Outside: Rank far beyond closing
  const pOutside = computeAdmissionProbability(2500, 500, 1200);
  assert(pOutside.tier === 'OUTSIDE' && pOutside.probability === 15, 'AIR 2500 -> OUTSIDE (15% Reach)');

  // 3. Connect to Database for Live Data Verification
  console.log('\n--- 3. Database Connection & Live Dataset Validation ---');
  await connectDB();
  console.log('MongoDB connected successfully.');

  // 4. Test 1-Click Prediction with Minimal Profile (AIR only)
  console.log('\n--- 4. 1-Click Prediction: Minimal AIR Profile ---');
  const minResult = await predictForProfile({ air: 10000 });
  assert(minResult.success === true, '1-Click prediction works with minimal AIR');
  assert(minResult.records.length > 0, `Returned ${minResult.records.length} historically eligible records`);
  assert(minResult.summaryStats.totalFound === minResult.records.length, 'Total found matches records length');
  assert(minResult.accuracyGuarantee.includes('100% Deterministic Evidence'), 'Includes official accuracy seal');

  // 5. Test 1-Click Prediction with Full Candidate Profile & Domicile
  console.log('\n--- 5. 1-Click Prediction: Complete Profile (OBC, Haryana Domicile) ---');
  const fullProfile = {
    name: 'Aarav Sharma',
    air: 450,
    category: 'OBC',
    domicileState: 'Haryana',
    targetStates: ['Haryana', 'Uttar Pradesh'],
    course: 'MBBS',
  };
  const fullResult = await predictForProfile(fullProfile);
  assert(fullResult.success === true, 'Full profile prediction succeeded');
  assert(fullResult.candidate.name === 'Aarav Sharma', 'Candidate name preserved');
  assert(fullResult.candidate.domicileState === 'Haryana', 'Domicile state normalized & preserved');
  assert(fullResult.candidate.canonicalCategory === 'OBC', 'Canonical category normalized');

  // Verify Choice Filling Strategy Matrix
  assert(fullResult.choiceFillingSheet.length > 0, `Generated ${fullResult.choiceFillingSheet.length} prioritized choices in strategy matrix`);
  const stages = fullResult.choiceFillingSheet.map(c => c.stage);
  assert(stages.some(s => s === 'STAGE_2_TARGET' || s === 'STAGE_3_SAFE' || s === 'STAGE_1_DREAM'), 'Includes structured 3-stage progression');

  // Verify Record Integrity: Round Progression & Probability
  const sample = fullResult.records[0];
  assert(sample.collegeName !== undefined || sample.collegeId !== undefined, 'Record has college reference');
  assert(Number.isFinite(sample.admissionProbability), 'Record has admissionProbability');
  assert(sample.tier !== undefined, 'Record has tier assigned');
  assert(Array.isArray(sample.roundProgression), 'Record includes multi-round progression array');

  // 6. Verify Strict Domicile 85% Quota Exclusion
  console.log('\n--- 6. Domicile Strictness Verification ---');
  const nonDomicileRecords = fullResult.records.filter(r => r.domicileType === 'NON_DOMICILE_STATE');
  assert(nonDomicileRecords.length === 0, 'Zero non-domicile state quota seats leaked into eligible list');
  console.log(`  -> AIQ Seats: ${fullResult.summaryStats.aiqCount}, Home State 85% Seats: ${fullResult.summaryStats.homeStateCount}`);

  console.log('\n===============================================================');
  console.log('🎉 ALL 1-CLICK PREDICTOR FEATURES VERIFIED & 100% FUNCTIONAL!');
  console.log('===============================================================');

  await mongoose.disconnect();
}

verifyOneClickPredictor().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
