const { signAdminToken } = require("../utils/tokens");

// Hardcoded for now — there's no admin-users table yet. Overridable via
// env so this doesn't have to stay a checked-in literal long-term.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "shashank";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "shashank";

function login(req, res) {

    const { username, password } = req.body || {};

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, message: "Invalid username or password." });
    }

    const token = signAdminToken({ username });

    res.json({
        success: true,
        token,
        admin: { username }
    });

}

module.exports = {
    login
};
