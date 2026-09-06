const adminUserStore = require("../db/adminUserStore");
const { signAdminToken } = require("../utils/tokens");

// Operator sign-in. Accounts live in the admin_users table (migration 009),
// not in env — there are three people working this queue and every write they
// make is stamped with their name, which a single shared credential made
// impossible. See scripts/admin-user.js for adding one.
async function login(req, res) {

    const { username, password } = req.body || {};

    const admin = await adminUserStore.verifyPassword(username, password);

    if (!admin) {
        // One message for both "no such operator" and "wrong password". The
        // form should not confirm which usernames exist.
        return res.status(401).json({ success: false, message: "Invalid username or password." });
    }

    // Best-effort: a failure to record the login should not stop the login.
    adminUserStore.recordLogin(admin.id).catch(() => {});

    res.json({
        success: true,
        token: signAdminToken(admin),
        admin: { username: admin.username, displayName: admin.displayName }
    });

}

module.exports = {
    login
};
