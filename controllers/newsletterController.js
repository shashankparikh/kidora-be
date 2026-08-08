const newsletterService = require("../services/newsletterService");

async function subscribe(req, res) {

    try {

        const result = await newsletterService.subscribe(req.body.email);

        res.json({
            success: true,
            message: "You're on the list!",
            email: result.email
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

}

module.exports = {
    subscribe
};
