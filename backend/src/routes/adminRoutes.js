const express = require('express');
const router = express.Router();
const { 
    getSystemStats, 
    getAllConsumers, 
    getPendingVerifications, 
    updateVerificationStatus, 
    updateConnectionType,
    getAllBillsAdmin,
    checkAndApplyOverdueFines,
    sendDueDateReminders,
    imposeManualFine,
    getAdminAiInsights,
    verifyConsumerPayment,
    sendSingleBillReminder,
    updateConsumerDistrict,
    updateConsumerProfileAdmin,
    getAdminNotifications
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware'); // Applying RBAC

router.use(protect, admin); // Secure all routes in this file for Admins

// Dashboard & Consumer Data
router.get('/stats', getSystemStats);
router.get('/consumers', getAllConsumers);
router.put('/consumer/:id/district', updateConsumerDistrict);
router.put('/consumer/:id/profile', updateConsumerProfileAdmin);
router.get('/notifications', getAdminNotifications);

// KYC Verification Management
router.get('/verifications/pending', getPendingVerifications);
router.put('/verify/:id', updateVerificationStatus);
router.put('/connection-type/:id', updateConnectionType);

// Billing & Payment Management
router.get('/bills', getAllBillsAdmin);
router.post('/bills/check-overdue', checkAndApplyOverdueFines);
router.post('/bills/send-reminders', sendDueDateReminders);
router.post('/bills/:id/send-reminder', sendSingleBillReminder);
router.post('/bills/:id/verify-payment', verifyConsumerPayment);
router.put('/bills/:id/fine', imposeManualFine);

// AI Assistant Intelligence Engine
router.post('/ai-query', getAdminAiInsights);

module.exports = router;