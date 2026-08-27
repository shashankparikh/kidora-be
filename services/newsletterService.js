const newsletterStore = require("../db/newsletterStore");
const { sendEmail } = require("./emailService");
const { newsletterConfirmationEmail } = require("./emailTemplates");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APP_URL = process.env.FRONTEND_URL || "http://localhost:5173";

async function subscribe(email) {

    const trimmed = (email || "").trim().toLowerCase();

    if (!EMAIL_PATTERN.test(trimmed)) {
        throw new Error("Please enter a valid email address.");
    }

    const result = await newsletterStore.subscribe(trimmed);

    const { subject, html } = newsletterConfirmationEmail({ appUrl: APP_URL });

    // Best-effort — emailService itself never throws, so this can't fail
    // the subscription.
    await sendEmail({ to: trimmed, subject, html });

    return result;

}

module.exports = {
    subscribe
};
