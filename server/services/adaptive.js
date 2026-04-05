const DIFFICULTY_HOURS = { easy: 1, medium: 1.5, hard: 2 };

// ── Safe date helper ──────────────────────────────────────────────────────────
// Parses "YYYY-MM-DD" without timezone shift issues
function parseLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day); // local time, no UTC shift
}

function toISODateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── Reschedule ────────────────────────────────────────────────────────────────
function reschedule(schedule, feedbackList, dailyHours) {
  const incomplete = feedbackList.filter(f => f.status === 'incomplete');
  if (incomplete.length === 0) return schedule;

  let updated = schedule.map(day => ({
    ...day,
    topics: [...day.topics],
  }));

  incomplete.forEach(feedback => {
    const topicHours = DIFFICULTY_HOURS[feedback.difficulty?.toLowerCase()] || 1;

    // Remove topic from all days
    updated = updated.map(day => ({
      ...day,
      topics: day.topics.filter(t => t.name !== feedback.topicName),
    }));

    // Recalculate hours per day
    updated = updated.map(day => ({
      ...day,
      totalHours: day.topics.reduce((sum, t) => sum + (t.hours || 0), 0),
    }));

    const rescheduledTopic = {
      name:        feedback.topicName,
      subject:     feedback.subject,
      difficulty:  feedback.difficulty || 'medium',
      hours:       topicHours,
      status:      'pending',
      confidence:  feedback.confidence || 'medium',
      rescheduled: true,
    };

    // Find first future day with enough capacity (skip index 0 — today)
    let placed = false;
    for (let i = 1; i < updated.length; i++) {
      const remaining = dailyHours - updated[i].totalHours;
      if (remaining >= topicHours) {
        updated[i].topics.unshift(rescheduledTopic);
        updated[i].totalHours += topicHours;
        placed = true;
        break;
      }
    }

    // No slot found — append a new day after the last valid one
    if (!placed) {
      // Find last day with a valid date string
      let lastValidDate = null;
      for (let i = updated.length - 1; i >= 0; i--) {
        const parsed = parseLocalDate(updated[i].date);
        if (parsed) { lastValidDate = parsed; break; }
      }

      let newDateStr;
      if (lastValidDate) {
        lastValidDate.setDate(lastValidDate.getDate() + 1);
        newDateStr = toISODateStr(lastValidDate);
      } else {
        // Absolute fallback — use tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        newDateStr = toISODateStr(tomorrow);
      }

      console.log(`Overflow: "${feedback.topicName}" added to new day ${newDateStr}`);

      updated.push({
        date:       newDateStr,
        topics:     [rescheduledTopic],
        totalHours: topicHours,
      });
    }
  });

  return updated;
}

module.exports = { reschedule };