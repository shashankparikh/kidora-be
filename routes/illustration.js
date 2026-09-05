const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth");

const illustrationController = require("../controllers/illustrationController");
const { illustrationLimiter } = require("../middleware/generationRateLimit");

router.post(
    "/books/:bookId/illustrations",
    requireAuth,
    illustrationLimiter,
    illustrationController.generateIllustrations
);

module.exports = router;