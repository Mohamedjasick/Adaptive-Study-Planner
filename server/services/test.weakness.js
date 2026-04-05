const { generateSchedule } = require('./scheduler');
const { injectRevisions, detectWeakTopics } = require('./weakness');

const subjects = [
  {
    name: 'Data Structures',
    topics: [
      { name: 'Arrays', difficulty: 'easy' },
      { name: 'Trees', difficulty: 'hard' },
      { name: 'Graphs', difficulty: 'hard' },
    ]
  },
  {
    name: 'Algorithms',
    topics: [
      { name: 'Sorting', difficulty: 'medium' },
      { name: 'Dynamic Programming', difficulty: 'hard' },
    ]
  }
];

const examDate = '2026-04-15';
const dailyHours = 3;

const result = generateSchedule(subjects, examDate, dailyHours);

// Simulate feedback history — Trees marked low confidence twice
const feedbackHistory = [
  { topicName: 'Trees', subject: 'Data Structures', difficulty: 'hard', confidence: 'low' },
  { topicName: 'Trees', subject: 'Data Structures', difficulty: 'hard', confidence: 'low' },
  { topicName: 'Dynamic Programming', subject: 'Algorithms', difficulty: 'hard', confidence: 'low' },
  { topicName: 'Arrays', subject: 'Data Structures', difficulty: 'easy', confidence: 'high' },
];

const weak = detectWeakTopics(feedbackHistory);
console.log('Weak topics detected:');
weak.forEach(t => console.log(`  - ${t.topicName} (low confidence x${t.lowCount})`));

const updated = injectRevisions(result.schedule, feedbackHistory, dailyHours);

console.log('\nSchedule with revisions injected:');
updated.forEach(day => {
  if (day.topics.length > 0) {
    console.log(`\n${day.date}:`);
    day.topics.forEach(t => {
      const tag = t.isRevision ? ' <- REVISION' : '';
      console.log(`  - ${t.name}${tag}`);
    });
  }
});