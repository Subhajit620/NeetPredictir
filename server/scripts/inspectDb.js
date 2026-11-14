const mongoose = require('mongoose');
const connectDB = require('../config/db');

async function run() {
  try {
    await connectDB();

    const datasets = await mongoose.connection.db.collection('datasets').find().toArray();
    console.log('\n--- DATASETS (' + datasets.length + ') ---');
    for (const d of datasets) {
      console.log(`[Dataset] id=${d._id}, name="${d.name}", status="${d.status}", year=${d.year}, round="${d.round}", state="${d.state}", records=${d.recordCount}, validRows=${d.validRows}`);
    }

    const cutoffsCount = await mongoose.connection.db.collection('cutoffs').countDocuments();
    const publishedCutoffsCount = await mongoose.connection.db.collection('cutoffs').countDocuments({ published: true });
    console.log(`\n--- CUTOFFS ---`);
    console.log(`Total cutoffs: ${cutoffsCount}, Published cutoffs: ${publishedCutoffsCount}`);

    const distinctStates = await mongoose.connection.db.collection('cutoffs').distinct('state');
    console.log('Distinct states in cutoffs:', distinctStates);

    const distinctCategories = await mongoose.connection.db.collection('cutoffs').distinct('category');
    console.log('Distinct categories in cutoffs:', distinctCategories);

    const distinctYears = await mongoose.connection.db.collection('cutoffs').distinct('year');
    console.log('Distinct years in cutoffs:', distinctYears);

    const distinctRounds = await mongoose.connection.db.collection('cutoffs').distinct('round');
    console.log('Distinct rounds in cutoffs:', distinctRounds);

    const distinctQuotas = await mongoose.connection.db.collection('cutoffs').distinct('quota');
    console.log('Distinct quotas in cutoffs:', distinctQuotas);

    const samplePublished = await mongoose.connection.db.collection('cutoffs').find({ published: true }).limit(3).toArray();
    console.log('\nSample published cutoff:', samplePublished);

    const chhattisgarhCutoffs = await mongoose.connection.db.collection('cutoffs').find({ state: /chhattisgarh/i }).toArray();
    console.log(`\nCutoffs matching state /chhattisgarh/i: ${chhattisgarhCutoffs.length}`);
    if (chhattisgarhCutoffs.length > 0) {
      console.log('Sample CG record:', chhattisgarhCutoffs[0]);
    }

    const { predict } = require('../services/counsellingEngine');
    const { getAvailableStates, getAvailableCategories } = require('../services/predictionService');

    const states = await getAvailableStates();
    const categories = await getAvailableCategories();
    console.log('\n--- AVAILABLE STATES & CATEGORIES API ---');
    console.log('States:', states);
    console.log('Categories:', categories);

    console.log('\n--- TESTING CATEGORY-BASED PREDICTIONS ---');
    const testCases = [
      { rank: 12000, state: 'Chhattisgarh', category: 'OBC', includeGeneral: false },
      { rank: 12000, state: 'Chhattisgarh', category: 'OBC', includeGeneral: true },
      { rank: 12000, state: 'Chhattisgarh', category: 'General' },
      { rank: 12000, state: 'Chhattisgarh', category: 'EWS' },
      { rank: 75000, state: 'Chhattisgarh', category: 'SC' },
      { rank: 150000, state: 'Chhattisgarh', category: 'ST' },
      { rank: 12000, state: 'Chhattisgarh', category: 'All Categories' },
    ];

    const { classifyRank } = require('../services/counsellingEngine');
    console.log('\n--- VERIFYING EXACT RULE: openingRank <= rank <= closingRank ---');
    const testRanks = [50, 99, 100, 101, 150, 199, 200, 201];
    const op = 100;
    const cl = 200;
    for (const r of testRanks) {
      const res = classifyRank(r, op, cl);
      console.log(`Rank ${r} (Range ${op} - ${cl}) => ${res.statusLabel} [Eligible: ${res.eligible}]`);
    }

    await mongoose.disconnect();
    console.log('\nDone.');
  } catch (err) {
    console.error('Error during DB inspection:', err);
  }
}

run();
