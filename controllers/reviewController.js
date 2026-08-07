const reviewService = require("../services/reviewService");

function createReview(req, res) {

    try {

        const { orderId, rating, title, comment } = req.body;

        if (!orderId) {
            return res.status(400).json({ success: false, message: "orderId is required." });
        }

        const review = reviewService.createReview({
            orderId,
            userId: req.user.id,
            rating,
            title,
            comment
        });

        res.json({
            success: true,
            message: "Thanks! Your review is being checked and will appear shortly.",
            review
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

}

function listReviews(req, res) {

    const { theme, limit } = req.query;

    const reviews = reviewService.listPublicReviews({
        theme: theme || undefined,
        limit: limit ? Number(limit) : undefined
    });

    res.json({
        success: true,
        reviews
    });

}

function getSummary(req, res) {

    res.json({
        success: true,
        summary: reviewService.getSummary()
    });

}

function listPendingReviews(req, res) {

    res.json({
        success: true,
        reviews: reviewService.listPendingReviews()
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
    createReview,
    listReviews,
    getSummary,
    listPendingReviews,
    moderateReview
};
