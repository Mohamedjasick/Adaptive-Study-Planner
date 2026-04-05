const { generateSchedule } = require('./scheduler');

const subjects = [
  {
    name: 'Data Structures',
    topics: [
      { name: 'Arrays', difficulty: 'easy' },
      { name: 'Linked Lists', difficulty: 'medium' },
      { name: 'Trees', difficulty: 'hard' },
      { name: 'Graphs', difficulty: 'hard' },
    ]
  },
  {
    name: 'Algorithms',
    topics: [
      { name: 'Sorting', difficulty: 'medium' },
      { name: 'Dynamic Programming', difficulty: 'hard' },
      { name: 'Binary Search', difficulty: 'easy' },
    ]
  }
];

const examDate = '2026-04-15';
const dailyHours = 3;

const result = generateSchedule(subjects, examDate, dailyHours);

console.log(`Total days: ${result.totalDays}`);
console.log(`Total topics: ${result.totalTopics}`);
console.log(`\nFirst 5 days of your plan:\n`);

result.schedule.slice(0, 5).forEach(day => {
  console.log(`${day.date} (${day.totalHours}h):`);
  day.topics.forEach(t => {
    console.log(`  - ${t.name} [${t.subject}] — ${t.difficulty} — ${t.hours}h`);
  });
});