#!/usr/bin/env node
/**
 * Operator accounts for the admin panel.
 *
 *   node scripts/admin-user.js list
 *   node scripts/admin-user.js add    --user niharika --name "Niharika"
 *   node scripts/admin-user.js add    --user minal --name "Minal" --password "..."
 *   node scripts/admin-user.js passwd --user minal
 *   node scripts/admin-user.js disable --user minal
 *   node scripts/admin-user.js enable  --user minal
 *
 * Run it against whichever database DATABASE_URL points at. Render's free
 * plan has no shell, so pointing this at the production Supabase URL from a
 * laptop is the intended way to manage the live accounts:
 *
 *   DATABASE_URL="postgresql://...pooler.supabase.com:5432/postgres" \
 *     node scripts/admin-user.js add --user aakanshi --name "Aakanshi"
 *
 * A generated password is printed once and never stored in readable form.
 * There is no "email them a reset link" path — with three operators, handing
 * the password over in person or through a password manager is both simpler
 * and safer than building one.
 */
require("dotenv").config();

const crypto = require("crypto");

const adminUserStore = require("../db/adminUserStore");
const { pool } = require("../db/database");

// Ambiguous characters left out (0/O, 1/l/I) because these get read aloud and
// typed by hand more often than they get pasted.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generatePassword(groups = 4, size = 5) {
    return Array.from({ length: groups }, () =>
        Array.from(
            crypto.randomBytes(size),
            (b) => ALPHABET[b % ALPHABET.length]
        ).join("")
    ).join("-");
}

function flag(args, name) {
    const i = args.indexOf(`--${name}`);
    return i === -1 ? null : args[i + 1] || null;
}

async function main() {

    const [command, ...args] = process.argv.slice(2);
    const username = flag(args, "user");

    if (command === "list") {
        const admins = await adminUserStore.list();
        if (admins.length === 0) {
            console.log("  no operators yet — add one with:  node scripts/admin-user.js add --user <name>");
            return;
        }
        console.log(`  ${admins.length} operator(s):\n`);
        for (const a of admins) {
            console.log(
                `     ${a.displayName.padEnd(12)} ${a.username.padEnd(12)}` +
                `${a.active ? "active  " : "disabled"}  ` +
                `last login ${a.lastLoginAt ? a.lastLoginAt.slice(0, 16).replace("T", " ") : "never"}`
            );
        }
        return;
    }

    if (!username) {
        throw new Error(`--user is required for "${command}".`);
    }

    if (command === "add") {
        const password = flag(args, "password") || generatePassword();
        const admin = await adminUserStore.create({
            username,
            displayName: flag(args, "name") || username,
            password
        });
        console.log(`  added ${admin.displayName} (${admin.username})`);
        console.log(`\n     password: ${password}`);
        console.log("\n  Shown once. Hand it over directly — it is not recoverable.");
        return;
    }

    if (command === "passwd") {
        const password = flag(args, "password") || generatePassword();
        const admin = await adminUserStore.setPassword(username, password);
        if (!admin) throw new Error(`No operator called "${username}".`);
        console.log(`  password reset for ${admin.displayName}`);
        console.log(`\n     password: ${password}`);
        console.log("\n  Shown once. Hand it over directly — it is not recoverable.");
        return;
    }

    if (command === "disable" || command === "enable") {
        const admin = await adminUserStore.setActive(username, command === "enable");
        if (!admin) throw new Error(`No operator called "${username}".`);
        console.log(`  ${admin.displayName} is now ${admin.active ? "active" : "disabled"}`);
        if (!admin.active) {
            console.log("  Their name stays on everything they did — the history is append-only.");
        }
        return;
    }

    throw new Error(
        `Unknown command "${command || ""}". Use: list | add | passwd | disable | enable`
    );

}

main()
    .then(() => pool.end())
    .catch((err) => {
        console.error(`  ${err.message}`);
        pool.end().finally(() => process.exit(1));
    });
