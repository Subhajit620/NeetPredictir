const express = require('express');
const ctrl = require('../controllers/collegeController');

const router = express.Router();

router.get('/suggestions', ctrl.getSuggestions);
router.get('/', ctrl.listColleges);
router.get('/:id', ctrl.getCollege);

module.exports = router;
