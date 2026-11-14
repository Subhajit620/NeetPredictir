const mongoose = require('mongoose');
const { DATASET_STATUS } = require('../config/constants');

const datasetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    round: { type: String, required: true, trim: true },
    counsellingType: { type: String, required: true, trim: true }, // AIQ | State
    state: { type: String, default: 'All India', trim: true },
    status: { type: String, enum: DATASET_STATUS, default: 'draft', index: true },

    sourceFileName: { type: String },
    sourceFileType: { type: String }, // xlsx | xls | csv | pdf
    sourceUsedOcr: { type: Boolean, default: false },

    columnMapping: { type: mongoose.Schema.Types.Mixed, default: {} },

    totalRows: { type: Number, default: 0 },
    validRows: { type: Number, default: 0 },
    invalidRows: { type: Number, default: 0 },
    duplicateRows: { type: Number, default: 0 },
    warnings: { type: mongoose.Schema.Types.Mixed, default: {} },

    recordCount: { type: Number, default: 0 }, // rows actually imported into Cutoff
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    publishedAt: { type: Date },
    archivedAt: { type: Date },
  },
  { timestamps: { createdAt: 'uploadedAt', updatedAt: 'updatedAt' } }
);

datasetSchema.index({ year: 1, round: 1, counsellingType: 1, state: 1 });

module.exports = mongoose.model('Dataset', datasetSchema);
