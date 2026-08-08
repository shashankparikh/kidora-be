const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");

const userStore = require("../db/userStore");
const {
    signAccessToken,
    generateRefreshToken,
    hashRefreshToken,
    refreshExpiryDate
} = require("../utils/tokens");
const { sendEmail } = require("./emailService");
const { welcomeEmail } = require("./emailTemplates");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const APP_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Fire-and-forget — a slow/failed welcome email should never delay or
// fail the signup response. emailService itself never throws.
function sendWelcomeEmail(user) {

    const { subject, html } = welcomeEmail({
        name: user.first_name || user.firstName,
        appUrl: APP_URL
    });

    sendEmail({ to: user.email, subject, html });

}

const PASSWORD_MIN_LENGTH = 8;

function issueSession(userRow, { userAgent, ipAddress } = {}) {

    const publicUser = userStore.toPublicUser(userRow);

    const accessToken = signAccessToken(publicUser);
    const refreshToken = generateRefreshToken();

    userStore.createRefreshSession({
        userId: userRow.id,
        refreshTokenHash: hashRefreshToken(refreshToken),
        userAgent,
        ipAddress,
        expiresAt: refreshExpiryDate()
    });

    return { user: publicUser, accessToken, refreshToken };

}

async function register({ email, password, firstName, lastName, mobileNumber }, context) {

    if (!email || !password) {
        throw new Error("Email and password are required.");
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
        throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
    }

    const existing = userStore.getUserByEmail(email);
    if (existing) {
        throw new Error("An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = userStore.createUser({
        email,
        firstName,
        lastName,
        mobileNumber,
        passwordHash
    });

    userStore.createAuthAccount({
        userId: user.id,
        provider: "password",
        providerAccountId: user.email
    });

    sendWelcomeEmail(user);

    return issueSession(user, context);

}

async function login({ email, password }, context) {

    if (!email || !password) {
        throw new Error("Email and password are required.");
    }

    const user = userStore.getUserByEmail(email);

    if (!user || !user.password_hash) {
        throw new Error("Invalid email or password.");
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
        throw new Error("Invalid email or password.");
    }

    return issueSession(user, context);

}

async function loginWithGoogle({ idToken }, context) {

    if (!idToken) {
        throw new Error("Missing Google ID token.");
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
        throw new Error(
            "Google sign-in isn't configured yet (GOOGLE_CLIENT_ID is not set)."
        );
    }

    const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    if (!payload?.email) {
        throw new Error("Google account has no email on file.");
    }

    let account = userStore.findAuthAccount({
        provider: "google",
        providerAccountId: payload.sub
    });

    let user = account ? userStore.getUserById(account.user_id) : null;

    if (!user) {
        // No Google account on file yet — fall back to matching a verified
        // email so someone who registered with a password can also sign
        // in with the same Google account instead of getting a duplicate.
        user = userStore.getUserByEmail(payload.email);
    }

    if (!user) {

        const [firstName, ...rest] = (payload.name ?? "").split(" ");

        user = userStore.createUser({
            email: payload.email,
            firstName: firstName || null,
            lastName: rest.join(" ") || null,
            avatarUrl: payload.picture ?? null,
            emailVerified: Boolean(payload.email_verified)
        });

        sendWelcomeEmail(user);

    }

    if (!account) {
        userStore.createAuthAccount({
            userId: user.id,
            provider: "google",
            providerAccountId: payload.sub
        });
    }

    if (payload.picture && payload.picture !== user.avatar_url) {
        user = userStore.updateUser(user.id, { avatarUrl: payload.picture });
    }

    return issueSession(user, context);

}

function refresh(refreshToken, context) {

    if (!refreshToken) {
        throw new Error("Missing refresh token.");
    }

    const tokenHash = hashRefreshToken(refreshToken);
    const session = userStore.findRefreshSessionByHash(tokenHash);

    if (!session || session.revoked_at || new Date(session.expires_at) < new Date()) {
        throw new Error("Session expired. Please log in again.");
    }

    const user = userStore.getUserById(session.user_id);

    if (!user) {
        throw new Error("Session expired. Please log in again.");
    }

    // Rotate: the old refresh token is single-use.
    userStore.revokeRefreshSession(session.id);

    return issueSession(user, context);

}

function logout(refreshToken) {

    if (!refreshToken) {
        return;
    }

    const session = userStore.findRefreshSessionByHash(hashRefreshToken(refreshToken));

    if (session) {
        userStore.revokeRefreshSession(session.id);
    }

}

function logoutAll(userId) {
    userStore.revokeAllRefreshSessionsForUser(userId);
}

module.exports = {
    register,
    login,
    loginWithGoogle,
    refresh,
    logout,
    logoutAll
};
