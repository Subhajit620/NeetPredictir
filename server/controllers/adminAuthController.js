const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function signToken(admin) {
  return jwt.sign({ sub: admin._id.toString(), role: admin.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required.');
  }

  const admin = await Admin.findOne({ email: String(email).toLowerCase().trim() });
  if (!admin) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const isMatch = await admin.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  admin.lastLoginAt = new Date();
  await admin.save();

  const token = signToken(admin);

  res.json({
    success: true,
    token,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, admin: req.admin });
});

module.exports = { login, me };
