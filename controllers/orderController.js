const orderService = require("../services/orderService");
const reviewService = require("../services/reviewService");

// There is no longer a direct "create order" HTTP endpoint — see
// BACKLOG.md P0.5 and routes/orders.js. Orders are only ever created from
// inside services/paymentService.js, after a Razorpay payment has been
// verified/captured; see controllers/paymentController.js for the routes
// that actually front order creation now (POST /payments/create-order,
// POST /payments/verify).
async function listOrders(req, res) {

    const orders = await orderService.listOrdersForUser(req.user.id);

    res.json({
        success: true,
        orders
    });

}

function getReviewEligibility(req, res) {

    const eligibility = reviewService.getEligibility(req.params.orderId, req.user.id);

    res.json({
        success: true,
        ...eligibility
    });

}

module.exports = {
    listOrders,
    getReviewEligibility
};
