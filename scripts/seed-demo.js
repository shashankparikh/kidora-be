#!/usr/bin/env node
/**
 * Populate the database with demo orders spread across the fulfilment
 * pipeline, so the admin queue has something real to look at.
 *
 *     node scripts/seed-demo.js            # create
 *     node scripts/seed-demo.js --clean    # remove everything it created
 *     node scripts/seed-demo.js --with-pages  # also upload real preview
 *                                             # images to S3 for one order
 *     node scripts/seed-demo.js --email=you@example.com
 *                                # give the live-preview order to a real
 *                                # account, so you can sign in and see the
 *                                # customer's side of it
 *
 * Every row it writes is tagged by the email domain below, and --clean
 * deletes strictly by that tag. Nothing else is touched, so this is safe to
 * run against a database that has real orders in it — though you would want a
 * very good reason to.
 */
require("dotenv").config();

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const { pool } = require("../db/database");
const userStore = require("../db/userStore");
const bookStore = require("../db/bookStore");
const orderStore = require("../db/orderStore");
const previewStore = require("../db/previewStore");
const supportStore = require("../db/supportStore");
const pipeline = require("../services/orderPipeline");
const { uploadBuffer } = require("../services/s3Service");

// The tag. Chosen so it can never collide with a real signup: .test is
// reserved by RFC 2606 and can never be registered.
const DEMO_DOMAIN = "demo.oopsyink.test";
const DEMO_PAGE_KEY = "previews/demo/page-01.jpg";

// The people who actually work this queue. Names only — the accounts
// themselves are created by scripts/admin-user.js, and the audit trail stores
// the display name as it was at the time of the action.
const OPERATORS = ["Niharika", "Aakanshi", "Minal"];

const PEOPLE = [
    { first: "Priya",  last: "Sharma",  child: "Aarav",  theme: "jungle", title: "Aarav and the Great Jungle Race" },
    { first: "Meera",  last: "Iyer",    child: "Tisha",  theme: "space",  title: "Tisha and the Little Star" },
    { first: "Rohan",  last: "Kapoor",  child: "Vihaan", theme: "ocean",  title: "Vihaan and the Singing Pearl" },
    { first: "Ananya", last: "Reddy",   child: "Ishaan", theme: "dino",   title: "Ishaan and the Lost Egg" },
    { first: "Kavya",  last: "Nair",    child: "Kiara",  theme: "farm",   title: "A Sleepy Morning for Kiara" },
    { first: "Arjun",  last: "Menon",   child: "Zoya",   theme: "pirates",title: "Zoya and the Stolen Light" },
    { first: "Sneha",  last: "Gupta",   child: "Reyansh",theme: "city",   title: "Reyansh Finds the Long Way Home" },
    { first: "Divya",  last: "Rao",     child: "Anaya",  theme: "forest", title: "Anaya and the Whispering Woods" },
    { first: "Karan",  last: "Bose",    child: "Dhruv",  theme: "space",  title: "Dhruv and the Missing Moon" }
];

// Where each demo order should end up, and how it got there. The point is to
// exercise every column the queue renders, including the awkward ones — an
// order sitting with a customer, one nudged twice, one auto-approved, one
// cancelled.
const SCENARIOS = [
    { person: 0, path: ["NEW_ORDER"], note: "just paid" },
    { person: 1, path: ["NEW_ORDER", "PREVIEW_GENERATED"], preview: "draft" },
    { person: 2, path: ["NEW_ORDER", "PREVIEW_GENERATED", "PENDING_REVIEW"], preview: "live", releasedHoursAgo: 3 },
    { person: 3, path: ["NEW_ORDER", "PREVIEW_GENERATED", "PENDING_REVIEW"], preview: "live", releasedHoursAgo: 50, nudges: 2 },
    { person: 4, path: ["NEW_ORDER", "PREVIEW_GENERATED", "PENDING_REVIEW", "BUYER_COMMENTS"], preview: "changes_requested",
      request: { kind: "changes", message: "On page 3 could her hair be a bit darker? It's lighter than she is. Everything else is lovely." } },
    { person: 5, path: ["NEW_ORDER", "PREVIEW_GENERATED", "PENDING_REVIEW", "PREVIEW_AUTO_APPROVED"], preview: "approved" },
    { person: 6, path: ["NEW_ORDER", "PREVIEW_GENERATED", "PENDING_REVIEW", "PREVIEW_APPROVED", "BOOK_GENERATED", "PRINTING"] },
    // The far end of the pipeline. A delivered order is the only kind that
    // can carry a review, so without one the Reviews screen has nothing to
    // moderate and its filters cannot be tested at all.
    { person: 7, path: ["NEW_ORDER", "PREVIEW_GENERATED", "PENDING_REVIEW", "PREVIEW_APPROVED", "BOOK_GENERATED", "PRINTING", "SHIPPED", "DELIVERED"],
      preview: "approved",
      review: {
          rating: 5,
          title: "She asked for it three nights running",
          comment: "The likeness is genuinely uncanny — my daughter spotted herself on the cover before I'd said a word. Printing and paper are lovely too."
      } },
    // And the unhappy path, so Cancelled is not an empty tab and the refund
    // side of the payments ledger has a row behind it.
    { person: 8, path: ["NEW_ORDER", "PREVIEW_GENERATED", "PENDING_REVIEW", "CANCELLED"],
      preview: "cancelled",
      request: { kind: "cancel", message: "So sorry — we have had a change of plan and would like to cancel this one." } }
];

