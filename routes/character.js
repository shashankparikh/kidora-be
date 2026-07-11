const express = require("express");

const router = express.Router();

const characterController = require("../controllers/characterController");


router.post(
    "/books/:bookId/character",
    characterController.generateCharacter
);


module.exports = router;