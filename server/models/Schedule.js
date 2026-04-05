const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  subject:       { type: String, required: true },
  difficulty:    { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  hours:         { type: Number, default: 1.5 },
  priorityScore: { type: Number, default: 0 },
  status:        { type: String, enum: ['pending', 'completed', 'incomplete'], default: 'pending' },
  confidence:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  isRevision:    { type: Boolean, default: false },
}, { _id: true });

const daySchema = new mongoose.Schema({
  date:             { type: String, required: true },   // "YYYY-MM-DD"
  topics:           [topicSchema],
  totalHours:       { type: Number, default: 0 },
  isRevisionBuffer: { type: Boolean, default: false },
}, { _id: false });

const scheduleSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  planName:       { type: String, required: true },
  examDate:       { type: String, required: true },
  dailyHours:     { type: Number, required: true },
  totalDays:      { type: Number, default: 0 },
  totalTopics:    { type: Number, default: 0 },
  bufferDays:     { type: Number, default: 0 },
  schedulingDays: { type: Number, default: 0 },
  skippedCount:   { type: Number, default: 0 },   // topics that couldn't fit
  schedule:       [daySchema],
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);