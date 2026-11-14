const express = require('express');
const rateLimit = require('express-rate-limit');
const { identifyUser } = require('../middleware/auth');
const ctrl = require('../controllers/chatController');

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many messages. Please slow down.' },
});

router.use(identifyUser);

router.post('/', chatLimiter, ctrl.sendMessage);
router.get('/history', ctrl.listHistory);
router.get('/:id', ctrl.getSession);
router.delete('/:id', ctrl.deleteSession);

module.exports = router;
