const settingsStore = require("../db/settingsStore");

// The storefront needs to know which preview experience to render BEFORE it
// starts the wizard, so this is public. Only the settings that change what a
// visitor sees are exposed — anything operational stays behind /admin.
async function getPublicSettings(req, res) {

    const settings = await settingsStore.getSettings();

    res.json({
        success: true,
        settings: {
            previewMode: settings.preview_mode,
            previewPageCount: settings.preview_page_count
        }
    });

}

module.exports = {
    getPublicSettings
};
