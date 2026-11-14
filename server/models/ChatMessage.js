const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatSession', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    text: { type: String, required: true },
    // Structured filters extracted for this turn (user messages) and the
    // resulting college ids shown (assistant messages) — kept for
    // traceability/history, never used as a source of truth on replay.
    filters: { type: mongoose.Schema.Types.Mixed },
    resultCollegeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'College' }],
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
