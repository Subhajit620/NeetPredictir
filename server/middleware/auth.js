const jwt = require('jsonwebtoken');
const env = require('../config/env');
const Admin = require('../models/Admin');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Requires a valid admin JWT (Authorization: Bearer <token>). Attaches
// req.admin. Rejects unauthenticated/invalid/expired tokens.
const requireAdmin = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw new ApiError(401, 'Authentication required.');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired session. Please log in again.');
  }

  const admin = await Admin.findById(payload.sub).select('-passwordHash');
  if (!admin) {
    throw new ApiError(401, 'Admin account not found.');
  }

  req.admin = admin;
  next();
});

// End-user identity: resolves via student Bearer token if provided,
// or via x-client-id header (with lazy creation).
const identifyUser = asyncHandler(async (req, res, next) => {
  const User = require('../models/User');
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token && env.jwtSecret) {
    try {
      const payload = jwt.verify(token, env.jwtSecret);
      if (payload && payload.sub && payload.role === 'student') {
        const student = await User.findById(payload.sub).select('-passwordHash');
        if (student) {
          User.findByIdAndUpdate(student._id, { $set: { lastSeenAt: new Date() } }).catch(() => {});
          req.user = student;
          return next();
        }
      }
    } catch (err) {
      // If token expired or invalid, continue to fallback by clientId
    }
  }

  let clientId = req.headers['x-client-id'];
  if (!clientId || typeof clientId !== 'string' || clientId.length > 100) {
    clientId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  let user = await User.findOne({ clientId });
  if (!user) {
    user = await User.create({ clientId });
  } else {
    User.findByIdAndUpdate(user._id, { $set: { lastSeenAt: new Date() } }).catch(() => {});
  }

  req.user = user;
  next();
});

module.exports = { requireAdmin, identifyUser };
