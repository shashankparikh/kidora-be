# Local setup

Getting `kidora-be` running on a new machine.

> **Nothing in this file is a secret, and nothing in it should become one.**
> Copy `.env.example` to `.env` and fill in your own values. `.env` is
> gitignored. Never paste a filled-in `.env`, a `DATABASE_URL`, or an API key
> into Slack, email or a pull request — use a password manager's sharing
> feature if a value genuinely has to be handed over.

---

## 1. Get a database

The server will not start without `DATABASE_URL`. That is deliberate — an
unset database used to mean a silent fallback, and silent fallbacks in a
storefront mean lost orders.

**Use your own Supabase project for local development. Do not use production.**

It is free, it takes about five minutes, and it means a mistake on your laptop
cannot touch a customer's book. The schema is fully described by the migrations
in `db/migrations/`, so a fresh project becomes a working database with one
command.

1. Create a project at supabase.com — any region, though one near you is
   faster.
2. **Save the database password when it is shown.** Supabase never displays it
   again; if you lose it your only option is Settings → Database → Reset
   database password.
3. Settings → Database → Connection string → URI → the **Session pooler** tab.

### Two traps in that connection string

Both of these fail in ways that point you at the wrong problem, so they are
worth reading before you hit either.

**Use the pooler host, not the direct one.** `db.<ref>.supabase.co` resolves to
IPv6 only. Most networks and most hosting providers cannot reach it, and the
failure looks like the database being down. The pooler host —
`aws-0-<region>.pooler.supabase.com` — has IPv4 and works everywhere.

**The pooler username carries the project ref.** It is
`postgres.<project-ref>`, not bare `postgres`. Getting this wrong fails as an
authentication error, which sends you hunting for a password problem that does
not exist.

**Port 5432, not 6543.** 5432 is the session pooler. 6543 is the transaction
pooler, which does not hold a session across statements — that would break the
`SELECT … FOR UPDATE` in `db/bookStore.js`'s `mutateBook`, and the breakage
would be an occasional lost update rather than an error, which is worse.

So the finished string looks like:

```
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

---

## 2. Configure

```bash
cp .env.example .env
```

Then fill it in. Every variable is documented in that file. The ones you cannot
start without:

| Variable | Where it comes from |
|---|---|
| `DATABASE_URL` | step 1 |
| `FRONTEND_URL`, `ADMIN_URL` | `http://localhost:5173` and `http://localhost:5174` locally. **Both are required** — the server refuses to boot without them, because a wrong CORS origin should be loud rather than a 500 nobody notices. |
| `JWT_ACCESS_SECRET`, `ADMIN_JWT_SECRET` | generate your own, below |

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Everything else — Gemini, OpenAI, AWS, Resend, Razorpay, Google — is only
needed for the feature that uses it. The app runs without them; the relevant
feature just does not work. `emailService` in particular logs and continues
rather than throwing when `RESEND_API_KEY` is missing.

**Use your own keys, not production's.** Especially `GEMINI_API_KEY` and
`OPENAI_API_KEY` — those spend real money per call, and a local test loop
against the production key spends it from the same budget as real customers.

---

## 3. Install and migrate

```bash
npm ci
npm run migrate
```

`npm run migrate` applies `db/migrations/*.sql` in order and records each one in
`schema_migrations`, so re-running is a no-op. It is **not** run on boot —
several containers starting at once would race on DDL — so run it yourself
after pulling anything that adds a migration.

```bash
npm start
```

Health check: <http://localhost:3000/health>

---

## 4. Create an operator login

The admin panel has no default account — a fresh database has nobody who can
sign in, on purpose.

```bash
npm run admin -- add --user niharika --name "Niharika"
```

The password is generated and printed **once**; it is stored only as a bcrypt
hash and cannot be recovered. Other commands:

```bash
npm run admin -- list
npm run admin -- passwd  --user niharika    # new password, printed once
npm run admin -- disable --user niharika    # revoke access, keep their history
npm run admin -- enable  --user niharika
```

Accounts live in the database rather than in env, so a person can be added or
revoked without a redeploy — and so every status change, note, upload and
refund in the queue is stamped with the name of whoever made it. Render's free
plan has no shell, so manage the live accounts by pointing this at the
production database from your own machine:

```bash
DATABASE_URL="postgresql://...pooler.supabase.com:5432/postgres" \
  npm run admin -- add --user aakanshi --name "Aakanshi"
```

A disabled operator keeps their name on everything they did. `order_events` is
append-only; deactivating is not deletion, because history that quietly loses
its author is worse than no history.

---

## 5. Verify it actually works

```bash
curl -s localhost:3000/health
curl -s localhost:3000/settings
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/books
```

The third should print **401**. That is correct: generation requires a signed-in
customer, and an anonymous request being refused is the gate working, not a
fault. A database problem would show up as a 500 or as the server failing to
start at all.

---

## Notes

**No SQLite.** Storage moved to Postgres because the deploy target has an
ephemeral filesystem — a `.db` file does not survive a restart. There is no
local-file fallback, by design.

**Nothing is written to local disk.** Uploads, illustrations and generated PDFs
all go to S3. If you find code writing to the filesystem, that is a bug.

**Local Postgres works too.** If crossing the network for every query is
annoying — and from India to a Singapore region it is roughly 50 ms a query —
run Postgres in Docker and point `DATABASE_URL` at it. Same driver, same SQL,
no code change.
