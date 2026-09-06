const { verifyAdminToken } = require("../utils/tokens");

// Separate from requireAuth/requireAdmin in middleware/auth.js on purpose —
// those are tied to a customer users-table row. Operators live in their own
// admin_users table with their own token secret, so this gets its own
// verification middleware.
//
// req.admin.name is what every audit-trail write is stamped with. It comes
// off the token rather than a lookup so a handler can attribute an action
// without an extra query, and so the name recorded is the one the operator
// signed in under.
function requireAdminAuth(req, res, next) {

    const header = req.get("authorization") || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ success: false, message: "Not authenticated." });
    }

    try {

        const claims = verifyAdminToken(token);
        req.admin = { username: claims.sub, name: claims.name || claims.sub };
        next();

    } catch {
        res.status(401).json({ success: false, message: "Session expired." });
    }

}

// A route that both a customer and an operator can reach, on the SAME url,
// with whichever session they happen to hold.
//
// The storefront preview page is one screen; sending operators to a parallel
// copy of it would mean two implementations of the thing customers actually
// see, and the copy is the one that drifts. So the page stays single and the
// route accepts either token.
//
// Order matters: the admin token is tried first and, on success, `req.admin`
// is set and `req.user` is NOT. A handler therefore cannot mistake an
// operator for the order's owner — it has to opt into the operator path
// explicitly rather than inheriting a customer's permissions by accident.
function allowAdminOrCustomer(requireAuth) {

    return async function (req, res, next) {

        const [scheme, token] = (req.get("authorization") || "").split(" ");

        if (scheme === "Bearer" && token) {
            try {
                const claims = verifyAdminToken(token);
                req.admin = { username: claims.sub, name: claims.name || claims.sub };
                return next();
            } catch {
                // Not an admin token — fall through to the customer check
                // rather than rejecting, because the overwhelming majority of
                // requests here are customers holding a customer token.
            }
        }

        return requireAuth(req, res, next);

    };

}

module.exports = {
    requireAdminAuth,
    allowAdminOrCustomer
};
