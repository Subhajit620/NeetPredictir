const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
require('dotenv').config();

function bool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function int(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

const env = {
  port: int(process.env.PORT, 5001),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI || '',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  ai: {
    provider: process.env.AI_PROVIDER || 'groq',
    baseUrl: process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
  },

  ocr: {
    enabled: bool(process.env.PDF_OCR_ENABLED, true),
    maxPages: int(process.env.PDF_OCR_MAX_PAGES, 25),
    parseTimeoutMs: int(process.env.PDF_PARSE_TIMEOUT_MS, 90000),
  },

  seedAdmin: {
    email: process.env.SEED_ADMIN_EMAIL || '',
    password: process.env.SEED_ADMIN_PASSWORD || '',
    name: process.env.SEED_ADMIN_NAME || 'Super Admin',
  },
};

module.exports = env;
