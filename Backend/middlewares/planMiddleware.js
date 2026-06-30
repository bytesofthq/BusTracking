const Subscription = require('../models/SubscriptionModel');

// Middleware to check if the user's institute has an active subscription
exports.checkActiveSubscription = async (req, res, next) => {
    try {
        // Ensure user is authenticated and instituteId is available
        if (!req.user || !req.user.instituteId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please log in first.'
            });
        }

        const instituteId = req.user.instituteId;

        // Query database for an active subscription that hasn't expired
        const subscription = await Subscription.findOne({
            instituteId: instituteId,
            status: 'active',
            endDate: { $gte: new Date() }
        }).populate({ path: 'planId', model: 'Plan' });

        if (!subscription) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Your institute does not have an active subscription plan.'
            });
        }

        // Attach subscription information to request object for downstream controllers
        req.subscription = subscription;

        next();
    } catch (err) {
        next(err);
    }
};
