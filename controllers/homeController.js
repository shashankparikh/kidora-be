const homeService = require("../services/homeService");


async function getHome(req, res) {

    const modules = await homeService.getHomeWidgets();

    res.json({
        success: true,
        modules
    });

}


module.exports = {
    getHome
};
