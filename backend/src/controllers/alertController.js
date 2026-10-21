const Alert = require('../models/Alert');
const Consumer = require('../models/Consumer');

// @desc    Get alerts strictly for the authenticated user and their linked consumer profile
// @route   GET /api/alerts
// @access  Private
const getActiveAlerts = async (req, res, next) => {
    try {
        const isConsumer = req.user.role === 'CONSUMER';
        let filter;

        if (isConsumer) {
            // Consumers ONLY see alerts explicitly meant for consumers (never admin KYC verification requests)
            const consumer = await Consumer.findOne({ user: req.user._id });
            const userCondition = [{ user: req.user._id }];
            if (consumer) {
                userCondition.push({ consumer: consumer._id });
            }
            filter = {
                $or: userCondition,
                targetRole: { $ne: 'ADMIN' },
                type: { $nin: ['KYC_STATUS', 'PAYMENT_VERIFICATION_REQUEST', 'ADMIN_ALERT'] }
            };
        } else {
            // Admins see their alerts or admin-targeted broadcasts
            filter = {
                $or: [
                    { user: req.user._id },
                    { targetRole: 'ADMIN' },
                    { type: 'KYC_STATUS' },
                    { type: 'PAYMENT_VERIFICATION_REQUEST' }
                ]
            };
        }

        const alerts = await Alert.find(filter)
            .populate('bill')
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = alerts.filter(a => !a.isResolved).length;

        res.status(200).json({ 
            success: true, 
            count: alerts.length, 
            unreadCount,
            data: alerts 
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get unread alerts count strictly for authenticated user
// @route   GET /api/alerts/unread-count
// @access  Private
const getUnreadAlertsCount = async (req, res, next) => {
    try {
        const isConsumer = req.user.role === 'CONSUMER';
        let filter;

        if (isConsumer) {
            const consumer = await Consumer.findOne({ user: req.user._id });
            const userCondition = [{ user: req.user._id }];
            if (consumer) {
                userCondition.push({ consumer: consumer._id });
            }
            filter = {
                isResolved: { $ne: true },
                $or: userCondition,
                targetRole: { $ne: 'ADMIN' },
                type: { $nin: ['KYC_STATUS', 'PAYMENT_VERIFICATION_REQUEST', 'ADMIN_ALERT'] }
            };
        } else {
            filter = {
                isResolved: { $ne: true },
                $or: [
                    { user: req.user._id },
                    { targetRole: 'ADMIN' },
                    { type: 'KYC_STATUS' },
                    { type: 'PAYMENT_VERIFICATION_REQUEST' }
                ]
            };
        }

        const count = await Alert.countDocuments(filter);
        res.status(200).json({ success: true, count });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark an alert as resolved / read (verifying user ownership)
// @route   PUT /api/alerts/:id/resolve
// @access  Private
const resolveAlert = async (req, res, next) => {
    try {
        const alert = await Alert.findById(req.params.id);
        if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });

        alert.isResolved = true;
        alert.resolvedAt = new Date();
        await alert.save();

        res.status(200).json({ success: true, data: alert });
    } catch (error) {
        next(error);
    }
};

// @desc    Mark all alerts as resolved / read for current user
// @route   PUT /api/alerts/mark-all-read
// @access  Private
const markAllAlertsRead = async (req, res, next) => {
    try {
        const consumer = await Consumer.findOne({ user: req.user._id });
        const userCondition = [{ user: req.user._id }];
        if (consumer) {
            userCondition.push({ consumer: consumer._id });
        }
        const filter = { isResolved: { $ne: true }, $or: userCondition };

        await Alert.updateMany(filter, { 
            $set: { isResolved: true, resolvedAt: new Date() } 
        });

        res.status(200).json({ success: true, message: 'All alerts marked as read.' });
    } catch (error) {
        next(error);
    }
};

module.exports = { 
    getActiveAlerts, 
    getUnreadAlertsCount,
    resolveAlert, 
    markAllAlertsRead 
};