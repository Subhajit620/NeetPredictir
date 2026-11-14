const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    collegeCode: { type: String, trim: true },
    state: { type: String, trim: true, index: true },
    city: { type: String, trim: true },
    district: { type: String, trim: true },
    course: { type: String, trim: true },
    collegeType: { type: String, trim: true }, // Government | Private | Deemed | Central | Other
    ownership: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    address: { type: String, trim: true },
    website: { type: String, trim: true },
    courses: [{ type: String }],
    facilities: [{ type: String }],
  },
  { timestamps: true }
);

collegeSchema.index({ name: 1, state: 1 }, { unique: false });

module.exports = mongoose.model('College', collegeSchema);

