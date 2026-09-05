const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const otpStore = require("../db/otpStore");
const userStore = require("../db/userStore");
const { issueSession, sendWelcomeEmail } = require("./authService");
const { sendEmail } = require("./emailService");
const { loginCodeEmail } = require("./emailTemplates");

const CODE_LENGTH = 6;
const TTL_MINUTES = 10;

// Wrong guesses allowed against a single code before it is burned. Six
// digits is a million possibilities, so five guesses is generous security-
// wise and forgiving of typos.
const MAX_ATTEMPTS = 5;

// Codes requestable per address per hour. This bounds both inbox spam
// aimed at a stranger's address and an attacker cycling codes to widen
// their guessing surface.
const MAX_PER_HOUR = 5;

// A bcrypt hash of a value nothing will ever match, compared against when
// no live code exists. Without it, "no code was requested" would return
// noticeably faster than "wrong code", and that timing difference tells an
// attacker which addresses have a sign-in underway.
const DUMMY_HASH = bcrypt.hashSync("no-such-code", 10);

function normalise(email) {
    return (email || "").trim().toLowerCase();
}

// crypto.randomInt, not Math.random: this is a credential, and Math.random
// is a predictable PRNG. Padded so every code is exactly six digits —
// otherwise a leading zero would silently produce a five-digit code.
function generateCode() {
    return String(crypto.randomInt(0, 10 ** CODE_LENGTH))
        .padStart(CODE_LENGTH, "0");
}

async function requestOtp({ email, ipAddress }) {

    const address = normalise(email);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
        throw new Error("Please enter a valid email address.");
    }

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recent = await otpStore.countRecentFor(address, since);

    if (recent >= MAX_PER_HOUR) {
        throw new Error(
            "Too many codes requested for this address. Please try again later."
        );
    }

    const code = generateCode();

    await otpStore.createOtp({
        email: address,
        codeHash: await bcrypt.hash(code, 10),
        expiresAt: new Date(Date.now() + TTL_MINUTES * 60 * 1000).toISOString(),
        ipAddress
    });

    const { subject, html } = loginCodeEmail({ code, minutes: TTL_MINUTES });

    // Awaited AND checked, unlike every other email in this app. Elsewhere
    // email is a courtesy and emailService's swallow-and-log behaviour is
    // right; here the email IS the credential, and reporting success for a
    // send that failed leaves the customer staring at a code box waiting for
    // something that was never sent.
    //
    // emailService never throws — it returns { skipped: true } both when the
    // API key is missing and when the provider rejects the send — so the
    // return value has to be inspected rather than trusted.
    const delivery = await sendEmail({ to: address, subject, html });

    if (delivery?.skipped) {
        console.error(
            `[otpService] could not deliver a sign-in code to ${address}: ${delivery.error || "email is not configured"}`
        );
        throw new Error(
            "We couldn't send the code right now. Please try again, or continue with Google."
        );
    }

    return { email: address, expiresInMinutes: TTL_MINUTES };

}

async function verifyOtp({ email, code, mobileNumber, firstName }, context = {}) {

    const address = normalise(email);
    const supplied = String(code || "").trim();

    const live = await otpStore.liveOtpsFor(address);
    const usable = live.filter((row) => row.attempts < MAX_ATTEMPTS);

    if (usable.length === 0) {
        // Constant-ish time regardless of whether a code exists.
        await bcrypt.compare(supplied, DUMMY_HASH);
        throw new Error("That code is invalid or has expired.");
    }

    let matched = null;

    for (const row of usable) {
        if (await bcrypt.compare(supplied, row.code_hash)) {
            matched = row;
            break;
        }
    }

    if (!matched) {

        await Promise.all(usable.map((row) => otpStore.recordAttempt(row.id)));

        // Somebody is guessing. Burn every live code for the address —
        // including the real customer's, who can request a fresh one.
        if (usable.every((row) => row.attempts + 1 >= MAX_ATTEMPTS)) {
            await otpStore.invalidateAllFor(address);
            throw new Error(
                "Too many incorrect attempts. Please request a new code."
            );
        }

        throw new Error("That code is invalid or has expired.");

    }

    // Burn ALL live codes, not just the one used: any other outstanding code
    // for this address is now spent too, so a second email cannot be replayed.
    await otpStore.invalidateAllFor(address);

    let user = await userStore.getUserByEmail(address);
    let isNew = false;

    if (!user) {

        // Reaching a code at this address IS the verification, so the
        // address is trusted from the moment it is used.
        user = await userStore.createUser({
            email: address,
            firstName: firstName || null,
            mobileNumber: mobileNumber || null,
            emailVerified: true
        });

        isNew = true;
        sendWelcomeEmail(user);

    } else {

        const updates = {};
        if (!user.email_verified) updates.emailVerified = true;
        // Only fills a blank. An existing number is the customer's own, and
        // a sign-in form is not where it should be silently overwritten.
        if (mobileNumber && !user.mobile_number) updates.mobileNumber = mobileNumber;

        if (Object.keys(updates).length > 0) {
            user = await userStore.updateUser(user.id, updates);
        }

    }

    const session = await issueSession(user, context);

    return { ...session, isNew };

}

// Expired rows are dead weight and every sign-in attempt writes one.
async function purgeExpired() {
    return otpStore.deleteExpiredBefore(new Date().toISOString());
}

module.exports = {
    requestOtp,
    verifyOtp,
    purgeExpired,
    MAX_ATTEMPTS,
    TTL_MINUTES
};
