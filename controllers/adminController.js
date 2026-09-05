const orderService = require("../services/orderService");
const settingsStore = require("../db/settingsStore");
const reviewService = require("../services/reviewService");

async function listOrders(req, res) {

    const { status } = req.query;

    const orders = await orderService.listAllOrders({ status: status || undefined });

    res.json({
        success: true,
        orders
    });

}

async function listReviews(req, res) {

    const { status } = req.query;

    const reviews = await reviewService.listAllReviews({ status: status || undefined });

    res.json({
        success: true,
        reviews
    });

}

async function moderateReview(req, res) {

    try {

        const review = await reviewService.moderateReview(req.params.reviewId, req.body.status);

        res.json({
            success: true,
            review
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

}

async function getSettings(req, res) {

    res.json({
        success: true,
        settings: await settingsStore.getSettings()
    });

}

async function updateSettings(req, res) {

    try {

        // req.body is passed through as-is; settingsStore rejects unknown
        // keys and bad values, so validation lives in one place rather than
        // being duplicated here and drifting.
        const settings = await settingsStore.updateSettings(
            req.body,
            req.admin?.username || null
        );

        res.json({ success: true, settings });

    } catch (error) {

        // A rejected setting is operator error, not a server fault.
        res.status(400).json({
            success: false,
            message: error.message
        });

    }

}

module.exports = {
    listOrders,
    listReviews,
    moderateReview,
    getSettings,
    updateSettings
};
