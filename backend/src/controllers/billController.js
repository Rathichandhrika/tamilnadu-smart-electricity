const fs = require('fs');
const path = require('path');
const Consumer = require('../models/Consumer');
const Bill = require('../models/Bill');
const Alert = require('../models/Alert');
const { generateBill } = require('../services/billing/billCalculator');
const { sendPaymentInvoiceReceiptEmail } = require('../services/emailService');

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
        const { 
            unitsConsumed, 
            billingMonth, 
            connectionType: explicitType,
            demoScenario,
            dueDateOffsetDays,
            customDueDate
        } = req.body;

        const consumer = await Consumer.findOne({ user: req.user._id });
        if (!consumer) {
            return res.status(404).json({ success: false, message: 'Consumer profile not found' });
        }

        // 1. Enforce strict e-KYC requirement for official invoice generation
        const User = require('../models/User');
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

        // 2. Due Date Calculation & Demo Scenario Logic
        let dueDate;
        let billStatus = 'UNPAID';
        let fineAmount = 0;
        let fineImposed = false;
        let fineReason = '';
        let fineImposedAt = null;
        let paymentVerificationStatus = 'NONE';
        let transactionRef = null;
        let paymentMode = null;
        let submittedAt = null;
        let dueAlertSent = false;
        let fineAlertSent = false;

        const isOverdueDemo = demoScenario === 'OVERDUE' || (typeof dueDateOffsetDays === 'number' && dueDateOffsetDays < 0);
        const isNearingDueDemo = demoScenario === 'NEARING_DUE' || (typeof dueDateOffsetDays === 'number' && dueDateOffsetDays >= 0 && dueDateOffsetDays <= 3);
        const isVerificationDemo = demoScenario === 'PENDING_VERIFICATION';

        if (customDueDate) {
            dueDate = new Date(customDueDate);
        } else if (isOverdueDemo) {
            const offset = typeof dueDateOffsetDays === 'number' ? dueDateOffsetDays : -5;
            dueDate = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
            billStatus = 'OVERDUE';
            fineAmount = Math.max(150, Number((billDetails.totalAmount * 0.015).toFixed(2)));
            fineImposed = true;
            fineImposedAt = new Date();
            fineReason = 'TANGEDCO Late Payment Surcharge (LPSC) for crossing statutory due date';
            dueAlertSent = true;
            fineAlertSent = true;
        } else if (isNearingDueDemo) {
            const offset = typeof dueDateOffsetDays === 'number' ? dueDateOffsetDays : 2;
            dueDate = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
            billStatus = 'UNPAID';
            dueAlertSent = true;
        } else if (isVerificationDemo) {
            dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
            billStatus = 'PENDING_VERIFICATION';
            paymentVerificationStatus = 'PENDING';
            paymentMode = 'TANGEDCO_QUICKPAY';
            transactionRef = `TNEB-QPAY-${Date.now().toString().slice(-8)}`;
            submittedAt = new Date();
        } else {
            dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 15);
        }

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
            status: billStatus,
            fineAmount: fineAmount,
            fineImposed: fineImposed,
            fineReason: fineReason,
            fineImposedAt: fineImposedAt,
            paymentVerificationStatus: paymentVerificationStatus,
            transactionRef: transactionRef,
            paymentMode: paymentMode,
            submittedAt: submittedAt,
            dueAlertSent: dueAlertSent,
            fineAlertSent: fineAlertSent,
            slabBreakdown: billDetails.slabBreakdown
        });

        const dueDateFormatted = dueDate.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        // 3. Create Corresponding In-App Notification
        if (isOverdueDemo) {
            await Alert.create({
                type: 'FINE_IMPOSED',
                severity: 'HIGH',
                title: 'TANGEDCO Late Payment Surcharge (LPSC) Imposed',
                titleTa: 'தாமத அபராதக் கட்டணம் (LPSC) விதிக்கப்பட்டது',
                message: `Statutory Warning: Your electricity bill of ₹${savedBill.totalAmount.toLocaleString()} for ${savedBill.billingMonth} is overdue (Due Date was: ${dueDateFormatted}). A late fee surcharge of ₹${fineAmount} has been applied. Total Payable: ₹${(savedBill.totalAmount + fineAmount).toLocaleString()}. Please settle immediately via TANGEDCO Quick Pay to avoid supply disconnection.`,
                messageTa: `அறிவிப்பு: உங்கள் ${savedBill.billingMonth} மாத மின்கட்டணம் ₹${savedBill.totalAmount.toLocaleString()} நிலுவைத் தேதியைத் (${dueDateFormatted}) தாண்டிவிட்டதால் ₹${fineAmount} அபராதக் கட்டணம் விதிக்கப்பட்டுள்ளது. மொத்தத் தொகை: ₹${(savedBill.totalAmount + fineAmount).toLocaleString()}. உடனே செலுத்தவும்.`,
                consumer: consumer._id,
                user: req.user._id,
                bill: savedBill._id,
                fineAmount: fineAmount
            });
        } else if (isNearingDueDemo) {
            await Alert.create({
                type: 'DUE_DATE_NEAR',
                severity: 'HIGH',
                title: 'TANGEDCO Due Date Alert (≤ 3 Days Remaining)',
                titleTa: 'கட்டணக் கடைசி நாள் எச்சரிக்கை (3 நாட்களுக்குள்)',
                message: `Statutory Warning: Your electricity bill of ₹${savedBill.totalAmount.toLocaleString()} for ${savedBill.billingMonth} is due soon (Due Date: ${dueDateFormatted}). Clear before due date to avoid a late fee surcharge of ₹150.`,
                messageTa: `அறிவிப்பு: உங்கள் ${savedBill.billingMonth} மாத மின்கட்டணம் ₹${savedBill.totalAmount.toLocaleString()} செலுத்தக் கடைசி நாள்: ${dueDateFormatted}. ₹150 அபராதத்தைத் தவிர்க்க கடைசி நாளுக்குள் செலுத்தவும்.`,
                consumer: consumer._id,
                user: req.user._id,
                bill: savedBill._id,
                fineAmount: 150
            });
        } else if (isVerificationDemo) {
            const totalPayable = savedBill.totalAmount + (savedBill.fineAmount || 0);
            await Alert.create({
                type: 'PAYMENT_SUCCESS',
                severity: 'MEDIUM',
                title: 'TANGEDCO Payment Reference Submitted',
                titleTa: 'கட்டண ரசீது எண் சரிபார்ப்புக்கு சமர்ப்பிக்கப்பட்டது',
                message: `Payment reference ${transactionRef} submitted for ₹${totalPayable.toLocaleString()} (${savedBill.billingMonth}). Pending administrative ledger verification.`,
                messageTa: `${savedBill.billingMonth} மாதத்திற்கான மின்கட்டண ரசீது எண் ${transactionRef} (₹${totalPayable.toLocaleString()}) சரிபார்ப்புக்கு சமர்ப்பிக்கப்பட்டுள்ளது.`,
                consumer: consumer._id,
                user: req.user._id,
                bill: savedBill._id
            });
        } else {
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
        }

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

        let bill = null;
        if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
            bill = await Bill.findById(id).populate({
                path: 'consumer',
                populate: { path: 'user' }
            });
        }

        // Resilient Fallback: If bill ID was from previous session or consumer submits by serviceNumber / consumerId
        if (!bill) {
            const serviceNumber = req.body.serviceNumber || (!id?.match(/^[0-9a-fA-F]{24}$/) ? id : null);
            const consumerId = req.body.consumerId || (id?.match(/^[0-9a-fA-F]{24}$/) ? id : null);

            if (serviceNumber) {
                bill = await Bill.findOne({ serviceNumber, status: { $ne: 'PAID' } }).sort({ createdAt: -1 }).populate({
                    path: 'consumer',
                    populate: { path: 'user' }
                });
            }

            if (!bill && consumerId) {
                bill = await Bill.findOne({ consumer: consumerId, status: { $ne: 'PAID' } }).sort({ createdAt: -1 }).populate({
                    path: 'consumer',
                    populate: { path: 'user' }
                });
            }

            // Fallback: look up consumer profile of current authenticated user
            if (!bill && req.user) {
                const consumerObj = await Consumer.findOne({ user: req.user._id });
                if (consumerObj) {
                    bill = await Bill.findOne({ consumer: consumerObj._id, status: { $ne: 'PAID' } }).sort({ createdAt: -1 }).populate({
                        path: 'consumer',
                        populate: { path: 'user' }
                    });
                }
            }
        }

        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill record not found. Please refresh to view current bills.' });
        }

        const isOwner = bill.consumer?.user?._id?.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'ADMIN';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to submit payment for this bill.' });
        }

        if (bill.status === 'PAID' && bill.paymentVerificationStatus === 'VERIFIED') {
            return res.status(400).json({ success: false, message: 'This bill has already been verified and paid.' });
        }

        const totalPayable = Number((bill.totalAmount + (bill.fineAmount || 0)).toFixed(2));
        const genRef = transactionRef || `TNEB-QPAY-${Date.now().toString().slice(-8)}`;

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

        // Clear previous due date / overdue fine alerts for this bill
        await Alert.deleteMany({
            bill: bill._id,
            type: { $in: ['DUE_DATE_NEAR', 'FINE_IMPOSED'] }
        });

        // Create In-App Notification
        if (bill.status === 'PAID') {
            await Alert.create({
                type: 'PAYMENT_SUCCESS',
                severity: 'LOW',
                title: 'TANGEDCO Official Tax Invoice & Receipt Generated',
                titleTa: 'மின்கட்டணம் உறுதி செய்யப்பட்டு ரசீது உருவாக்கப்பட்டது',
                message: `Payment Verified: ₹${totalPayable.toLocaleString()} for ${bill.billingMonth} via ${paymentMode.replace(/_/g, ' ')}. Reference ID: ${genRef}. Your official receipt is ready to download.`,
                messageTa: `மின்கட்டணம் வெற்றிகரமாக உறுதிசெய்யப்பட்டது: ₹${totalPayable.toLocaleString()} (${bill.billingMonth}) - ${paymentMode}. ரசீது எண்: ${genRef}. அதிகாரப்பூர்வ ரசீது பதிவிறக்கம் செய்யத் தயாராக உள்ளது.`,
                consumer: consumer?._id,
                user: user?._id,
                bill: bill._id
            });

            // Dispatch Official Tax Invoice & Payment Receipt Email to Consumer
            if (user?.email) {
                sendPaymentInvoiceReceiptEmail({
                    toEmail: user.email,
                    consumerName: user.name,
                    serviceNumber: consumer?.serviceNumber || bill.serviceNumber || 'N/A',
                    district: consumer?.district || user?.district || 'Tamil Nadu',
                    billingMonth: bill.billingMonth,
                    totalAmount: bill.totalAmount,
                    fineAmount: bill.fineAmount || 0,
                    totalPaid: totalPayable,
                    transactionRef: genRef,
                    paymentMode: paymentMode,
                    paidDate: bill.paidAt || new Date(),
                    connectionType: bill.connectionType,
                    unitsConsumed: bill.unitsConsumed
                }).catch(e => console.warn('Payment receipt email dispatch error:', e.message));
            }
        } else {
            // Consumer Alert
            await Alert.create({
                type: 'PAYMENT_SUCCESS',
                severity: 'MEDIUM',
                title: 'TANGEDCO Bill Number Submitted for Verification',
                titleTa: 'கட்டண ரசீது எண் நிர்வாகியின் சரிபார்ப்புக்கு அனுப்பப்பட்டது',
                message: `Payment/Bill reference ${genRef} submitted for ₹${totalPayable.toLocaleString()} (${bill.billingMonth}). Sent to Admin for payment verification.`,
                messageTa: `${bill.billingMonth} மாதத்திற்கான மின்கட்டண ரசீது எண் ${genRef} (₹${totalPayable.toLocaleString()}) நிர்வாகியின் சரிபார்ப்புக்கு சமர்ப்பிக்கப்பட்டுள்ளது. சரிபார்க்கப்பட்டதும் அதிகாரப்பூர்வ ரசீது வழங்கப்படும்.`,
                consumer: consumer?._id,
                user: user?._id,
                bill: bill._id
            });

            // Admin Alert
            const adminUsers = await User.find({ role: 'ADMIN' });
            for (const adm of adminUsers) {
                await Alert.create({
                    type: 'PAYMENT_VERIFICATION_REQUEST',
                    severity: 'HIGH',
                    title: 'Consumer Payment Verification Request',
                    titleTa: 'நுகர்வோர் கட்டண சரிபார்ப்பு கோரிக்கை',
                    message: `Consumer ${user?.name || 'Consumer'} (Service: ${consumer?.serviceNumber || 'N/A'}) submitted TANGEDCO Bill/Receipt No: ${genRef} for ₹${totalPayable.toLocaleString()} (${bill.billingMonth}). Action required: Verify and approve in Admin Portal.`,
                    messageTa: `நுகர்வோர் ${user?.name || 'Consumer'} (${consumer?.serviceNumber || 'N/A'}) மின்கட்டண ரசீது எண் ${genRef} (₹${totalPayable.toLocaleString()} - ${bill.billingMonth}) சமர்ப்பித்துள்ளார். சரிபார்த்து அங்கீகரிக்கவும்.`,
                    user: adm._id,
                    bill: bill._id,
                    consumer: consumer?._id
                });
            }
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

// @desc    Adjust bill due date & simulate demo scenarios (Overdue, Due Soon, Paid, Reset)
// @route   PUT /api/bills/:id/adjust-date
// @access  Private
const adjustBillDueDate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { scenario, daysOffset, customFine } = req.body;

        let bill = null;
        if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
            bill = await Bill.findById(id).populate({
                path: 'consumer',
                populate: { path: 'user' }
            });
        }

        if (!bill) {
            const serviceNumber = req.body.serviceNumber;
            if (serviceNumber) {
                bill = await Bill.findOne({ serviceNumber }).sort({ createdAt: -1 }).populate({
                    path: 'consumer',
                    populate: { path: 'user' }
                });
            }
            if (!bill && id) {
                bill = await Bill.findOne({
                    $or: [
                        { consumer: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
                        { serviceNumber: id }
                    ]
                }).sort({ createdAt: -1 }).populate({
                    path: 'consumer',
                    populate: { path: 'user' }
                });
            }
        }

        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill record not found. Please refresh to view current bills.' });
        }

        const consumer = bill.consumer;
        const user = consumer?.user;

        if (scenario === 'OVERDUE' || (typeof daysOffset === 'number' && daysOffset < 0)) {
            const offset = typeof daysOffset === 'number' ? daysOffset : -5;
            const newDue = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
            const fine = customFine || Math.max(150, Number((bill.totalAmount * 0.015).toFixed(2)));

            bill.dueDate = newDue;
            bill.status = 'OVERDUE';
            bill.fineAmount = fine;
            bill.fineImposed = true;
            bill.fineImposedAt = new Date();
            bill.fineReason = 'TANGEDCO Late Payment Surcharge (LPSC) for crossing statutory due date';
            bill.dueAlertSent = true;
            bill.fineAlertSent = true;
            bill.paymentVerificationStatus = 'NONE';
            await bill.save();

            await Alert.create({
                type: 'FINE_IMPOSED',
                severity: 'HIGH',
                title: 'TANGEDCO Late Payment Surcharge (LPSC) Imposed',
                titleTa: 'தாமத அபராதக் கட்டணம் (LPSC) விதிக்கப்பட்டது',
                message: `Statutory Warning: Your electricity bill of ₹${bill.totalAmount.toLocaleString()} for ${bill.billingMonth} is overdue by ${Math.abs(offset)} days. A late fee surcharge of ₹${fine} has been applied. Total Payable: ₹${(bill.totalAmount + fine).toLocaleString()}. Please settle immediately via TANGEDCO Quick Pay to avoid supply disconnection.`,
                messageTa: `அறிவிப்பு: உங்கள் ${bill.billingMonth} மாத மின்கட்டணம் ₹${bill.totalAmount.toLocaleString()} நிலுவைத் தேதியைத் தாண்டிவிட்டதால் ₹${fine} அபராதக் கட்டணம் விதிக்கப்பட்டுள்ளது. செலுத்த வேண்டிய மொத்தத் தொகை: ₹${(bill.totalAmount + fine).toLocaleString()}. மின் துண்டிப்பைத் தவிர்க்க உடனே TANGEDCO Quick Pay மூலம் செலுத்தவும்.`,
                consumer: consumer?._id,
                user: user?._id,
                bill: bill._id,
                fineAmount: fine
            });

            return res.status(200).json({
                success: true,
                message: `Bill adjusted to OVERDUE with ₹${fine} late fee surcharge. Alert dispatched.`,
                data: bill
            });
        }

        if (scenario === 'NEARING_DUE' || (typeof daysOffset === 'number' && daysOffset <= 3)) {
            const offset = typeof daysOffset === 'number' ? daysOffset : 2;
            const newDue = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);

            bill.dueDate = newDue;
            bill.status = 'UNPAID';
            bill.fineAmount = 0;
            bill.fineImposed = false;
            bill.fineImposedAt = null;
            bill.dueAlertSent = true;
            bill.paymentVerificationStatus = 'NONE';
            await bill.save();

            const dueDateFormatted = newDue.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });

            await Alert.create({
                type: 'DUE_DATE_NEAR',
                severity: 'HIGH',
                title: 'TANGEDCO Due Date Alert (≤ 3 Days Remaining)',
                titleTa: 'கட்டணக் கடைசி நாள் எச்சரிக்கை (3 நாட்களுக்குள்)',
                message: `Statutory Warning: Your electricity bill of ₹${bill.totalAmount.toLocaleString()} for ${bill.billingMonth} is due in ${offset} days (Due Date: ${dueDateFormatted}). Clear before deadline to avoid a late fee surcharge of ₹150.`,
                messageTa: `அறிவிப்பு: உங்கள் ${bill.billingMonth} மாத மின்கட்டணம் ₹${bill.totalAmount.toLocaleString()} செலுத்த இன்னும் ${offset} நாட்களே உள்ளன (கடைசி நாள்: ${dueDateFormatted}). ₹150 தாமத அபராதத்தைத் தவிர்க்க உடனே செலுத்தவும்.`,
                consumer: consumer?._id,
                user: user?._id,
                bill: bill._id,
                fineAmount: 150
            });

            return res.status(200).json({
                success: true,
                message: `Bill adjusted to NEARING DUE (${offset} days remaining). Reminder alert dispatched.`,
                data: bill
            });
        }

        if (scenario === 'PENDING_VERIFICATION') {
            const genRef = `TNEB-QPAY-${Date.now().toString().slice(-8)}`;
            const totalPayable = Number((bill.totalAmount + (bill.fineAmount || 0)).toFixed(2));

            bill.status = 'PENDING_VERIFICATION';
            bill.paymentVerificationStatus = 'PENDING';
            bill.submittedAt = new Date();
            bill.paymentMode = 'TANGEDCO_QUICKPAY';
            bill.transactionRef = genRef;
            await bill.save();

            await Alert.create({
                type: 'PAYMENT_SUCCESS',
                severity: 'MEDIUM',
                title: 'TANGEDCO Payment Reference Submitted',
                titleTa: 'கட்டண ரசீது எண் சரிபார்ப்புக்கு சமர்ப்பிக்கப்பட்டது',
                message: `Payment reference ${genRef} submitted for ₹${totalPayable.toLocaleString()} (${bill.billingMonth}). Pending administrative ledger verification.`,
                messageTa: `${bill.billingMonth} மாதத்திற்கான மின்கட்டண ரசீது எண் ${genRef} (₹${totalPayable.toLocaleString()}) சரிபார்ப்புக்கு சமர்ப்பிக்கப்பட்டுள்ளது.`,
                consumer: consumer?._id,
                user: user?._id,
                bill: bill._id
            });

            return res.status(200).json({
                success: true,
                message: `Bill submitted for admin payment verification with reference ${genRef}.`,
                data: bill
            });
        }

        // Default: NORMAL (15 Days)
        const offset = typeof daysOffset === 'number' ? daysOffset : 15;
        const newDue = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);

        bill.dueDate = newDue;
        bill.status = 'UNPAID';
        bill.fineAmount = 0;
        bill.fineImposed = false;
        bill.fineImposedAt = null;
        bill.paymentVerificationStatus = 'NONE';
        await bill.save();

        return res.status(200).json({
            success: true,
            message: `Bill reset to NORMAL with ${offset} days grace period.`,
            data: bill
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
    payBill,
    adjustBillDueDate
};