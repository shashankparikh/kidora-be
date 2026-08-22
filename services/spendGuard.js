const aiUsageStore = require("../db/aiUsageStore");
const { sendEmail } = require("./emailService");
const { dailySpendCapAlert } = require("./emailTemplates");

// Distinguishable from a transient provider error so callers with a retry
// loop (illustrationService) can recognize "the cap is reached, stop
// retrying" instead of burning through retry attempts that will just hit
// the same wall.
class DailyCapError extends Error {}

// Every call to OpenAI/Gemini in this app costs real money and the
// generation routes are intentionally unauthenticated (see BACKLOG.md
// P0.2) — this is the backstop that makes the worst case bounded instead
// of open-ended. It counts *calls*, not dollars: exact per-call cost
// drifts as provider pricing changes, and a call-count ceiling is a
// simpler, harder-to-get-wrong proxy for "stop before this gets
// expensive." Tune AI_DAILY_GENERATION_CAP to whatever daily call volume
// your budget can absorb. Deliberately not `... || 200` — that treats an
// explicit 0 (a legitimate "stop all generation" kill switch) the same as
// unset, and silently reopens the cap to 200 instead of shutting it down.
const envCap = process.env.AI_DAILY_GENERATION_CAP;
const DAILY_CAP = envCap !== undefined && envCap !== "" ? Number(envCap) : 200;

// Fire-and-forget, once per day — see BACKLOG.md P2.1 ("no alerting on API
// spend"). Every one of the (potentially many) requests rejected for the
// rest of the day would otherwise each try to send their own alert; the
// alerted_at flag on today's ai_usage row makes this a single notification.
function alertCapReachedOnce() {

    if (!process.env.ALERT_EMAIL || aiUsageStore.hasAlertedToday()) {
        return;
    }

    aiUsageStore.markAlertedToday();

    const { subject, html } = dailySpendCapAlert({
        cap: DAILY_CAP,
        date: new Date().toISOString().slice(0, 10)
    });

    sendEmail({ to: process.env.ALERT_EMAIL, subject, html });

}

// Call once immediately before any AI provider call (character analysis,
// story generation, each illustration attempt — including retries, since
// a retried attempt still costs the provider call). Throws and makes no
// provider call at all once the day's cap is reached — fails closed.
function assertWithinDailyCap() {

    const usedToday = aiUsageStore.getTodayCount();

    if (usedToday >= DAILY_CAP) {
        alertCapReachedOnce();
        throw new DailyCapError(
            "Daily generation limit reached. Please try again tomorrow."
        );
    }

    aiUsageStore.incrementToday();

}

module.exports = {
    assertWithinDailyCap,
    DailyCapError
};
