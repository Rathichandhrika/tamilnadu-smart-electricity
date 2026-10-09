const express = require('express');
const router = express.Router();
const { getEnergyInbox, getAnomalies, getRecommendations } = require('../controllers/insightsController');
const { protect } = require('../middleware/authMiddleware');

router.get('/anomalies', protect, getAnomalies);
router.post('/energy-inbox', protect, getEnergyInbox);
router.get('/energy-inbox', protect, getEnergyInbox);
router.get('/recommendations', protect, getRecommendations);

module.exports = router;