const User = require('../models/User');
const Consumer = require('../models/Consumer');
const IoTReading = require('../models/IoTReading');
const Bill = require('../models/Bill');
const Alert = require('../models/Alert');
const { sendDueDateReminderEmail, sendOverdueFineNoticeEmail } = require('../services/emailService');

// @desc    Get system-wide statistics for Admin Dashboard & Verification Portal
// @route   GET /api/admin/stats
// @access  Private/Admin
const getSystemStats = async (req, res, next) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'CONSUMER' });
        const totalMeters = await Consumer.countDocuments();
        const totalTelemetry = await IoTReading.countDocuments();
        const totalBills = await Bill.countDocuments();

        // KYC Verification stats
        const pendingVerifications = await Consumer.countDocuments({ verificationStatus: 'PENDING' });
        const approvedVerifications = await Consumer.countDocuments({ verificationStatus: 'APPROVED' });
        const rejectedVerifications = await Consumer.countDocuments({ verificationStatus: 'REJECTED' });

        // Connection types
        const domesticCount = await Consumer.countDocuments({ connectionType: 'LT-1A_DOMESTIC' });
        const commercialCount = await Consumer.countDocuments({ connectionType: 'LT-V_COMMERCIAL' });
        const industrialCount = await Consumer.countDocuments({ connectionType: 'LT-IIIB_INDUSTRIAL' });

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                totalMeters,
                totalTelemetry,
                totalBills,
                pendingVerifications,
                approvedVerifications,
                rejectedVerifications,
                domesticCount,
                commercialCount,
                industrialCount
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all consumers with their verification and KYC details
// @route   GET /api/admin/consumers
// @access  Private/Admin
const getAllConsumers = async (req, res, next) => {
    try {
        const { status, connectionType, search } = req.query;
        let filter = {};

        if (status && status !== 'ALL') {
            filter.verificationStatus = status;
        }

        if (connectionType && connectionType !== 'ALL') {
            filter.connectionType = connectionType;
        }

        let consumers = await Consumer.find(filter)
            .populate('user', 'name email role verificationStatus kycDocuments connectionType createdAt isActive district phone address')
            .sort({ createdAt: -1 });

        // Client search filter (by name, email, service number)
        if (search) {
            const s = search.toLowerCase();
            consumers = consumers.filter(c => 
                c.serviceNumber?.toLowerCase().includes(s) ||
                c.user?.name?.toLowerCase().includes(s) ||
                c.user?.email?.toLowerCase().includes(s)
            );
        }

        res.status(200).json({ 
            success: true, 
            count: consumers.length, 
            data: consumers 
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get only consumers with pending KYC verification
// @route   GET /api/admin/verifications/pending
// @access  Private/Admin
const getPendingVerifications = async (req, res, next) => {
    try {
        const pending = await Consumer.find({ verificationStatus: 'PENDING' })
            .populate('user', 'name email role verificationStatus kycDocuments connectionType createdAt district phone address')
            .sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            count: pending.length,
            data: pending
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Approve or Reject Consumer KYC Verification
// @route   PUT /api/admin/verify/:id
// @access  Private/Admin
const updateVerificationStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;

        if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: "Status must be either 'APPROVED', 'REJECTED', or 'PENDING'" 
            });
        }

        // Search by Consumer _id or user _id
        let consumer = await Consumer.findById(id).populate('user');
        if (!consumer) {
            consumer = await Consumer.findOne({ user: id }).populate('user');
        }

        if (!consumer) {
            return res.status(404).json({ success: false, message: 'Consumer record not found.' });
        }

        // Crucial Rule: If approving, consumer MUST have uploaded at least one KYC document
        const docs = (consumer.kycDocuments && consumer.kycDocuments.length > 0) 
            ? consumer.kycDocuments 
            : (consumer.user?.kycDocuments || []);

        if (status === 'APPROVED' && (!docs || docs.length === 0)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot approve e-KYC without document upload. The consumer must upload at least one valid identity/address proof document first.'
            });
        }

        // Update Consumer profile
        consumer.verificationStatus = status;
        await consumer.save();

        // Update corresponding User profile
        if (consumer.user) {
            consumer.user.verificationStatus = status;
            await consumer.user.save();
        }

        res.status(200).json({
            success: true,
            message: `Consumer ${consumer.serviceNumber} verification status updated to ${status}.`,
            data: {
                consumerId: consumer._id,
                serviceNumber: consumer.serviceNumber,
                verificationStatus: consumer.verificationStatus,
                connectionType: consumer.connectionType,
                user: {
                    name: consumer.user?.name,
                    email: consumer.user?.email,
                    verificationStatus: consumer.user?.verificationStatus
                },
                remarks: remarks || null
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update consumer connection type (Domestic LT-1A vs Commercial LT-V)
// @route   PUT /api/admin/connection-type/:id
// @access  Private/Admin
const updateConnectionType = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { connectionType } = req.body;

        if (!['LT-1A_DOMESTIC', 'LT-V_COMMERCIAL', 'LT-IIIB_INDUSTRIAL'].includes(connectionType)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid connection type. Allowed: 'LT-1A_DOMESTIC', 'LT-V_COMMERCIAL', 'LT-IIIB_INDUSTRIAL'" 
            });
        }

        let consumer = await Consumer.findById(id).populate('user');
        if (!consumer) {
            consumer = await Consumer.findOne({ user: id }).populate('user');
        }

        if (!consumer) {
            return res.status(404).json({ success: false, message: 'Consumer record not found.' });
        }

        consumer.connectionType = connectionType;
        if (connectionType === 'LT-IIIB_INDUSTRIAL') {
            consumer.tariffCategory = 'LT-3B';
        } else if (connectionType === 'LT-V_COMMERCIAL') {
            consumer.tariffCategory = 'LT-5';
        } else {
            consumer.tariffCategory = 'LT-1A';
        }
        await consumer.save();

        if (consumer.user) {
            consumer.user.connectionType = connectionType;
            await consumer.user.save();
        }

        res.status(200).json({
            success: true,
            message: `Connection type updated to ${connectionType}`,
            data: consumer
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all consumer bills with payment status, fines, and due date metrics
// @route   GET /api/admin/bills
// @access  Private/Admin
const getAllBillsAdmin = async (req, res, next) => {
    try {
        const { status, connectionType, district, search } = req.query;

        let bills = await Bill.find()
            .populate({
                path: 'consumer',
                populate: { path: 'user', select: 'name email role district connectionType verificationStatus' }
            })
            .sort({ createdAt: -1 });

        const now = new Date();

        // Process and enrich bills
        const enrichedBills = bills.map(b => {
            const billObj = b.toObject();
            const dueDate = new Date(b.dueDate);
            const diffTime = dueDate - now;
            const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const isOverdue = b.status !== 'PAID' && daysRemaining < 0;
            const isNearingDue = b.status !== 'PAID' && daysRemaining >= 0 && daysRemaining <= 3;
            
            // Derive effective status
            let effectiveStatus = b.status;
            if (b.status === 'PENDING_VERIFICATION' || b.paymentVerificationStatus === 'PENDING') {
                effectiveStatus = 'PENDING_VERIFICATION';
            } else if (b.status !== 'PAID') {
                if (isOverdue || b.fineImposed) {
                    effectiveStatus = 'OVERDUE';
                } else {
                    effectiveStatus = 'UNPAID';
                }
            }

            const consumer = billObj.consumer || {};
            const user = consumer.user || {};
            const userDistrict = consumer.district || consumer.address?.district || user.district || 'Chennai';

            return {
                ...billObj,
                status: effectiveStatus,
                paymentVerificationStatus: b.paymentVerificationStatus || 'NONE',
                transactionRef: b.transactionRef,
                submittedAt: b.submittedAt,
                verifiedAt: b.verifiedAt,
                rejectionReason: b.rejectionReason,
                daysRemaining: daysRemaining,
                daysOverdue: isOverdue ? Math.abs(daysRemaining) : 0,
                isOverdue,
                isNearingDue,
                totalPayable: Number((b.totalAmount + (b.fineAmount || 0)).toFixed(2)),
                serviceNumber: consumer.serviceNumber || 'N/A',
                consumerId: consumer._id,
                userId: user._id,
                userName: user.name || 'Unknown Consumer',
                userEmail: user.email || 'N/A',
                district: userDistrict,
                sanctionedLoadKw: consumer.sanctionedLoadKw || 2.0,
                tariffCategory: consumer.tariffCategory || 'LT-1A'
            };
        });

        // Apply filters
        let filtered = enrichedBills;
        if (status && status !== 'ALL') {
            filtered = filtered.filter(b => b.status === status);
        }
        if (connectionType && connectionType !== 'ALL') {
            filtered = filtered.filter(b => b.connectionType === connectionType);
        }
        if (district && district !== 'ALL') {
            filtered = filtered.filter(b => b.district?.toLowerCase() === district.toLowerCase());
        }
        if (search) {
            const s = search.toLowerCase();
            filtered = filtered.filter(b => 
                b.serviceNumber?.toLowerCase().includes(s) ||
                b.userName?.toLowerCase().includes(s) ||
                b.userEmail?.toLowerCase().includes(s) ||
                b.district?.toLowerCase().includes(s) ||
                b.billingMonth?.toLowerCase().includes(s) ||
                b.transactionRef?.toLowerCase().includes(s)
            );
        }

        // Aggregate overview metrics
        const totalBilled = enrichedBills.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
        const totalCollected = enrichedBills.filter(b => b.status === 'PAID').reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
        const totalOutstanding = enrichedBills.filter(b => b.status !== 'PAID').reduce((acc, curr) => acc + (curr.totalPayable || 0), 0);
        const totalFines = enrichedBills.reduce((acc, curr) => acc + (curr.fineAmount || 0), 0);

        const paidCount = enrichedBills.filter(b => b.status === 'PAID').length;
        const pendingVerificationCount = enrichedBills.filter(b => b.status === 'PENDING_VERIFICATION').length;
        const unpaidCount = enrichedBills.filter(b => b.status === 'UNPAID').length;
        const finesCount = enrichedBills.filter(b => (b.fineAmount > 0 || b.fineImposed || b.status === 'OVERDUE')).length;
        const overdueCount = finesCount;
        const nearingDueCount = enrichedBills.filter(b => b.isNearingDue).length;

        res.status(200).json({
            success: true,
            count: filtered.length,
            summary: {
                totalBilled: Number(totalBilled.toFixed(2)),
                totalCollected: Number(totalCollected.toFixed(2)),
                totalOutstanding: Number(totalOutstanding.toFixed(2)),
                totalFines: Number(totalFines.toFixed(2)),
                paidCount,
                pendingVerificationCount,
                unpaidCount,
                overdueCount,
                finesCount,
                nearingDueCount
            },
            data: filtered
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Automatically scan and apply late payment fines to all overdue bills & notify users
// @route   POST /api/admin/bills/check-overdue
// @access  Private/Admin
const checkAndApplyOverdueFines = async (req, res, next) => {
    try {
        const now = new Date();
        const overdueBills = await Bill.find({
            status: { $ne: 'PAID' },
            dueDate: { $lt: now }
        }).populate({
            path: 'consumer',
            populate: { path: 'user' }
        });

        let updatedCount = 0;
        let createdAlerts = 0;

        for (const bill of overdueBills) {
            // TANGEDCO Rule: 1.5% late payment surcharge (LPSC) per cycle or flat ₹150 (minimum ₹100)
            const calculatedFine = Math.max(150, Number((bill.totalAmount * 0.015).toFixed(2)));

            let needsUpdate = false;
            if (bill.status !== 'OVERDUE') {
                bill.status = 'OVERDUE';
                needsUpdate = true;
            }

            if (!bill.fineImposed || bill.fineAmount === 0) {
                bill.fineAmount = calculatedFine;
                bill.fineImposed = true;
                bill.fineImposedAt = new Date();
                bill.fineReason = 'TANGEDCO Late Payment Surcharge (LPSC) for crossing statutory due date';
                needsUpdate = true;
            }

            if (needsUpdate) {
                await bill.save();
                updatedCount++;
            }

            // Send or check alert notification
            if (!bill.fineAlertSent) {
                const consumer = bill.consumer;
                const user = consumer?.user;

                await Alert.create({
                    type: 'FINE_IMPOSED',
                    severity: 'HIGH',
                    title: 'TANGEDCO Late Payment Surcharge (LPSC) Imposed',
                    message: `Statutory Warning: Your electricity bill of ₹${bill.totalAmount.toLocaleString()} for ${bill.billingMonth} is overdue. A late fee surcharge of ₹${bill.fineAmount} has been applied. Total Payable: ₹${(bill.totalAmount + bill.fineAmount).toLocaleString()}. Please settle immediately via TANGEDCO Quick Pay to avoid supply disconnection.`,
                    messageTa: `அறிவிப்பு: உங்கள் ${bill.billingMonth} மாத மின்கட்டணம் ₹${bill.totalAmount.toLocaleString()} நிலுவைத் தேதியைத் தாண்டிவிட்டதால் ₹${bill.fineAmount} அபராதக் கட்டணம் விதிக்கப்பட்டுள்ளது. செலுத்த வேண்டிய மொத்தத் தொகை: ₹${(bill.totalAmount + bill.fineAmount).toLocaleString()}. மின் துண்டிப்பைத் தவிர்க்க உடனே TANGEDCO Quick Pay மூலம் செலுத்தவும்.`,
                    consumer: consumer?._id,
                    user: user?._id,
                    bill: bill._id,
                    fineAmount: bill.fineAmount
                });

                bill.fineAlertSent = true;
                await bill.save();
                createdAlerts++;

                // Dispatch Official Overdue Fine Notice Email to Consumer
                if (user?.email) {
                    sendOverdueFineNoticeEmail({
                        toEmail: user.email,
                        consumerName: user.name,
                        serviceNumber: consumer?.serviceNumber || bill.serviceNumber || 'N/A',
                        amount: bill.totalAmount,
                        fineAmount: bill.fineAmount,
                        totalPayable: bill.totalAmount + bill.fineAmount,
                        billingMonth: bill.billingMonth,
                        dueDate: new Date(bill.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                        district: consumer?.district || user.district || 'Tamil Nadu',
                        fineReason: bill.fineReason
                    }).catch(e => console.warn('Overdue email notice error:', e.message));
                }
            }
        }

        const statusMessage = updatedCount === 0 && createdAlerts === 0
            ? 'No users with overdue bills requiring fine imposition.'
            : `Overdue scan complete. Applied fines to ${updatedCount} bills and sent ${createdAlerts} fine notice alerts.`;

        res.status(200).json({
            success: true,
            message: statusMessage,
            data: {
                scannedBills: overdueBills.length,
                finesImposed: updatedCount,
                alertsSent: createdAlerts
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Send approaching due date reminders to consumers (within 3-5 days of due date)
// @route   POST /api/admin/bills/send-reminders
// @access  Private/Admin
const sendDueDateReminders = async (req, res, next) => {
    try {
        const now = new Date();
        const futureLimit = new Date();
        futureLimit.setDate(now.getDate() + 5);

        let approachingBills = await Bill.find({
            status: 'UNPAID',
            dueDate: { $gte: now, $lte: futureLimit },
            ...(req.body.force ? {} : { dueAlertSent: { $ne: true } })
        }).populate({
            path: 'consumer',
            populate: { path: 'user' }
        });

        // Fallback: If all nearing bills already received alert once, still include them so admin can re-dispatch
        if (approachingBills.length === 0) {
            approachingBills = await Bill.find({
                status: 'UNPAID',
                dueDate: { $gte: now, $lte: futureLimit }
            }).populate({
                path: 'consumer',
                populate: { path: 'user' }
            });
        }

        let sentCount = 0;

        for (const bill of approachingBills) {
            const dueDateFormatted = new Date(bill.dueDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });

            const diffTime = new Date(bill.dueDate) - now;
            const daysLeft = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

            const consumer = bill.consumer;
            const user = consumer?.user;

            const fineSurcharge = 150;

            // Clear any previous due reminders for this bill to prevent duplicate alerts
            await Alert.deleteMany({
                bill: bill._id,
                type: 'DUE_DATE_NEAR'
            });

            await Alert.create({
                type: 'DUE_DATE_NEAR',
                severity: 'HIGH',
                title: 'TANGEDCO Due Date Alert (≤ 3 Days Remaining)',
                titleTa: 'கட்டணக் கடைசி நாள் எச்சரிக்கை (3 நாட்களுக்குள்)',
                message: `Statutory Warning: Your electricity bill of ₹${bill.totalAmount.toLocaleString()} for ${bill.billingMonth} is due in ${daysLeft} days (Due Date: ${dueDateFormatted}). You must pay the invoice amount before the deadline. Otherwise, a late payment fine of ₹${fineSurcharge} will be imposed.`,
                messageTa: `அறிவிப்பு: உங்கள் ${bill.billingMonth} மாத மின்கட்டணம் ₹${bill.totalAmount.toLocaleString()} செலுத்த இன்னும் ${daysLeft} நாட்களே உள்ளன (கடைசி நாள்: ${dueDateFormatted}). உடனே கட்டணத்தைச் செலுத்தவும். தவறினால் ₹${fineSurcharge} தாமத அபராதக் கட்டணம் விதிக்கப்படும்.`,
                consumer: consumer?._id,
                user: user?._id,
                bill: bill._id,
                fineAmount: fineSurcharge
            });

            bill.dueAlertSent = true;
            await bill.save();
            sentCount++;

            // Dispatch Official Approaching Due Date Reminder Email to Consumer
            if (user?.email) {
                sendDueDateReminderEmail({
                    toEmail: user.email,
                    consumerName: user.name,
                    serviceNumber: consumer?.serviceNumber || 'N/A',
                    amount: bill.totalAmount,
                    dueDate: dueDateFormatted,
                    daysLeft: daysLeft,
                    billingMonth: bill.billingMonth,
                    district: consumer?.district || user.district || 'Tamil Nadu'
                }).catch(e => console.warn('Due reminder email error:', e.message));
            }
        }

        const reminderMessage = sentCount === 0
            ? 'No users with upcoming due date reminders found.'
            : `Successfully sent ${sentCount} due date reminders to consumers with upcoming deadlines.`;

        res.status(200).json({
            success: true,
            message: reminderMessage,
            count: sentCount
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Manually impose or adjust fine on a specific consumer bill
// @route   PUT /api/admin/bills/:id/fine
// @access  Private/Admin
const imposeManualFine = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { fineAmount, reason } = req.body;

        const bill = await Bill.findById(id).populate({
            path: 'consumer',
            populate: { path: 'user' }
        });

        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill record not found.' });
        }

        const amount = Math.max(0, Number(fineAmount) || 0);
        bill.fineAmount = amount;
        bill.fineImposed = amount > 0;
        bill.fineImposedAt = amount > 0 ? new Date() : null;
        bill.fineReason = reason || 'Administrative Surcharge imposed by TANGEDCO Officer';
        if (bill.status !== 'PAID' && amount > 0) {
            bill.status = 'OVERDUE';
        }
        await bill.save();

        if (amount > 0) {
            const consumer = bill.consumer;
            const user = consumer?.user;

            await Alert.create({
                type: 'FINE_IMPOSED',
                severity: 'HIGH',
                title: 'TANGEDCO Administrative Surcharge',
                message: `Administrative Action: A fine surcharge of ₹${amount} has been imposed on your ${bill.billingMonth} bill. Reason: ${bill.fineReason}. Total Payable: ₹${(bill.totalAmount + amount).toLocaleString()}.`,
                messageTa: `நிர்வாக அறிவிப்பு: உங்கள் ${bill.billingMonth} மின்கட்டணத்திற்கு ₹${amount} அபராதக் கட்டணம் விதிக்கப்பட்டுள்ளது. காரணம்: ${bill.fineReason}. மொத்த செலுத்த வேண்டிய தொகை: ₹${(bill.totalAmount + amount).toLocaleString()}.`,
                consumer: consumer?._id,
                user: user?._id,
                bill: bill._id,
                fineAmount: amount
            });

            // Dispatch email notice to consumer
            if (user?.email) {
                sendOverdueFineNoticeEmail({
                    toEmail: user.email,
                    consumerName: user.name,
                    serviceNumber: consumer?.serviceNumber || bill.serviceNumber || 'N/A',
                    amount: bill.totalAmount,
                    fineAmount: amount,
                    totalPayable: bill.totalAmount + amount,
                    billingMonth: bill.billingMonth,
                    dueDate: new Date(bill.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                    district: consumer?.district || user.district || 'Tamil Nadu',
                    fineReason: bill.fineReason
                }).catch(e => console.warn('Manual fine email notice error:', e.message));
            }
        }

        res.status(200).json({
            success: true,
            message: `Fine updated to ₹${amount} for bill ${bill._id}.`,
            data: bill
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin AI Assistant Intelligence Engine: Instant queries for paid, unpaid, fines, nearing due date & districts
// @route   POST /api/admin/ai-query
// @access  Private/Admin
const getAdminAiInsights = async (req, res, next) => {
    try {
        const { query, language = 'en' } = req.body;
        const q = (query || '').toLowerCase().trim();

        const bills = await Bill.find()
            .populate({
                path: 'consumer',
                populate: { path: 'user', select: 'name email role district connectionType' }
            })
            .sort({ createdAt: -1 });

        const now = new Date();
        const enriched = bills.map(b => {
            const dueDate = new Date(b.dueDate);
            const diffTime = dueDate - now;
            const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const isOverdue = b.status !== 'PAID' && daysRemaining < 0;
            const isNearing = b.status !== 'PAID' && daysRemaining >= 0 && daysRemaining <= 3;
            const consumer = b.consumer || {};
            const user = consumer.user || {};
            const dist = consumer.district || consumer.address?.district || user.district || 'Chennai';

            return {
                id: b._id,
                month: b.billingMonth,
                units: b.unitsConsumed,
                amount: b.totalAmount,
                fine: b.fineAmount || 0,
                total: b.totalAmount + (b.fineAmount || 0),
                status: b.status === 'PAID' ? 'PAID' : (isOverdue || b.fineImposed ? 'OVERDUE' : 'UNPAID'),
                paidAt: b.paidAt,
                paymentMode: b.paymentMode,
                serviceNumber: consumer.serviceNumber || 'N/A',
                name: user.name || 'Unknown',
                email: user.email || 'N/A',
                district: dist,
                connectionType: b.connectionType,
                daysRemaining,
                daysOverdue: isOverdue ? Math.abs(daysRemaining) : 0,
                isNearing
            };
        });

        const paidList = enriched.filter(b => b.status === 'PAID');
        const unpaidList = enriched.filter(b => b.status === 'UNPAID');
        const overdueList = enriched.filter(b => b.status === 'OVERDUE' || b.fine > 0);
        const nearingList = enriched.filter(b => b.isNearing);

        const totalBilled = enriched.reduce((a, c) => a + c.amount, 0);
        const totalCollected = paidList.reduce((a, c) => a + c.amount, 0);
        const totalOutstanding = unpaidList.reduce((a, c) => a + c.total, 0) + overdueList.reduce((a, c) => a + c.total, 0);
        const totalFines = overdueList.reduce((a, c) => a + c.fine, 0);

        // District aggregation
        const districtMap = {};
        enriched.forEach(b => {
            const d = b.district || 'Chennai';
            if (!districtMap[d]) {
                districtMap[d] = { district: d, totalBills: 0, paid: 0, unpaid: 0, overdue: 0, revenueCollected: 0, outstanding: 0 };
            }
            districtMap[d].totalBills++;
            if (b.status === 'PAID') {
                districtMap[d].paid++;
                districtMap[d].revenueCollected += b.amount;
            } else if (b.status === 'OVERDUE') {
                districtMap[d].overdue++;
                districtMap[d].outstanding += b.total;
            } else {
                districtMap[d].unpaid++;
                districtMap[d].outstanding += b.total;
            }
        });

        let answer = '';
        let intent = 'GENERAL';
        let structuredData = null;

        // Intent detection
        if (q.includes('paid') || q.includes('செலுத்திய') || q.includes('பணம் செலுத்திய')) {
            intent = 'PAID_USERS';
            structuredData = paidList;
            if (language === 'ta') {
                answer = `மொத்தம் ${paidList.length} நுகர்வோர்கள் தங்கள் மின்கட்டணத்தை வெற்றிகரமாக செலுத்தியுள்ளனர். வசூலான மொத்தத் தொகை ₹${totalCollected.toLocaleString('ta-IN')}.`;
            } else {
                answer = `A total of ${paidList.length} consumers have PAID their electricity bills successfully. Total revenue collected: ₹${totalCollected.toLocaleString('en-IN')}.`;
            }
        } else if (q.includes('unpaid') || q.includes('pending') || q.includes('செலுத்தாத') || q.includes('நிலுவை')) {
            intent = 'UNPAID_USERS';
            structuredData = unpaidList;
            if (language === 'ta') {
                answer = `தற்போது ${unpaidList.length} நுகர்வோர்களின் மின்கட்டணம் நிலுவையில் உள்ளது. நிலுவையில் உள்ள மொத்தத் தொகை ₹${unpaidList.reduce((a, c) => a + c.total, 0).toLocaleString('ta-IN')}.`;
            } else {
                answer = `Currently ${unpaidList.length} consumers have UNPAID electricity bills within standard grace periods. Total pending amount: ₹${unpaidList.reduce((a, c) => a + c.total, 0).toLocaleString('en-IN')}.`;
            }
        } else if (q.includes('fine') || q.includes('overdue') || q.includes('penalty') || q.includes('அபராதம்') || q.includes('தாமத')) {
            intent = 'FINE_USERS';
            structuredData = overdueList;
            if (language === 'ta') {
                answer = `${overdueList.length} நுகர்வோர்களுக்கு நிலுவைத் தேதியைக் கடந்ததால் தாமதக் கட்டணம்/அபராதம் விதிக்கப்பட்டுள்ளது. மொத்த அபராதத் தொகை ₹${totalFines.toLocaleString('ta-IN')}. மொத்த நிலுவை: ₹${overdueList.reduce((a, c) => a + c.total, 0).toLocaleString('ta-IN')}.`;
            } else {
                answer = `${overdueList.length} consumers have crossed their statutory due date and have late payment surcharges/fines imposed. Total fines: ₹${totalFines.toLocaleString('en-IN')}, with total overdue amount of ₹${overdueList.reduce((a, c) => a + c.total, 0).toLocaleString('en-IN')}.`;
            }
        } else if (q.includes('due') || q.includes('near') || q.includes('approaching') || q.includes('அருகில்') || q.includes('கடைசி நாள்')) {
            intent = 'NEARING_DUE';
            structuredData = nearingList;
            if (language === 'ta') {
                answer = `${nearingList.length} நுகர்வோர்களின் கட்டணக் கடைசி நாள் 3 நாட்களுக்குள் முடிவடைகிறது. தாமதக் கட்டணத்தைத் தவிர்க்க நினைவூட்டல் அனுப்பலாம்.`;
            } else {
                answer = `${nearingList.length} consumers have payment due dates approaching within the next 3 days. Automated reminders can be dispatched immediately to prevent defaults.`;
            }
        } else if (q.includes('district') || q.includes('மாவட்டம்') || q.includes('area') || q.includes('zone')) {
            intent = 'DISTRICT_BREAKDOWN';
            structuredData = Object.values(districtMap);
            if (language === 'ta') {
                answer = `தமிழக மாவட்டங்கள் வாரியான மின்கட்டண நிலவரம் மற்றும் வசூல் விவரங்கள் தயார் செய்யப்பட்டுள்ளன. அதிக நுகர்வோர் உள்ள மாவட்டங்கள்: சென்னை, கோயம்புத்தூர், மதுரை.`;
            } else {
                answer = `District-wise billing and revenue collection analysis prepared across Tamil Nadu distribution zones. Top active circles include Chennai, Coimbatore, and Madurai.`;
            }
        } else {
            intent = 'SUMMARY';
            structuredData = {
                totalBilled,
                totalCollected,
                totalOutstanding,
                totalFines,
                paidCount: paidList.length,
                unpaidCount: unpaidList.length,
                overdueCount: overdueList.length,
                nearingCount: nearingList.length
            };
            if (language === 'ta') {
                answer = `TANGEDCO மையக் கணக்கீட்டு நிலை: மொத்தம் ${enriched.length} பில்கள். வசூலான தொகை: ₹${totalCollected.toLocaleString('ta-IN')} (${paidList.length} நுகர்வோர்), நிலுவையில்: ₹${totalOutstanding.toLocaleString('ta-IN')} (${unpaidList.length + overdueList.length} நுகர்வோர்), அபராதம் விதிக்கப்பட்டது: ${overdueList.length} பேர் (₹${totalFines.toLocaleString('ta-IN')}).`;
            } else {
                answer = `TANGEDCO Central Billing Snapshot: ${enriched.length} total bills. Collected: ₹${totalCollected.toLocaleString('en-IN')} (${paidList.length} paid), Outstanding: ₹${totalOutstanding.toLocaleString('en-IN')} (${unpaidList.length + overdueList.length} pending), Overdue with Fines: ${overdueList.length} accounts (₹${totalFines.toLocaleString('en-IN')}).`;
            }
        }

        res.status(200).json({
            success: true,
            intent,
            answer,
            summary: {
                totalBilled,
                totalCollected,
                totalOutstanding,
                totalFines,
                paidCount: paidList.length,
                unpaidCount: unpaidList.length,
                overdueCount: overdueList.length,
                nearingCount: nearingList.length
            },
            structuredData
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin Approve or Reject Consumer-Submitted TANGEDCO Payment Reference
// @route   POST /api/admin/bills/:id/verify-payment
// @access  Private/Admin
const verifyConsumerPayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { action = 'APPROVE', rejectionReason = '' } = req.body;

        const bill = await Bill.findById(id).populate({
            path: 'consumer',
            populate: { path: 'user' }
        });

        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill record not found.' });
        }

        const consumer = bill.consumer;
        const user = consumer?.user;
        const totalPayable = Number((bill.totalAmount + (bill.fineAmount || 0)).toFixed(2));

        if (action === 'APPROVE') {
            bill.status = 'PAID';
            bill.paymentVerificationStatus = 'VERIFIED';
            bill.paidAt = bill.submittedAt || new Date();
            bill.verifiedBy = req.user._id;
            bill.verifiedAt = new Date();
            bill.rejectionReason = '';
            await bill.save();

            // Clear previous due reminders and pending verification alerts for this bill
            await Alert.deleteMany({
                bill: bill._id,
                type: { $in: ['DUE_DATE_NEAR', 'FINE_IMPOSED', 'PAYMENT_VERIFICATION_REQUEST'] }
            });

            await Alert.create({
                type: 'PAYMENT_SUCCESS',
                severity: 'LOW',
                title: 'TANGEDCO Official Tax Invoice & Receipt Generated',
                titleTa: 'மின்கட்டணப் பதிவு அதிகாரப்பூர்வமாக உறுதிசெய்யப்பட்டு ரசீது வழங்கப்பட்டது',
                message: `Payment Verified: ₹${totalPayable.toLocaleString()} for ${bill.billingMonth} via TANGEDCO Quick Pay. Transaction Reference: ${bill.transactionRef || 'TNEB-QPAY'}. Your official tax invoice and payment receipt are ready to download.`,
                messageTa: `TANGEDCO சரிபார்ப்பு முடிவு: ${bill.billingMonth} மாதத்திற்கான உங்கள் கட்டண ரசீது (${bill.transactionRef || 'TNEB-QPAY'} - ₹${totalPayable.toLocaleString()}) நிர்வாக அதிகாரியால் சரிபார்க்கப்பட்டு கட்டணம் செலுத்தப்பட்டதாகப் பதிவு செய்யப்பட்டது. அதிகாரப்பூர்வ ரசீது பதிவிறக்கம் செய்யத் தயாராக உள்ளது.`,
                consumer: consumer?._id,
                user: user?._id,
                bill: bill._id
            });

            return res.status(200).json({
                success: true,
                message: `Payment approved and verified for ${user?.name || 'Consumer'}. Official tax invoice & receipt issued.`,
                data: bill
            });
        } else {
            // REJECT
            const now = new Date();
            const isOverdue = new Date(bill.dueDate) < now;
            bill.status = isOverdue ? 'OVERDUE' : 'UNPAID';
            bill.paymentVerificationStatus = 'REJECTED';
            bill.rejectionReason = rejectionReason || 'Invalid or unverifiable TANGEDCO reference number';
            await bill.save();

            await Alert.create({
                type: 'FINE_IMPOSED',
                severity: 'HIGH',
                title: 'TANGEDCO Payment Reference Verification Rejected',
                titleTa: 'கட்டண ரசீது எண் சரிபார்ப்பு நிராகரிக்கப்பட்டது',
                message: `Verification Notice: Your submitted payment reference (${bill.transactionRef}) for ${bill.billingMonth} could not be verified on the TANGEDCO ledger. Reason: ${bill.rejectionReason}. Please settle via TANGEDCO portal and submit the correct receipt reference.`,
                messageTa: `சரிபார்ப்பு அறிவிப்பு: ${bill.billingMonth} மாதத்திற்கான உங்கள் கட்டண ரசீது எண் (${bill.transactionRef}) தமிழ்நாடு மின்சார வாரியத்தால் நிராகரிக்கப்பட்டது. காரணம்: ${bill.rejectionReason}. தயவுசெய்து சரியான ரசீது எண்ணைச் சமர்ப்பிக்கவும்.`,
                consumer: consumer?._id,
                user: user?._id,
                bill: bill._id,
                fineAmount: bill.fineAmount || 0
            });

            return res.status(200).json({
                success: true,
                message: `Payment reference rejected. Consumer notified.`,
                data: bill
            });
        }
    } catch (error) {
        next(error);
    }
};
// @desc    Send reminder for a single bill to consumer (in-app alert + email)
// @route   POST /api/admin/bills/:id/send-reminder
// @access  Private/Admin
const sendSingleBillReminder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const bill = await Bill.findById(id).populate({
            path: 'consumer',
            populate: { path: 'user' }
        });

        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill record not found.' });
        }

        const now = new Date();
        const dueDateFormatted = new Date(bill.dueDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        const diffTime = new Date(bill.dueDate) - now;
        const daysLeft = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        const consumer = bill.consumer;
        const user = consumer?.user;
        // Clear previous due reminders for this bill to prevent duplicate alerts
        await Alert.deleteMany({
            bill: bill._id,
            type: 'DUE_DATE_NEAR'
        });

        await Alert.create({
            type: 'DUE_DATE_NEAR',
            severity: 'HIGH',
            title: `TANGEDCO Due Reminder (Due: ${dueDateFormatted})`,
            titleTa: `கட்டணக் கடைசி நாள் நினைவூட்டல் (${dueDateFormatted})`,
            message: `Official Reminder: Your electricity bill of ₹${bill.totalAmount.toLocaleString()} for ${bill.billingMonth} is due in ${daysLeft} days (${dueDateFormatted}). Settle online via TANGEDCO Quick Pay to prevent late payment surcharge.`,
            messageTa: `அறிவிப்பு: உங்கள் ${bill.billingMonth} மாத மின்கட்டணம் ₹${bill.totalAmount.toLocaleString()} செலுத்த இன்னும் ${daysLeft} நாட்களே உள்ளன (கடைசி நாள்: ${dueDateFormatted}). தாமத அபராதக் கட்டணத்தைத் தவிர்க்க உடனே செலுத்தவும்.`,
            consumer: consumer?._id,
            user: user?._id,
            bill: bill._id,
            fineAmount: 150
        });

        bill.dueAlertSent = true;
        await bill.save();

        if (user?.email) {
            sendDueDateReminderEmail({
                toEmail: user.email,
                consumerName: user.name,
                serviceNumber: consumer?.serviceNumber || 'N/A',
                amount: bill.totalAmount,
                dueDate: dueDateFormatted,
                daysLeft: daysLeft,
                billingMonth: bill.billingMonth,
                district: consumer?.district || user?.district || 'Tamil Nadu'
            }).catch(e => console.warn('Single due reminder email error:', e.message));
        }

        res.status(200).json({
            success: true,
            message: `Due reminder notice and email dispatched to ${user?.name || 'Consumer'}.`,
            data: bill
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update consumer district
// @route   PUT /api/admin/consumer/:id/district
// @access  Private/Admin
const updateConsumerDistrict = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { district } = req.body;

        if (!district) {
            return res.status(400).json({ success: false, message: 'District is required.' });
        }

        let consumer = await Consumer.findById(id).populate('user');
        if (!consumer) {
            consumer = await Consumer.findOne({ user: id }).populate('user');
        }

        if (!consumer) {
            return res.status(404).json({ success: false, message: 'Consumer not found.' });
        }

        consumer.district = district.trim();
        if (consumer.address) {
            consumer.address.district = district.trim();
            consumer.address.city = district.trim();
        }
        await consumer.save();

        if (consumer.user) {
            await User.findByIdAndUpdate(consumer.user._id, { district: district.trim() });
        }

        res.status(200).json({
            success: true,
            message: `District updated to ${district} for consumer ${consumer.serviceNumber}.`,
            data: consumer
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin update consumer profile (name, email, phone, address, district, pincode, service connection number)
// @route   PUT /api/admin/consumer/:id/profile
// @access  Private/Admin
const updateConsumerProfileAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, email, phone, street, district, pincode, serviceNumber } = req.body;

        let consumer = null;
        if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
            consumer = await Consumer.findById(id).populate('user');
            if (!consumer) {
                consumer = await Consumer.findOne({ user: id }).populate('user');
            }
        }

        if (!consumer && email) {
            const matchedUser = await User.findOne({ email: email.trim().toLowerCase() });
            if (matchedUser) {
                consumer = await Consumer.findOne({ user: matchedUser._id }).populate('user');
            }
        }

        if (!consumer && serviceNumber) {
            consumer = await Consumer.findOne({ serviceNumber: serviceNumber.trim() }).populate('user');
        }

        if (!consumer) {
            return res.status(404).json({ success: false, message: 'Consumer profile not found.' });
        }

        const user = consumer.user ? await User.findById(consumer.user._id) : null;

        if (user) {
            if (name && name.trim()) user.name = name.trim();
            if (email && email.trim()) {
                const normalizedEmail = email.trim().toLowerCase();
                const conflict = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
                if (conflict) {
                    return res.status(400).json({ success: false, message: 'Email address already assigned to another user.' });
                }
                user.email = normalizedEmail;
            }
            if (phone !== undefined) user.phone = phone.trim();
            if (district && district.trim()) user.district = district.trim();
            user.address = {
                street: street !== undefined ? street.trim() : (user.address?.street || ''),
                city: district ? district.trim() : (user.address?.city || 'Chennai'),
                district: district ? district.trim() : (user.address?.district || 'Chennai'),
                pincode: pincode !== undefined ? pincode.trim() : (user.address?.pincode || '')
            };
            await user.save();
        }

        if (serviceNumber && serviceNumber.trim()) {
            const cleanServiceNo = serviceNumber.trim();
            const conflict = await Consumer.findOne({ serviceNumber: cleanServiceNo, _id: { $ne: consumer._id } });
            if (conflict) {
                return res.status(400).json({ success: false, message: `Service connection number ${cleanServiceNo} is already registered.` });
            }
            consumer.serviceNumber = cleanServiceNo;
        }

        if (phone !== undefined) consumer.phone = phone.trim();
        if (district && district.trim()) consumer.district = district.trim();
        consumer.address = {
            street: street !== undefined ? street.trim() : (consumer.address?.street || ''),
            city: district ? district.trim() : (consumer.address?.city || 'Chennai'),
            district: district ? district.trim() : (consumer.address?.district || 'Chennai'),
            pincode: pincode !== undefined ? pincode.trim() : (consumer.address?.pincode || '')
        };
        await consumer.save();

        res.status(200).json({
            success: true,
            message: 'Consumer profile updated successfully.',
            data: {
                consumer,
                user
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get Admin Live Notifications and Action Alerts
// @route   GET /api/admin/notifications
// @access  Private/Admin
const getAdminNotifications = async (req, res, next) => {
    try {
        const alerts = await Alert.find({
            $or: [
                { user: req.user._id },
                { type: 'KYC_STATUS' },
                { severity: 'HIGH' }
            ]
        })
        .populate('consumer', 'serviceNumber district connectionType')
        .populate('user', 'name email role')
        .populate('bill', 'billingMonth totalAmount fineAmount dueDate status')
        .sort({ createdAt: -1 })
        .limit(50);

        const pendingKycCount = await Consumer.countDocuments({ verificationStatus: 'PENDING' });
        const now = new Date();
        const overdueBills = await Bill.find({
            status: { $ne: 'PAID' },
            dueDate: { $lt: now }
        }).populate({
            path: 'consumer',
            populate: { path: 'user', select: 'name email district phone' }
        }).sort({ dueDate: 1 });

        const futureLimit = new Date();
        futureLimit.setDate(now.getDate() + 5);
        const nearingDueBills = await Bill.find({
            status: 'UNPAID',
            dueDate: { $gte: now, $lte: futureLimit }
        }).populate({
            path: 'consumer',
            populate: { path: 'user', select: 'name email district phone' }
        }).sort({ dueDate: 1 });

        const pendingKycConsumers = await Consumer.find({ verificationStatus: 'PENDING' })
            .populate('user', 'name email district phone kycDocuments connectionType')
            .sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            data: {
                alerts,
                metrics: {
                    pendingKycCount: pendingKycConsumers.length,
                    overdueBillsCount: overdueBills.length,
                    nearingDueCount: nearingDueBills.length,
                    totalUrgent: pendingKycConsumers.length + overdueBills.length + nearingDueBills.length
                },
                overdueBills,
                nearingDueBills,
                pendingKycConsumers
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { 
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
};