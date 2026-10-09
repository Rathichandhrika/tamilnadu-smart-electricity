const fs = require('fs');
const path = require('path');
const Consumer = require('../models/Consumer');
const Bill = require('../models/Bill');
const Alert = require('../models/Alert');
const { generateBill } = require('../services/billing/billCalculator');

/**
 * Calculates Commercial (LT-V_COMMERCIAL) Non-Telescopic Bill
 * Rule:
 * - 0-100 units @ ₹6.65
 * - >100 units @ ₹10.45 flat for all units
 * - Fixed demand charges @ ₹110/kW
 * - 5% State Electricity Tax
 */
const calculateCommercialBill = (unitsConsumed, sanctionedLoadKw) => {
    const units = Math.max(0, Number(unitsConsumed) || 0);
    const loadKw = Number(sanctionedLoadKw) || 2.0;

    // Non-telescopic: If > 100 units, all units billed flat at ₹10.45. Else ₹6.65.
    const ratePerUnit = units <= 100 ? 6.65 : 10.45;
    const energyCharge = Number((units * ratePerUnit).toFixed(2));
    const fixedCharge = Number((loadKw * 110).toFixed(2));
    const subtotal = energyCharge + fixedCharge;
    const electricityTax = Number((subtotal * 0.05).toFixed(2));
    const totalAmount = Number((subtotal + electricityTax).toFixed(2));

    const slabBreakdown = [
        {
            slab: units <= 100 ? '0 - 100 Units (Commercial Base)' : '> 100 Units (Commercial High Usage)',
            unitsBilled: units,
            ratePerUnit: ratePerUnit,
            charge: energyCharge,
            isNonTelescopic: true,
            description: units <= 100 
                ? 'Non-telescopic: 0-100 units @ ₹6.65/unit' 
                : `Non-telescopic: All ${units} units billed flat @ ₹10.45/unit`
        },
        {
            slab: 'Fixed Demand Charge',
            unitsBilled: loadKw,
            ratePerUnit: 110,
            charge: fixedCharge,
            description: `₹110/kW fixed demand charge for ${loadKw} kW sanctioned load`
        },
        {
            slab: 'State Electricity Tax',
            unitsBilled: 1,
            ratePerUnit: 0.05,
            charge: electricityTax,
            description: '5% State Electricity Tax applied on subtotal'
        }
    ];

    return {
        unitsConsumed: units,
        sanctionedLoadKw: loadKw,
        connectionType: 'LT-V_COMMERCIAL',
        tariffCategory: 'LT-V',
        tariffDescription: 'TANGEDCO LT-V Commercial Supply (Non-Telescopic)',
        ratePerUnit,
        energyCharge,
        fixedCharge,
        electricityTax,
        totalAmount,
        slabBreakdown
    };
};

/**
 * Calculates Industrial (LT-IIIB_INDUSTRIAL) Bill
 * Rule:
 * - Energy Charge: Flat ₹7.65 per unit across all units
 * - Fixed Demand Charges: ₹600/kW bi-monthly
 * - 5% State Electricity Duty applied on subtotal
 */
