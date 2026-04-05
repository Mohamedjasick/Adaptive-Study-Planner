const { sortTopicsByPriority } = require('./priority');

const DIFFICULTY_HOURS = { easy: 1, medium: 1.5, hard: 2 };
const WEEKEND_MULTIPLIER = 1.5;

function calcBufferDays(totalDays) {
  return Math.max(1, Math.min(7, Math.round(totalDays * 0.10)));
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm   = String(date.getMonth() + 1).padStart(2, '0');
  const dd   = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getCapacityForDate(date, dailyHours) {
  const day = date.getDay();
  return (day === 0 || day === 6)
    ? Math.round(dailyHours * WEEKEND_MULTIPLIER * 10) / 10
    : dailyHours;
}

// ── Assign topics using best-fit bin-packing ──────────────────────────────────
function assignBinPacking(daySlots, topicsWithHours) {
  const scheduled     = new Set();
  const skippedTopics = [];

  for (const day of daySlots) {
    let remaining = day.capacity;

    // Pass 1: Place highest priority topics that fit at full hours
    for (let i = 0; i < topicsWithHours.length; i++) {
      if (scheduled.has(i)) continue;
      if (remaining <= 0.01) break;

      const topic     = topicsWithHours[i];
      const effective = Math.min(topic.assignHours, day.capacity);

      if (effective <= remaining + 0.01) {
        day.topics.push(buildTopicEntry(topic, effective, false));
        day.totalHours = Math.round((day.totalHours + effective) * 10) / 10;
        remaining      = Math.round((remaining - effective) * 10) / 10;
        scheduled.add(i);
      }
    }

    // Pass 2: Fill remaining gap — allow up to 30% hour reduction
    // Handles cases where all topics are same size (e.g. all 1.5h)
    // and the gap (e.g. 1h) is smaller than a full topic but not wasted.
    while (remaining > 0.4) {
      let bestIdx   = -1;
      let bestHours = 0;

      for (let i = 0; i < topicsWithHours.length; i++) {
        if (scheduled.has(i)) continue;
        const topic = topicsWithHours[i];

        // Min hours = 70% of original (e.g. 1.5h topic can fill a 1h slot)
        const minHours  = Math.round(topic.assignHours * 0.7 * 10) / 10;
        const effective = Math.min(topic.assignHours, remaining);

        if (effective >= minHours && effective > bestHours) {
          bestHours = effective;
          bestIdx   = i;
        }
      }

      if (bestIdx === -1) break; // nothing fits even with reduction

      const best      = topicsWithHours[bestIdx];
      const effective = Math.min(best.assignHours, remaining);
      day.topics.push(buildTopicEntry(best, effective, false));
      day.totalHours = Math.round((day.totalHours + effective) * 10) / 10;
      remaining      = Math.round((remaining - effective) * 10) / 10;
      scheduled.add(bestIdx);
    }
  }

  // Collect skipped topics
  for (let i = 0; i < topicsWithHours.length; i++) {
    if (!scheduled.has(i)) {
      const t = topicsWithHours[i];
      skippedTopics.push({ name: t.name, subject: t.subject, difficulty: t.difficulty });
    }
  }

  return { skippedCount: skippedTopics.length, skippedTopics };
}

// ── Assign topics using even distribution (compress mode) ─────────────────────
function assignCompressed(daySlots, topicsWithHours, totalCapacity) {
  const totalTopics = topicsWithHours.length;
  if (totalTopics === 0) return { skippedCount: 0, skippedTopics: [] };

  const hoursPerTopic = totalCapacity / totalTopics;
  let topicIndex = 0;

  for (const day of daySlots) {
    if (topicIndex >= totalTopics) break;
    const topicsForDay = Math.min(
      Math.round(day.capacity / hoursPerTopic),
      totalTopics - topicIndex
    );
    const actualTopics = Math.max(1, topicsForDay);

    for (let j = 0; j < actualTopics && topicIndex < totalTopics; j++) {
      const topic     = topicsWithHours[topicIndex];
      const effective = Math.round(hoursPerTopic * 10) / 10;
      day.topics.push(buildTopicEntry(topic, effective, true));
      day.totalHours = Math.round((day.totalHours + effective) * 10) / 10;
      topicIndex++;
    }
  }

  // If any topics remain due to rounding, append to last day
  while (topicIndex < totalTopics) {
    const last      = daySlots[daySlots.length - 1];
    const topic     = topicsWithHours[topicIndex];
    const effective = Math.round(hoursPerTopic * 10) / 10;
    last.topics.push(buildTopicEntry(topic, effective, true));
    last.totalHours = Math.round((last.totalHours + effective) * 10) / 10;
    topicIndex++;
  }

  return { skippedCount: 0, skippedTopics: [] };
}

function buildTopicEntry(topic, hours, isCompressed) {
  return {
    name:          topic.name,
    subject:       topic.subject,
    difficulty:    topic.difficulty,
    hours,
    priorityScore: topic.priorityScore,
    status:        'pending',
    confidence:    topic.confidence,
    isRevision:    false,
    isCompressed:  isCompressed || false,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
function generateSchedule(subjects, examDate, dailyHours, compress = false) {

  const now       = new Date();
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const exam      = new Date(examDate);
  const examLocal = new Date(exam.getFullYear(), exam.getMonth(), exam.getDate());
  const totalDays = Math.ceil((examLocal - today) / (1000 * 60 * 60 * 24));

  if (totalDays <= 0) return { error: 'Exam date must be in the future' };

  const bufferDays              = calcBufferDays(totalDays);
  const schedulingDays          = totalDays - bufferDays;
  const effectiveSchedulingDays = Math.max(1, schedulingDays);

  // ── Flatten + sort ────────────────────────────────────────────────────────
  const allTopics = [];
  subjects.forEach(subject => {
    subject.topics.forEach(topic => {
      allTopics.push({
        ...topic,
        subject:    subject.name,
        confidence: topic.confidence || 'medium',
      });
    });
  });

  const sorted = sortTopicsByPriority(allTopics, examDate);

  // ── Build day slots ───────────────────────────────────────────────────────
  let totalCapacity = 0;
  const daySlots = [];

  for (let i = 0; i < effectiveSchedulingDays; i++) {
    const date     = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const capacity = getCapacityForDate(date, dailyHours);
    totalCapacity  = Math.round((totalCapacity + capacity) * 10) / 10;
    daySlots.push({
      date:             formatDate(date),
      topics:           [],
      totalHours:       0,
      capacity,
      isRevisionBuffer: false,
      isWeekend:        date.getDay() === 0 || date.getDay() === 6,
    });
  }

  // ── Hours calculation ─────────────────────────────────────────────────────
  const hoursNeeded    = Math.round(
    allTopics.reduce((sum, t) => sum + (DIFFICULTY_HOURS[t.difficulty?.toLowerCase()] || 1.5), 0)
  );
  const hoursAvailable = Math.round(totalCapacity);

  const topicsWithHours = sorted.map(t => ({
    ...t,
    assignHours: DIFFICULTY_HOURS[t.difficulty?.toLowerCase()] || 1.5,
  }));

  // ── Assign topics ─────────────────────────────────────────────────────────
  const { skippedCount, skippedTopics } = compress
    ? assignCompressed(daySlots, topicsWithHours, totalCapacity)
    : assignBinPacking(daySlots, topicsWithHours);

  // ── Remove empty days + strip internal fields ─────────────────────────────
  const filledSchedule = daySlots
    .filter(day => day.topics.length > 0)
    .map(({ capacity, isWeekend, ...day }) => day);

  // ── Revision buffer days ──────────────────────────────────────────────────
  const lastSchedulingDate = filledSchedule.length > 0
    ? new Date(filledSchedule[filledSchedule.length - 1].date)
    : new Date(today.getFullYear(), today.getMonth(), today.getDate() + effectiveSchedulingDays - 1);

  const revisionCandidates = sorted
    .filter(t => t.difficulty === 'hard' || t.difficulty === 'medium')
    .slice(0, bufferDays * 4);

  const revisionBufferDays = [];
  for (let i = 0; i < bufferDays; i++) {
    const bufferDate = new Date(lastSchedulingDate);
    bufferDate.setDate(bufferDate.getDate() + i + 1);
    const perDay    = Math.ceil(revisionCandidates.length / bufferDays);
    const dayTopics = revisionCandidates.slice(i * perDay, i * perDay + perDay);
    const dayHours  = dayTopics.reduce((sum, t) => sum + (DIFFICULTY_HOURS[t.difficulty] || 1.5), 0);
    revisionBufferDays.push({
      date:             formatDate(bufferDate),
      isRevisionBuffer: true,
      topics: dayTopics.map(t => ({
        name:          t.name,
        subject:       t.subject,
        difficulty:    t.difficulty,
        hours:         DIFFICULTY_HOURS[t.difficulty] || 1.5,
        priorityScore: t.priorityScore,
        status:        'pending',
        confidence:    t.confidence,
        isRevision:    true,
      })),
      totalHours: Math.min(dayHours, dailyHours * WEEKEND_MULTIPLIER),
    });
  }

  const fullSchedule = [...filledSchedule, ...revisionBufferDays];

  // ── Warning ───────────────────────────────────────────────────────────────
  const shortfallPct = hoursNeeded > hoursAvailable
    ? Math.round(((hoursNeeded - hoursAvailable) / hoursNeeded) * 100)
    : 0;

  let dailyHoursNeeded = null;
  if (!compress && skippedCount > 0) {
    const HOUR_STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5];
    if (hoursNeeded > hoursAvailable) {
      const raw = dailyHours * hoursNeeded / hoursAvailable;
      dailyHoursNeeded = Math.min(5, Math.round(raw * 2) / 2);
      if (dailyHoursNeeded <= dailyHours) {
        dailyHoursNeeded = HOUR_STEPS.find(h => h > dailyHours) || 5;
      }
    } else {
      dailyHoursNeeded = HOUR_STEPS.find(h => h > dailyHours) || 5;
    }
  }

  const skippedRatioPct    = Math.round((skippedCount / allTopics.length) * 100);
  const effectiveShortfall = shortfallPct > 0 ? shortfallPct : skippedRatioPct;
  const canCompress        = !compress && skippedCount > 0 && effectiveShortfall <= 30;

  const compressionRatio = (compress && hoursNeeded > hoursAvailable)
    ? Math.round((hoursAvailable / hoursNeeded) * 100)
    : 100;

  const warning = (!compress && skippedCount > 0) ? {
    skippedCount,
    skippedTopics,
    hoursAvailable,
    hoursNeeded,
    hoursShortfall:   Math.max(0, hoursNeeded - hoursAvailable),
    shortfallPct:     effectiveShortfall,
    canCompress,
    dailyHoursNeeded,
    message: `${skippedCount} topic${skippedCount > 1 ? 's' : ''} couldn't be scheduled. Try ${dailyHoursNeeded}h/day or use Compress.`,
  } : null;

  return {
    totalDays:       fullSchedule.length,
    totalTopics:     allTopics.length,
    scheduledTopics: allTopics.length - skippedCount,
    skippedCount,
    bufferDays,
    schedulingDays:  effectiveSchedulingDays,
    isCompressed:    compress && hoursNeeded > hoursAvailable,
    compressionRatio,
    warning,
    examDate,
    dailyHours,
    schedule:        fullSchedule,
  };
}

module.exports = { generateSchedule };