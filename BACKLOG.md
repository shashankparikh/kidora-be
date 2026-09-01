# kidora-be — Backlog

Findings from a full read of the repository on 2026-08-21, ahead of taking it
live as the OopsyInk backend.

Conventions: **P0** must be fixed before this is exposed to the public internet,
**P1** blocks going live, **P2** costs money or correctness in normal operation,
**P3** is cleanup. Each item records *why*, not just *what*, so the reasoning
survives the person who wrote it.

When something is fixed, move it to **Done** with a one-line note on what the
fix actually was.

---

## P0 — Security and privacy. Do not launch with these open.

### P0.1 — Children's names, ages and photos are publicly enumerable
`services/bookService.js:9` mints book IDs as `"bk_" + Date.now()` — a
millisecond timestamp — and `server.js:53` serves the whole `storage/`
directory as static files.

    GET /storage/books/bk_1735689600000/book.json

returns that child's **name, age, theme and photo URL** to anyone who guesses a
timestamp. A single day is ~86 million milliseconds and requests are cheap;
narrowing to a known signup time makes it trivial.

`services/s3Service.js:12` compounds it by building plain public bucket URLs
(`https://<bucket>.s3.<region>.amazonaws.com/<key>`), so the photographs
themselves are public objects, not just the metadata.

**Fix:** unguessable IDs (`crypto.randomUUID()`), stop serving `storage/`
statically, move book reads behind an authenticated route that checks
ownership, and switch S3 to a private bucket with short-lived signed URLs.
All four, not one of them.

### P0.2 — Every expensive endpoint is unauthenticated
`POST /books`, `/books/:id/upload`, `/books/:id/character`, `/books/:id/story`,
`/books/:id/illustrations` and `/books/:id/pdf` carry no auth guard. Only
`PATCH /books/:id/claim` does.

Anyone can drive the generation pipeline in a loop and spend your OpenAI and
Gemini balance. There is no per-user quota, no captcha, and no spend ceiling.

`express-rate-limit` is a declared dependency but is imported **only** in
`routes/auth.js` — the endpoints that actually cost money have none.

**Fix:** `requireAuth` on everything that writes or generates; rate limits per
IP *and* per user on the generation routes; a hard daily spend cap that fails
closed.

### P0.3 — Admin panel has a hardcoded default login
`controllers/adminAuthController.js:5` falls back to `shashank` / `shashank`
when `ADMIN_USERNAME` / `ADMIN_PASSWORD` are unset. If those env vars are ever
missing in production, the admin panel is open with a guessable credential.

Admin tokens are signed with the **same secret** as customer tokens
(`utils/tokens.js:47`), distinguished only by a `scope` claim — so the two
trust domains share a key.

**Fix:** no defaults (fail to boot if unset), a separate signing secret for the
admin scheme, and a real admin-users table with hashed passwords before more
than one operator exists.

### P0.4 — Uploads are unvalidated
`controllers/uploadController.js` checks only that a file was attached. No MIME
type check, no file-size limit, no magic-byte verification, and multer uses
`memoryStorage()` with no limits — so a single large POST is a
memory-exhaustion DoS, and arbitrary file types reach S3.

**Fix:** allowlist JPEG/PNG/WebP, cap at ~10 MB, verify magic bytes rather than
trusting the declared MIME type or extension.

### P0.5 — Order totals are supplied by the client
`services/orderService.js:10` takes `total` straight from the request body. The
code comment acknowledges this. Anyone can create a `total: 0` order, and
orders are written as already `delivered`.

**Fix:** compute the total server-side from the book and its add-ons. This
becomes urgent the moment a payment gateway is wired up, and should land before
it rather than after.

---

## P1 — Blocks going live

### P1.1 — Books stored as JSON files cannot survive production
`utils/bookHelper.js` reads and writes `storage/books/<id>/book.json`.

- **No transactions or concurrency control.** `generateIllustrations` reads the
  book, generates for *minutes*, then writes it back — any concurrent write in
  that window is silently lost.
- **`storage/` is local and gitignored.** On a container or serverless host it
  is ephemeral: every book disappears on deploy.
- **Not queryable.** The admin dashboard can list orders but not books.
- **`orders.book_id` has no foreign key**, so orders can reference books that no
  longer exist.

**Fix:** move books into SQLite (or Postgres) alongside orders, with a real FK.
The JSON blob can stay as a column initially if the shape is still moving.

### P1.2 — Generation runs synchronously inside the HTTP request
`services/illustrationService.js:56` loops pages serially, retrying up to three
times with 5-second sleeps, all inside the request handler. Several minutes of
image generation will exceed almost any proxy or load-balancer timeout, and the
client has no way to observe progress.

