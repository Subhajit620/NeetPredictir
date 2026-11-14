// Creates (or updates the password of) the initial admin account from
// SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME in .env.
// Run with: npm run seed:admin
const connectDB = require('../config/db');
const env = require('../config/env');
const Admin = require('../models/Admin');
const mongoose = require('mongoose');

async function run() {
  if (!env.seedAdmin.email || !env.seedAdmin.password) {
    console.error('[seedAdmin] SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  await connectDB();

  const passwordHash = await Admin.hashPassword(env.seedAdmin.password);
  const email = env.seedAdmin.email.toLowerCase().trim();

  const admin = await Admin.findOneAndUpdate(
    { email },
    { name: env.seedAdmin.name, email, passwordHash, role: 'superadmin' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`[seedAdmin] Admin ready: ${admin.email} (id: ${admin._id})`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('[seedAdmin] Failed:', err.message);
  process.exit(1);
});
