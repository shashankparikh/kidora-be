const express = require("express");

const router = express.Router();

const themeController = require("../controllers/themeController");


router.get(
    "/themes",
    themeController.listThemes
);


module.exports = router;
