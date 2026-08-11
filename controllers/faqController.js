const faqService = require("../services/faqService");


function getFaq(req, res) {

    const data = faqService.getFaq();

    res.json({
        success: true,
        data
    });

}


module.exports = {
    getFaq
};
