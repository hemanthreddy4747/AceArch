require("dotenv").config();

const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("./database");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const JWT_SECRET =
    process.env.ACEARCH_JWT_SECRET ||
    process.env.JWT_SECRET ||
    "acearch-development-secret-change-this-later";

if (process.env.NODE_ENV === "production" && (JWT_SECRET === "acearch-development-secret-change-this-later" || JWT_SECRET === "replace-with-a-long-random-secret")) {
    throw new Error("A production JWT_SECRET (or ACEARCH_JWT_SECRET) must be configured.");
}

app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "../public")));

/* =========================================================
   AUTHENTICATION
========================================================= */

function createToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            username: user.username
        },
        JWT_SECRET,
        { expiresIn: "7d" }
    );
}

async function authenticateToken(req, res, next) {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Authentication required."
        });
    }

    const token = header.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await db.get(`
            SELECT id, username
            FROM users
            WHERE id = ?
        `, [decoded.userId]);

        if (!user) {
            return res.status(401).json({
                error: "Account no longer exists."
            });
        }

        req.user = {
            id: user.id,
            username: user.username
        };

        next();
    } catch (error) {
        console.error("Authentication/database error:", error);
        return res.status(401).json({
            error: "Invalid or expired authentication token."
        });
    }
}

function deleteUserRows(tx, userId, includeUser = false) {
    tx.run("DELETE FROM tasks WHERE user_id = ?", [userId]);
    tx.run("DELETE FROM subjects WHERE user_id = ?", [userId]);
    tx.run("DELETE FROM settings WHERE user_id = ?", [userId]);
    tx.run("DELETE FROM notifications WHERE user_id = ?", [userId]);
    tx.run("DELETE FROM calendar_items WHERE user_id = ?", [userId]);
    tx.run("DELETE FROM focus_sessions WHERE user_id = ?", [userId]);
    tx.run("DELETE FROM pdfs WHERE user_id = ?", [userId]);
    if (includeUser) {
        tx.run("DELETE FROM users WHERE id = ?", [userId]);
    }
}

async function deleteUserData(userId, includeUser = false) {
    await db.transaction(async (tx) => {
        await deleteUserRowsAsync(tx, userId, includeUser);
    });
}

async function deleteUserRowsAsync(tx, userId, includeUser = false) {
    await tx.run("DELETE FROM tasks WHERE user_id = ?", [userId]);
    await tx.run("DELETE FROM subjects WHERE user_id = ?", [userId]);
    await tx.run("DELETE FROM settings WHERE user_id = ?", [userId]);
    await tx.run("DELETE FROM notifications WHERE user_id = ?", [userId]);
    await tx.run("DELETE FROM calendar_items WHERE user_id = ?", [userId]);
    await tx.run("DELETE FROM focus_sessions WHERE user_id = ?", [userId]);
    await tx.run("DELETE FROM pdfs WHERE user_id = ?", [userId]);
    if (includeUser) {
        await tx.run("DELETE FROM users WHERE id = ?", [userId]);
    }
}

/* =========================================================
   REGISTER
========================================================= */

app.post("/api/auth/register", async (req, res) => {
    try {
        const username = String(req.body?.username || "").trim();
        const password = String(req.body?.password || "");

        if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) {
            return res.status(400).json({
                error: "Username must be 3–30 characters and use only letters, numbers, or underscores."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: "Password must be at least 6 characters."
            });
        }

        const existingUser = await db.get(`
            SELECT id
            FROM users
            WHERE LOWER(username) = LOWER(?)
        `, [username]);

        if (existingUser) {
            return res.status(409).json({
                error: "That username is already in use."
            });
        }

        const userId =
            Date.now().toString() +
            "-" +
            crypto.randomBytes(8).toString("hex");

        const passwordHash = await bcrypt.hash(password, 12);

        await db.run(`
            INSERT INTO users (id, username, password_hash, created_at)
            VALUES (?, ?, ?, ?)
        `, [
            userId,
            username,
            passwordHash,
            new Date().toISOString()
        ]);

        const user = { id: userId, username };
        const token = createToken(user);

        res.status(201).json({
            success: true,
            token,
            user
        });
    } catch (error) {
        if (isUniqueViolation(error)) {
            return res.status(409).json({
                error: "That username is already in use."
            });
        }
        console.error("Registration error:", error);
        res.status(500).json({ error: "Could not create account." });
    }
});

/* =========================================================
   LOGIN
========================================================= */

