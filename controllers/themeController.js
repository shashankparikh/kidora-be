const themeService = require("../services/themeService");


function listThemes(req, res) {

    const themes = themeService.getStoryThemes();

    res.json({
        success: true,
        themes
    });

}


module.exports = {
    listThemes
};
