const express = require("express");

const router = express.Router();

const bookController = require("../controllers/bookController");
const { requireAuth } = require("../middleware/auth");
const { createBookLimiter } = require("../middleware/generationRateLimit");


router.post(
    "/",
    requireAuth,
    createBookLimiter,
    bookController.createBook
);

router.get(
    "/:bookId",
    bookController.getBookById
);

// The wizard saving the child's details. Behind requireAuth like everything
// else in the creation flow — the gate covers the whole of it, not only the
// calls that used to cost money.
//
// Declared BEFORE /:bookId/claim: Express matches in order, and while these
// two do not actually collide, keeping the more specific route after the
// general one is the habit that eventually does.
router.patch(
    "/:bookId",
    requireAuth,
    bookController.saveDetails
);

router.patch(
    "/:bookId/claim",
    requireAuth,
    bookController.claimBook
);

module.exports = router;