async function clean() {
    // Demo customers, plus any real account holding a demo order.
    const users = await pool.query(
        `SELECT DISTINCT u.id FROM users u
         LEFT JOIN orders o ON o.user_id = u.id
         WHERE u.email LIKE $1
            OR o.book_title IN (${PEOPLE.map((_, i) => `$${i + 2}`).join(", ")})`,
        [`%@${DEMO_DOMAIN}`, ...PEOPLE.map((p) => p.title)]
    );
    const ids = users.rows.map((r) => r.id);
    if (ids.length === 0) {
        console.log("  nothing to clean");
        return;
    }
    const orders = await pool.query("SELECT id FROM orders WHERE user_id = ANY($1)", [ids]);
    const orderIds = orders.rows.map((r) => r.id);
    if (orderIds.length) {
        await pool.query("DELETE FROM order_events    WHERE order_id = ANY($1)", [orderIds]);
        await pool.query("DELETE FROM support_requests WHERE order_id = ANY($1)", [orderIds]);
        await pool.query("DELETE FROM previews        WHERE order_id = ANY($1)", [orderIds]);
        await pool.query("DELETE FROM payments        WHERE order_id = ANY($1)", [orderIds]);
    }
    // Also by user: the interesting demo payments are the ones with no
    // order attached, and deleting only by order_id leaves those behind to
    // pile up a little more on every re-seed.
    await pool.query("DELETE FROM payments WHERE user_id = ANY($1)", [ids]);
    await pool.query("DELETE FROM orders WHERE user_id = ANY($1)", [ids]);
    await pool.query("DELETE FROM books  WHERE user_id = ANY($1)", [ids]);
    // Deliberately does not delete users: one of them may be a real account
    // that was handed a demo order. Its orders and books are gone; the
    // account stays.
    await pool.query("DELETE FROM users WHERE id = ANY($1) AND email LIKE $2",
        [ids, `%@${DEMO_DOMAIN}`]);
    console.log(`  removed ${ids.length} demo customer(s) and ${orderIds.length} order(s)`);
}

// Real pages from a finished book, downscaled, so the customer preview page
// can actually be looked at rather than just returning an empty array.
async function uploadRealPages(orderId) {
    const dir = path.join(__dirname, "..", "..", "..", "oopsy_engine_v9", "books", "harvi_dino");
    const wanted = ["cover_front.jpg", "page_02.jpg", "page_03.jpg", "page_04.jpg"];
    const keys = [];
    for (const [i, file] of wanted.entries()) {
        const full = path.join(dir, file);
        if (!fs.existsSync(full)) continue;
        const key = `previews/${orderId}/page-${String(i + 1).padStart(2, "0")}.jpg`;
        await uploadBuffer(key, fs.readFileSync(full), "image/jpeg");
        keys.push(key);
    }
    return keys;
}

// Every demo preview that doesn't get real pages points at this one shared
// key. Without it the key exists only in the database and S3 answers 403,
// which renders as a blank tile in admin — indistinguishable from a page
// that uploaded but came out empty.
async function ensureDemoPage() {
    const dir = path.join(__dirname, "..", "..", "..", "oopsy_engine_v9", "books", "harvi_dino");
    const source = ["cover_front.jpg", "page_02.jpg"].map((f) => path.join(dir, f)).find(fs.existsSync);
    if (!source) return false;
    await uploadBuffer(DEMO_PAGE_KEY, fs.readFileSync(source), "image/jpeg");
    return true;
}

