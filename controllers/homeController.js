const homeService = require("../services/homeService");


function getHome(req, res) {

    const modules = homeService.getHomeWidgets();

    res.json({
        success: true,
        modules
    });

}


module.exports = {
    getHome
};
