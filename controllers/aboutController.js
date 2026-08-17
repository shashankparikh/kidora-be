const aboutService = require("../services/aboutService");


function getAbout(req, res) {

    const data = aboutService.getAbout();

    res.json({
        success: true,
        data
    });

}


module.exports = {
    getAbout
};
