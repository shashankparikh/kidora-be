const orderService = require("../services/orderService");
const reviewService = require("../services/reviewService");

function createOrder(req, res) {

    try {

        const { bookId, total, gaClientId } = req.body;

        if (!bookId) {
            return res.status(400).json({ success: false, message: "bookId is required." });
        }

        const order = orderService.createOrder({
            userId: req.user.id,
            bookId,
            total,
            gaClientId
        });

        res.json({
            success: true,
            order
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

}

function listOrders(req, res) {

    const orders = orderService.listOrdersForUser(req.user.id);

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
    createOrder,
    listOrders,
    getReviewEligibility
};
