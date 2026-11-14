const mongoose = require('mongoose');

const predictionRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rank: { type: Number, required: true },
    state: { type: String },
    category: { type: String },
    quota: { type: String },
    course: { type: String },
    collegeType: { type: String },
    maxFees: { type: Number },
    round: { type: String },
    year: { type: Number },
    datasetIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Dataset' }],
    resultCollegeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'College' }],
    resultCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

predictionRequestSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('PredictionRequest', predictionRequestSchema);
