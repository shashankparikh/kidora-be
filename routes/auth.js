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

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.post("/google", authLimiter, authController.google);
router.post("/refresh", authLimiter, authController.refresh);
router.get("/me", requireAuth, authController.me);
router.post("/logout", authController.logout);
router.post("/logout-all", requireAuth, authController.logoutAll);

module.exports = router;
