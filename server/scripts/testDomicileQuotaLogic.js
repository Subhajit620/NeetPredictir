const { classifyQuotaAndDomicile } = require('../services/counsellingEngine');
const profilePredictionService = require('../services/profilePredictionService');
const counsellingEngine = require('../services/counsellingEngine');
const mongoose = require('mongoose');
const connectDB = require('../config/db');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✅ [PASS] ${message}`);
  }
}

async function runDomicileTests() {
  console.log('===============================================================');
  console.log('🧪 Testing Domicile State & 85% State Quota Logic');
  console.log('===============================================================');

  // Test 1: AIQ Seat (Open to all candidates regardless of domicile)
  const aiqCheck = classifyQuotaAndDomicile('AIQ', 'Uttar Pradesh', 'Haryana');
  assert(aiqCheck.isDomicileEligible === true, 'AIQ Seat is 100% eligible for non-domicile candidate');
  assert(aiqCheck.domicileType === 'AIQ_15', 'AIQ Seat categorized as AIQ_15');
  assert(aiqCheck.domicileBadge.includes('15% All India Quota'), 'AIQ Seat has 15% AIQ badge');

  // Test 2: Matching Home State 85% Quota Seat
  const homeCheck = classifyQuotaAndDomicile('State', 'Haryana', 'Haryana');
  assert(homeCheck.isDomicileEligible === true, 'Haryana State Quota is eligible for Haryana candidate');
  assert(homeCheck.domicileType === 'HOME_STATE_85', 'Haryana State Quota marked as HOME_STATE_85');
  assert(homeCheck.domicileBadge.includes('85% Home State Quota'), 'Contains 85% Home State badge');

  // Test 3: Non-Matching State Quota Seat
  const nonDomicileCheck = classifyQuotaAndDomicile('State', 'Uttar Pradesh', 'Haryana');
  assert(nonDomicileCheck.isDomicileEligible === false, 'UP State Quota is INELIGIBLE for Haryana candidate');
  assert(nonDomicileCheck.domicileType === 'NON_DOMICILE_STATE', 'Categorized as NON_DOMICILE_STATE');
  assert(nonDomicileCheck.domicileBadge.includes('Domicile Required'), 'Alert badge indicates domicile required');

  // Test 4: Deemed / Management Quota
  const deemedCheck = classifyQuotaAndDomicile('Deemed', 'Karnataka', 'Haryana');
  assert(deemedCheck.isDomicileEligible === true, 'Deemed seat is eligible for all');
  assert(deemedCheck.domicileType === 'OPEN_DEEMED', 'Categorized as OPEN_DEEMED');

  // Test 5: End-to-end profile prediction with Domicile
  await connectDB();

  console.log('\n--- Testing Profile Prediction with Domicile Filtering ---');
  const haryanaProfile = {
    name: 'Test Student',
    air: 12000,
    category: 'General',
    domicileState: 'Haryana',
    targetStates: ['Haryana', 'Uttar Pradesh', 'Rajasthan'],
    quota: 'All Quotas',
  };

  const result = await profilePredictionService.predictForProfile(haryanaProfile);
  assert(result.success === true, 'Profile prediction succeeded');
  assert(Number.isFinite(result.summaryStats.aiqCount), 'Summary includes aiqCount');
  assert(Number.isFinite(result.summaryStats.homeStateCount), 'Summary includes homeStateCount');

  // Verify none of the returned records have NON_DOMICILE_STATE
  const invalidSeats = result.records.filter(r => r.domicileType === 'NON_DOMICILE_STATE');
  assert(invalidSeats.length === 0, 'Zero non-domicile state quota seats in recommended candidate list');

  console.log(`\n🎉 All Domicile State Quota tests passed! (AIQ: ${result.summaryStats.aiqCount}, Home State 85%: ${result.summaryStats.homeStateCount})`);
  await mongoose.disconnect();
}

runDomicileTests().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});
