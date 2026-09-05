const express = require("express");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false
});

// Tighter than authLimiter: every request to this endpoint sends a real
// email to an address the caller chose, so an open limit here is a spam
// cannon pointed at strangers as much as it is a risk to us. The
// per-address cap in otpService sits underneath this per-IP one.
const otpRequestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many code requests. Please wait a few minutes."
    }
});

router.post("/register", authLimiter, authController.register);
router.post("/otp/request", otpRequestLimiter, authController.requestOtp);
router.post("/otp/verify", authLimiter, authController.verifyOtp);
router.post("/login", authLimiter, authController.login);
router.post("/google", authLimiter, authController.google);
router.post("/refresh", authLimiter, authController.refresh);
router.get("/me", requireAuth, authController.me);
router.post("/logout", authController.logout);
router.post("/logout-all", requireAuth, authController.logoutAll);

module.exports = router;
