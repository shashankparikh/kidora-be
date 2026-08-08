const { Resend } = require("resend");

const client = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Kidora <onboarding@resend.dev>";

// Every caller in this app treats email as best-effort — a failed send
// should never fail the request it's attached to (signup, story
// generation, newsletter signup all succeed independently of email
// delivery). Missing RESEND_API_KEY is treated the same way: log and
// move on, so the app runs fine in an environment with no key configured.
async function sendEmail({ to, subject, html }) {

    if (!client) {

        console.log(
            `[emailService] RESEND_API_KEY not set — skipping email "${subject}" to ${to}`
        );

        return { skipped: true };

    }

    try {

        const result = await client.emails.send({
            from: FROM_EMAIL,
            to,
            subject,
            html
        });

        if (result.error) {
            throw new Error(result.error.message || "Resend returned an error.");
        }

        console.log(`[emailService] Sent "${subject}" to ${to}`);

        return result;

    } catch (error) {

        console.error(`[emailService] Failed to send "${subject}" to ${to}:`, error.message);

        return { skipped: true, error: error.message };

    }

}

module.exports = {
    sendEmail
};