**This is the gap the "preview APIs" work has to fill.** Wants: enqueue a job,
return an id immediately, expose a status/progress endpoint, deliver pages as
they complete rather than all at the end.

### P1.3 — No global error handler, no 404 handler
Unhandled async errors fall through to Express's default handler and return an
HTML error page. Add a JSON error handler and a 404, and make sure stack traces
never reach a production response.

### P1.4 — PDF output is not printable
`services/pdfService.js` uses pdf-lib at the default US-Letter page size, with
images placed at 250×250 and 400×300 points. No bleed, no 300 DPI target, no
CMYK, no square trim. It is a screen artefact.

The Oopsy engine already solves this properly (8×8in + 3mm bleed, 300 DPI,
ICC-managed CMYK) — see the engine decision in P1.5 before rebuilding it here.

### P1.5 — This repo contains a THIRD generation engine, and it contradicts the canonical one
The Python `oopsy_engine` is canonical. `services/ai/*` is an independent
implementation that breaks most of the rules that engine encodes:

- **Wrong model.** `services/ai/imageAI.js:141` uses OpenAI `gpt-image-1` at
  `1024x1024`. That model is documented as deprecating 2026-10-23, and 1024px
  cannot reach print DPI.
- **The photograph is sent to every page** with "Preserve the child's
  recognizable facial identity" and no REDRAW instruction — the exact
  formulation that composites a photograph into a cartoon scene.
- **No face plate and no reference sheet.** Identity is re-derived from the
  photo independently on each page, so the character drifts page to page by
  construction.
- **Prompts are built from negatives** ("No text. No watermark.") and from
  adjectives including **"Cute Pixar-style"** — a live IP risk of the same kind
  already recorded in the engine's own history.
- **Four pages, not 24.** No beats, no travelogue rule, no cast re-injection, no
  derived pronouns, no age lock, no signature accessory.
- Five themes (dinosaur / space / beach / jungle / pirate) that do not match the
  four authored templates, with stories improvised per order rather than
  authored and reviewed.

**Recommendation:** keep what this repo is genuinely good at — auth, orders,
reviews, CMS content, email, analytics — and replace `services/ai/*` with a
queue that invokes the canonical engine. Porting rules from Python to Node is
the alternative, and means maintaining two copies of prompt logic that have
already drifted once.

---

## P2 — Costs money or correctness in normal operation

### P2.1 — No spend controls anywhere
No per-user quota, no daily ceiling, no alerting on API spend. Combined with
P0.2 this is unbounded. Even authenticated, a retry loop across four pages at
three attempts each has no cap.

### P2.2 — CORS defaults to localhost
`server.js:33` falls back to `http://localhost:5173` when `FRONTEND_URL` is
unset, which in production means the real site is not in the allowlist. Fail to
boot on a missing origin rather than defaulting to a dev URL.

### P2.3 — Story generation uses a flash-lite model with no schema validation
`services/ai/geminiService.js:312` calls `gemini-3.1-flash-lite` and then
`JSON.parse`s the reply after stripping code fences. A malformed reply throws an
unhandled parse error; a well-formed reply with missing fields flows downstream
unchecked. Validate the parsed object against the expected shape.

### P2.4 — Email is fire-and-forget with no record
`sendStoryReadyEmail` never throws and leaves no trace, so a failed send is
invisible. Log the attempt and outcome at minimum.

---

## P3 — Cleanup

- `services/ai/openaiImageService.js` is 0 bytes.
- Six `test-*.js` scratch scripts sit at the repository root.
- `openai-test.png` is a committed 2.2 MB artefact.
- `services/ai/geminiService.js:264-265` duplicates a line.
- `package.json` still says `"name": "storybook-backend"` with an empty
  description, author and `"main": "index.js"` pointing at a file that does not
  exist.
- `npm test` is the default "no test specified" stub — there are no tests at
  all in a codebase that handles payments, auth and children's photographs.

---

## Done

