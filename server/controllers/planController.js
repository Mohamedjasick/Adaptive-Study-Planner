const Plan     = require('../models/Plan');
const Schedule = require('../models/Schedule');
const Feedback = require('../models/Feedback');
const User     = require('../models/User');
const { generateSchedule } = require('../services/scheduler');

const PLAN_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4',
  '#10b981', '#f59e0b', '#ef4444',
];

// ── GET /api/plans ────────────────────────────────────────────────────────────
const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ userId: req.user.id }).sort({ createdAt: -1 });

    const enriched = await Promise.all(plans.map(async (plan) => {
      const schedule = await Schedule.findOne({ userId: req.user.id, planId: plan._id });
      if (!schedule) return { ...plan.toObject(), totalTopics: 0, completedTopics: 0, progress: 0 };

      const allTopics       = schedule.schedule
        .filter(d => !d.isRevisionBuffer)
        .flatMap(d => d.topics);
      const totalTopics     = allTopics.length;
      const completedTopics = allTopics.filter(t => t.status === 'completed').length;

      return {
        ...plan.toObject(),
        totalTopics,
        completedTopics,
        bufferDays:     schedule.bufferDays     || 0,
        schedulingDays: schedule.schedulingDays || 0,
        skippedCount:   schedule.skippedCount   || 0,
        progress: totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0,
      };
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/plans/preview ───────────────────────────────────────────────────
const previewPlan = async (req, res) => {
  try {
    const { examDate, dailyHours, subjects } = req.body;

    if (!examDate || !dailyHours || !subjects) {
      return res.status(400).json({ message: 'examDate, dailyHours and subjects are required' });
    }

    const result = generateSchedule(subjects, examDate, dailyHours); // no compress — preview always runs normal mode
    if (result.error) return res.status(400).json({ message: result.error });

    res.json({
      totalTopics:     result.totalTopics,
      scheduledTopics: result.scheduledTopics,
      skippedCount:    result.skippedCount,
      schedulingDays:  result.schedulingDays,
      bufferDays:      result.bufferDays,
      warning:         result.warning || null,
    });
  } catch (err) {
    console.error("PREVIEW ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/plans ───────────────────────────────────────────────────────────
const createPlan = async (req, res) => {
  try {
    const { planName, examDate, dailyHours, subjects, compress } = req.body;

    if (!planName || !examDate || !dailyHours || !subjects) {
      return res.status(400).json({ message: 'planName, examDate, dailyHours and subjects are required' });
    }

    const existingPlans = await Plan.find({ userId: req.user.id });
    const color = PLAN_COLORS[existingPlans.length % PLAN_COLORS.length];

    const plan = await Plan.create({
      userId: req.user.id,
      planName,
      examDate,
      dailyHours,
      color,
    });

    const result = generateSchedule(subjects, examDate, dailyHours, compress === true);
    if (result.error) {
      await Plan.findByIdAndDelete(plan._id);
      return res.status(400).json({ message: result.error });
    }

    const schedule = await Schedule.create({
      userId:          req.user.id,
      planId:          plan._id,
      planName,
      examDate,
      dailyHours,
      totalDays:       result.totalDays,
      totalTopics:     result.totalTopics,
      bufferDays:      result.bufferDays,
      schedulingDays:  result.schedulingDays,
      skippedCount:    result.skippedCount || 0,
      schedule:        result.schedule,
    });

    res.status(201).json({
      plan,
      schedule,
      warning: result.warning || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PUT /api/plans/:id ────────────────────────────────────────────────────────
const updatePlan = async (req, res) => {
  try {
    const { planName, examDate, dailyHours } = req.body;

    const plan = await Plan.findOne({ _id: req.params.id, userId: req.user.id });
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    if (planName)   plan.planName   = planName;
    if (examDate)   plan.examDate   = examDate;
    if (dailyHours) plan.dailyHours = dailyHours;

    await Schedule.findOneAndUpdate(
      { planId: plan._id },
      {
        ...(dailyHours && { dailyHours }),
        ...(examDate   && { examDate   }),
        ...(planName   && { planName   }),
      }
    );

    await plan.save();
    res.json(plan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── DELETE /api/plans/:id ─────────────────────────────────────────────────────
const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findOne({ _id: req.params.id, userId: req.user.id });
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    await Schedule.deleteMany({ planId: plan._id });
    await Feedback.deleteMany({ planId: plan._id });
    await Plan.findByIdAndDelete(plan._id);

    res.json({ message: 'Plan deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/plans/suggest-hours ──────────────────────────────────────────────
const suggestHours = async (req, res) => {
  try {
    const user  = await User.findById(req.user.id);
    const plans = await Plan.find({ userId: req.user.id });

    const totalDailyHours = user.dailyHours || 5;

    if (plans.length === 0) {
      return res.json({ totalDailyHours, totalAllocated: 0, remaining: totalDailyHours, plans: [] });
    }

    const totalAllocated = plans.reduce((sum, p) => sum + p.dailyHours, 0);
    const remaining      = totalDailyHours - totalAllocated;
    const now            = new Date();

    const scored = plans.map(p => ({
      planId:     p._id,
      planName:   p.planName,
      examDate:   p.examDate,
      daysLeft:   Math.max(1, Math.ceil((new Date(p.examDate) - now) / (1000 * 60 * 60 * 24))),
      dailyHours: p.dailyHours,
    }));

    res.json({ totalDailyHours, totalAllocated, remaining, plans: scored });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getPlans, previewPlan, createPlan, updatePlan, deletePlan, suggestHours };