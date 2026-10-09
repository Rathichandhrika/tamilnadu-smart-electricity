const express = require('express');
const router = express.Router();
const { predictNextMonth, getApplianceAdvice } = require('../controllers/predictionController');
const { protect } = require('../middleware/authMiddleware');

router.post('/next-month', protect, predictNextMonth);
router.post('/appliance-advice', protect, getApplianceAdvice);

module.exports = router;