const express = require("express");

const router = express.Router();

const orderController = require("../controllers/orderController");
const { requireAuth } = require("../middleware/auth");

// POST / (create order) was removed on purpose — see BACKLOG.md P0.5 and
// controllers/orderController.js. Orders are created from
// services/paymentService.js after a Razorpay payment is verified; see
// routes/payments.js for POST /payments/create-order and
// POST /payments/verify.

router.get(
    "/",
    requireAuth,
    orderController.listOrders
);

router.get(
    "/:orderId/review-eligibility",
    requireAuth,
    orderController.getReviewEligibility
);

module.exports = router;
