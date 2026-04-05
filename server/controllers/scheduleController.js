const Schedule = require('../models/Schedule');
const Plan     = require('../models/Plan');
const { generateSchedule } = require('../services/scheduler');

// ── POST /api/schedule ────────────────────────────────────────────────────────
const createSchedule = async (req, res) => {
  try {
    const { subjects, examDate, dailyHours, planId, planName } = req.body;

    if (!subjects || !examDate)
      return res.status(400).json({ message: 'subjects and examDate are required' });
    if (!planId || !planName)
      return res.status(400).json({ message: 'planId and planName are required' });

    const plan = await Plan.findOne({ _id: planId, userId: req.user.id });
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    await Schedule.deleteOne({ userId: req.user.id, planId });

    const result = generateSchedule(subjects, examDate, dailyHours || plan.dailyHours);
    if (result.error) return res.status(400).json({ message: result.error });

    const schedule = await Schedule.create({
      userId:      req.user.id,
      planId,
      planName,
      examDate,
      dailyHours:  dailyHours || plan.dailyHours,
      totalDays:   result.totalDays,
      totalTopics: result.totalTopics,
      schedule:    result.schedule,
    });

    res.status(201).json(schedule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/schedule?planId=xxx ──────────────────────────────────────────────
const getSchedule = async (req, res) => {
  try {
    const { planId } = req.query;
    if (!planId) return res.status(400).json({ message: 'planId query param required' });

    const schedule = await Schedule.findOne({ userId: req.user.id, planId });
    if (!schedule) return res.status(404).json({ message: 'No schedule found for this plan' });

    res.json(schedule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/schedule/today?planId=xxx ────────────────────────────────────────
const getToday = async (req, res) => {
  try {
    const { planId } = req.query;
    if (!planId) return res.status(400).json({ message: 'planId query param required' });

    const schedule = await Schedule.findOne({ userId: req.user.id, planId });
    if (!schedule) return res.status(404).json({ message: 'No schedule found' });

    const now   = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

    const todayPlan = schedule.schedule.find(day => day.date === today);
    if (!todayPlan) return res.status(404).json({ message: 'No topics scheduled for today in this plan' });

    res.json({
      ...todayPlan.toObject(),
      planName: schedule.planName,
      planId:   schedule.planId,
      examDate: schedule.examDate,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/schedule/today-all ───────────────────────────────────────────────
const getTodayAll = async (req, res) => {
  try {
    const now   = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

    const allSchedules = await Schedule.find({ userId: req.user.id });

    const result = allSchedules.map(schedule => {
      const todayPlan = schedule.schedule.find(d => d.date === today);
      return {
        planId:     schedule.planId,
        planName:   schedule.planName,
        examDate:   schedule.examDate,
        topics:     todayPlan ? todayPlan.topics : [],
        totalHours: todayPlan ? todayPlan.totalHours : 0,
      };
    }).filter(p => p.topics.length > 0);

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PUT /api/schedule/regenerate/:planId ──────────────────────────────────────
const regenerateSchedule = async (req, res) => {
  try {
    const { planId }                         = req.params;
    const { examDate, dailyHours, compress } = req.body;

    if (!examDate || !dailyHours)
      return res.status(400).json({ message: 'examDate and dailyHours are required' });

    const plan = await Plan.findOne({ _id: planId, userId: req.user.id });
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    const existing = await Schedule.findOne({ userId: req.user.id, planId });
    if (!existing) return res.status(404).json({ message: 'No existing schedule found' });

    // ── Rebuild subjects from existing schedule ─────────────────────────────
    // Use revision buffer days too so no topics are lost
    const subjectMap = {};
    existing.schedule.forEach(day => {
      day.topics.forEach(t => {
        if (t.isRevision) return; // skip revision copies — originals are in study days
        const subj = t.subject || 'General';
        if (!subjectMap[subj]) subjectMap[subj] = [];
        const already = subjectMap[subj].find(x => x.name === t.name);
        if (!already) {
          subjectMap[subj].push({
            name:       t.name,
            difficulty: t.difficulty || 'medium',
          });
        }
      });
    });

    // ⚠️ KEY FIX: use 'name' not 'subjectName' — matches generateSchedule signature
    const subjects = Object.entries(subjectMap).map(([name, topics]) => ({
      name,
      topics,
    }));

    if (subjects.length === 0)
      return res.status(400).json({ message: 'No topics found in existing schedule' });

    const result = generateSchedule(subjects, examDate, dailyHours, compress === true);
    if (result.error) return res.status(400).json({ message: result.error });

    // Update Plan document
    await Plan.findByIdAndUpdate(planId, { $set: { examDate, dailyHours } });

    // Overwrite Schedule document
    const updated = await Schedule.findOneAndUpdate(
      { userId: req.user.id, planId },
      {
        $set: {
          examDate,
          dailyHours,
          totalDays:      result.totalDays,
          totalTopics:    result.totalTopics,
          bufferDays:     result.bufferDays      || 0,
          schedulingDays: result.schedulingDays  || result.totalDays,
          skippedCount:   result.skippedCount    || 0,
          schedule:       result.schedule,
        }
      },
      { new: true }
    );

    res.json({
      message:      'Schedule regenerated successfully',
      warning:      result.warning    || null,
      skippedCount: result.skippedCount || 0,
      schedule:     updated,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createSchedule, getSchedule, getToday, getTodayAll, regenerateSchedule };