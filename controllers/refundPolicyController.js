const refundPolicyService = require("../services/refundPolicyService");


function getRefundPolicy(req, res) {

    const data = refundPolicyService.getRefundPolicy();

    res.json({
        success: true,
        data
    });

}


module.exports = {
    getRefundPolicy
};
