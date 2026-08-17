// Server-side confirmation of the "purchase" GA4 event, sent via the
// Measurement Protocol (https://www.google-analytics.com/mp/collect).
// This is deliberately redundant with the client-side "purchase" event
// fired from Kidora-fe's ordersSaga right after the order API call
// succeeds — the client-side event can be dropped by ad blockers or a
// closed tab before it flushes, so this server-confirmed copy is what
// keeps the purchase count in GA4 trustworthy.
//
// GA_MEASUREMENT_ID / GA_API_SECRET come from the GA4 property's Admin >
// Data Streams > (web stream) > Measurement Protocol API secrets. The API
// secret must never be exposed client-side — that's the whole reason this
// call lives here instead of just relying on gtag.js in the browser.

const MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID;
const API_SECRET = process.env.GA_API_SECRET;
const ENDPOINT = "https://www.google-analytics.com/mp/collect";

// clientId ties this event to the same GA4 client as the browser's
// gtag.js events — it's the _ga cookie value, sourced client-side via
// getGaClientId() and passed through the order-creation request body.
// Falls back to a synthetic id when it's missing (e.g. a first-party
// cookie blocked by the browser) so the event still lands in GA4,
// just not stitched to a specific browsing session.
async function sendPurchaseEvent({ clientId, orderId, total, bookTitle, storyTheme }) {

    if (!MEASUREMENT_ID || !API_SECRET) {
        console.warn("GA_MEASUREMENT_ID/GA_API_SECRET not set — skipping server-side purchase event.");
        return;
    }

    try {

        const url = `${ENDPOINT}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`;

        const body = {
            client_id: clientId || `server.${orderId}`,
            events: [
                {
                    name: "purchase",
                    params: {
                        transaction_id: orderId,
                        value: Number(total) || 0,
                        currency: "INR",
                        items: [
                            {
                                item_id: orderId,
                                item_name: bookTitle || "Storybook",
                                item_category: storyTheme || undefined,
                                price: Number(total) || 0,
                                quantity: 1
                            }
                        ]
                    }
                }
            ]
        };

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            console.warn(`GA4 Measurement Protocol responded with ${response.status} for order ${orderId}.`);
        }

    } catch (error) {
        // Analytics failures must never block or fail order creation —
        // this is fire-and-forget best-effort reporting.
        console.warn("Failed to send GA4 server-side purchase event:", error.message);
    }

}

module.exports = {
    sendPurchaseEvent
};
