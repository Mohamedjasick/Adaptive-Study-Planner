const { sortTopicsByPriority } = require('./priority');

const topics = [
  { name: 'Arrays', difficulty: 'easy', confidence: 'high' },
  { name: 'Trees', difficulty: 'hard', confidence: 'low' },
  { name: 'Graphs', difficulty: 'hard', confidence: 'medium' },
  { name: 'Sorting', difficulty: 'medium', confidence: 'low' },
  { name: 'DP', difficulty: 'hard', confidence: 'low' },
];

const examDate = '2025-08-01';

const sorted = sortTopicsByPriority(topics, examDate);

console.log('Topics sorted by priority:\n');
sorted.forEach((t, i) => {
  console.log(`${i + 1}. ${t.name} — score: ${t.priorityScore} (${t.difficulty}, confidence: ${t.confidence || 'medium'})`);
});