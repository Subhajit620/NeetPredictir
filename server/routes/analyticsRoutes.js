const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { getDashboard } = require('../controllers/analyticsController');

const router = express.Router();

router.get('/', requireAdmin, getDashboard);

module.exports = router;
