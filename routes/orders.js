const express = require("express");

const router = express.Router();

const orderController = require("../controllers/orderController");
const previewController = require("../controllers/previewController");
const { requireAuth } = require("../middleware/auth");
const { allowAdminOrCustomer } = require("../middleware/adminAuth");

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

// The preview a customer sees, and what they send back about it. Owned by
// the order rather than the book, because the order is what was paid for and
// what a cancellation or change request refers to.
router.get(
    "/:orderId/preview",
    // Read-only, and the one route here an operator may reach. Approving and
    // support requests below stay requireAuth: those are the customer's
    // decisions to make, and an operator must not be able to take them from
    // the same screen just because they can see it.
    allowAdminOrCustomer(requireAuth),
    previewController.getMyPreview
);

router.post(
    "/:orderId/preview/approve",
    requireAuth,
    previewController.approvePreview
);

// Change requests, questions and cancellations all arrive here — one door,
// distinguished by `kind`, because asking for a fix should be exactly as easy
// as asking for a refund.
router.post(
    "/:orderId/support",
    requireAuth,
    previewController.submitSupportRequest
);

module.exports = router;
