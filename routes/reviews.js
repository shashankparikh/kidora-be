const express = require("express");

const router = express.Router();

const reviewController = require("../controllers/reviewController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

router.post(
    "/",
    requireAuth,
    reviewController.createReview
);

router.get(
    "/",
    reviewController.listReviews
);

router.get(
    "/summary",
    reviewController.getSummary
);

router.get(
    "/admin/pending",
    requireAdmin,
    reviewController.listPendingReviews
);

router.patch(
    "/admin/:reviewId",
    requireAdmin,
    reviewController.moderateReview
);

module.exports = router;
