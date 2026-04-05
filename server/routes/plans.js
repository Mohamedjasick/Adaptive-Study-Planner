const express = require('express');
const router  = express.Router();
const protect = require('../middleware/auth');
const {
  getPlans,
  previewPlan,
  createPlan,
  updatePlan,
  deletePlan,
  suggestHours,
} = require('../controllers/planController');

// ⚠️ Specific routes MUST come before parameterised routes (:id)
router.get('/suggest-hours', protect, suggestHours);
router.post('/preview',      protect, previewPlan);   // ← new

router.get('/',              protect, getPlans);
router.post('/',             protect, createPlan);
router.put('/:id',           protect, updatePlan);
router.delete('/:id',        protect, deletePlan);

module.exports = router;