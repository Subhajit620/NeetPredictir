const mongoose = require('mongoose');

const stateCounsellingRuleSchema = new mongoose.Schema(
  {
    state: { type: String, required: true, trim: true, index: true },
    year: { type: Number, required: true, index: true },
    counsellingAuthority: { type: String, trim: true }, // e.g. "DME UP", "MCC", "KEAM Kerala", "KEA Karnataka"
    domicileRules: {
      required: { type: Boolean, default: true },
      eligibilityCriteria: [{ type: String }],
      nonDomicileAllowedForPrivate: { type: Boolean, default: true },
      openState: { type: Boolean, default: false }, // Is the state open for other states in private colleges?
    },
    quotaRules: [
      {
        quotaCode: { type: String, required: true }, // "AIQ", "STATE_QUOTA", "MANAGEMENT", "NRI", "DEEMED", "MINORITY", "INSTITUTIONAL"
        quotaLabel: { type: String, required: true },
        eligibilityConditions: [{ type: String }],
        seatPercentage: { type: Number },
      },
    ],
    reservationRules: [
      {
        categoryCode: { type: String, required: true }, // "GENERAL", "OBC", "EWS", "SC", "ST", "PWD"
        categoryLabel: { type: String, required: true },
        horizontalReservations: [{ type: String }], // "FEMALE", "DEFENCE", "FREEDOM_FIGHTER", "PH"
        requiresStateCertificate: { type: Boolean, default: true },
      },
    ],
    specialCategoryRules: [
      {
        code: { type: String, required: true },
        label: { type: String, required: true },
        description: { type: String },
      },
    ],
    eligibilityRules: [
      {
        ruleName: { type: String, required: true },
        ruleDescription: { type: String },
        ruleCondition: { type: mongoose.Schema.Types.Mixed },
      },
    ],
    source: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

stateCounsellingRuleSchema.index({ state: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('StateCounsellingRule', stateCounsellingRuleSchema);
