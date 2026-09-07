/*
 * AceArch database entry point.
 * PostgreSQL/Supabase is the only supported database backend.
 */

require("dotenv").config();

if (!process.env.DATABASE_URL) {
    throw new Error(
        "DATABASE_URL is required. AceArch now uses PostgreSQL/Supabase only."
    );
}

const db = require("./db/postgres");

console.log(`AceArch database backend: ${db.mode}`);

module.exports = db;
