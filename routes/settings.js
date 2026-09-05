const express = require("express");

const router = express.Router();

const settingsController = require("../controllers/settingsController");

// Public: the storefront reads this to decide whether to wait for a preview
// or promise one by email.
router.get(
    "/settings",
    settingsController.getPublicSettings
);

module.exports = router;
