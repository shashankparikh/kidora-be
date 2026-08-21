# kidora-be — Backlog

Findings from a full read of the repository on 2026-08-21, ahead of taking it
live as the Oopsy.Ink backend.

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

_(nothing yet — move items here with a note on what the fix was)_
