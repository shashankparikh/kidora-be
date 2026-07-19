const express = require("express");

const router = express.Router();

const storyController = require("../controllers/storyController");

router.post(
    "/books/:bookId/story",
    storyController.generateStory
);

module.exports = router;