app.post("/api/auth/login", async (req, res) => {
    try {
        const username = String(req.body?.username || "").trim();
        const password = String(req.body?.password || "");

        const user = await db.get(`
            SELECT id, username, password_hash AS "passwordHash"
            FROM users
            WHERE LOWER(username) = LOWER(?)
        `, [username]);

        if (!user) {
            return res.status(401).json({
                error: "Incorrect username or password."
            });
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) {
            return res.status(401).json({
                error: "Incorrect username or password."
            });
        }

        const publicUser = {
            id: user.id,
            username: user.username
        };

        res.json({
            success: true,
            token: createToken(publicUser),
            user: publicUser
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Could not log in." });
    }
});

/* =========================================================
   CHANGE PASSWORD
========================================================= */

app.put("/api/auth/password", authenticateToken, async (req, res) => {
    try {
        const currentPassword = String(req.body?.currentPassword || "");
        const newPassword = String(req.body?.newPassword || "");

        if (currentPassword.length < 6 || newPassword.length < 6) {
            return res.status(400).json({
                error: "Passwords must be at least 6 characters."
            });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({
                error: "Choose a different new password."
            });
        }

        const user = await db.get(`
            SELECT id, password_hash AS "passwordHash"
            FROM users
            WHERE id = ?
        `, [req.user.id]);

        if (!user) {
            return res.status(401).json({ error: "Account no longer exists." });
        }

        const matches = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!matches) {
            return res.status(400).json({ error: "Current password is incorrect." });
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await db.run(`
            UPDATE users
            SET password_hash = ?
            WHERE id = ?
        `, [passwordHash, req.user.id]);

        res.json({
            success: true,
            message: "Password changed successfully."
        });
    } catch (error) {
        console.error("Password change error:", error);
        res.status(500).json({ error: "Could not change your password." });
    }
});

/* =========================================================
   CURRENT USER
========================================================= */

app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
        const user = await db.get(`
            SELECT id, username
            FROM users
            WHERE id = ?
        `, [req.user.id]);

        if (!user) {
            return res.status(401).json({ authenticated: false });
        }

        res.json({ authenticated: true, user });
    } catch (error) {
        console.error("Current user error:", error);
        res.status(500).json({ error: "Could not load the current user." });
    }
});

/* =========================================================
   DELETE CURRENT USER DATA
========================================================= */

app.delete("/api/account/data", authenticateToken, async (req, res) => {
    try {
        const user = await db.get("SELECT id FROM users WHERE id = ?", [req.user.id]);
        if (!user) {
            return res.status(401).json({ error: "Account no longer exists." });
        }

        await deleteUserData(req.user.id);
        res.json({
            success: true,
            message: "Your AceArch data was deleted. Your account is still active."
        });
    } catch (error) {
        console.error("Delete user data error:", error);
        res.status(500).json({ error: "Could not delete your AceArch data." });
    }
});

/* =========================================================
   DELETE CURRENT USER ACCOUNT
========================================================= */

app.delete("/api/account", authenticateToken, async (req, res) => {
    try {
        const user = await db.get("SELECT id FROM users WHERE id = ?", [req.user.id]);
        if (!user) {
            return res.status(401).json({ error: "Account no longer exists." });
        }

        await deleteUserData(req.user.id, true);
        res.json({
            success: true,
            message: "Your AceArch account and its data were deleted."
        });
    } catch (error) {
        console.error("Delete account error:", error);
        res.status(500).json({ error: "Could not delete your AceArch account." });
    }
});

/* =========================================================
   LOAD USER DATA
========================================================= */

app.get("/api/data", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const tasks = (await db.all(`
            SELECT id, title, subject, deadline, priority, description,
                   completed, created_at AS createdAt,
                   updated_at AS updatedAt, completed_at AS completedAt
            FROM tasks
            WHERE user_id = ?
            ORDER BY created_at ASC
        `, [userId])).map(task => ({
            ...task,
            completed: Boolean(task.completed)
        }));

        const subjects = (await db.all(`
            SELECT id, name, color, schedule, notes,
                   created_at AS createdAt
            FROM subjects
            WHERE user_id = ?
            ORDER BY created_at ASC
        `, [userId])).map(subject => ({
            ...subject,
            schedule: parseJSON(subject.schedule, []),
            notes: parseJSON(subject.notes, [])
        }));

        const settingsRows = await db.all(`
            SELECT key, value
            FROM settings
            WHERE user_id = ?
        `, [userId]);

        const settings = {};
        for (const row of settingsRows) {
            const prefix = `${userId}::`;
            const key = row.key.startsWith(prefix)
                ? row.key.substring(prefix.length)
                : row.key;
            settings[key] = parseJSON(row.value, row.value);
        }

        const notifications = (await db.all(`
            SELECT id, notification_key AS key, title, message,
                   created_at AS createdAt, read
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at ASC
        `, [userId])).map(notification => ({
            id: notification.id,
            ...(notification.key ? { key: notification.key } : {}),
            title: notification.title,
            message: notification.message,
            createdAt: notification.createdAt,
            read: Boolean(notification.read)
        }));

        const calendarItems = await db.all(`
            SELECT id, title, date, type, task_id AS taskId
            FROM calendar_items
            WHERE user_id = ?
            ORDER BY date ASC
        `, [userId]);

        const focusSessions = await db.all(`
            SELECT id, minutes, date, completed_at AS completedAt
            FROM focus_sessions
            WHERE user_id = ?
            ORDER BY completed_at ASC
        `, [userId]);

        const pdfs = await db.all(`
            SELECT id, subject_id AS subjectId, filename AS name,
                   mime_type AS type, size, created_at AS createdAt
            FROM pdfs
            WHERE user_id = ?
            ORDER BY created_at ASC
        `, [userId]);

        res.json({
            tasks,
            subjects,
            settings,
            notifications,
            calendarItems,
            focusSessions,
            pdfs
        });
    } catch (error) {
        console.error("Database read error:", error);
        res.status(500).json({ error: "Could not load AceArch data." });
    }
});

