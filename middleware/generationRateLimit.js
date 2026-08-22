const rateLimit = require("express-rate-limit");

// The generation pipeline is intentionally unauthenticated (anonymous
// try-before-signup, see BACKLOG.md P0.2) so per-IP request limits are the
// first line of defense against a scripted loop — tighter the more
// expensive the endpoint is. This is on top of, not instead of,
// services/spendGuard.js's app-wide daily cap: this stops one IP from
// hogging the budget, the daily cap stops the budget being blown at all.
function makeLimiter(limit, windowMs = 60 * 60 * 1000) {

    return rateLimit({
        windowMs,
        limit,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            message: "Too many requests. Please try again later."
        }
    });

}

module.exports = {
    createBookLimiter: makeLimiter(30),
    uploadLimiter: makeLimiter(20),
    characterLimiter: makeLimiter(10),
    storyLimiter: makeLimiter(10),
    illustrationLimiter: makeLimiter(5),
    pdfLimiter: makeLimiter(20)
};