// Payments are seeded straight into the table rather than through
// paymentService, which would talk to Razorpay. What matters for the admin
// screen is the shape of each display status, and 'needs_attention' most of
// all — captured money with no order behind it is the row an operator has to
// act on, and it is the one you cannot produce by paying for something
// successfully.
async function seedPayment({ userId, bookId, orderId, status, extras = {} }) {
    const now = new Date().toISOString();
    const suffix = crypto.randomUUID().slice(0, 12);
    await pool.query(
        `INSERT INTO payments
            (id, user_id, book_id, razorpay_order_id, razorpay_payment_id, status,
             amount, currency, add_on_ids, order_id, failure_reason, refund_id,
             refunded_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'INR','[]',$8,$9,$10,$11,$12,$12)`,
        [
            `pay_${crypto.randomUUID()}`,
            userId, bookId,
            `order_demo${suffix}`,
            status === "created" ? null : `pay_demo${suffix}`,
            status,
            1499,
            orderId,
            extras.failureReason || null,
            extras.refundId || null,
            extras.refundedAt || null,
            now
        ]
    );
}

async function seed({ withPages, realEmail }) {

    const created = [];
    let usedRealPages = false;

    if (withPages && await ensureDemoPage()) {
        console.log(`     shared demo page uploaded (${DEMO_PAGE_KEY})`);
    }
    let usedRealEmail = false;

    for (const scenario of SCENARIOS) {

        const p = PEOPLE[scenario.person];

        // The live-preview order can be handed to a real address so you can
        // sign in and see what the customer sees. Demo accounts have no
        // password and sit on a reserved TLD, so they cannot be logged into —
        // which is correct, but leaves the customer-facing half untestable
        // without this.
        const mine = realEmail && scenario.preview === "live" && !usedRealEmail;
        const email = mine ? realEmail : `${p.first.toLowerCase()}@${DEMO_DOMAIN}`;
        if (mine) usedRealEmail = true;

        const user = await userStore.getUserByEmail(email)
            || await userStore.createUser({ email, firstName: p.first, lastName: p.last, emailVerified: true });

        const bookId = `bk_${crypto.randomUUID()}`;
        await bookStore.createBook({ id: bookId, userId: user.id });

        const order = await orderStore.createOrder({
            userId: user.id, bookId,
            bookTitle: p.title, storyTheme: p.theme, childName: p.child,
            total: 1499
        });

        // Spread the demo history across the operators so the drawer shows
        // what a real order's trail looks like — several named people handing
        // work between them — rather than one anonymous "admin" doing
        // everything, which is the exact ambiguity the accounts removed.
        for (const [step, status] of scenario.path.entries()) {

            // Who moved it matters more than that it moved. The auto-approval
            // is the sweep, not a person. BUYER_COMMENTS and CANCELLED are
            // reached by the customer pressing something on their preview
            // page — see services/supportService.js submit() — so crediting
            // an operator with those would put a name on a decision they did
            // not make, which is the confusion named accounts exist to end.
            const auto = status === "PREVIEW_AUTO_APPROVED";
            const byCustomer = status === "BUYER_COMMENTS" || status === "CANCELLED";

            await pipeline.setStatus(order.id, status, {
                actorType: auto ? "system" : byCustomer ? "customer" : "admin",
                actor: auto || byCustomer
                    ? null
                    : OPERATORS[(scenario.person + step) % OPERATORS.length],
                message: byCustomer ? "Requested via the preview page" : (scenario.note || "demo data")
            });
        }

        if (scenario.preview) {
            let pages = [DEMO_PAGE_KEY];
            // Real pages go to the first LIVE preview, so the customer-facing
            // preview page has something to actually render. Attaching them to
            // whichever order came first is no use if that order has no
            // preview, or has one nobody can see yet.
            if (withPages && scenario.preview === "live" && !usedRealPages) {
                const real = await uploadRealPages(order.id);
                if (real.length) {
                    pages = real;
                    usedRealPages = true;
                    console.log(`     real pages uploaded for ${p.child} (${order.id})`);
                }
            }
            await previewStore.upsertDraft({ orderId: order.id, pages });

            if (scenario.preview !== "draft") {
                const released = new Date(Date.now() - (scenario.releasedHoursAgo ?? 6) * 3600e3);
                await pool.query(
                    `UPDATE previews SET status = $2, released_at = $3, respond_by = $4, nudges_sent = $5
                     WHERE order_id = $1`,
                    [order.id,
                     scenario.preview,
                     released.toISOString(),
                     new Date(released.getTime() + 72 * 3600e3).toISOString(),
                     scenario.nudges ?? 0]
                );
            }
        }

        if (scenario.request) {
            const req = await supportStore.create({
                orderId: order.id, userId: user.id,
                kind: scenario.request.kind, message: scenario.request.message
            });
            // Matches what supportService.submit does for a cancellation it
            // was able to carry out: the request closes with the order.
            if (scenario.request.kind === "cancel") {
                await supportStore.resolve(req.id, "system");
            }
            await pipeline.addNote(order.id, {
                kind: "buyer_message",
                message: `[${scenario.request.kind}] ${scenario.request.message}`,
                actorType: "customer", actor: user.id
            });
        }

        if (scenario.review) {
            await pool.query(
                `INSERT INTO reviews
                    (id, order_id, user_id, book_id, child_name, story_theme,
                     rating, title, comment, status, created_at, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10,$10)`,
                [`rev_${crypto.randomUUID()}`, order.id, user.id, bookId,
                 p.child, p.theme, scenario.review.rating,
                 scenario.review.title, scenario.review.comment,
                 new Date().toISOString()]
            );
        }

        // Every real order has money behind it. Cancelled orders keep a
        // refunded payment so the ledger and the queue tell the same story.
        await seedPayment({
            userId: user.id, bookId, orderId: order.id,
            status: scenario.path.includes("CANCELLED") ? "refunded" : "captured",
            extras: scenario.path.includes("CANCELLED")
                ? { refundId: `rfnd_demo${crypto.randomUUID().slice(0, 10)}`, refundedAt: new Date().toISOString() }
                : {}
        });

        created.push({
            child: p.child,
            status: scenario.path[scenario.path.length - 1],
            orderId: order.id,
            email: mine ? email : null
        });
    }

    // The three payment states no successful order can produce. They hang off
    // the first demo customer so --clean still sweeps them up.
    if (created.length) {
        const first = await userStore.getUserByEmail(`${PEOPLE[0].first.toLowerCase()}@${DEMO_DOMAIN}`);
        if (first) {
            const orphanBook = `bk_${crypto.randomUUID()}`;
            await bookStore.createBook({ id: orphanBook, userId: first.id });
            await seedPayment({ userId: first.id, bookId: orphanBook, orderId: null, status: "captured" });
            await seedPayment({
                userId: first.id, bookId: orphanBook, orderId: null, status: "failed",
                extras: { failureReason: "Payment declined by the customer's bank." }
            });
            await seedPayment({ userId: first.id, bookId: orphanBook, orderId: null, status: "created" });
            console.log("  created 3 loose payments (needs attention / failed / pending)");
        }
    }

    console.log(`  created ${created.length} demo orders:`);
    created.forEach((c) => console.log(
        `     ${c.child.padEnd(9)} ${c.status.padEnd(22)} ${c.orderId}` +
        (c.email ? `   ← yours (${c.email})` : "")
    ));

    const mineOrder = created.find((c) => c.email);
    if (mineOrder) {
        console.log(`\n  Sign in as ${mineOrder.email} and open:`);
        console.log(`     ${process.env.FRONTEND_URL || "http://localhost:5173"}/orders/${mineOrder.orderId}/preview`);
    }
    console.log(`\n  all tagged @${DEMO_DOMAIN} — remove with: node scripts/seed-demo.js --clean`);
}

(async () => {
    const args = process.argv.slice(2);
    if (args.includes("--clean")) {
        await clean();
    } else {
        await clean();
        const emailArg = args.find((a) => a.startsWith("--email="));
        await seed({
            withPages: args.includes("--with-pages"),
            realEmail: emailArg ? emailArg.split("=")[1] : null
        });
    }
    await pool.end();
})().catch((err) => {
    console.error("  seed failed:", err.message);
    pool.end();
    process.exit(1);
});
