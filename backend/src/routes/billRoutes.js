const express = require('express');
const router = express.Router();
const { 
    calculateBillEstimate, 
    saveGeneratedBill, 
    getMyBills,
    getTariffRules,
    payBill
} = require('../controllers/billController');
const { protect } = require('../middleware/authMiddleware');

router.get('/tariffs', getTariffRules);
router.post('/calculate', protect, calculateBillEstimate);
router.post('/', protect, saveGeneratedBill);
router.get('/history', protect, getMyBills);
router.post('/:id/pay', protect, payBill);

module.exports = router;