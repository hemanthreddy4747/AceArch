const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when PostgreSQL mode is enabled.");
}

const isProduction = process.env.NODE_ENV === "production";
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction || process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : false
});

function convertPlaceholders(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
}

async function query(sql, params = [], client = pool) {
    return client.query(convertPlaceholders(sql), params);
}

const api = {
    mode: "postgres",
    async get(sql, params = []) {
        const result = await query(sql, params);
        return result.rows[0];
    },
    async all(sql, params = []) {
        const result = await query(sql, params);
        return result.rows;
    },
    async run(sql, params = []) {
        return query(sql, params);
    },
    async transaction(callback) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const tx = {
                mode: "postgres",
                get: async (sql, params = []) => {
                    const result = await query(sql, params, client);
                    return result.rows[0];
                },
                all: async (sql, params = []) => {
                    const result = await query(sql, params, client);
                    return result.rows;
                },
                run: async (sql, params = []) => query(sql, params, client)
            };
            const result = await callback(tx);
            await client.query("COMMIT");
            return result;
        } catch (error) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("PostgreSQL rollback error:", rollbackError);
            }
            throw error;
        } finally {
            client.release();
        }
    },
    async close() {
        await pool.end();
    }
};

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL pool error:", error);
});

module.exports = api;
