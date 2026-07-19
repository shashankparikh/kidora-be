const { testConnection } = require("../services/ai/geminiService");

async function test(req, res) {

    try {

        const response = await testConnection();

        res.json({
            success: true,
            response
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

}

module.exports = {
    test
};