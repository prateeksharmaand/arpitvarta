const router = require('express').Router();
const ctrl = require('../controllers/professionalController');
const { authenticate } = require('../middleware/auth');

// Specific routes BEFORE wildcard /:id
router.get('/', ctrl.listProfessionals);
router.post('/register', authenticate, ctrl.registerAsProfessional);
router.patch('/availability', authenticate, ctrl.updateAvailability);
router.get('/me', authenticate, ctrl.getMyProfile);
router.put('/me', authenticate, ctrl.updateMyProfile);
router.patch('/me', authenticate, ctrl.updateMyProfile);
router.get('/me/dashboard', authenticate, ctrl.getProfessionalDashboard);
router.get('/me/wallet', authenticate, ctrl.getProfessionalWallet);
router.get('/me/transactions', authenticate, ctrl.getProfessionalTransactions);
router.get('/consultations/history', authenticate, ctrl.getConsultationHistory);
router.get('/consultations/:id/messages', authenticate, ctrl.getConsultationMessages);
router.get('/threads', authenticate, ctrl.getChatThreads);
router.get('/threads/:userId/messages', authenticate, ctrl.getUserThreadMessages);

// Wildcard routes LAST
router.get('/:id', ctrl.getProfessional);
router.get('/:id/reviews', ctrl.getProfessionalReviews);
router.post('/:id/reviews', authenticate, ctrl.submitReview);

module.exports = router;
