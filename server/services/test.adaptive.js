const { generateSchedule } = require('./scheduler');
const { reschedule } = require('./adaptive');

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

let result = generateSchedule(subjects, examDate, dailyHours);

console.log('BEFORE — first 4 days:');
result.schedule.slice(0, 4).forEach(day => {
  console.log(`\n${day.date}:`);
  day.topics.forEach(t => console.log(`  - ${t.name}`));
});

// Simulate: Trees (day 0) was not completed
const feedback = [
  {
    topicName: 'Trees',
    subject: 'Data Structures',
    difficulty: 'hard',
    status: 'incomplete',
    confidence: 'low'
  }
];

const updated = reschedule(result.schedule, feedback, dailyHours);
console.log('Total days after reschedule:', updated.length);
console.log('All days:');
updated.forEach(day => {
  console.log(`${day.date} (${day.totalHours}h):`, day.topics.map(t => t.name));
});

console.log('\nAFTER — Trees missed — first 6 days:');
updated.slice(0, 6).forEach(day => {
  console.log(`\n${day.date}:`);
  day.topics.forEach(t => {
    const tag = t.rescheduled ? ' <- RESCHEDULED' : '';
    console.log(`  - ${t.name}${tag}`);
  });
});