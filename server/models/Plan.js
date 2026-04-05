const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planName:   { type: String, required: true },
  examDate:   { type: String, required: true },
  dailyHours: { type: Number, required: true },
  totalHours: { type: Number, default: 0 }, // hours allocated per day for THIS plan
  color:      { type: String, default: '#6366f1' }, // for UI differentiation
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);