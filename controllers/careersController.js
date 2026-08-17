const careersService = require("../services/careersService");


function getCareers(req, res) {

    const data = careersService.getCareers();

    res.json({
        success: true,
        data
    });

}


module.exports = {
    getCareers
};
