const orderService = require("../services/orderService");
const reviewService = require("../services/reviewService");

async function createOrder(req, res) {

    try {

        const { bookId, gaClientId } = req.body;

        if (!bookId) {
            return res.status(400).json({ success: false, message: "bookId is required." });
        }

        // total is deliberately not read from req.body — orderService
        // computes it server-side from the book's theme (see BACKLOG.md
        // P0.5). A client-supplied total would let anyone place a free
        // order.
        const order = await orderService.createOrder({
            userId: req.user.id,
            bookId,
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
    createOrder,
    listOrders,
    getReviewEligibility
};
