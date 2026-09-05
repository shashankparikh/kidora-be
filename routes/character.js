const express = require("express");

const router = express.Router();

const { requireAuth } = require("../middleware/auth");

const characterController = require("../controllers/characterController");
const { characterLimiter } = require("../middleware/generationRateLimit");


router.post(
    "/books/:bookId/character",
    requireAuth,
    characterLimiter,
    characterController.generateCharacter
);


module.exports = router;