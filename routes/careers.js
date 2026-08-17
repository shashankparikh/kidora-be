const express = require("express");

const router = express.Router();

const careersController = require("../controllers/careersController");


router.get(
    "/careers",
    careersController.getCareers
);


module.exports = router;
