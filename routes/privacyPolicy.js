const express = require("express");

const router = express.Router();

const privacyPolicyController = require("../controllers/privacyPolicyController");


router.get(
    "/privacy-policy",
    privacyPolicyController.getPrivacyPolicy
);


module.exports = router;
