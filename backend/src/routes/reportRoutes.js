const express = require('express');
const router = express.Router();
const { downloadBillPDF, downloadInvoicePDF, downloadBillHistoryPDF } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.get('/bill/:id/pdf', protect, downloadBillPDF);
router.get('/invoice', protect, downloadInvoicePDF);
router.post('/invoice', protect, downloadInvoicePDF);
router.get('/bill-history', protect, downloadBillHistoryPDF);
router.get('/bill-history/pdf', protect, downloadBillHistoryPDF);

module.exports = router;