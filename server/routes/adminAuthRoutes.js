const express = require('express');
const rateLimit = require('express-rate-limit');
const { login, me } = require('../controllers/adminAuthController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

router.post('/login', loginLimiter, login);
router.get('/me', requireAdmin, me);

module.exports = router;
