const orderService = require("../services/orderService");
const reviewService = require("../services/reviewService");
const paymentService = require("../services/paymentService");

async function listOrders(req, res) {

    const { status } = req.query;

    const orders = await orderService.listAllOrders({ status: status || undefined });

    res.json({
        success: true,
        orders
    });

}

function listReviews(req, res) {

    const { status } = req.query;

    const reviews = reviewService.listAllReviews({ status: status || undefined });

    res.json({
        success: true,
        reviews
    });

}

function moderateReview(req, res) {

    try {

        const review = reviewService.moderateReview(req.params.reviewId, req.body.status);

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

// Captured-but-unlinked Razorpay payments — see services/paymentService.js's
// listOrphanedPayments. Surfaced here so an operator can see what's stuck
// before deciding whether to wait for the automatic sweep or refund one
// immediately below.
function listOrphanedPayments(req, res) {

    const payments = paymentService.listOrphanedPayments();

    res.json({
        success: true,
        payments
    });

}

// Refunds one specific orphaned payment right now, by its internal
// payment id (as returned by listOrphanedPayments above) — see
// paymentService.refundOrphanedPaymentById for the guardrails (only ever
// touches a payment that's genuinely still an orphaned capture).
async function refundOrphanedPayment(req, res) {

    try {

        const result = await paymentService.refundOrphanedPaymentById(req.params.paymentId);

        res.json({
            success: true,
            ...result
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

}

// Manual trigger for the same sweep server.js runs on a timer — mainly
// useful for confirming the feature works right after deploying it,
// without waiting for the interval, or for running it once right after
// go-live rather than waiting up to the full interval for the first pass.
async function reconcileOrphanedPayments(req, res) {

    const summary = await paymentService.reconcileOrphanedPayments();

    res.json({
        success: true,
        ...summary
    });

}

module.exports = {
    listOrders,
    listReviews,
    moderateReview,
    listOrphanedPayments,
    refundOrphanedPayment,
    reconcileOrphanedPayments
};
