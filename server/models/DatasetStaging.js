const mongoose = require('mongoose');

// Holds parsed rows for a dataset between upload and import/publish so the
// admin can review validation results and correct column mapping without
// touching the live Cutoff collection. Deleted once the dataset is imported.
const datasetStagingSchema = new mongoose.Schema(
  {
    datasetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset', required: true, index: true },
    rowIndex: { type: Number, required: true },
    raw: { type: mongoose.Schema.Types.Mixed, required: true },
    normalized: { type: mongoose.Schema.Types.Mixed },
    isValid: { type: Boolean, default: false },
    isDuplicate: { type: Boolean, default: false },
    errors: [{ type: String }],
    warnings: [{ type: String }],
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

datasetStagingSchema.index({ datasetId: 1, rowIndex: 1 });

module.exports = mongoose.model('DatasetStaging', datasetStagingSchema);
