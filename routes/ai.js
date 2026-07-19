const express = require("express");

const router = express.Router();

const aiController = require("../controllers/aiController");

router.get("/ai/test", aiController.test);

module.exports = router;