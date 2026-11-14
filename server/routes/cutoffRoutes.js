const express = require('express');
const { listCutoffs } = require('../controllers/cutoffController');

const router = express.Router();

router.get('/', listCutoffs);

module.exports = router;
