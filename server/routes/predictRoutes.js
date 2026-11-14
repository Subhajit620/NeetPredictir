const express = require('express');
const { identifyUser } = require('../middleware/auth');
const { predict, getStates, getCategories } = require('../controllers/predictController');

const router = express.Router();

router.get('/states', getStates);
router.get('/categories', getCategories);
router.post('/', identifyUser, predict);

module.exports = router;

