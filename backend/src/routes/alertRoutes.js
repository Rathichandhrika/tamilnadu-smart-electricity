const express = require('express');
const router = express.Router();
const { 
    getActiveAlerts, 
    getUnreadAlertsCount,
    resolveAlert, 
    markAllAlertsRead 
} = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getActiveAlerts);
router.get('/unread-count', getUnreadAlertsCount);
router.put('/mark-all-read', markAllAlertsRead);
router.put('/:id/resolve', resolveAlert);

module.exports = router;