const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const {
  createSchedule,
  getSchedule,
  getToday,
  getTodayAll,
  regenerateSchedule,
} = require('../controllers/scheduleController');

router.post('/',                       auth, createSchedule);
router.get('/',                        auth, getSchedule);
router.get('/today-all',               auth, getTodayAll);   // before /today to avoid param clash
router.get('/today',                   auth, getToday);
router.put('/regenerate/:planId',      auth, regenerateSchedule);

module.exports = router;