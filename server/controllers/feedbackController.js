const Feedback = require('../models/Feedback');
const Schedule = require('../models/Schedule');
const Plan     = require('../models/Plan');
const User     = require('../models/User');
const { reschedule }      = require('../services/adaptive');
const { injectRevisions } = require('../services/weakness');

// ── POST /api/feedback ────────────────────────────────────────────────────────
const submitFeedback = async (req, res) => {
  try {
    const { topicName, subject, difficulty, date, status, confidence, planId } = req.body;

    if (!planId) return res.status(400).json({ message: 'planId is required' });

    // Verify plan belongs to user
    const plan = await Plan.findOne({ _id: planId, userId: req.user.id });
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    // Save feedback
    await Feedback.create({
      userId: req.user.id,
      planId,
      topicName,
      subject,
      difficulty,
      date,
      status,
      confidence,
    });

    // Get this plan's schedule
    const schedule = await Schedule.findOne({ userId: req.user.id, planId });
    if (!schedule) return res.status(404).json({ message: 'No schedule found for this plan' });

    // Mark topic in schedule
    schedule.schedule.forEach(day => {
      day.topics.forEach(topic => {
        if (topic.name === topicName && day.date === date) {
          topic.status     = status;
          topic.confidence = confidence;
        }
      });
    });

    // Adaptive rescheduling if incomplete
    if (status === 'incomplete') {
      const feedbackList = [{ topicName, subject, difficulty, date, status, confidence }];
      const updated = reschedule(schedule.schedule, feedbackList, plan.dailyHours);
      schedule.schedule = updated;
    }

    // Weakness detection — revisions
    const allFeedback = await Feedback.find({ userId: req.user.id, planId });
    const withRevisions = injectRevisions(schedule.schedule, allFeedback, plan.dailyHours);
    schedule.schedule = withRevisions;

    schedule.markModified('schedule');
    await schedule.save();

    res.json({ message: 'Feedback submitted', schedule: schedule.schedule });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/feedback?planId=xxx ──────────────────────────────────────────────
const getFeedback = async (req, res) => {
  try {
    const { planId } = req.query;
    const query = { userId: req.user.id };
    if (planId) query.planId = planId;

    const feedback = await Feedback.find(query).sort({ createdAt: -1 });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/feedback/weak-topics?planId=xxx ──────────────────────────────────
const getWeakTopics = async (req, res) => {
  try {
    const { planId } = req.query;
    const query = { userId: req.user.id, confidence: 'low' };
    if (planId) query.planId = planId;

    const feedback = await Feedback.find(query);

    const weakMap = {};
    feedback.forEach(f => {
      if (!weakMap[f.topicName]) {
        weakMap[f.topicName] = {
          topicName:        f.topicName,
          subjectName:      f.subject,
          difficulty:       f.difficulty,
          lowConfidenceCount: 0,
        };
      }
      weakMap[f.topicName].lowConfidenceCount++;
    });

    res.json({
      weakTopics: Object.values(weakMap).sort((a, b) => b.lowConfidenceCount - a.lowConfidenceCount)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/feedback/progress?planId=xxx ────────────────────────────────────
const getProgress = async (req, res) => {
  try {
    const { planId } = req.query;
    if (!planId) return res.status(400).json({ message: 'planId query param required' });

    const schedule = await Schedule.findOne({ userId: req.user.id, planId });
    if (!schedule) return res.status(404).json({ message: 'No schedule found for this plan' });

    const allTopics = schedule.schedule.flatMap(d => d.topics);
    const totalTopics     = allTopics.length;
    const completedTopics = allTopics.filter(t => t.status === 'completed').length;
    const incomplete      = allTopics.filter(t => t.status === 'incomplete').length;
    const pending         = allTopics.filter(t => t.status === 'pending').length;

    // Per-module (subject) breakdown
    const subjectMap = {};
    allTopics.forEach(t => {
      if (!subjectMap[t.subject]) subjectMap[t.subject] = { subjectName: t.subject, total: 0, completed: 0 };
      subjectMap[t.subject].total++;
      if (t.status === 'completed') subjectMap[t.subject].completed++;
    });

    res.json({
      totalTopics,
      completedTopics,
      incomplete,
      pending,
      percentage:  totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0,
      bySubject:   Object.values(subjectMap),
      examDate:    schedule.examDate,
      planName:    schedule.planName,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { submitFeedback, getFeedback, getWeakTopics, getProgress };