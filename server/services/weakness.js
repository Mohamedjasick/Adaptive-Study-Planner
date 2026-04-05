const REVISION_INTERVAL_DAYS = 3;
const DIFFICULTY_HOURS = { easy: 1, medium: 1.5, hard: 2 };

// ── Detect weak topics from feedback history ──────────────────────────────────
// A topic is weak if it was marked low confidence even once.
function detectWeakTopics(feedbackHistory) {
  const weakMap = {};
  feedbackHistory.forEach(feedback => {
    const key = feedback.topicName;
    if (!weakMap[key]) {
      weakMap[key] = {
        topicName:   feedback.topicName,
        subject:     feedback.subject,
        difficulty:  feedback.difficulty || 'medium',
        lowCount:    0,
        mediumCount: 0,
        highCount:   0,
      };
    }
    if (feedback.confidence === 'low')    weakMap[key].lowCount++;
    if (feedback.confidence === 'medium') weakMap[key].mediumCount++;
    if (feedback.confidence === 'high')   weakMap[key].highCount++;
  });

  // Sort by lowCount descending so the weakest topics get priority
  return Object.values(weakMap)
    .filter(t => t.lowCount > 0)
    .sort((a, b) => b.lowCount - a.lowCount);
}

// ── Inject revisions into the schedule ───────────────────────────────────────
// Strategy:
//   1. Replace the difficulty-based placeholder topics in revision buffer days
//      with the student's actual weak topics (ordered by weakness severity).
//   2. For any weak topics that don't fit in the buffer, fall back to the
//      original interval-based injection into regular study days.
function injectRevisions(schedule, feedbackHistory, dailyHours) {
  const weakTopics = detectWeakTopics(feedbackHistory);
  if (weakTopics.length === 0) return schedule;

  let updated = schedule.map(day => ({ ...day, topics: [...day.topics] }));

  // ── Split schedule into buffer days and study days ──────────────────────
  const bufferIndices = updated
    .map((day, i) => (day.isRevisionBuffer ? i : -1))
    .filter(i => i !== -1);

  const studyIndices = updated
    .map((day, i) => (!day.isRevisionBuffer ? i : -1))
    .filter(i => i !== -1);

  // ── Step 1: Fill buffer days with actual weak topics ────────────────────
  // Clear the placeholder difficulty-based suggestions first,
  // then fill with real weak topics sorted by severity.
  const weakHandledInBuffer = new Set();

  if (bufferIndices.length > 0) {
    // Clear all placeholder revision topics from buffer days
    bufferIndices.forEach(i => {
      updated[i].topics     = [];
      updated[i].totalHours = 0;
    });

    // Spread weak topics across buffer days, respecting dailyHours cap
    let bufferDayPointer = 0;

    for (const weak of weakTopics) {
      const topicHours = DIFFICULTY_HOURS[weak.difficulty?.toLowerCase()] || 1.5;
      const maxRevisions = weak.lowCount + 1; // more low-confidence = more revision slots
      let revisionsAdded = 0;

      while (
        revisionsAdded < maxRevisions &&
        bufferDayPointer < bufferIndices.length
      ) {
        const dayIdx   = bufferIndices[bufferDayPointer];
        const remaining = dailyHours - updated[dayIdx].totalHours;

        if (remaining >= topicHours) {
          updated[dayIdx].topics.push({
            name:       weak.topicName,
            subject:    weak.subject,
            difficulty: weak.difficulty,
            hours:      topicHours,
            status:     'pending',
            confidence: 'low',
            isRevision: true,
          });
          updated[dayIdx].totalHours += topicHours;
          revisionsAdded++;
        } else {
          // This buffer day is full — move to the next one
          bufferDayPointer++;
        }
      }

      if (revisionsAdded > 0) {
        weakHandledInBuffer.add(weak.topicName);
      }
    }
  }

  // ── Step 2: Spill remaining weak topics into regular study days ─────────
  // Any weak topic not fully handled by buffer days gets the original
  // interval-based injection into study days.
  const unhandledWeak = weakTopics.filter(w => !weakHandledInBuffer.has(w.topicName));

  unhandledWeak.forEach(weak => {
    const topicHours = DIFFICULTY_HOURS[weak.difficulty?.toLowerCase()] || 1.5;

    // Find the last study day that already has this topic scheduled
    const existingStudyDays = studyIndices.filter(i =>
      updated[i].topics.some(t => t.name === weak.topicName)
    );
    const lastStudyIndex = existingStudyDays.length > 0
      ? existingStudyDays[existingStudyDays.length - 1]
      : studyIndices[0] || 0;

    let revisionsAdded = 0;
    const maxRevisions = weak.lowCount + 1;

    // Inject every REVISION_INTERVAL_DAYS in the study window
    for (
      let i = lastStudyIndex + REVISION_INTERVAL_DAYS;
      i < updated.length && revisionsAdded < maxRevisions;
      i++
    ) {
      // Skip buffer days in this pass — they were handled in Step 1
      if (updated[i].isRevisionBuffer) continue;

      const remaining = dailyHours - updated[i].totalHours;
      if (remaining >= topicHours) {
        updated[i].topics.push({
          name:       weak.topicName,
          subject:    weak.subject,
          difficulty: weak.difficulty,
          hours:      topicHours,
          status:     'pending',
          confidence: 'low',
          isRevision: true,
        });
        updated[i].totalHours += topicHours;
        revisionsAdded++;
        lastStudyIndex !== i && (lastStudyIndex === i);
      }
    }
  });

  return updated;
}

module.exports = { detectWeakTopics, injectRevisions };