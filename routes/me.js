const express = require("express");

const router = express.Router();

const meController = require("../controllers/meController");
const { requireAuth } = require("../middleware/auth");

router.get("/books", requireAuth, meController.listMyBooks);

module.exports = router;
