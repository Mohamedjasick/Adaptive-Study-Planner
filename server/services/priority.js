const DIFFICULTY_WEIGHT = 3;
const URGENCY_WEIGHT = 2;
const CONFIDENCE_WEIGHT = 2;

function getDifficultyScore(difficulty) {
  const map = { easy: 1, medium: 2, hard: 3 };
  return map[difficulty.toLowerCase()] || 1;
}

function getConfidencePenalty(confidence) {
  const map = { high: 0, medium: 1, low: 3 };
  return map[confidence.toLowerCase()] || 0;
}

function getUrgencyScore(examDate) {
  const today = new Date();
  const exam = new Date(examDate);
  const daysLeft = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 3) return 10;
  if (daysLeft <= 7) return 7;
  if (daysLeft <= 14) return 4;
  if (daysLeft <= 30) return 2;
  return 1;
}

function calculatePriority(topic, examDate) {
  const difficulty = getDifficultyScore(topic.difficulty);
  const urgency = getUrgencyScore(examDate);
  const confidence = getConfidencePenalty(topic.confidence || 'medium');

  const score =
    difficulty * DIFFICULTY_WEIGHT +
    urgency * URGENCY_WEIGHT +
    confidence * CONFIDENCE_WEIGHT;

  return score;
}

function sortTopicsByPriority(topics, examDate) {
  return topics
    .map(topic => ({
      ...topic,
      priorityScore: calculatePriority(topic, examDate)
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

module.exports = { calculatePriority, sortTopicsByPriority };