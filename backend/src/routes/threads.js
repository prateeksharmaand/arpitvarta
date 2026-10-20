const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { listThreads, getMessages } = require('../controllers/threadController');

router.get('/', authenticate, listThreads);
router.get('/:professionalId/messages', authenticate, getMessages);

module.exports = router;
