const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/aiController');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Anonymous visitors can try the assistant, but sparingly.
const aiLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

router.post('/assist', aiLimiter, optionalAuth, ctrl.assist);
router.post('/profile-bio', authenticate, ctrl.profileBio);

module.exports = router;
