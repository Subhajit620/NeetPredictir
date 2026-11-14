const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const College = require('../models/College');
const Cutoff = require('../models/Cutoff');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { predictForProfile, calculateProfileHealth } = require('../services/profilePredictionService');

function generateStudentToken(user) {
  return jwt.sign(
    {
      sub: user._id,
      role: 'student',
      email: user.email,
      clientId: user.clientId,
    },
    env.jwtSecret || 'fallback_secret',
    { expiresIn: env.jwtExpiresIn || '7d' }
  );
}

// 1. Get Candidate Profile
const getProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  const health = calculateProfileHealth(user);
  res.json({
    success: true,
    user: {
      _id: user._id,
      clientId: user.clientId,
      isRegistered: !!user.isRegistered,
      email: user.email || '',
      name: user.name || '',
      phone: user.phone || '',
      air: user.air || null,
      score: user.score || null,
      percentile: user.percentile || null,
      category: user.category || 'General',
      categoryRank: user.categoryRank || null,
      domicileState: user.domicileState || '',
      targetStates: user.targetStates || [],
      quota: user.quota || 'All Quotas',
      course: user.course || 'MBBS',
      collegeType: user.collegeType || 'All',
      maxFees: user.maxFees || null,
      isMinority: !!user.isMinority,
      minorityType: user.minorityType || '',
      isPwd: !!user.isPwd,
      isNri: !!user.isNri,
      choiceListCount: (user.choiceList || []).length,
      savedPredictionsCount: (user.savedPredictions || []).length,
      createdAt: user.createdAt,
    },
    profileHealth: health,
  });
});

// 2. Update Candidate Profile
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const updates = req.body;

  const allowedFields = [
    'name', 'phone', 'air', 'score', 'percentile', 'category',
    'categoryRank', 'domicileState', 'targetStates', 'quota',
    'course', 'collegeType', 'maxFees', 'isMinority', 'minorityType',
    'isPwd', 'isNri'
  ];

  const updateDoc = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      if (field === 'air' || field === 'score' || field === 'percentile' || field === 'maxFees' || field === 'categoryRank') {
        updateDoc[field] = updates[field] === '' || updates[field] === null ? null : Number(updates[field]);
      } else {
        updateDoc[field] = updates[field];
      }
    }
  }

  if (updateDoc.air) {
    updateDoc.lastRank = updateDoc.air;
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updateDoc },
    { new: true, runValidators: true }
  );

  const health = calculateProfileHealth(updatedUser);

  res.json({
    success: true,
    message: 'Candidate profile updated successfully.',
    user: updatedUser,
    profileHealth: health,
  });
});

// 3. 1-Click Profile Prediction
const predictProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  const overrides = req.body || {};

  const effectiveProfile = {
    air: overrides.air !== undefined ? overrides.air : user.air,
    score: overrides.score !== undefined ? overrides.score : user.score,
    category: overrides.category || user.category || 'General',
    domicileState: overrides.domicileState !== undefined ? overrides.domicileState : user.domicileState,
    targetStates: overrides.targetStates || user.targetStates || [],
    quota: overrides.quota || user.quota || 'All Quotas',
    course: overrides.course || user.course || 'MBBS',
    collegeType: overrides.collegeType || user.collegeType || 'All',
    maxFees: overrides.maxFees !== undefined ? overrides.maxFees : user.maxFees,
    isPwd: overrides.isPwd !== undefined ? Boolean(overrides.isPwd) : Boolean(user.isPwd),
    isMinority: overrides.isMinority !== undefined ? Boolean(overrides.isMinority) : Boolean(user.isMinority),
    minorityType: overrides.minorityType !== undefined ? overrides.minorityType : (user.minorityType || ''),
    isNri: overrides.isNri !== undefined ? Boolean(overrides.isNri) : Boolean(user.isNri),
    name: user.name || 'Candidate',
  };

  const predictionResult = await predictForProfile(effectiveProfile);

  if (predictionResult.success) {
    const newPrediction = {
      predictedAt: new Date(),
      profileSnapshot: effectiveProfile,
      totalEligible: predictionResult.summaryStats?.totalFound || 0,
      summary: `Found ${predictionResult.summaryStats?.totalFound || 0} eligible colleges (${predictionResult.summaryStats?.safeCount || 0} Safe, ${predictionResult.summaryStats?.targetCount || 0} Target, ${predictionResult.summaryStats?.ambitiousCount || 0} Dream).`,
    };

    await User.findByIdAndUpdate(user._id, {
      $push: {
        savedPredictions: {
          $each: [newPrediction],
          $position: 0,
          $slice: 20,
        },
      },
    }).catch((err) => console.warn('[studentController] Error updating savedPredictions:', err.message));
  }

  res.json(predictionResult);
});

// 4. Get Candidate Choice List
const getChoiceList = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate({
      path: 'choiceList.collegeId',
      model: 'College',
    })
    .populate({
      path: 'choiceList.cutoffId',
      model: 'Cutoff',
    });

  const choices = (user?.choiceList || []).sort((a, b) => a.preferenceOrder - b.preferenceOrder);
  res.json({
    success: true,
    choices,
    total: choices.length,
  });
});

