const { verifyAdminToken } = require("../utils/tokens");

// Separate from requireAuth/requireAdmin in middleware/auth.js on purpose —
// those are tied to a real customer users-table row with role='admin'.
// The admin panel currently has a single hardcoded operator login (no
// users table involved), so it gets its own token scheme and its own
// verification middleware.
function requireAdminAuth(req, res, next) {

    const header = req.get("authorization") || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ success: false, message: "Not authenticated." });
    }

    try {

        const claims = verifyAdminToken(token);
        req.admin = { username: claims.sub };
        next();

    } catch {
        res.status(401).json({ success: false, message: "Session expired." });
    }

}

module.exports = {
    requireAdminAuth
};
