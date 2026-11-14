const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');
const Admin = require('./models/Admin');
const Cutoff = require('./models/Cutoff');
const { seedSampleData } = require('./services/datasetService');

async function ensureInitialData() {
  try {
    let admin = await Admin.findOne({ email: 'admin@example.com' });
    if (!admin) {
      const hash = await Admin.hashPassword('123');
      admin = await Admin.create({
        name: 'Super Admin',
        email: 'admin@example.com',
        passwordHash: hash,
        role: 'superadmin',
      });
      console.log('[server] Initial admin user created: admin@example.com');
    }

    const cutoffCount = await Cutoff.countDocuments({ published: true });
    if (cutoffCount === 0) {
      console.log('[server] No published cutoff data found in MongoDB. Auto-seeding initial sample NEET cutoffs...');
      await seedSampleData(admin._id);
      const count = await Cutoff.countDocuments({ published: true });
      console.log(`[server] Successfully seeded and published ${count} historical NEET cutoff records.`);
    }
  } catch (err) {
    console.warn('[server] Notice during initial data setup:', err.message);
  }
}

async function start() {
  try {
    await connectDB();
    await ensureInitialData();
  } catch (err) {
    console.error('[server] Failed to connect to MongoDB. Server will not start.');
    console.error(err.message);
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log(`[server] NEET AI College Predictor API listening on port ${env.port} (${env.nodeEnv})`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[server] Port ${env.port} is already in use by another running process.`);
      console.error(`[server] To free port ${env.port}, stop the existing node instance or change PORT in .env`);
      process.exit(1);
    } else {
      console.error('[server] Server error:', err);
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (err) => {
    console.error('[server] Unhandled rejection:', err);
  });

  process.on('SIGTERM', () => {
    console.log('[server] SIGTERM received, shutting down gracefully.');
    server.close(() => process.exit(0));
  });
}

start();