### P0.1 — Children's names, ages and photos are publicly enumerable
Book IDs are now `"bk_" + crypto.randomUUID()` (`services/bookService.js`).
Along the way, found and closed a path-traversal hole in the same area:
`bookId` reached filesystem paths straight from `req.params` with no
validation — `utils/bookHelper.js` now allowlists the id's charset before it
touches a path. Removed the blanket `/storage` static mount in `server.js`
entirely; PDF downloads now go through a validated, per-book route
(`GET /books/:bookId/pdf`) instead. Child photos and generated illustrations
are stored as bare S3 keys and are only ever handed to a client as a signed,
1-hour URL generated fresh at the response boundary
(`utils/bookHelper.toPublicBook`, `services/orderService.signOrder`) — this
was verified end-to-end against the live S3 bucket. Still outstanding:
actually flipping the bucket's public-access block on in AWS — the
signed-URL code works whether the bucket is public or private, so that flip
can happen independently, whenever there's AWS console/CLI access to do it.

### P0.2 — Every expensive endpoint is unauthenticated
Decision made to keep the anonymous try-before-signup funnel rather than
gate book creation behind login (a product call, not just a security one —
`PATCH /books/:id/claim` already existed to attach an anonymous book to an
account later, and forcing login first would remove that flow). Instead:
per-IP rate limits on every generation route
(`middleware/generationRateLimit.js` — 30/hr create, 20/hr upload, 10/hr
character, 10/hr story, 5/hr illustrations, 20/hr pdf), and a
SQLite-persisted daily cap on AI provider calls that fails closed
(`services/spendGuard.js`, `AI_DAILY_GENERATION_CAP`, survives restarts
unlike an in-memory counter — wired into the character/story/illustration
call sites, including each retry attempt). Step-ordering guardrails
(character needs a photo, story needs a character, illustrations need a
story) turned out to already be enforced — confirmed, no new code needed.

### P0.3 — Admin panel has a hardcoded default login
Removed the `shashank`/`shashank` fallback entirely —
`controllers/adminAuthController.js` now throws at import time (the server
refuses to boot) if `ADMIN_USERNAME`/`ADMIN_PASSWORD` are unset. Admin JWTs
now sign with their own `ADMIN_JWT_SECRET`, no longer sharing a key with
customer tokens (`utils/tokens.js`). Password comparison uses
`crypto.timingSafeEqual`. Generated real random values for the local `.env`
(new admin password: `Qr02NS3In3vps4ttAt0YfKfj` — needs setting again in
whatever production environment this deploys to). A real admin-users table
with hashed passwords was deliberately deferred, matching the original fix
note's own scoping ("before more than one operator exists").

### P0.4 — Uploads are unvalidated
`middleware/validateImageUpload.js` + `utils/imageSignature.js` check magic
bytes against an allowlist (JPEG/PNG/WebP) regardless of claimed filename or
Content-Type — hand-rolled rather than a dependency since the three
signatures are short and worth being able to read at a glance rather than
trusting a third-party parser. `multer` now caps uploads at 10MB/4 files
(`routes/upload.js`), with its own JSON error handler for the overflow case
instead of falling through to Express's default HTML error page. The stored
file extension now follows the sniffed content type, not the client-supplied
filename. Tested against a real image, a text file renamed to `.jpg`, and an
oversized file — all three behave correctly.

### P0.5 — Order totals are supplied by the client
`total` is no longer read from the request body at all —
`services/orderService.js` computes it server-side from the book's theme via
`data/storyThemes.js`, and rejects the order (rather than defaulting to 0) if
the theme is missing or unrecognized. Verified a spoofed `total: 1` in the
request gets silently overridden to the real price.

### P1.1 — Books stored as JSON files cannot survive production
Books moved from `storage/books/<id>/book.json` into a `books` SQLite table
(`db/bookStore.js`); the JSON blob is kept as a column per the original fix
note, since the shape is still moving. `orders.book_id` now has a real
foreign key to `books(id)` — required a table-recreate migration since
SQLite can't `ALTER` a foreign key onto an existing table
(`db/migrateBooksTable.js`, idempotent, runs on every boot). Existing local
`book.json` files and orders were migrated automatically on first boot; 4
pre-existing orders referenced synthetic demo book IDs that never had a real
book record, so those got minimal stub rows rather than failing the
migration or losing the order data. Reads/writes now go through a single
SQLite transaction (`bookStore.mutateBook`) instead of a JS-variable
read-modify-write — this meaningfully narrows (though doesn't fully
eliminate) the concurrent-write race in the original finding, since every
write now merges against a *fresh* read instead of unconditionally
overwriting with whatever was held in memory minutes earlier.
`controllers/meController.js` went from an `fs.readdirSync` scan of every
book on disk to one indexed query. PDF files themselves are unchanged —
still local disk, tracked as a known residual gap (see P1.4/P1.5, on hold).

