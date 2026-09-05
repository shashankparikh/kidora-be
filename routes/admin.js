const express = require("express");

const router = express.Router();

const adminAuthController = require("../controllers/adminAuthController");
const adminController = require("../controllers/adminController");
const { requireAdminAuth } = require("../middleware/adminAuth");

// Public — this IS the admin login.
router.post(
    "/login",
    adminAuthController.login
);

router.get(
    "/orders",
    requireAdminAuth,
    adminController.listOrders
);

router.get(
    "/reviews",
    requireAdminAuth,
    adminController.listReviews
);

router.patch(
    "/reviews/:reviewId",
    requireAdminAuth,
    adminController.moderateReview
);

router.get(
    "/settings",
    requireAdminAuth,
    adminController.getSettings
);

router.patch(
    "/settings",
    requireAdminAuth,
    adminController.updateSettings
);

// Orphaned-payment refund tooling — see controllers/adminController.js
// and services/paymentService.js. "Orphaned" = Razorpay captured the
// money but no order was ever created for it.
router.get(
    "/payments/orphaned",
    requireAdminAuth,
    adminController.listOrphanedPayments
);

router.post(
    "/payments/:paymentId/refund",
    requireAdminAuth,
    adminController.refundOrphanedPayment
);

router.post(
    "/payments/reconcile",
    requireAdminAuth,
    adminController.reconcileOrphanedPayments
);

module.exports = router;
