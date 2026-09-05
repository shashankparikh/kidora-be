const { all, run } = require("./database");
const { EXPECTED_PAGE_COUNT } = require("../services/ai/storySchema");

// Operator-editable settings, defined here rather than accepted freeform from
// the admin console. An unknown key is rejected: without this a typo in the
// UI would write a row nobody reads, and the setting would silently appear to
// have been saved.
const SCHEMA = {
    preview_mode: {
        // web   — generate the preview while the visitor waits, show it in
        //         the browser as soon as it lands.
        // email — hand the visitor back to their day immediately and email a
        //         link when the pages are ready.
        values: ["web", "email"],
        fallback: "web",
        parse: (v) => v,
        validate: (v) =>
            ["web", "email"].includes(v) ||
            "preview_mode must be 'web' or 'email'"
    },
    preview_page_count: {
        fallback: 4,
        parse: (v) => Number(v),
        validate: (v) => {
            const n = Number(v);
            if (!Number.isInteger(n)) return "preview_page_count must be a whole number";
            if (n < 1) return "preview_page_count must be at least 1";
            // The story generator produces exactly EXPECTED_PAGE_COUNT pages,
            // so asking for more would silently render fewer and look like a
            // bug rather than a misconfiguration.
            if (n > EXPECTED_PAGE_COUNT)
                return `preview_page_count cannot exceed ${EXPECTED_PAGE_COUNT} — a story only has that many pages`;
            return true;
        }
    }
};

// Read on every book creation, so it is cached — but the operator was
// promised the toggle "applies immediately", which a time-based cache cannot
// honour. Instead the cache is invalidated on write. That is exact rather
// than eventually-consistent, and correct here precisely because the service
// runs as a single container; if it is ever scaled out, this needs a TTL or
// a notify channel, and the comment should not be trusted as-is.
let cache = null;

function invalidate() {
    cache = null;
}

async function getSettings() {

    if (cache) {
        return cache;
    }

    const rows = await all("SELECT key, value FROM app_settings");
    const raw = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    const parsed = {};
    for (const [key, def] of Object.entries(SCHEMA)) {
        parsed[key] = key in raw ? def.parse(raw[key]) : def.fallback;
    }

    cache = parsed;
    return parsed;

}

// Validates every key BEFORE writing any of them, so a bad value in one field
// cannot leave the others half-applied.
async function updateSettings(updates, updatedBy = null) {

    const entries = Object.entries(updates);

    if (entries.length === 0) {
        throw new Error("No settings supplied.");
    }

    for (const [key, value] of entries) {
        const def = SCHEMA[key];
        if (!def) {
            throw new Error(`Unknown setting: ${key}`);
        }
        const result = def.validate(value);
        if (result !== true) {
            throw new Error(result);
        }
    }

    const now = new Date().toISOString();

    for (const [key, value] of entries) {
        await run(
            `INSERT INTO app_settings (key, value, updated_at, updated_by)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (key)
             DO UPDATE SET value = $2, updated_at = $3, updated_by = $4`,
            [key, String(value), now, updatedBy]
        );
    }

    invalidate();

    return getSettings();

}

module.exports = {
    SCHEMA,
    getSettings,
    updateSettings,
    invalidate
};
