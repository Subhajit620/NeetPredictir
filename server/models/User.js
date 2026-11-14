const mongoose = require('mongoose');

const choiceItemSchema = new mongoose.Schema(
  {
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
    cutoffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cutoff' },
    preferenceOrder: { type: Number, default: 1 },
    notes: { type: String, default: '' },
    course: { type: String, default: 'MBBS' },
    quota: { type: String, default: 'AIQ' },
    category: { type: String, default: 'General' },
    round: { type: String, default: '' },
    openingRank: { type: Number, default: null },
    closingRank: { type: Number, default: null },
    fees: { type: Number, default: null },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true, unique: true, index: true },
    email: { type: String, lowercase: true, trim: true, sparse: true, index: true },
    passwordHash: { type: String },
    isRegistered: { type: Boolean, default: false },

    // Candidate Profile
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    air: { type: Number, default: null },
    score: { type: Number, default: null },
    percentile: { type: Number, default: null },
    category: { type: String, default: 'General' },
    categoryRank: { type: Number, default: null },
    domicileState: { type: String, default: '' },
    targetStates: [{ type: String }],
    quota: { type: String, default: 'All Quotas' },
    course: { type: String, default: 'MBBS' },
    collegeType: { type: String, default: 'All' },
    maxFees: { type: Number, default: null },
    isMinority: { type: Boolean, default: false },
    minorityType: { type: String, default: '' },
    isPwd: { type: Boolean, default: false },
    isNri: { type: Boolean, default: false },

    // Choice List / Preference Sheet
    choiceList: [choiceItemSchema],

    // Saved Prediction Reports
    savedPredictions: [
      {
        predictedAt: { type: Date, default: Date.now },
        profileSnapshot: { type: Object },
        totalEligible: { type: Number, default: 0 },
        summary: { type: String, default: '' },
      },
    ],

    lastRank: { type: Number },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('User', userSchema);