const calculateIndustrialBill = (unitsConsumed, sanctionedLoadKw) => {
    const units = Math.max(0, Number(unitsConsumed) || 0);
    const loadKw = Number(sanctionedLoadKw) || 10.0; // Default 10 kW industrial load

    const ratePerUnit = 7.65;
    const energyCharge = Number((units * ratePerUnit).toFixed(2));
    const fixedCharge = Number((loadKw * 600.0).toFixed(2));
    const subtotal = energyCharge + fixedCharge;
    const electricityTax = Number((subtotal * 0.05).toFixed(2));
    const totalAmount = Number((subtotal + electricityTax).toFixed(2));

    const slabBreakdown = [
        {
            slab: 'Industrial Energy Draw (Flat Rate)',
            unitsBilled: units,
            ratePerUnit: ratePerUnit,
            charge: energyCharge,
            isFlatRate: true,
            description: `Flat Industrial Rate: ${units} units @ ₹7.65/unit`
        },
        {
            slab: 'Bi-Monthly Demand Charge',
            unitsBilled: loadKw,
            ratePerUnit: 600.0,
            charge: fixedCharge,
            description: `₹600.00/kW bi-monthly fixed demand charge for ${loadKw} kW sanctioned load`
        },
        {
            slab: 'Tamil Nadu Electricity Duty (5%)',
            unitsBilled: 1,
            ratePerUnit: 0.05,
            charge: electricityTax,
            description: '5% State Electricity Duty on aggregate energy and demand charges'
        }
    ];

    return {
        unitsConsumed: units,
        sanctionedLoadKw: loadKw,
        connectionType: 'LT-IIIB_INDUSTRIAL',
        tariffCategory: 'LT-3B',
        tariffDescription: 'TANGEDCO LT-IIIB Industrial / Manufacturing Power Supply',
        ratePerUnit,
        energyCharge,
        fixedCharge,
        electricityTax,
        totalAmount,
        slabBreakdown
    };
};

// @desc    Estimate bill dynamically (does not save to DB)
// @route   POST /api/bills/calculate
// @access  Private
const calculateBillEstimate = async (req, res, next) => {
    try {
        const { unitsConsumed, connectionType: explicitType, sanctionedLoadKw: explicitLoad } = req.body;
        
        // Fetch consumer profile of logged-in user
        const consumer = await Consumer.findOne({ user: req.user._id });
        const connectionType = explicitType || consumer?.connectionType || 'LT-1A_DOMESTIC';
        const sanctionedLoadKw = explicitLoad || consumer?.sanctionedLoadKw || (connectionType === 'LT-IIIB_INDUSTRIAL' ? 10.0 : 2.0);

        let billDetails;
        if (connectionType === 'LT-IIIB_INDUSTRIAL' || consumer?.tariffCategory === 'LT-3B') {
            // Apply Industrial Flat + Demand Charge Billing
            billDetails = calculateIndustrialBill(unitsConsumed, sanctionedLoadKw);
        } else if (connectionType === 'LT-V_COMMERCIAL' || consumer?.tariffCategory === 'LT-5') {
            // Apply Commercial Non-Telescopic Billing
            billDetails = calculateCommercialBill(unitsConsumed, sanctionedLoadKw);
        } else {
            // Apply Domestic Telescopic Tariff
            billDetails = await generateBill(
                consumer?.tariffCategory || 'LT-1A', 
                Number(unitsConsumed), 
                sanctionedLoadKw
            );
            billDetails.connectionType = 'LT-1A_DOMESTIC';
            billDetails.electricityTax = 0;
        }

        res.status(200).json({ success: true, data: billDetails });
    } catch (error) {
        next(error);
    }
};

