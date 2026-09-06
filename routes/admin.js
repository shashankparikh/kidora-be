const express = require("express");

const router = express.Router();

const adminAuthController = require("../controllers/adminAuthController");
const adminController = require("../controllers/adminController");
const { requireAdminAuth } = require("../middleware/adminAuth");
const previewController = require("../controllers/previewController");

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
    "/payments",
    requireAdminAuth,
    adminController.listPayments
);

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

// Preview operations. Upload lives on its own router because it needs
// multer; everything else that is just a state change lives here.
router.get(
    "/previews",
    requireAdminAuth,
    previewController.listPreviews
);

router.get(
    "/previews/ready-to-print",
    requireAdminAuth,
    previewController.listReadyToPrint
);

router.get(
    "/previews/:orderId",
    requireAdminAuth,
    previewController.adminPreviewPages
);

router.post(
    "/previews/:orderId/release",
    requireAdminAuth,
    previewController.releasePreview
);

router.post(
    "/previews/:orderId/unrelease",
    requireAdminAuth,
    previewController.unreleasePreview
);

router.get(
    "/support-requests",
    requireAdminAuth,
    adminController.listSupportRequests
);

router.post(
    "/support-requests/:id/resolve",
    requireAdminAuth,
    adminController.resolveSupportRequest
);

// The fulfilment queue and everything that acts on it.
router.get("/queue",                requireAdminAuth, adminController.orderQueue);
router.get("/activity",             requireAdminAuth, adminController.recentActivity);
router.get("/queue/:orderId",       requireAdminAuth, adminController.orderDetail);
router.post("/queue/:orderId/status", requireAdminAuth, adminController.advanceOrder);
router.post("/queue/:orderId/note",   requireAdminAuth, adminController.addOrderNote);

module.exports = router;
