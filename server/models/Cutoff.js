const mongoose = require('mongoose');

const cutoffSchema = new mongoose.Schema(
  {
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true, index: true },
    collegeName: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String },
    district: { type: String },
    category: { type: String, required: true },
    course: { type: String, required: true },
    year: { type: Number, required: true },
    round: { type: String, required: true },
    quota: { type: String }, // AIQ | State | Management | ...
    openingRank: { type: Number, default: null },
    closingRank: { type: Number, default: null },
    allottedRank: { type: Number, default: null },
    allotmentRank: { type: Number, default: null },
    sourceDatasetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true, index: true },
    sourceFile: { type: String },
    published: { type: Boolean, default: false, index: true },
    fees: { type: Number, default: null },
    collegeType: { type: String },
    seatCount: { type: Number, default: null },
    gender: { type: String, default: 'All' },
    counsellingAuthority: { type: String },
  },
  { timestamps: true }
);

cutoffSchema.index({ published: 1, state: 1, category: 1, course: 1, year: 1, round: 1, quota: 1 });
cutoffSchema.index({ closingRank: 1 });

module.exports = mongoose.model('Cutoff', cutoffSchema);

