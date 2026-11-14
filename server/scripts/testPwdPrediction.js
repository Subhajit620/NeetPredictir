const mongoose = require('mongoose');
const { predictForProfile } = require('../services/profilePredictionService');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/neet_predictor');
  
  const profile = {
    name: 'subhajit saha',
    air: 1372,
    score: 680,
    category: 'PwD',
    domicileState: '',
    quota: 'All Quotas',
    course: 'MBBS',
    collegeType: 'All',
  };

  const res = await predictForProfile(profile);
  console.log('Success:', res.success);
  console.log('Total Found:', res.summaryStats?.totalFound);
  console.log('Safe Count:', res.summaryStats?.safeCount);
  console.log('Target Count:', res.summaryStats?.targetCount);
  console.log('Dream Count:', res.summaryStats?.ambitiousCount);
  console.log('Records Length:', res.records?.length);
  
  if (res.choiceFillingSheet && res.choiceFillingSheet.length > 0) {
    console.log('\nTop 5 Choice Filling Sheet Recommendations:');
    res.choiceFillingSheet.slice(0, 5).forEach(c => {
      console.log(`  - #${c.preferenceOrder} [${c.type}] ${c.college.collegeName || c.college.collegeId?.name} (${c.college.quota}) - Prob: ${c.probability}`);
    });
  }

  await mongoose.disconnect();
}
test();