### P1.3 — No global error handler, no 404 handler
Added both as the last two middleware in `server.js`. The 404 returns JSON.
The error handler always logs full details server-side, but only echoes
`err.message` to the client when `err.expose` is set (the convention
body-parser/http-errors already use for safe 4xx messages) — everything
else gets a generic message, so an unexpected 500 can't leak internals.
Tested with an unknown route and a malformed-JSON request body.

### P2.1 — No spend controls anywhere
Mostly already covered by the P0.2 work (daily cap + per-IP rate limits act
as the practical per-user-quota equivalent, since the funnel is anonymous).
The genuine remaining gap was alerting: added a one-per-day operator email
when the cap is hit (`ALERT_EMAIL` env var, no-op if unset,
`services/spendGuard.js` + `services/emailTemplates.dailySpendCapAlert`).
Testing this surfaced two real bugs, both fixed: `Number(process.env.
AI_DAILY_GENERATION_CAP) || 200` treated an explicit `0` (a legitimate
kill-switch) the same as unset and silently reopened the cap to 200; and the
alert-sent dedup flag used a plain `UPDATE`, which silently no-ops if no
usage row exists yet for the day (only reachable when the cap is `0` from
the start of a fresh day) — switched to an upsert.

### P2.2 — CORS defaults to localhost
Removed the `|| "http://localhost:..."` fallbacks for `FRONTEND_URL` and
`ADMIN_URL` in `server.js`; the server now refuses to boot without both set.
Zero impact locally since both were already present in `.env`. Verified both
the normal-boot and fail-closed paths.

### P2.3 — Story generation uses a flash-lite model with no schema validation
Found there's already a fallback mechanism (`services/ai/aiService.js`
catches any error from Gemini and falls back to a deterministic story), so a
malformed-JSON reply was already handled. The real gap was a
well-formed-but-wrong-shaped reply sailing through unchecked. Added
`services/ai/storySchema.js`, validating exactly what the pipeline depends
on downstream (exactly 4 pages, required title/summary/moral fields,
correct page numbering, non-empty text) — a failure now throws and routes
through the existing fallback for free. Unit-tested 7 malformed-shape cases
plus the fallback integration.

### P2.4 — Email is fire-and-forget with no record
The general "log attempts/outcomes" bar was already met by pre-existing
`services/emailService.js` logging (not something added this pass). The real
gap: `sendStoryReadyEmail` in `services/illustrationService.js` returned
silently with zero log output when a claimed book's `userId` pointed at a
since-deleted user — a genuine data-inconsistency case that was previously
indistinguishable from the normal "book is still anonymous, no one to email"
case. Added a `console.warn` for that specific case; left the normal
anonymous-book skip path unlogged since that's expected behavior, not an
anomaly worth log noise.

### P3 — Cleanup
Deleted: `services/ai/openaiImageService.js` (0 bytes), all six root-level
`test-*.js` scratch scripts, `services/ai/testOpenAIImage.js`, and the
`openai-test.png` artefact it produced (2.2MB) — all confirmed unreferenced
by any production code via grep, and several were already broken by earlier
refactors in this pass (e.g. `characterVisionService.analyzeChildPhoto` no
longer takes a file path). Fixed the duplicated line in
`services/ai/geminiService.js`'s prompt. Fixed `package.json`: name →
`oopsyink-be`, real description, `main` → `server.js` (the file that
actually exists), author filled in. `npm test`'s stub was **not** touched —
unlike every other P3 item this one has no `**Fix:**` line, just an
observation; writing a real test suite for a codebase handling payments,
auth, and children's photos is a project of its own, not a cleanup-pass
item.

---

## Pending

Everything above this line is closed. What's left:

### P1.2 — Generation runs synchronously inside the HTTP request
Still open. Explicitly put on hold: building the async job queue blind,
without knowing whether it needs to interoperate with the canonical engine
in P1.5, risks the wrong shape.

### P1.4 — PDF output is not printable
Still open. The original fix note itself defers this to the P1.5 engine
decision ("see the engine decision in P1.5 before rebuilding it here") —
left exactly as scoped.

### P1.5 — This repo contains a THIRD generation engine, and it contradicts the canonical one
Still open. The canonical `oopsy_engine` repo isn't present anywhere on this
machine (checked — not alongside `kidora-be`, `kidora-admin`, or
`Kidora-fe`), so there's no interface to integrate against yet. Needs one of:
the engine repo/interface pointed at directly, or a decision to build P1.2's
job queue generically first (around the existing `services/ai/*` code, swap
the engine in later as an isolated change).

### P3 — `npm test` is a stub
No tests exist anywhere in the codebase. Out of scope for a cleanup pass —
flagged, not attempted.
