const privacyPolicyService = require("../services/privacyPolicyService");


function getPrivacyPolicy(req, res) {

    const data = privacyPolicyService.getPrivacyPolicy();

    res.json({
        success: true,
        data
    });

}


module.exports = {
    getPrivacyPolicy
};