// @desc    Generate and save official monthly bill
// @route   POST /api/bills
// @access  Private (System/Admin usually, opened for demo)
const saveGeneratedBill = async (req, res, next) => {
    try {
        const { unitsConsumed, billingMonth, connectionType: explicitType } = req.body;

        const consumer = await Consumer.findOne({ user: req.user._id });
        if (!consumer) {
            return res.status(404).json({ success: false, message: 'Consumer profile not found' });
        }

        // 1. Enforce strict e-KYC requirement for official invoice generation
        const user = await User.findById(req.user._id);
        const isKycApproved = (consumer.verificationStatus === 'APPROVED' || user?.verificationStatus === 'APPROVED');
        if (!isKycApproved) {
            return res.status(403).json({
                success: false,
                code: 'KYC_REQUIRED',
                message: 'e-KYC verification required. You must complete identity verification (Aadhar / Property Tax) before generating an official statutory electricity invoice.',
                messageTa: 'மின்னணு கேஒய்சி (e-KYC) சரிபார்ப்பு அவசியம். அதிகாரப்பூர்வ மின்கட்டண விலைப்பட்டியல் உருவாக்க உங்கள் ஆதார் / ஆவண சரிபார்ப்பு அங்கீகரிக்கப்பட்டிருக்க வேண்டும்.'
            });
        }

        const connectionType = explicitType || consumer.connectionType || 'LT-1A_DOMESTIC';
        let billDetails;

        if (connectionType === 'LT-IIIB_INDUSTRIAL' || consumer.tariffCategory === 'LT-3B') {
            billDetails = calculateIndustrialBill(unitsConsumed, consumer.sanctionedLoadKw);
        } else if (connectionType === 'LT-V_COMMERCIAL' || consumer.tariffCategory === 'LT-5') {
            billDetails = calculateCommercialBill(unitsConsumed, consumer.sanctionedLoadKw);
        } else {
            billDetails = await generateBill(
                consumer.tariffCategory || 'LT-1A', 
                Number(unitsConsumed), 
                consumer.sanctionedLoadKw
            );
            billDetails.connectionType = 'LT-1A_DOMESTIC';
            billDetails.electricityTax = 0;
        }

        // 2. Set strict statutory due date: exactly 15 days from invoice generation
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 15);

        // Save to Database
        const savedBill = await Bill.create({
            consumer: consumer._id,
            billingMonth: billingMonth || 'October 2026',
            connectionType: billDetails.connectionType,
            unitsConsumed: billDetails.unitsConsumed,
            energyCharge: billDetails.energyCharge,
            fixedCharge: billDetails.fixedCharge,
            electricityTax: billDetails.electricityTax || 0,
            totalAmount: billDetails.totalAmount,
            dueDate: dueDate,
            slabBreakdown: billDetails.slabBreakdown
        });

        const dueDateFormatted = dueDate.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        // 3. Create In-App Notification with 15-day payment window and ₹150 fine warning
        await Alert.create({
            type: 'INVOICE_GENERATED',
            severity: 'MEDIUM',
            title: 'Official Electricity Invoice Generated',
            titleTa: 'அதிகாரப்பூர்வ மின்கட்டண விலைப்பட்டியல் வெளியீடு',
            message: `Official Invoice for ${savedBill.billingMonth} has been generated: ₹${savedBill.totalAmount.toLocaleString()} (${savedBill.unitsConsumed} kWh). You have 15 days to pay (Due Date: ${dueDateFormatted}). Clear before due date to avoid a late fee surcharge of ₹150.`,
            messageTa: `${savedBill.billingMonth} மாதத்திற்கான அதிகாரப்பூர்வ மின்கட்டண விலைப்பட்டியல் உருவாக்கப்பட்டது: ₹${savedBill.totalAmount.toLocaleString()} (${savedBill.unitsConsumed} kWh). கட்டணம் செலுத்த 15 நாட்கள் கால அவகாசம் உள்ளது (கடைசி நாள்: ${dueDateFormatted}). ₹150 அபராதக் கட்டணத்தைத் தவிர்க்க கடைசி நாளுக்குள் செலுத்தவும்.`,
            consumer: consumer._id,
            user: req.user._id,
            bill: savedBill._id,
            fineAmount: 0
        });

        res.status(201).json({ success: true, data: savedBill });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all bills for the logged-in user
// @route   GET /api/bills/history
// @access  Private
const getMyBills = async (req, res, next) => {
    try {
        const consumer = await Consumer.findOne({ user: req.user._id });
        if (!consumer) {
            return res.status(404).json({ success: false, message: 'Consumer profile not found' });
        }

        const bills = await Bill.find({ consumer: consumer._id })
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: bills });
    } catch (error) {
        next(error);
    }
};

// @desc    Get official TANGEDCO tariff schedule (Domestic, Commercial, Industrial)
// @route   GET /api/bills/tariffs
// @access  Public / Private
const getTariffRules = async (req, res, next) => {
    try {
        const tariffPath = path.join(__dirname, '../../../database/tangedco_tariffs.json');
        if (fs.existsSync(tariffPath)) {
            const data = JSON.parse(fs.readFileSync(tariffPath, 'utf8'));
            return res.status(200).json({ success: true, data });
        }
        res.status(200).json({ success: true, data: null });
    } catch (error) {
        next(error);
    }
};

