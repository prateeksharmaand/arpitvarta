const router = require('express').Router();
const { body } = require('express-validator');
const { authenticateAdmin, requirePermission } = require('../middleware/adminAuth');
const ctrl = require('../controllers/adminController');

// Auth (no middleware)
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists(),
], ctrl.login);

// All routes below require admin token
router.use(authenticateAdmin);

// Helper: require superadmin access
const requireSuperAdmin = (req, res, next) => {
  if (req.admin.isSuperAdmin) {
    return next();
  }
  res.status(403).json({ success: false, message: 'Superadmin access required' });
};

// Dashboard
router.get('/dashboard', ctrl.getDashboardStats);

// User Management
router.get('/users', ctrl.listUsers);
router.get('/users/:id', ctrl.getUser);
router.post('/users/:id/ban', ctrl.banUser);
router.post('/users/:id/unban', ctrl.unbanUser);

// Professional Management
router.get('/professionals', ctrl.listProfessionals);
router.post('/professionals/:id/approve', ctrl.approveProfessional);
router.post('/professionals/:id/reject', ctrl.rejectProfessional);
router.put('/professionals/:id/rates', ctrl.setProfessionalRates);
router.post('/professionals/:id/toggle-online', ctrl.toggleProfessionalOnline);
router.post('/professionals/:id/ban', ctrl.banProfessional);
router.post('/professionals/:id/unban', ctrl.unbanProfessional);
router.get('/professionals/:id/earnings', ctrl.getProfessionalEarnings);

// Category Management
router.get('/categories', ctrl.listCategories);
router.post('/categories', ctrl.createCategory);
router.put('/categories/:id', ctrl.updateCategory);
router.delete('/categories/:id', ctrl.deleteCategory);
router.put('/professionals/:id/category', ctrl.setProfessionalCategory);

// Wallet & Transactions
router.get('/transactions', ctrl.listTransactions);
router.post('/wallet/credit', [
  body('user_id').notEmpty(),
  body('amount').isFloat({ gt: 0 }),
], ctrl.manualCredit);
router.post('/wallet/debit', [
  body('user_id').notEmpty(),
  body('amount').isFloat({ gt: 0 }),
], ctrl.manualDebit);
router.post('/transactions/:id/refund', ctrl.refundTransaction);

// Withdrawal Requests
router.get('/withdrawals', ctrl.listWithdrawals);
router.post('/withdrawals/:id/approve', ctrl.approveWithdrawal);
router.post('/withdrawals/:id/reject', ctrl.rejectWithdrawal);

// Community Moderation
router.get('/community', ctrl.listCommunityPosts);
router.post('/community/:id/approve', ctrl.approvePost);
router.post('/community/:id/reject', ctrl.rejectPost);
router.delete('/community/:id', ctrl.deletePostAdmin);

// Push Notifications
router.post('/notifications/broadcast', [
  body('title').notEmpty(),
  body('body').notEmpty(),
], ctrl.sendBroadcastNotification);
router.post('/notifications/segment', [
  body('title').notEmpty(),
  body('body').notEmpty(),
], ctrl.sendSegmentedNotification);

const hiringCtrl = require('../controllers/hiringController');
router.get('/hirings', hiringCtrl.listApplications);
router.patch('/hirings/:id', hiringCtrl.updateStatus);
router.post('/hirings/:id/activate-as-professional', hiringCtrl.activateAsProfessional);
router.post('/hirings/:id/resend-email', hiringCtrl.resendWelcomeEmail);
router.post('/hirings/:id/reset-password', hiringCtrl.resetPassword);

// Recharge Offers Management
const walletCtrl = require('../controllers/walletController');
router.get('/recharge-offers', walletCtrl.adminListOffers);
router.post('/recharge-offers', walletCtrl.adminCreateOffer);
router.put('/recharge-offers/:id', walletCtrl.adminUpdateOffer);
router.delete('/recharge-offers/:id', walletCtrl.adminDeleteOffer);

// Sub-admin Management (superadmin only)
router.get('/sub-admins', requireSuperAdmin, ctrl.listSubAdmins);
router.post('/sub-admins', requireSuperAdmin, [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
], ctrl.createSubAdmin);
router.put('/sub-admins/:id', requireSuperAdmin, ctrl.updateSubAdmin);
router.delete('/sub-admins/:id', requireSuperAdmin, ctrl.deleteSubAdmin);

module.exports = router;