/* =========================================================
   PDF STORAGE
   Binary files live in PostgreSQL so they are available on every device.
========================================================= */

app.post(
    "/api/pdfs/:id",
    authenticateToken,
    express.raw({ type: "application/pdf", limit: "25mb" }),
    async (req, res) => {
        try {
            const id = String(req.params.id || "").trim();
            const subjectId = String(req.query.subjectId || "").trim();
            const filename = String(req.query.name || "AceArch document.pdf").trim();

            if (!id || !subjectId || !Buffer.isBuffer(req.body) || !req.body.length) {
                return res.status(400).json({ error: "A PDF file and subject are required." });
            }

            if (req.body.length > 25 * 1024 * 1024) {
                return res.status(413).json({ error: "PDF must be smaller than 25 MB." });
            }

            const subject = await db.get(`
                SELECT id FROM subjects
                WHERE id = ? AND user_id = ?
            `, [subjectId, req.user.id]);

            if (!subject) {
                return res.status(404).json({ error: "Subject not found." });
            }

            await db.run(`
                INSERT INTO pdfs (
                    id, user_id, subject_id, filename, mime_type,
                    size, data, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO UPDATE SET
                    subject_id = EXCLUDED.subject_id,
                    filename = EXCLUDED.filename,
                    mime_type = EXCLUDED.mime_type,
                    size = EXCLUDED.size,
                    data = EXCLUDED.data,
                    updated_at = EXCLUDED.updated_at
                WHERE pdfs.user_id = EXCLUDED.user_id
            `, [
                id,
                req.user.id,
                subjectId,
                filename || "AceArch document.pdf",
                "application/pdf",
                req.body.length,
                req.body,
                new Date().toISOString(),
                new Date().toISOString()
            ]);

            res.json({
                success: true,
                id,
                size: req.body.length
            });
        } catch (error) {
            console.error("PDF upload error:", error);
            res.status(500).json({ error: "Could not store the PDF." });
        }
    }
);

app.get("/api/pdfs/:id", authenticateToken, async (req, res) => {
    try {
        const pdf = await db.get(`
            SELECT filename, mime_type, size, data
            FROM pdfs
            WHERE id = ? AND user_id = ?
        `, [String(req.params.id || ""), req.user.id]);

        if (!pdf) {
            return res.status(404).json({ error: "PDF not found." });
        }

        res.setHeader("Content-Type", pdf.mime_type || "application/pdf");
        res.setHeader("Content-Length", String(pdf.size || pdf.data?.length || 0));
        res.setHeader(
            "Content-Disposition",
            `inline; filename="${String(pdf.filename || "AceArch document.pdf").replace(/["\r\n]/g, "")}"`
        );
        res.send(pdf.data);
    } catch (error) {
        console.error("PDF read error:", error);
        res.status(500).json({ error: "Could not load the PDF." });
    }
});

app.delete("/api/pdfs/:id", authenticateToken, async (req, res) => {
    try {
        await db.run(`
            DELETE FROM pdfs
            WHERE id = ? AND user_id = ?
        `, [String(req.params.id || ""), req.user.id]);

        res.json({ success: true });
    } catch (error) {
        console.error("PDF delete error:", error);
        res.status(500).json({ error: "Could not delete the PDF." });
    }
});

/* =========================================================
   SAVE USER DATA
========================================================= */

