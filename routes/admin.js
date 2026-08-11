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

module.exports = router;
