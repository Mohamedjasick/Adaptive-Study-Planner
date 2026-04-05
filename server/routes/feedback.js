const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const {
  submitFeedback,
  getFeedback,
  getWeakTopics,
  getProgress
} = require('../controllers/feedbackController');

router.post('/', protect, submitFeedback);
router.get('/', protect, getFeedback);
router.get('/weak-topics', protect, getWeakTopics);
router.get('/progress', protect, getProgress);

module.exports = router;