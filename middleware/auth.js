const { verifyAccessToken } = require("../utils/tokens");
const userStore = require("../db/userStore");

async function requireAuth(req, res, next) {

    const header = req.get("authorization") || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ success: false, message: "Not authenticated." });
    }

    try {

        const claims = verifyAccessToken(token);
        const userRow = await userStore.getUserById(claims.sub);

        if (!userRow) {
            return res.status(401).json({ success: false, message: "Not authenticated." });
        }

        req.user = userStore.toPublicUser(userRow);

        next();

    } catch {
        res.status(401).json({ success: false, message: "Session expired." });
    }

}

async function requireAdmin(req, res, next) {

    await requireAuth(req, res, () => {
        if (req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Admins only." });
        }
        next();
    });

}

module.exports = {
    requireAuth,
    requireAdmin
};
