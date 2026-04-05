const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  name: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  confidence: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  estimatedHours: { type: Number, default: 1 },
  priorityScore: { type: Number, default: 0 }
});

const subjectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  topics: [topicSchema],
  examDate: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);