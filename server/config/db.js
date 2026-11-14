const mongoose = require('mongoose');
const env = require('./env');

let hasConnected = false;

async function connectDB() {
  mongoose.connection.on('connected', () => {
    hasConnected = true;
    console.log(`[db] Connected to MongoDB (db: ${mongoose.connection.name})`);
  });

  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    if (hasConnected) console.warn('[db] MongoDB disconnected');
  });

  const primaryUri = env.mongoUri || process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/neet_predictor';
  const isAtlas = primaryUri.includes('mongodb+srv://') || primaryUri.includes('.mongodb.net');

  try {
    const maskedUri = isAtlas
      ? primaryUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
      : primaryUri;

    console.log(`[db] Connecting to ${isAtlas ? 'MongoDB Atlas Cloud' : 'MongoDB'} (${maskedUri})...`);
    
    await mongoose.connect(primaryUri, {
      tlsAllowInvalidCertificates: true,
      serverSelectionTimeoutMS: 12000,
    });
    
    console.log(`[db] Successfully connected to ${isAtlas ? 'MongoDB Atlas' : 'MongoDB'} (Database: ${mongoose.connection.name})`);
    return mongoose.connection;
  } catch (primaryErr) {
    if (isAtlas) {
      console.error(`[db] ❌ MongoDB Atlas connection failed: ${primaryErr.message}`);
      console.error('[db] 💡 Note: If you receive an IP whitelist error, add your IP (or 0.0.0.0/0) in MongoDB Atlas -> Security -> Network Access.');
    } else {
      console.error(`[db] ❌ MongoDB connection failed: ${primaryErr.message}`);
    }
    throw primaryErr;
  }
}

module.exports = connectDB;

