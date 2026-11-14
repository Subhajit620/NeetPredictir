const connectDB = require('../config/db');
const mongoose = require('mongoose');

async function migrateTo2026() {
  await connectDB();
  
  // 1. Update Cutoffs where year is 2025 -> 2026
  const cutoffRes = await mongoose.connection.db.collection('cutoffs').updateMany(
    { year: 2025 },
    { $set: { year: 2026, round: 'Round 1' } }
  );
  console.log('Migrated cutoffs 2025 -> 2026:', cutoffRes.modifiedCount);

  // 2. Update Datasets where year is 2025 -> 2026
  const datasetRes = await mongoose.connection.db.collection('datasets').updateMany(
    { year: 2025 },
    { $set: { year: 2026, round: 'Round 1' } }
  );
  console.log('Migrated datasets 2025 -> 2026:', datasetRes.modifiedCount);

  // 3. Verify distinct years now
  const years = await mongoose.connection.db.collection('cutoffs').distinct('year');
  const counts = {};
  for (const y of years) {
    counts[y] = await mongoose.connection.db.collection('cutoffs').countDocuments({ year: y });
  }
  console.log('Updated Cutoffs distinct years:', years, counts);
  process.exit(0);
}

migrateTo2026();
