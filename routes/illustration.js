const express = require("express");
const router = express.Router();

const illustrationController = require("../controllers/illustrationController");
const { illustrationLimiter } = require("../middleware/generationRateLimit");

router.post(
    "/books/:bookId/illustrations",
    illustrationLimiter,
    illustrationController.generateIllustrations
);

module.exports = router;