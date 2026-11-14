const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Admin = require('../models/Admin');
const College = require('../models/College');
const Cutoff = require('../models/Cutoff');
const Dataset = require('../models/Dataset');
const DatasetStaging = require('../models/DatasetStaging');
const User = require('../models/User');
const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const PredictionRequest = require('../models/PredictionRequest');
const { seedSampleData } = require('../services/datasetService');

const models = [
  { name: 'Admin', model: Admin },
  { name: 'College', model: College },
  { name: 'Cutoff', model: Cutoff },
  { name: 'Dataset', model: Dataset },
  { name: 'DatasetStaging', model: DatasetStaging },
  { name: 'User', model: User },
  { name: 'ChatSession', model: ChatSession },
  { name: 'ChatMessage', model: ChatMessage },
  { name: 'PredictionRequest', model: PredictionRequest },
];

async function initializeDatabase() {
  console.log('--- Initializing NEET-PREDICTOR Database ---');
  await connectDB();

  const db = mongoose.connection.db;
  const currentDbName = mongoose.connection.name;
  console.log(`[db] Active Database Name: "${currentDbName}"`);

  if (currentDbName === 'aspiring_life') {
    throw new Error('FATAL: Attempted to run on aspiring_life! Aborting immediately.');
  }

  // 1. Create collections and build indexes
  console.log('\n1. Creating collections and syncing indexes...');
  for (const { name, model } of models) {
    try {
      await model.createCollection();
      await model.syncIndexes();
      console.log(`  ✓ Table/Collection created: "${model.collection.name}" (${name} model) with indexes synced.`);
    } catch (err) {
      console.log(`  ℹ "${model.collection.name}": ${err.message}`);
    }
  }

  // 2. Ensure initial admin
  console.log('\n2. Setting up superadmin account...');
  let admin = await Admin.findOne({ email: 'admin@example.com' });
  if (!admin) {
    const hash = await Admin.hashPassword('123');
    admin = await Admin.create({
      name: 'Super Admin',
      email: 'admin@example.com',
      passwordHash: hash,
      role: 'superadmin',
    });
    console.log('  ✓ Created admin user: admin@example.com');
  } else {
    console.log('  ✓ Admin user already exists: admin@example.com');
  }

  // 3. Seed sample data if empty or --reseed passed
  console.log('\n3. Checking cutoff data...');
  const forceReseed = process.argv.includes('--reseed') || process.argv.includes('--force');
  if (forceReseed) {
    console.log('  → --reseed flag detected: Clearing previous datasets, colleges, and cutoffs...');
    await Cutoff.deleteMany({});
    await College.deleteMany({});
    await Dataset.deleteMany({});
    await DatasetStaging.deleteMany({});
  }

  const cutoffCount = await Cutoff.countDocuments({ published: true });
  if (cutoffCount === 0) {
    console.log('  → Seeding standard multi-state NEET dataset (including Haryana)...');
    await seedSampleData(admin._id);
    const newCount = await Cutoff.countDocuments({ published: true });
    console.log(`  ✓ Seeded and published ${newCount} cutoff records in "neet_predictor".`);
  } else {
    console.log(`  ✓ Existing published records found: ${cutoffCount}`);
  }

  // 4. Summary of all collections in neet-predictor
  console.log('\n4. Database Collections Summary:');
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`  - Collection [${col.name}]: ${count} documents`);
  }

  console.log('\n✓ NEET-PREDICTOR database setup and verification complete!\n');
}

if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Database initialization error:', err);
      process.exit(1);
    });
}

module.exports = initializeDatabase;
