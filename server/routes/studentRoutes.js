const express = require('express');
const rateLimit = require('express-rate-limit');
const { identifyUser } = require('../middleware/auth');
const ctrl = require('../controllers/studentController');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
});

router.use(identifyUser);

// Profile routes
router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
router.post('/predict-profile', ctrl.predictProfile);

// Choice List routes
router.get('/choice-list', ctrl.getChoiceList);
router.post('/choice-list', ctrl.addChoice);
router.delete('/choice-list/:id', ctrl.removeChoice);
router.put('/choice-list/reorder', ctrl.reorderChoiceList);

// Auth routes
router.post('/register', authLimiter, ctrl.registerStudent);
router.post('/login', authLimiter, ctrl.loginStudent);

module.exports = router;
