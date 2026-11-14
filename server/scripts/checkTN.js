const mongoose = require('mongoose');
const env = require('../config/env');
const Cutoff = require('../models/Cutoff');

async function check() {
  await mongoose.connect(env.mongoUri);
  const tnCutoffs = await Cutoff.find({
    $or: [
      { state: /tamil/i },
      { collegeName: /madras|stanley|tamil/i },
    ]
  }).lean();
  console.log('Total Tamil Nadu / TN college cutoffs found:', tnCutoffs.length);
  tnCutoffs.forEach(c => {
    console.log({
      id: c._id,
      collegeName: c.collegeName,
      state: c.state,
      quota: c.quota,
      category: c.category,
      collegeType: c.collegeType,
      openingRank: c.openingRank,
      closingRank: c.closingRank,
      published: c.published,
      sourceFile: c.sourceFile,
    });
  });

  const allCutoffsCount = await Cutoff.countDocuments({ published: true });
  console.log('Total published cutoffs in DB:', allCutoffsCount);

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
