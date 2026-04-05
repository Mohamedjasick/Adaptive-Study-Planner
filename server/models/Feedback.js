const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // ── Multi-plan field ───────────────────────────────────────────────────────
  planId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  // ──────────────────────────────────────────────────────────────────────────
  topicName:  { type: String, required: true },
  subject:    { type: String, required: true },
  difficulty: { type: String, default: 'medium' },
  date:       { type: String, required: true },
  status:     { type: String, enum: ['completed', 'incomplete'], required: true },
  confidence: { type: String, enum: ['low', 'medium', 'high'], required: true }
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);