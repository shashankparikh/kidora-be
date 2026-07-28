const express = require("express");

const router = express.Router();

const bookController = require("../controllers/bookController");
const { requireAuth } = require("../middleware/auth");


router.post(
    "/",
    bookController.createBook
);

router.get(
    "/:bookId",
    bookController.getBookById
);

router.patch(
    "/:bookId/claim",
    requireAuth,
    bookController.claimBook
);

module.exports = router;