async function saveUserDataAsync(tx, data, userId) {
    await tx.run("DELETE FROM tasks WHERE user_id = ?", [userId]);
    await tx.run("DELETE FROM subjects WHERE user_id = ?", [userId]);
    await tx.run("DELETE FROM settings WHERE user_id = ?", [userId]);
    await tx.run("DELETE FROM notifications WHERE user_id = ?", [userId]);
    await tx.run("DELETE FROM calendar_items WHERE user_id = ?", [userId]);
    await tx.run("DELETE FROM focus_sessions WHERE user_id = ?", [userId]);

    for (const task of Array.isArray(data.tasks) ? data.tasks : []) {
        if (!task.id || !task.title) continue;
        await tx.run(`
            INSERT INTO tasks (
                id, user_id, title, subject, deadline, priority,
                description, completed, created_at, updated_at, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            String(task.id), userId, String(task.title), task.subject ?? "",
            task.deadline ?? "", task.priority ?? "", task.description ?? "",
            Boolean(task.completed), task.createdAt ?? new Date().toISOString(),
            task.updatedAt ?? null, task.completedAt ?? null
        ]);
    }

    for (const subject of Array.isArray(data.subjects) ? data.subjects : []) {
        if (!subject.id || !subject.name) continue;
        await tx.run(`
            INSERT INTO subjects (
                id, user_id, name, color, schedule, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            String(subject.id), userId, String(subject.name), subject.color ?? "",
            JSON.stringify(Array.isArray(subject.schedule) ? subject.schedule : []),
            JSON.stringify(Array.isArray(subject.notes) ? subject.notes : []),
            subject.createdAt ?? new Date().toISOString()
        ]);
    }

    if (data.settings && typeof data.settings === "object") {
        for (const [key, value] of Object.entries(data.settings)) {
            await tx.run(`
                INSERT INTO settings (key, user_id, value)
                VALUES (?, ?, ?)
            `, [String(key), userId, JSON.stringify(value)]);
        }
    }

    for (const notification of Array.isArray(data.notifications) ? data.notifications : []) {
        if (!notification.id) continue;
        await tx.run(`
            INSERT INTO notifications (
                id, user_id, title, message, created_at, read, notification_key
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            String(notification.id), userId, notification.title ?? "",
            notification.message ?? "", notification.createdAt ?? new Date().toISOString(),
            Boolean(notification.read), notification.key ?? null
        ]);
    }

    for (const item of Array.isArray(data.calendarItems) ? data.calendarItems : []) {
        if (!item.id) continue;
        await tx.run(`
            INSERT INTO calendar_items (id, user_id, title, date, type, task_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            String(item.id), userId, item.title ?? "", item.date ?? "",
            item.type ?? "", item.taskId ?? null
        ]);
    }

    for (const session of Array.isArray(data.focusSessions) ? data.focusSessions : []) {
        if (!session.id) continue;
        await tx.run(`
            INSERT INTO focus_sessions (id, user_id, minutes, date, completed_at)
            VALUES (?, ?, ?, ?, ?)
        `, [
            String(session.id), userId, Number(session.minutes) || 0,
            session.date ?? "", session.completedAt ?? new Date().toISOString()
        ]);
    }
}

app.post("/api/data", authenticateToken, async (req, res) => {
    const data = req.body || {};
    const userId = req.user.id;

    try {
        await db.transaction(tx => saveUserDataAsync(tx, data, userId));

        res.json({ success: true });
    } catch (error) {
        console.error("Database save error:", error);
        res.status(500).json({ error: "Could not save AceArch data." });
    }
});

/* =========================================================
   DATABASE TEST
========================================================= */

app.get("/api/test-database", async (req, res) => {
    try {
        const result = await db.all(`
            SELECT table_name AS name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        res.json(result);
    } catch (error) {
        console.error("Database test error:", error);
        res.status(500).json({ error: "Could not test database." });
    }
});

/* =========================================================
   DATABASE EXTENSIONS / STARTUP
========================================================= */

async function ensurePdfTable() {
    await db.run(`
        CREATE TABLE IF NOT EXISTS pdfs (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            subject_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            mime_type TEXT NOT NULL DEFAULT 'application/pdf',
            size INTEGER NOT NULL DEFAULT 0,
            data BYTEA NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `);
    await db.run(`
        CREATE INDEX IF NOT EXISTS pdfs_user_id_idx
        ON pdfs (user_id)
    `);
    await db.run(`
        CREATE INDEX IF NOT EXISTS pdfs_subject_id_idx
        ON pdfs (subject_id)
    `);
}

async function startServer() {
    try {
        await ensurePdfTable();
        const server = app.listen(PORT, () => {
            console.log(`AceArch is running at http://localhost:${PORT}`);
        });
        return server;
    } catch (error) {
        console.error("Database startup error:", error);
        process.exit(1);
    }
}

startServer();

function parseJSON(value, fallback) {
    if (value === null || value === undefined || value === "") {
        return fallback;
    }

    if (typeof value !== "string") {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function isUniqueViolation(error) {
    return error && (error.code === "23505" || String(error.message || "").includes("UNIQUE"));
}

function shutdown(signal) {
    console.log(`${signal} received. Shutting down AceArch...`);
    server.close(async () => {
        try {
            await db.close();
        } finally {
            process.exit(0);
        }
    });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

module.exports = app;