// 5. Add College to Choice List
const addChoice = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { collegeId, cutoffId, notes, quota, category, course, round, openingRank, closingRank, fees } = req.body;

  if (!collegeId) {
    throw new ApiError(400, 'collegeId is required.');
  }

  const college = await College.findById(collegeId);
  if (!college) {
    throw new ApiError(404, 'College not found.');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  const targetQuota = quota || user.quota || 'AIQ';
  const targetCourse = course || user.course || 'MBBS';

  const choiceList = user.choiceList || [];
  const existingIndex = choiceList.findIndex(
    (c) =>
      String(c.collegeId) === String(collegeId) &&
      String(c.quota || 'AIQ').toLowerCase() === String(targetQuota).toLowerCase() &&
      String(c.course || 'MBBS').toLowerCase() === String(targetCourse).toLowerCase()
  );

  if (existingIndex >= 0) {
    return res.json({
      success: true,
      message: 'College with this quota and course is already in your choice list.',
      choice: choiceList[existingIndex],
      total: choiceList.length,
    });
  }

  const nextOrder = choiceList.length + 1;
  const newChoice = {
    collegeId,
    cutoffId: cutoffId || null,
    preferenceOrder: nextOrder,
    notes: notes || '',
    quota: targetQuota,
    category: category || user.category || 'General',
    course: targetCourse,
    round: round || '',
    openingRank: openingRank !== undefined && openingRank !== null ? Number(openingRank) : null,
    closingRank: closingRank !== undefined && closingRank !== null ? Number(closingRank) : null,
    fees: fees !== undefined && fees !== null ? Number(fees) : null,
    addedAt: new Date(),
  };

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $push: { choiceList: newChoice } },
    { new: true }
  );

  res.json({
    success: true,
    message: `${college.name} added to your preference list (#${nextOrder}).`,
    choice: newChoice,
    total: (updatedUser.choiceList || []).length,
  });
});

// 6. Remove College from Choice List
const removeChoice = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  const filtered = (user.choiceList || []).filter(
    (c) => String(c._id) !== String(id) && String(c.collegeId) !== String(id)
  );

  filtered.forEach((c, idx) => {
    c.preferenceOrder = idx + 1;
  });

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: { choiceList: filtered } },
    { new: true }
  );

  res.json({
    success: true,
    message: 'College removed from your preference list.',
    total: (updatedUser.choiceList || []).length,
  });
});

// 7. Reorder Choice List
const reorderChoiceList = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { orderedIds } = req.body;

  if (!Array.isArray(orderedIds)) {
    throw new ApiError(400, 'orderedIds must be an array.');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  const map = new Map((user.choiceList || []).map((c) => [String(c._id), c]));

  const reordered = [];
  let order = 1;
  for (const id of orderedIds) {
    const item = map.get(String(id));
    if (item) {
      item.preferenceOrder = order++;
      reordered.push(item);
      map.delete(String(id));
    }
  }

  for (const item of map.values()) {
    item.preferenceOrder = order++;
    reordered.push(item);
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: { choiceList: reordered } },
    { new: true }
  )
    .populate('choiceList.collegeId', 'name state city collegeType ownership fees')
    .populate('choiceList.cutoffId', 'openingRank closingRank round year fees quota category course');

  res.json({
    success: true,
    message: 'Choice list reordered successfully.',
    choices: updatedUser.choiceList,
  });
});

// 8. Register Student Account
const registerStudent = asyncHandler(async (req, res) => {
  const { email, password, name, phone, air, score, category, domicileState } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required.');
  }

  if (password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters.');
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing && existing.isRegistered) {
    throw new ApiError(400, 'An account with this email already exists. Please login.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  let user = req.user;

  // Upgrade existing guest user or create new
  if (user && !user.isRegistered) {
    user.email = email.toLowerCase().trim();
    user.passwordHash = passwordHash;
    user.isRegistered = true;
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (air) user.air = Number(air);
    if (score) user.score = Number(score);
    if (category) user.category = category;
    if (domicileState) user.domicileState = domicileState;
    await user.save();
  } else {
    user = await User.create({
      clientId: `student_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      email: email.toLowerCase().trim(),
      passwordHash,
      isRegistered: true,
      name: name || '',
      phone: phone || '',
      air: air ? Number(air) : null,
      score: score ? Number(score) : null,
      category: category || 'General',
      domicileState: domicileState || '',
    });
  }

  const token = generateStudentToken(user);

  res.status(201).json({
    success: true,
    message: 'Student account created successfully!',
    token,
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
      air: user.air,
      score: user.score,
      category: user.category,
      domicileState: user.domicileState,
      targetStates: user.targetStates || [],
      quota: user.quota || 'All Quotas',
      course: user.course || 'MBBS',
      collegeType: user.collegeType || 'All',
      maxFees: user.maxFees,
      isPwd: Boolean(user.isPwd),
      isMinority: Boolean(user.isMinority),
      minorityType: user.minorityType || '',
      isNri: Boolean(user.isNri),
      isRegistered: true,
    },
  });
});

// 9. Login Student Account
const loginStudent = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required.');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.isRegistered || !user.passwordHash) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const token = generateStudentToken(user);

  res.json({
    success: true,
    message: `Welcome back, ${user.name || 'Candidate'}!`,
    token,
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
      air: user.air,
      score: user.score,
      category: user.category,
      domicileState: user.domicileState,
      targetStates: user.targetStates || [],
      quota: user.quota || 'All Quotas',
      course: user.course || 'MBBS',
      collegeType: user.collegeType || 'All',
      maxFees: user.maxFees,
      isPwd: Boolean(user.isPwd),
      isMinority: Boolean(user.isMinority),
      minorityType: user.minorityType || '',
      isNri: Boolean(user.isNri),
      isRegistered: true,
    },
  });
});

module.exports = {
  getProfile,
  updateProfile,
  predictProfile,
  getChoiceList,
  addChoice,
  removeChoice,
  reorderChoiceList,
  registerStudent,
  loginStudent,
};
