const express = require("express");

const router = express.Router();

const refundPolicyController = require("../controllers/refundPolicyController");


router.get(
    "/refund-policy",
    refundPolicyController.getRefundPolicy
);


module.exports = router;