// @desc    Process or submit bill payment reference (TANGEDCO Quick Pay verification)
// @route   POST /api/bills/:id/pay
// @access  Private
const payBill = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { paymentMode = 'TANGEDCO_QUICKPAY', transactionRef, directConfirm = false } = req.body;

        const bill = await Bill.findById(id).populate({
            path: 'consumer',
            populate: { path: 'user' }
        });

        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill record not found' });
        }

        if (bill.status === 'PAID' && bill.paymentVerificationStatus === 'VERIFIED') {
            return res.status(400).json({ success: false, message: 'This bill has already been verified and paid.' });
        }

        const totalPayable = Number((bill.totalAmount + (bill.fineAmount || 0)).toFixed(2));
        const genRef = transactionRef || `TNEB-QPAY-${Date.now().toString().slice(-8)}`;
        const isAdmin = req.user.role === 'ADMIN';

        if (isAdmin || directConfirm) {
            bill.status = 'PAID';
            bill.paymentVerificationStatus = 'VERIFIED';
            bill.paidAt = new Date();
            bill.verifiedBy = req.user._id;
            bill.verifiedAt = new Date();
        } else {
            bill.status = 'PENDING_VERIFICATION';
            bill.paymentVerificationStatus = 'PENDING';
            bill.submittedAt = new Date();
        }

        bill.paymentMode = paymentMode;
        bill.transactionRef = genRef;
        await bill.save();

        const consumer = bill.consumer;
        const user = consumer?.user;

        // Create In-App Notification
        if (bill.status === 'PAID') {
            await Alert.create({
                type: 'PAYMENT_SUCCESS',
                severity: 'LOW',
                title: 'TANGEDCO E-Receipt Generated & Verified',
                titleTa: 'மின்கட்டணம் உறுதி செய்யப்பட்டு ரசீது உருவாக்கப்பட்டது',
                message: `Payment Verified: ₹${totalPayable.toLocaleString()} for ${bill.billingMonth} via ${paymentMode.replace(/_/g, ' ')}. Reference ID: ${genRef}.`,
                messageTa: `மின்கட்டணம் வெற்றிகரமாக உறுதிசெய்யப்பட்டது: ₹${totalPayable.toLocaleString()} (${bill.billingMonth}) - ${paymentMode}. ரசீது எண்: ${genRef}.`,
                consumer: consumer?._id,
                user: user?._id,
                bill: bill._id
            });
        } else {
            await Alert.create({
                type: 'PAYMENT_SUCCESS',
                severity: 'MEDIUM',
                title: 'TANGEDCO Payment Reference Submitted',
                titleTa: 'கட்டண ரசீது எண் சரிபார்ப்புக்கு அனுப்பப்பட்டது',
                message: `Payment reference ${genRef} submitted for ₹${totalPayable.toLocaleString()} (${bill.billingMonth}). Pending administrative ledger verification.`,
                messageTa: `${bill.billingMonth} மாதத்திற்கான மின்கட்டண ரசீது எண் ${genRef} (₹${totalPayable.toLocaleString()}) சரிபார்ப்புக்கு சமர்ப்பிக்கப்பட்டுள்ளது.`,
                consumer: consumer?._id,
                user: user?._id,
                bill: bill._id
            });
        }

        res.status(200).json({
            success: true,
            message: bill.status === 'PAID'
                ? 'Payment verified successfully and official receipt issued.'
                : 'Payment reference submitted successfully. Pending admin ledger verification.',
            data: {
                billId: bill._id,
                billingMonth: bill.billingMonth,
                amountPaid: totalPayable,
                paymentMode: bill.paymentMode,
                transactionRef: bill.transactionRef,
                paidAt: bill.paidAt,
                submittedAt: bill.submittedAt,
                status: bill.status,
                paymentVerificationStatus: bill.paymentVerificationStatus
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    calculateCommercialBill,
    calculateIndustrialBill,
    calculateBillEstimate,
    saveGeneratedBill,
    getMyBills,
    getTariffRules,
    payBill
};