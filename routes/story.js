const express = require("express");

const router = express.Router();

const { requireAuth } = require("../middleware/auth");

const storyController = require("../controllers/storyController");
const { storyLimiter } = require("../middleware/generationRateLimit");

router.post(
    "/books/:bookId/story",
    requireAuth,
    storyLimiter,
    storyController.generateStory
);

module.exports = router;