const express = require('express');
const router = express.Router();
const { calculateSolar, calculateBattery, calculateEV } = require('../controllers/renewableController');
const { protect } = require('../middleware/authMiddleware');

router.post('/solar', protect, calculateSolar);
router.post('/battery', protect, calculateBattery);
router.post('/ev', protect, calculateEV);

module.exports = router;