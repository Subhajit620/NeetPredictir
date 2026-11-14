const express = require('express');

const router = express.Router();

router.use('/admin', require('./adminAuthRoutes'));
router.use('/admin/datasets', require('./datasetRoutes'));
router.use('/admin/analytics', require('./analyticsRoutes'));
router.use('/colleges', require('./collegeRoutes'));
router.use('/cutoffs', require('./cutoffRoutes'));
router.use('/predict', require('./predictRoutes'));
router.use('/chat', require('./chatRoutes'));
router.use('/student', require('./studentRoutes'));

const { getStates, getCategories } = require('../controllers/predictController');

router.get('/states', getStates);
router.get('/categories', getCategories);

router.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', time: new Date().toISOString() });
});

module.exports = router;
