const authService = require("../services/authService");
const otpService = require("../services/otpService");
const { REFRESH_TOKEN_TTL_MS } = require("../utils/tokens");

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_PATH = "/auth";

function refreshCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: REFRESH_COOKIE_PATH,
        maxAge: REFRESH_TOKEN_TTL_MS
    };
}

function requestContext(req) {
    return {
        userAgent: req.get("user-agent"),
        ipAddress: req.ip
    };
}

function sendSession(res, { user, accessToken, refreshToken }) {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
    res.json({ success: true, user, accessToken });
}

async function register(req, res) {
    try {
        const session = await authService.register(req.body, requestContext(req));
        sendSession(res, session);
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
}

async function login(req, res) {
    try {
        const session = await authService.login(req.body, requestContext(req));
        sendSession(res, session);
    } catch (error) {
        res.status(401).json({ success: false, message: error.message });
    }
}

async function google(req, res) {
    try {
        const session = await authService.loginWithGoogle(req.body, requestContext(req));
        sendSession(res, session);
    } catch (error) {
        res.status(401).json({ success: false, message: error.message });
    }
}

async function refresh(req, res) {
    try {
        const session = await authService.refresh(
            req.cookies?.[REFRESH_COOKIE_NAME],
            requestContext(req)
        );
        sendSession(res, session);
    } catch (error) {
        res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
        res.status(401).json({ success: false, message: error.message });
    }
}

function me(req, res) {
    res.json({ success: true, user: req.user });
}

async function logout(req, res) {
    await authService.logout(req.cookies?.[REFRESH_COOKIE_NAME]);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
    res.json({ success: true });
}

async function logoutAll(req, res) {
    await authService.logoutAll(req.user.id);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
    res.json({ success: true });
}

async function requestOtp(req, res) {
    try {
        const result = await otpService.requestOtp({
            email: req.body?.email,
            ipAddress: req.ip
        });
        res.json({ success: true, ...result });
    } catch (error) {
        // Deliberately surfaced verbatim. Unlike password login there is no
        // account-existence secret here — a code is sent to whatever address
        // is typed, whether or not it has an account — so the only errors
        // possible are a malformed address or the rate limit, and both are
        // things the customer needs told plainly.
        res.status(400).json({ success: false, message: error.message });
    }
}

async function verifyOtp(req, res) {
    try {
        const session = await otpService.verifyOtp(
            {
                email: req.body?.email,
                code: req.body?.code,
                mobileNumber: req.body?.mobileNumber,
                firstName: req.body?.firstName
            },
            requestContext(req)
        );
        sendSession(res, session);
    } catch (error) {
        res.status(401).json({ success: false, message: error.message });
    }
}

module.exports = {
    register,
    requestOtp,
    verifyOtp,
    login,
    google,
    refresh,
    me,
    logout,
    logoutAll
};
