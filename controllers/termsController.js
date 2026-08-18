const termsService = require("../services/termsService");


function getTerms(req, res) {

    const data = termsService.getTerms();

    res.json({
        success: true,
        data
    });

}


module.exports = {
    getTerms
};
