const Bill = require('../models/Bill');
const Consumer = require('../models/Consumer');
const { generateBillPDF, generateBillHistoryPDF } = require('../utils/pdfGenerator');
const { calculateCommercialBill, calculateIndustrialBill } = require('./billController');
const { generateBill } = require('../services/billing/billCalculator');

/**
 * Helper to auto-create an official initial bill for a consumer if none exists
 */
const getOrCreateLatestBill = async (consumer) => {
    let bill = await Bill.findOne({ consumer: consumer._id })
        .sort({ createdAt: -1 })
        .populate({
            path: 'consumer',
            populate: { path: 'user', select: 'name email verificationStatus' }
        });

    if (!bill) {
        const connectionType = consumer.connectionType || 'LT-1A_DOMESTIC';
        const sanctionedLoadKw = consumer.sanctionedLoadKw || (connectionType === 'LT-IIIB_INDUSTRIAL' ? 10.0 : 2.0);
        const defaultUnits = connectionType === 'LT-IIIB_INDUSTRIAL' ? 1200 : (connectionType === 'LT-V_COMMERCIAL' ? 350 : 240);

        let billDetails;
        if (connectionType === 'LT-IIIB_INDUSTRIAL' || consumer.tariffCategory === 'LT-3B') {
            billDetails = calculateIndustrialBill(defaultUnits, sanctionedLoadKw);
        } else if (connectionType === 'LT-V_COMMERCIAL' || consumer.tariffCategory === 'LT-5') {
            billDetails = calculateCommercialBill(defaultUnits, sanctionedLoadKw);
        } else {
            billDetails = await generateBill(
                consumer.tariffCategory || 'LT-1A', 
                defaultUnits, 
                sanctionedLoadKw
            );
            billDetails.connectionType = 'LT-1A_DOMESTIC';
            billDetails.electricityTax = 0;
        }

        const currentMonthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 15);

        const newBill = await Bill.create({
            consumer: consumer._id,
            billingMonth: currentMonthName,
            connectionType: billDetails.connectionType,
            unitsConsumed: billDetails.unitsConsumed,
            energyCharge: billDetails.energyCharge,
            fixedCharge: billDetails.fixedCharge,
            electricityTax: billDetails.electricityTax || 0,
            totalAmount: billDetails.totalAmount,
            dueDate: dueDate,
            slabBreakdown: billDetails.slabBreakdown,
            status: 'UNPAID'
        });

        bill = await Bill.findById(newBill._id).populate({
            path: 'consumer',
            populate: { path: 'user', select: 'name email verificationStatus' }
        });
    }

    return bill;
};

/**
 * Helper to validate authorization and stream PDF response
 */
const sendBillResponse = (bill, req, res) => {
    // Verify logged-in user owns this bill or is ADMIN
    const billUserId = bill.consumer?.user?._id?.toString() || bill.consumer?.user?.toString();
    if (billUserId !== req.user._id.toString() && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Not authorized to access this invoice' });
    }

    const safeMonth = (bill.billingMonth || 'Billing_Cycle').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=TNEB_Tax_Invoice_${safeMonth}.pdf`);

    generateBillPDF(bill, res);
};

// @desc    Download PDF version of a Bill by ID
// @route   GET /api/reports/bill/:id/pdf
// @access  Private
const downloadBillPDF = async (req, res, next) => {
    try {
        const bill = await Bill.findById(req.params.id).populate({
            path: 'consumer',
            populate: { path: 'user', select: 'name email' }
        });

        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill not found' });
        }

        sendBillResponse(bill, req, res);
    } catch (error) {
        next(error);
    }
};

// @desc    Download Official Tax Invoice PDF (by query param or latest consumer bill)
// @route   GET /api/reports/invoice
// @route   POST /api/reports/invoice
// @access  Private
const downloadInvoicePDF = async (req, res, next) => {
    try {
        const billId = req.query.billId || req.body?.billId;
        let bill;

        if (billId) {
            bill = await Bill.findById(billId).populate({
                path: 'consumer',
                populate: { path: 'user', select: 'name email' }
            });
        } else {
            // Find consumer for current user
            const consumer = await Consumer.findOne({ user: req.user._id });
            if (!consumer) {
                return res.status(404).json({ success: false, message: 'Consumer profile not found' });
            }
            // Fetch or auto-generate most recent bill
            bill = await getOrCreateLatestBill(consumer);
        }

        if (!bill) {
            return res.status(404).json({ success: false, message: 'No bill found for invoice generation' });
        }

        sendBillResponse(bill, req, res);
    } catch (error) {
        next(error);
    }
};

// @desc    Download Consolidated Bill History PDF Statement
// @route   GET /api/reports/bill-history
// @route   GET /api/reports/bill-history/pdf
// @access  Private
const downloadBillHistoryPDF = async (req, res, next) => {
    try {
        let consumerId = req.query.consumerId;
        let consumer;

        if (req.user.role === 'ADMIN' && consumerId) {
            consumer = await Consumer.findById(consumerId).populate('user', 'name email verificationStatus');
        } else {
            consumer = await Consumer.findOne({ user: req.user._id }).populate('user', 'name email verificationStatus');
        }

        if (!consumer) {
            return res.status(404).json({ success: false, message: 'Consumer profile not found for statement generation.' });
        }

        // Fetch all bills for this consumer ordered from newest to oldest
        let bills = await Bill.find({ consumer: consumer._id }).sort({ createdAt: -1 });

        // If no bills exist yet, create initial cycle bill so statement contains their official initial demand note
        if (bills.length === 0) {
            const initialBill = await getOrCreateLatestBill(consumer);
            bills = [initialBill];
        }

        const safeSNo = (consumer.serviceNumber || 'Account').replace(/[^a-zA-Z0-9_-]/g, '_');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=TNEB_Bill_History_${safeSNo}.pdf`);

        generateBillHistoryPDF({ consumer, bills }, res);
    } catch (error) {
        console.error('Bill History PDF generation error:', error);
        next(error);
    }
};

module.exports = { downloadBillPDF, downloadInvoicePDF, downloadBillHistoryPDF };