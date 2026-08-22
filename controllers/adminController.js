const orderService = require("../services/orderService");
const reviewService = require("../services/reviewService");

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

module.exports = {
    listOrders,
    listReviews,
    moderateReview
};
