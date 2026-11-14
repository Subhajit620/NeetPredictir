const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'New Chat' },

    // Explicit student profile structure
    studentProfile: {
      studentName: { type: String, default: null },
      name: { type: String, default: null },
      air: { type: Number, default: null },
      rank: { type: Number, default: null },
      rankType: { type: String, enum: ['AIR', 'CATEGORY_RANK', 'UNSPECIFIED'], default: 'UNSPECIFIED' },
      neetScore: { type: Number, default: null },
      score: { type: Number, default: null },
      percentile: { type: Number, default: null },
      categoryRank: { type: Number, default: null },
      category: { type: String, default: null },
      domicileState: { type: String, default: null },
      pwd: { type: Boolean, default: false },
      ews: { type: Boolean, default: false },
      minority: { type: Boolean, default: false },
      nri: { type: Boolean, default: false },
      specialCategory: { type: String, default: null },
    },

    // Explicit search / filter context
    searchContext: {
      targetStates: { type: [String], default: [] },
      targetState: { type: String, default: null },
      state: { type: String, default: null },
      course: { type: String, default: 'MBBS' },
      quota: { type: String, default: null },
      year: { type: Number, default: null },
      round: { type: String, default: null },
      collegeType: { type: String, default: null },
      maxFees: { type: Number, default: null },
    },

    // Unified sticky conversation context carried across turns
    context: {
      studentName: { type: String, default: null },
      name: { type: String, default: null },
      air: { type: Number, default: null },
      rank: { type: Number, default: null },
      rankType: { type: String, enum: ['AIR', 'CATEGORY_RANK', 'UNSPECIFIED'], default: 'UNSPECIFIED' },
      neetScore: { type: Number, default: null },
      score: { type: Number, default: null },
      percentile: { type: Number, default: null },
      categoryRank: { type: Number, default: null },
      category: { type: String, default: null },
      domicileState: { type: String, default: null },
      targetStates: { type: [String], default: [] },
      targetState: { type: String, default: null },
      state: { type: String, default: null },
      course: { type: String, default: 'MBBS' },
      quota: { type: String, default: null },
      collegeType: { type: String, default: null },
      maxFees: { type: Number, default: null },
      round: { type: String, default: null },
      year: { type: Number, default: null },
      pwd: { type: Boolean, default: false },
      ews: { type: Boolean, default: false },
      minority: { type: Boolean, default: false },
      nri: { type: Boolean, default: false },
      specialCategory: { type: String, default: null },
      previousResults: { type: Array, default: [] },
      selectedColleges: { type: Array, default: [] },
      lastResultCollegeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'College' }],
    },

    previousResults: { type: Array, default: [] },
    selectedColleges: { type: Array, default: [] },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true, strict: false }
);

module.exports = mongoose.model('ChatSession', chatSessionSchema);


