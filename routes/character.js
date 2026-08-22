const express = require("express");

const router = express.Router();

const characterController = require("../controllers/characterController");
const { characterLimiter } = require("../middleware/generationRateLimit");


router.post(
    "/books/:bookId/character",
    characterLimiter,
    characterController.generateCharacter
);


module.exports = router;