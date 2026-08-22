const express = require("express");

const router = express.Router();

const storyController = require("../controllers/storyController");
const { storyLimiter } = require("../middleware/generationRateLimit");

router.post(
    "/books/:bookId/story",
    storyLimiter,
    storyController.generateStory
);

module.exports = router;