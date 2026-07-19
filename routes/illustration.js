const express = require("express");
const router = express.Router();

const illustrationController = require("../controllers/illustrationController");

router.post(
    "/books/:bookId/illustrations",
    illustrationController.generateIllustrations
);

module.exports = router;