/* =========================================================
   ACEARCH
   Complete Application JavaScript
   Version 2
========================================================= */


/* =========================================================
   ACCOUNT / LOGIN
========================================================= */

const AUTH_KEYS = {
    token: "acearch_auth_token",
    user: "acearch_auth_user"
};

let authMode = "login";
let authInitializationPromise = Promise.resolve();

function getAuthToken() {
    try {
        return localStorage.getItem(AUTH_KEYS.token);
    } catch {
        return null;
    }
}

function getAuthUser() {
    try {
        const raw = localStorage.getItem(AUTH_KEYS.user);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.warn("Could not load authenticated user:", error);
        return null;
    }
}

function setAuthData(token, user) {
    localStorage.setItem(AUTH_KEYS.token, token);
    localStorage.setItem(AUTH_KEYS.user, JSON.stringify(user));
}

function clearAuthData() {
    localStorage.removeItem(AUTH_KEYS.token);
    localStorage.removeItem(AUTH_KEYS.user);
}

function setAuthMessage(message, type = "error") {
    const element = document.getElementById("authMessage");
    if (!element) return;

    element.textContent = message;
    element.classList.toggle("success", type === "success");
}

function updatePasswordToggle() {
    const password = document.getElementById("authPassword");
    const toggle = document.getElementById("authPasswordToggle");
    if (!password || !toggle) return;

    const visible = password.type === "text";
    toggle.setAttribute("aria-pressed", String(visible));
    toggle.setAttribute("aria-label", visible ? "Hide password" : "Show password");
    toggle.innerHTML = visible
        ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.8 10.8 0 0 1 12 5c5.1 0 8.8 4.2 10 7a12.8 12.8 0 0 1-3.2 4.6M6.2 6.3C4.3 7.6 2.9 9.5 2 12c1.2 2.8 4.9 7 10 7 1.3 0 2.5-.2 3.6-.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
        : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.7-7 10-7 10 7 10 7-3.7 7-10 7S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
}

function updateAuthMode() {
    const isRegister = authMode === "register";

    document.getElementById("loginTab")?.classList.toggle("active", !isRegister);
    document.getElementById("registerTab")?.classList.toggle("active", isRegister);

    const passwordElement = document.getElementById("authPassword");
    if (passwordElement) {
        passwordElement.autocomplete = isRegister ? "new-password" : "current-password";
        passwordElement.type = "password";
    }
    updatePasswordToggle();

    const eyebrow = document.getElementById("authEyebrow");
    const title = document.getElementById("authTitle");
    const description = document.getElementById("authDescription");
    const submit = document.getElementById("authSubmit");

    if (eyebrow) eyebrow.textContent = isRegister ? "GET STARTED" : "WELCOME BACK";
    if (title) title.textContent = isRegister ? "Create your AceArch account" : "Sign in to AceArch";
    if (description) description.textContent = isRegister ? "Create your AceArch account to use your personal workspace." : "Sign in to open your AceArch workspace.";
    if (submit) submit.textContent = isRegister ? "Create account" : "Log in";

    setAuthMessage("");
}

function resetUserDataInMemory() {
    tasks = [];
    calendarItems = [];
    subjects = [];
    focusSessions = [];
    notifications = [];
    settings = { ...defaultSettings };
    databaseReady = false;
    databaseUserId = null;
    databaseLoadPromise = Promise.resolve();
    databaseSaveQueue = Promise.resolve();
    dataSessionGeneration += 1;
    editingSubjectId = null;
    selectedCalendarDate = todayString();
    calendarDate = new Date();
}

function applyAuthenticationAppearance() {
    document.documentElement.style.setProperty("--accent", defaultSettings.accent);
    document.documentElement.style.setProperty("--app-font", `"${defaultSettings.font}"`);
    document.body.style.fontFamily = `"${defaultSettings.font}", system-ui, sans-serif`;
    document.body.classList.remove("light");
    document.querySelectorAll("[data-theme], .color-choice").forEach(element => element.classList.remove("selected"));
}

function playWorkspaceTransition() {
    const appElement = document.getElementById("acearchApp");
    if (!appElement) return;

    appElement.classList.remove("workspace-enter");
    void appElement.offsetWidth;
    appElement.classList.add("workspace-enter");

    window.setTimeout(() => {
        appElement.classList.remove("workspace-enter");
    }, 550);
}

function showAppForSession() {
    const screen = document.getElementById("authScreen");
    const appElement = document.getElementById("acearchApp");
    const user = getAuthUser();

    screen?.classList.add("hidden");
    appElement?.classList.remove("auth-locked");
    playWorkspaceTransition();

    const usernameElement = document.getElementById("accountUsername");
    const avatarElement = document.getElementById("accountAvatar");
    const settingsUsername = document.getElementById("settingsAccountUsername");
    const settingsAvatar = document.getElementById("settingsAccountAvatar");
    const mobileUsername = document.getElementById("mobileAccountUsername");
    const mobileAvatar = document.getElementById("mobileAccountAvatar");

    const username = user?.username || "Account";
    const avatar = username.trim().charAt(0).toUpperCase() || "A";

    if (usernameElement) usernameElement.textContent = username;
    if (avatarElement) avatarElement.textContent = avatar;
    if (settingsUsername) settingsUsername.textContent = username;
    if (settingsAvatar) settingsAvatar.textContent = avatar;
    if (mobileUsername) mobileUsername.textContent = username;
    if (mobileAvatar) mobileAvatar.textContent = avatar;
}

function showLoginScreen() {
    resetUserDataInMemory();
    applyAuthenticationAppearance();

    document.getElementById("authScreen")?.classList.remove("hidden");
    document.getElementById("acearchApp")?.classList.add("auth-locked");

    const password = document.getElementById("authPassword");
    if (password) {
        password.value = "";
        password.type = "password";
    }
    updatePasswordToggle();

    document.getElementById("authUsername")?.focus();
}

async function handleAuthSubmit(event) {
    event.preventDefault();

    const usernameElement = document.getElementById("authUsername");
    const passwordElement = document.getElementById("authPassword");
    const submitButton = document.getElementById("authSubmit");

    const username = usernameElement?.value.trim() || "";
    const password = passwordElement?.value || "";
    const isRegister = authMode === "register";

    if (!username || !password) {
        setAuthMessage("Please enter your username and password.");
        return;
    }
    if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) {
        setAuthMessage("Username must be 3–30 characters and use only letters, numbers, or underscores.");
        return;
    }
    if (password.length < 6) {
        setAuthMessage("Password must be at least 6 characters.");
        return;
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.classList.add("auth-is-loading");
        submitButton.setAttribute("aria-busy", "true");
        document.getElementById("loginTab")?.setAttribute("disabled", "true");
        document.getElementById("registerTab")?.setAttribute("disabled", "true");
        submitButton.innerHTML = `<span class="button-spinner" aria-hidden="true"></span>${isRegister ? "Creating account..." : "Logging in..."}`;
    }


    try {
        const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            setAuthMessage(result.error || "Authentication failed.");
            return;
        }

        resetUserDataInMemory();
        setAuthData(result.token, result.user);
        document.getElementById("authForm")?.reset();
        showAppForSession();

        await startAuthenticatedDatabaseLoad();
        applyCustomization();
        renderAll();
        renderFocusPage();
        navigate("dashboard");

    } catch (error) {
        console.error("Authentication request failed:", error);
        setAuthMessage("Could not connect to the AceArch server.");
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.classList.remove("auth-is-loading");
            submitButton.removeAttribute("aria-busy");
            submitButton.textContent = authMode === "register" ? "Create account" : "Log in";
            document.getElementById("loginTab")?.removeAttribute("disabled");
            document.getElementById("registerTab")?.removeAttribute("disabled");
        }
    }
}

async function verifyExistingSession() {
    const token = getAuthToken();

    if (!token) {
        showLoginScreen();
        return;
    }

    try {
        const response = await fetch("/api/auth/me", {
            method: "GET",
            cache: "no-store",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            clearAuthData();
            showLoginScreen();
            return;
        }

        const result = await response.json();
        if (!result.authenticated || !result.user) {
            clearAuthData();
            showLoginScreen();
            return;
        }

        setAuthData(token, result.user);
        showAppForSession();
        await startAuthenticatedDatabaseLoad();

    } catch (error) {
        console.error("Session verification failed:", error);
        if (getAuthUser()) {
            showAppForSession();
            await loadUserLocalBackup(getAuthUser().id);
        } else {
            showLoginScreen();
        }
    }
}

function initializeFrontendAuth() {
    document.getElementById("loginTab")?.addEventListener("click", () => {
        authMode = "login";
        updateAuthMode();
    });

    document.getElementById("registerTab")?.addEventListener("click", () => {
        authMode = "register";
        updateAuthMode();
    });

    document.getElementById("authPasswordToggle")?.addEventListener("click", () => {
        const password = document.getElementById("authPassword");
        if (!password) return;
        password.type = password.type === "password" ? "text" : "password";
        updatePasswordToggle();
        password.focus();
        password.setSelectionRange(password.value.length, password.value.length);
    });

    document.getElementById("authForm")?.addEventListener("submit", handleAuthSubmit);

    const logout = () => {
        clearAuthData();
        showLoginScreen();
        authMode = "login";
        updateAuthMode();
    };

    document.getElementById("logoutButton")?.addEventListener("click", logout);
    document.getElementById("mobileLogoutButton")?.addEventListener("click", logout);

    updateAuthMode();
    authInitializationPromise = Promise.resolve().then(verifyExistingSession);
}

initializeFrontendAuth();

/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEYS = {
    tasks: "acearch_tasks",
    calendar: "acearch_calendar",
    subjects: "acearch_subjects",
    focus: "acearch_focus",
    notifications: "acearch_notifications",
    settings: "acearch_settings"
};


const defaultSettings = {
    theme: "dark",
    accent: "#f97316",
    font: "Josefin Sans",
    confirmDelete: true,
    autoCalendarTasks: true
};


function loadStorage(key, fallback) {

    try {

        const value =
            localStorage.getItem(key);

        return value
            ? JSON.parse(value)
            : fallback;

    } catch (error) {

        console.warn(
            `Could not load ${key}:`,
            error
        );

        return fallback;

    }

}


let tasks = [];
let calendarItems = [];
let subjects = [];
let focusSessions = [];
let notifications = [];
let settings = { ...defaultSettings };


/* =========================================================
   DATABASE SYNC
========================================================= */

/*
 * localStorage remains as a browser-side backup, while PostgreSQL is
 * now the primary persistent store for AceArch app data.
 *
 * Calendar, focus data and PDF metadata are stored in PostgreSQL.
 * PDF binary files are stored in the PostgreSQL pdfs table so they sync
 * across devices; IndexedDB remains as a local fallback for offline use.
 */

let databaseReady = false;
let databaseUserId = null;
let databaseSaveQueue = Promise.resolve();
let dataSessionGeneration = 0;

function getDatabasePayload() {
    return {
        tasks,
        subjects,
        settings,
        notifications,
        calendarItems,
        focusSessions
    };
}

function getUserStorageKey(key, userId = getAuthUser()?.id) {
    return userId ? `${key}:${userId}` : null;
}

function saveLocalBackup() {
    const userId = getAuthUser()?.id;
    if (!userId) return;

    const write = (key, value) => {
        const storageKey = getUserStorageKey(key, userId);
        if (storageKey) localStorage.setItem(storageKey, JSON.stringify(value));
    };

    write(STORAGE_KEYS.tasks, tasks);
    write(STORAGE_KEYS.calendar, calendarItems);
    write(STORAGE_KEYS.subjects, subjects);
    write(STORAGE_KEYS.focus, focusSessions);
    write(STORAGE_KEYS.notifications, notifications);
    write(STORAGE_KEYS.settings, settings);
}

function loadUserLocalBackup(userId) {
    if (!userId) return false;

    const read = (key, fallback) => {
        const storageKey = getUserStorageKey(key, userId);
        return storageKey ? loadStorage(storageKey, fallback) : fallback;
    };

    tasks = read(STORAGE_KEYS.tasks, []);
    calendarItems = read(STORAGE_KEYS.calendar, []);
    subjects = read(STORAGE_KEYS.subjects, []);
    focusSessions = read(STORAGE_KEYS.focus, []);
    notifications = read(STORAGE_KEYS.notifications, []);
    settings = { ...defaultSettings, ...read(STORAGE_KEYS.settings, {}) };
    if (settings.font === "Cinzel") settings.font = defaultSettings.font;
    databaseUserId = userId;
    return true;
}

function clearUserLocalBackup(userId) {
    if (!userId) return;
    Object.values(STORAGE_KEYS).forEach(key => {
        const storageKey = getUserStorageKey(key, userId);
        if (storageKey) localStorage.removeItem(storageKey);
    });
}

function saveData() {
    const token = getAuthToken();
    const userId = getAuthUser()?.id;

    if (!token || !userId) {
        return;
    }

    saveLocalBackup();

    if (!databaseReady || databaseUserId !== userId) {
        return;
    }

    const payload = getDatabasePayload();
    const generation = dataSessionGeneration;

    databaseSaveQueue = databaseSaveQueue
        .then(async () => {
            // Never let a queued save from an old account/state run under a new account.
            if (generation !== dataSessionGeneration || getAuthToken() !== token || getAuthUser()?.id !== userId) {
                return;
            }

            const response = await fetch("/api/data", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 401) {
                clearAuthData();
                showLoginScreen();
                throw new Error("Authentication expired.");
            }

            if (!response.ok) {
                throw new Error(`Database save failed: ${response.status}`);
            }
        })
        .catch(error => {
            console.error("Database save failed:", error);
            if (getAuthUser()?.id === userId) {
                showToast("Could not save to the database. Your local backup is still available.", "error");
            }
        });
}

async function loadDatabaseData() {
    const token = getAuthToken();
    const userId = getAuthUser()?.id;

    if (!token || !userId) {
        resetUserDataInMemory();
        return;
    }

    try {
        const response = await fetch("/api/data", {
            cache: "no-store",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.status === 401) {
            clearAuthData();
            showLoginScreen();
            throw new Error("AUTHENTICATION_REQUIRED");
        }

        if (!response.ok) {
            throw new Error(`Database load failed: ${response.status}`);
        }

        const data = await response.json();

        // Only accept data if the same account is still active.
        if (getAuthToken() !== token || getAuthUser()?.id !== userId) {
            return;
        }

        tasks = Array.isArray(data.tasks) ? data.tasks : [];
        subjects = Array.isArray(data.subjects) ? data.subjects : [];
        const serverPdfs = Array.isArray(data.pdfs) ? data.pdfs : [];
        const pdfsBySubject = new Map();
        serverPdfs.forEach(pdf => {
            if (!pdf?.subjectId || !pdf?.id) return;
            if (!pdfsBySubject.has(pdf.subjectId)) pdfsBySubject.set(pdf.subjectId, []);
            pdfsBySubject.get(pdf.subjectId).push({
                id: pdf.id,
                name: pdf.name || "AceArch document.pdf",
                type: pdf.type || "application/pdf",
                size: Number(pdf.size) || 0,
                createdAt: pdf.createdAt || new Date().toISOString()
            });
        });
        subjects.forEach(subject => {
            const cloudNotes = pdfsBySubject.get(subject.id) || [];
            const localNotes = Array.isArray(subject.notes) ? subject.notes : [];
            const byId = new Map(localNotes.map(note => [note.id, note]));
            cloudNotes.forEach(note => byId.set(note.id, { ...byId.get(note.id), ...note }));
            subject.notes = Array.from(byId.values());
        });
        notifications = Array.isArray(data.notifications) ? data.notifications : [];
        calendarItems = Array.isArray(data.calendarItems) ? data.calendarItems : [];
        focusSessions = Array.isArray(data.focusSessions) ? data.focusSessions : [];
        settings = { ...defaultSettings, ...(data.settings || {}) };
        if (settings.font === "Cinzel") settings.font = defaultSettings.font;

        databaseReady = true;
        databaseUserId = userId;
        saveLocalBackup();

        applyCustomization();
        renderAll();
        renderFocusPage();
        showAppForSession();

    } catch (error) {
        if (error.message === "AUTHENTICATION_REQUIRED") {
            return;
        }

        console.error("Database load failed:", error);
        databaseReady = false;
        databaseUserId = userId;
        loadUserLocalBackup(userId);
        applyCustomization();
        renderAll();
        renderFocusPage();
        showToast("Database unavailable. AceArch is using this account's local backup data.", "error");
    }
}

let databaseLoadPromise = Promise.resolve();

async function startAuthenticatedDatabaseLoad() {
    const token = getAuthToken();
    const userId = getAuthUser()?.id;

    if (!token || !userId) {
        databaseLoadPromise = Promise.resolve();
        return;
    }

    // Invalidate any previous account's state before loading the new account.
    databaseReady = false;
    databaseUserId = null;
    databaseLoadPromise = loadDatabaseData();
    await databaseLoadPromise;
    if (databaseReady && databaseUserId === userId) {
        await syncLocalPdfsToServer();
    }
}

/* =========================================================
   SAVE
========================================================= */


/* =========================================================
   HELPERS
========================================================= */

function createId() {

    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2, 10)
    );

}


function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;

}


function todayString() {

    const date = new Date();

    return [
        date.getFullYear(),

        String(
            date.getMonth() + 1
        ).padStart(2, "0"),

        String(
            date.getDate()
        ).padStart(2, "0")

    ].join("-");

}


function formatDate(dateString) {

    if (!dateString) {
        return "";
    }

    const date =
        new Date(
            `${dateString}T00:00:00`
        );

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    const options = {
        month: "short",
        day: "numeric",
        year: "numeric"
    };

    return date.toLocaleDateString(
        undefined,
        options
    );

}


function formatFullDate(dateString) {

    if (!dateString) {
        return "";
    }

    const date =
        new Date(
            `${dateString}T00:00:00`
        );

    return date.toLocaleDateString(
        undefined,
        {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        }
    );

}


function formatMinutes(minutes) {

    minutes =
        Number(minutes) || 0;

    if (minutes < 60) {
        return `${minutes}m`;
    }

    const hours =
        Math.floor(minutes / 60);

    const remaining =
        minutes % 60;

    return remaining
        ? `${hours}h ${remaining}m`
        : `${hours}h`;

}


function dateToString(date) {

    return [
        date.getFullYear(),

        String(
            date.getMonth() + 1
        ).padStart(2, "0"),

        String(
            date.getDate()
        ).padStart(2, "0")

    ].join("-");

}


function getDateFromString(value) {

    return new Date(
        `${value}T00:00:00`
    );

}


function isPastDate(value) {

    return value < todayString();

}


function showToast(message, type = "info") {
    // AceArch no longer uses bottom-right toast popups.
    // Important actions use the existing confirmation/modal UI, while
    // background failures remain available in the developer console.
    if (type === "error") {
        console.warn("AceArch:", message);
    }
}


let confirmationResolver = null;

function confirmAction(message, options = {}) {
    const force = options.force === true;
    if (!force && !settings.confirmDelete) {
        return Promise.resolve(true);
    }

    return new Promise(resolve => {
        const overlay = document.querySelector("#confirmationModal");
        const messageElement = document.querySelector("#confirmationMessage");
        const titleElement = document.querySelector("#confirmationTitle");
        const confirmButton = document.querySelector("#confirmationConfirm");

        if (!overlay || !messageElement) {
            resolve(true);
            return;
        }

        confirmationResolver = resolve;
        messageElement.textContent = message;
        if (titleElement) titleElement.textContent = options.title || "Are you sure?";
        if (confirmButton) confirmButton.textContent = options.confirmText || "Yes, Delete";
        openModal("#confirmationModal");
    });
}

function closeConfirmation(result) {
    if (confirmationResolver) {
        const resolve = confirmationResolver;
        confirmationResolver = null;
        resolve(result);
    }

    closeModal("#confirmationModal");
}

/*
 * Confirmation modal lives after the app.js script in index.html, so direct
 * querySelector listeners can run before those buttons exist. Use delegated
 * listeners instead so the buttons always work.
 */
document.addEventListener("click", event => {

    const confirmButton =
        event.target.closest("#confirmationConfirm");

    if (confirmButton) {
        event.preventDefault();
        closeConfirmation(true);
        return;
    }

    const cancelButton =
        event.target.closest("#confirmationCancel");

    if (cancelButton) {
        event.preventDefault();
        closeConfirmation(false);
    }

});


/* =========================================================
   DISABLE RIGHT CLICK
========================================================= */

document.addEventListener(
    "contextmenu",
    event => {
        event.preventDefault();
    }
);


/* =========================================================
   NAVIGATION
========================================================= */

const sections = {

    dashboard:
        document.querySelector(
            "#dashboardSection"
        ),

    tasks:
        document.querySelector(
            "#tasksSection"
        ),

    calendar:
        document.querySelector(
            "#calendarSection"
        ),

    subjects:
        document.querySelector(
            "#subjectsSection"
        ),

    focus:
        document.querySelector(
            "#focusSection"
        ),

    analytics:
        document.querySelector(
            "#analyticsSection"
        ),

    settings:
        document.querySelector(
            "#settingsSection"
        )

};


const pageTitles = {

    dashboard: "Dashboard",
    tasks: "Tasks",
    calendar: "Calendar",
    subjects: "Subjects",
    focus: "Focus",
    analytics: "Analytics",
    settings: "Settings"

};


let navigationRenderToken = 0;

function navigate(section) {

    if (!sections[section]) {
        return;
    }

    Object.values(sections)
        .forEach(element => {

            element?.classList.remove(
                "active-section"
            );

        });


    sections[section]
        .classList.add(
            "active-section"
        );


    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.section === section
            );

        });


    const title =
        document.querySelector(
            "#pageTitle"
        );

    const resolvedTitle = pageTitles[section] || "AceArch";
    if (title) title.textContent = resolvedTitle;
    const mobileTitle = document.querySelector("#mobilePageTitle");
    if (mobileTitle) mobileTitle.textContent = resolvedTitle;


    closeSidebar();


    const renderToken = ++navigationRenderToken;

    window.scrollTo({
        top: 0,
        behavior: "auto"
    });


    switch (section) {

        case "dashboard":
            renderDashboard();
            break;

        case "tasks":
            renderTasks();
            break;

        case "calendar":
            renderCalendar();
            break;

        case "subjects":
            renderSubjects();
            break;

        case "focus":
            renderFocusPage();
            break;

        case "analytics":
            // Wait until the section is visible and laid out before starting the
            // SVG animation. Ignore stale callbacks when the user clicks rapidly.
            requestAnimationFrame(() => {
                if (renderToken !== navigationRenderToken) return;
                if (!sections.analytics?.classList.contains("active-section")) return;
                renderAnalytics();
            });
            break;

        case "settings":
            loadSettingsUI();
            break;

    }

}


document
    .querySelectorAll(".nav-item")
    .forEach(item => {

        item.addEventListener(
            "click",
            event => {

                event.preventDefault();

                navigate(
                    item.dataset.section
                );

            }
        );

    });


/* =========================================================
   MOBILE SIDEBAR
========================================================= */

const sidebar =
    document.querySelector(
        "#sidebar"
    );

const sidebarOverlay =
    document.querySelector(
        "#sidebarOverlay"
    );


function openSidebar() {

    sidebar?.classList.add(
        "open"
    );

    sidebarOverlay?.classList.add(
        "show"
    );

}


function closeSidebar() {

    sidebar?.classList.remove(
        "open"
    );

    sidebarOverlay?.classList.remove(
        "show"
    );

}


document
    .querySelector(
        "#menuButton"
    )
    ?.addEventListener(
        "click",
        openSidebar
    );


sidebarOverlay?.addEventListener(
    "click",
    closeSidebar
);


/* =========================================================
   CURRENT DATE
========================================================= */

function updateCurrentDate() {

    const element =
        document.querySelector(
            "#currentDate"
        );

    if (!element) {
        return;
    }

    const formatted = new Date().toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });
    element.textContent = formatted;

}


updateCurrentDate();


/* =========================================================
   MODALS
========================================================= */

function openModal(id) {

    const modal =
        document.querySelector(id);

    if (!modal) {
        return;
    }

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");

}


function closeModal(id) {

    const modal =
        document.querySelector(id);

    if (!modal) {
        return;
    }

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");

}


document.addEventListener("click", event => {
    const button = event.target.closest?.("[data-close-modal]");
    if (!button) return;

    const modal = button.closest(".modal-overlay");
    if (modal) {
        closeModal(`#${modal.id}`);
    }
});


document
    .querySelectorAll(
        "[data-close-calendar]"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => closeModal(
                "#calendarModal"
            )
        );

    });


document
    .querySelectorAll(
        "[data-close-subject]"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => closeModal(
                "#subjectModal"
            )
        );

    });


document
    .querySelectorAll(
        ".modal-overlay"
    )
    .forEach(overlay => {

        overlay.addEventListener(
            "click",
            event => {

                if (
                    event.target === overlay
                ) {

                    overlay.classList.remove(
                        "show"
                    );

                }

            }
        );

    });


/* =========================================================
   ACTION BUTTONS
========================================================= */

document
    .querySelectorAll(
        "[data-action]"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const action =
                    button.dataset.action;

                switch (action) {

                    case "add-task":
                        prepareTaskModal();
                        openModal(
                            "#taskModal"
                        );
                        break;

                    case "focus":
                        navigate("focus");
                        break;

                    case "calendar":
                        navigate("calendar");
                        break;

                    case "subject":
                        prepareSubjectModal();
                        openModal(
                            "#subjectModal"
                        );
                        break;

                    case "subjects":
                        navigate("subjects");
                        break;

                }

            }
        );

    });


document
    .querySelector(
        "#dashboardAddTask"
    )
    ?.addEventListener(
        "click",
        () => {

            prepareTaskModal();

            openModal(
                "#taskModal"
            );

        }
    );


document
    .querySelector(
        "#tasksAddButton"
    )
    ?.addEventListener(
        "click",
        () => {

            prepareTaskModal();

            openModal(
                "#taskModal"
            );

        }
    );


/* =========================================================
   TASK MODAL
========================================================= */

let editingTaskId = null;


function prepareTaskModal() {

    editingTaskId = null;

    const form =
        document.querySelector(
            "#taskForm"
        );

    if (!form) {
        return;
    }

    form.reset();

    const date =
        document.querySelector(
            "#taskDate"
        );

    if (date) {

        date.min =
            todayString();

    }

    const heading =
        form.closest(".modal")
            ?.querySelector("h2");

    if (heading) {
        heading.textContent =
            "Add Task";
    }

    const submit =
        form.querySelector(
            "[type='submit']"
        );

    if (submit) {
        submit.textContent =
            "Create Task";
    }

}


function editTask(taskId) {

    const task =
        tasks.find(
            item => item.id === taskId
        );

    if (!task) {
        return;
    }

    editingTaskId =
        taskId;

    const title =
        document.querySelector(
            "#taskTitle"
        );

    const subject =
        document.querySelector(
            "#taskSubject"
        );

    const date =
        document.querySelector(
            "#taskDate"
        );

    const priority =
        document.querySelector(
            "#taskPriority"
        );

    const description =
        document.querySelector(
            "#taskDescription"
        );


    if (title) {
        title.value =
            task.title || "";
    }

    if (subject) {
        subject.value =
            task.subject || "";
    }

    if (date) {

        date.value =
            task.deadline || "";

        date.min =
            todayString();

    }

    if (priority) {
        priority.value =
            task.priority || "medium";
    }

    if (description) {
        description.value =
            task.description || "";
    }


    const heading =
        document.querySelector(
            "#taskModal h2"
        );

    if (heading) {
        heading.textContent =
            "Edit Task";
    }


    const submit =
        document.querySelector(
            "#taskForm [type='submit']"
        );

    if (submit) {
        submit.textContent =
            "Save Changes";
    }


    openModal(
        "#taskModal"
    );

}


async function deleteTask(taskId) {

    const task =
        tasks.find(
            item => item.id === taskId
        );

    if (!task) {
        return;
    }

    if (!(await confirmAction(`Delete "${task.title}"?`))) {
        return;
    }

    tasks =
        tasks.filter(
            item => item.id !== taskId
        );


    calendarItems =
        calendarItems.filter(
            item =>
                item.taskId !== taskId
        );


    saveData();

    renderAll();

    showToast(
        "Task deleted.",
        "success"
    );

}


function toggleTask(taskId, completed) {

    const task =
        tasks.find(
            item => item.id === taskId
        );

    if (!task) {
        return;
    }

    task.completed = completed;
    task.completedAt = completed ? new Date().toISOString() : null;
    task.updatedAt = new Date().toISOString();
    saveData();

    renderAll();

}


/* =========================================================
   TASK FORM
========================================================= */

document
    .querySelector(
        "#taskForm"
    )
    ?.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            const title =
                document
                    .querySelector(
                        "#taskTitle"
                    )
                    ?.value
                    .trim();


            const subject =
                document
                    .querySelector(
                        "#taskSubject"
                    )
                    ?.value
                    .trim();


            const deadline =
                document
                    .querySelector(
                        "#taskDate"
                    )
                    ?.value;


            const priority =
                document
                    .querySelector(
                        "#taskPriority"
                    )
                    ?.value ||
                "medium";


            const description =
                document
                    .querySelector(
                        "#taskDescription"
                    )
                    ?.value
                    .trim();


            if (!title || !deadline) {

                showToast(
                    "Please enter a title and deadline.",
                    "error"
                );

                return;

            }


            /* NEVER allow a deadline before today */

            if (
                deadline <
                todayString()
            ) {

                showToast(
                    "Task deadlines cannot be before today.",
                    "error"
                );

                return;

            }


            /* EDIT EXISTING TASK */

            if (editingTaskId) {

                const task =
                    tasks.find(
                        item =>
                            item.id ===
                            editingTaskId
                    );

                if (!task) {
                    return;
                }

                const oldDeadline =
                    task.deadline;

                task.title =
                    title;

                task.subject =
                    subject;

                task.deadline =
                    deadline;

                task.priority =
                    priority;

                task.description =
                    description;

                task.updatedAt =
                    new Date().toISOString();


                if (
                    oldDeadline !==
                    deadline
                ) {

                    const calendarItem =
                        calendarItems.find(
                            item =>
                                item.taskId ===
                                task.id
                        );

                    if (calendarItem) {

                        calendarItem.date =
                            deadline;

                    }

                }


                saveData();

                event.target.reset();

                closeModal(
                    "#taskModal"
                );

                editingTaskId =
                    null;

                renderAll();

                showToast(
                    "Task updated.",
                    "success"
                );

                return;

            }


            /* CREATE NEW TASK */

            const task = {

                id: createId(),

                title,

                subject,

                deadline,

                priority,

                description,

                completed: false,

                createdAt:
                    new Date().toISOString(),

                updatedAt:
                    null,

                completedAt:
                    null

            };


            tasks.push(task);


            if (
                settings.autoCalendarTasks
            ) {

                calendarItems.push({

                    id: createId(),

                    title,

                    date: deadline,

                    type: "task",

                    taskId: task.id

                });

            }


            saveData();


            event.target.reset();

            closeModal(
                "#taskModal"
            );

            renderAll();

            navigate("tasks");

            showToast(
                "Task created.",
                "success"
            );

        }
    );


/* =========================================================
   TASK DETAILS VIEW
========================================================= */

if (!document.querySelector("#acearchTaskDetailsStyles")) {

    const style =
        document.createElement("style");

    style.id =
        "acearchTaskDetailsStyles";

    style.textContent = `
        .task-details-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 16px;
        }

        .task-details-grid .card,
        .task-description-card {
            margin: 0;
        }

        .task-description-text {
            white-space: pre-wrap;
            overflow-wrap: anywhere;
            line-height: 1.6;
        }

        @media (max-width: 600px) {
            .task-details-grid {
                grid-template-columns: 1fr;
            }
        }
    `;

    document.head.appendChild(style);

}


/* =========================================================
   TASK RENDERING
========================================================= */

function openTaskDetails(taskId) {

    const task =
        tasks.find(
            item => item.id === taskId
        );

    if (!task) {
        return;
    }

    let overlay =
        document.querySelector(
            "#taskDetailsModal"
        );

    if (!overlay) {

        overlay =
            document.createElement("div");

        overlay.id =
            "taskDetailsModal";

        overlay.className =
            "modal-overlay";

        overlay.innerHTML = `
            <div
                class="modal modal-large"
                role="dialog"
                aria-modal="true"
                aria-labelledby="taskDetailsTitle"
            >
                <div class="modal-header">
                    <div>
                        <p class="card-eyebrow">TASK DETAILS</p>
                        <h2 id="taskDetailsTitle"></h2>
                    </div>

                    <button
                        class="close-modal"
                        id="taskDetailsClose"
                        type="button"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div id="taskDetailsContent"></div>

                <div class="confirmation-actions">
                    <button
                        class="secondary-button"
                        id="taskDetailsEdit"
                        type="button"
                    >
                        Edit Task
                    </button>

                    <button
                        class="danger-button"
                        id="taskDetailsDelete"
                        type="button"
                    >
                        Delete Task
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.addEventListener(
            "click",
            event => {

                if (
                    event.target === overlay ||
                    event.target.closest("#taskDetailsClose")
                ) {
                    closeModal("#taskDetailsModal");
                }

            }
        );

        overlay
            .querySelector("#taskDetailsEdit")
            ?.addEventListener(
                "click",
                () => {

                    closeModal(
                        "#taskDetailsModal"
                    );

                    editTask(taskId);

                }
            );

        overlay
            .querySelector("#taskDetailsDelete")
            ?.addEventListener(
                "click",
                async () => {

                    closeModal(
                        "#taskDetailsModal"
                    );

                    await deleteTask(taskId);

                }
            );

    }

    const title =
        overlay.querySelector(
            "#taskDetailsTitle"
        );

    const content =
        overlay.querySelector(
            "#taskDetailsContent"
        );

    if (title) {
        title.textContent =
            task.title || "Task";
    }

    if (content) {

        const description =
            task.description?.trim() ||
            "No description added.";

        const subject =
            task.subject?.trim() ||
            "No subject";

        const status =
            task.completed
                ? "Completed"
                : "Active";

        content.innerHTML = `
            <div class="task-details-grid">

                <div class="card">
                    <p class="card-eyebrow">SUBJECT</p>
                    <p>${escapeHTML(subject)}</p>
                </div>

                <div class="card">
                    <p class="card-eyebrow">DEADLINE</p>
                    <p>${escapeHTML(formatDate(task.deadline))}</p>
                </div>

                <div class="card">
                    <p class="card-eyebrow">PRIORITY</p>
                    <p>${escapeHTML(task.priority || "Medium")}</p>
                </div>

                <div class="card">
                    <p class="card-eyebrow">STATUS</p>
                    <p>${escapeHTML(status)}</p>
                </div>

            </div>

            <div class="card task-description-card">
                <p class="card-eyebrow">DESCRIPTION</p>
                <p class="task-description-text">${escapeHTML(description)}</p>
            </div>
        `;

    }

    openModal(
        "#taskDetailsModal"
    );

}


function taskHTML(task) {

    const overdue =
        !task.completed &&
        task.deadline <
        todayString();

    return `

        <div
            class="task ${task.completed ? "completed" : ""}"
            data-task-id="${escapeHTML(task.id)}">

            <input
                type="checkbox"
                data-task-check="${escapeHTML(task.id)}"
                ${task.completed ? "checked" : ""}
                aria-label="Complete task"
            >

            <div class="task-content">

                <div class="task-title">
                    ${escapeHTML(task.title)}
                </div>

                <div class="task-meta">

                    ${escapeHTML(
        task.subject ||
        "No subject"
    )}

                    · Due ${escapeHTML(
        formatDate(task.deadline)
    )}

                    · ${escapeHTML(
        task.priority
    )}

                    ${overdue
            ? ` · <strong>Overdue</strong>`
            : ""
        }

                </div>

            </div>

            <div class="task-actions">

                <button
                    type="button"
                    class="task-edit"
                    data-task-edit="${escapeHTML(task.id)}"
                    title="Edit task"
                    aria-label="Edit task">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19.5 8.5a2.12 2.12 0 0 0-3-3L5 17v3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m14.5 7.5 2 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                    <span>Edit</span>
                </button>

                <button
                    type="button"
                    class="task-delete"
                    data-task-delete="${escapeHTML(task.id)}"
                    title="Delete task"
                    aria-label="Delete task">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v6m4-6v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>

            </div>

        </div>

    `;

}


function renderTasks() {

    const list =
        document.querySelector(
            "#fullTaskList"
        );

    const empty =
        document.querySelector(
            "#tasksEmpty"
        );


    if (!list) {
        return;
    }


    const search =
        document
            .querySelector(
                "#taskSearch"
            )
            ?.value
            .toLowerCase()
            .trim() ||
        "";


    const filter =
        document
            .querySelector(
                "#taskFilter"
            )
            ?.value ||
        "all";


    const priorityFilter =
        document
            .querySelector(
                "#taskPriorityFilter"
            )
            ?.value ||
        "all";


    const today =
        todayString();


    const filtered =
        tasks.filter(task => {

            const title =
                (
                    task.title ||
                    ""
                ).toLowerCase();

            const subject =
                (
                    task.subject ||
                    ""
                ).toLowerCase();

            const description =
                (
                    task.description ||
                    ""
                ).toLowerCase();


            const matchesSearch =
                title.includes(search) ||
                subject.includes(search) ||
                description.includes(search);


            const matchesFilter =
                filter === "all" ||

                (
                    filter === "active" &&
                    !task.completed
                ) ||

                (
                    filter === "completed" &&
                    task.completed
                ) ||

                (
                    filter === "overdue" &&
                    !task.completed &&
                    task.deadline < today
                );


            const matchesPriority =
                priorityFilter === "all" ||
                task.priority ===
                priorityFilter;


            return (
                matchesSearch &&
                matchesFilter &&
                matchesPriority
            );

        });


    list.innerHTML =
        filtered
            .map(taskHTML)
            .join("");


    if (empty) {

        empty.style.display =
            filtered.length === 0
                ? "flex"
                : "none";

    }


    updateStats();

}


document
    .querySelector(
        "#taskSearch"
    )
    ?.addEventListener(
        "input",
        renderTasks
    );


document
    .querySelector(
        "#taskFilter"
    )
    ?.addEventListener(
        "change",
        renderTasks
    );


document
    .querySelector(
        "#taskPriorityFilter"
    )
    ?.addEventListener(
        "change",
        renderTasks
    );


document.addEventListener(
    "change",
    event => {

        const checkbox =
            event.target.closest(
                "[data-task-check]"
            );

        if (!checkbox) {
            return;
        }

        toggleTask(
            checkbox.dataset.taskCheck,
            checkbox.checked
        );

    }
);


document.addEventListener(
    "click",
    event => {

        const taskCard =
            event.target.closest(
                "[data-task-id]"
            );

        if (
            taskCard &&
            !event.target.closest(
                "button, input, a, [data-task-check]"
            )
        ) {

            openTaskDetails(
                taskCard.dataset.taskId
            );

            return;

        }

        const editButton =
            event.target.closest(
                "[data-task-edit]"
            );

        if (editButton) {

            editTask(
                editButton.dataset.taskEdit
            );

            return;

        }


        const deleteButton =
            event.target.closest(
                "[data-task-delete]"
            );

        if (deleteButton) {

            deleteTask(
                deleteButton.dataset.taskDelete
            );

        }

    }
);


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

    const today =
        todayString();


    const todayTasks =
        tasks.filter(
            task =>
                task.deadline === today
        );


    const taskList =
        document.querySelector(
            "#dashboardTaskList"
        );


    const taskEmpty =
        document.querySelector(
            "#dashboardTaskEmpty"
        );


    if (taskList) {

        taskList.innerHTML =
            todayTasks
                .map(taskHTML)
                .join("");

    }


    if (taskEmpty) {

        taskEmpty.style.display =
            todayTasks.length
                ? "none"
                : "block";

    }


    const upcoming =
        [...calendarItems]
            .filter(
                item =>
                    item.date >= today
            )
            .sort(
                (a, b) =>
                    a.date.localeCompare(
                        b.date
                    )
            )
            .slice(0, 5);


    const upcomingList =
        document.querySelector(
            "#dashboardUpcoming"
        );


    const upcomingEmpty =
        document.querySelector(
            "#dashboardUpcomingEmpty"
        );


    if (upcomingList) {

        upcomingList.innerHTML =
            upcoming
                .map(item => `

                    <div class="calendar-item">

                        <strong>
                            ${escapeHTML(
                    item.title
                )}
                        </strong>

                        <small>
                            ${escapeHTML(
                    formatDate(
                        item.date
                    )
                )}
                            ·
                            ${escapeHTML(
                    item.type
                )}
                        </small>

                    </div>

                `)
                .join("");

    }


    if (upcomingEmpty) {

        upcomingEmpty.style.display =
            upcoming.length
                ? "none"
                : "block";

    }


    renderDashboardSubjects();

    renderWeeklyBars();

    updateStats();

}


function renderDashboardSubjects() {

    const container =
        document.querySelector(
            "#dashboardSubjects"
        );

    const empty =
        document.querySelector(
            "#dashboardSubjectsEmpty"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        subjects
            .slice(0, 5)
            .map(subject => {

                const count =
                    tasks.filter(
                        task =>
                            task.subject ===
                            subject.name
                    ).length;

                return `

                    <div class="task">

                        <span
                            class="subject-color"
                            style="background:${escapeHTML(subject.color)}">
                        </span>

                        <div class="task-content">

                            <div class="task-title">
                                ${escapeHTML(
                    subject.name
                )}
                            </div>

                            <div class="task-meta">
                                ${count}
                                ${count === 1 ? "task" : "tasks"}
                            </div>

                        </div>

                    </div>

                `;

            })
            .join("");


    if (empty) {

        empty.style.display =
            subjects.length
                ? "none"
                : "block";

    }

}


/* =========================================================
   STATS
========================================================= */

function calculateStudyStreak() {

    const completedDates =
        new Set(
            tasks
                .filter(
                    task =>
                        task.completed
                )
                .map(task => {

                    if (
                        task.completedAt
                    ) {

                        return task.completedAt
                            .slice(0, 10);

                    }

                    return task.createdAt
                        ?.slice(0, 10);

                })
                .filter(Boolean)
        );


    let streak = 0;

    const date =
        new Date();


    while (true) {

        const value =
            dateToString(date);

        if (
            !completedDates.has(value)
        ) {
            break;
        }

        streak++;

        date.setDate(
            date.getDate() - 1
        );

    }


    return streak;

}


function updateStats() {

    const completed =
        tasks.filter(
            task => task.completed
        ).length;


    const totalMinutes =
        focusSessions.reduce(
            (sum, session) =>
                sum +
                (
                    Number(
                        session.minutes
                    ) || 0
                ),
            0
        );


    const completion =
        tasks.length
            ? Math.round(
                (
                    completed /
                    tasks.length
                ) * 100
            )
            : 0;


    const streak =
        calculateStudyStreak();


    const completedElement =
        document.querySelector(
            "#completedTasksStat"
        );

    if (completedElement) {
        completedElement.textContent =
            completed;
    }


    const streakElement =
        document.querySelector(
            "#studyStreakStat"
        );

    if (streakElement) {
        streakElement.textContent =
            streak;
    }


    const studyTimeElement =
        document.querySelector(
            "#studyTimeStat"
        );

    if (studyTimeElement) {

        studyTimeElement.textContent =
            formatMinutes(
                totalMinutes
            );

    }


    const productivityElement =
        document.querySelector(
            "#productivityStat"
        );

    if (productivityElement) {

        productivityElement.textContent =
            `${completion}%`;

    }


    const analyticsTasks =
        document.querySelector(
            "#analyticsTasks"
        );

    if (analyticsTasks) {
        analyticsTasks.textContent =
            completed;
    }


    const analyticsFocus =
        document.querySelector(
            "#analyticsFocus"
        );

    if (analyticsFocus) {

        analyticsFocus.textContent =
            `${totalMinutes}m`;

    }


    const analyticsSubjects =
        document.querySelector(
            "#analyticsSubjects"
        );

    if (analyticsSubjects) {

        analyticsSubjects.textContent =
            subjects.length;

    }


    const analyticsCompletion =
        document.querySelector(
            "#analyticsCompletion"
        );

    if (analyticsCompletion) {

        analyticsCompletion.textContent =
            `${completion}%`;

    }

}


/* =========================================================
   CALENDAR
========================================================= */

let calendarDate =
    new Date();

let selectedCalendarDate =
    todayString();


function renderCalendar() {

    const grid =
        document.querySelector(
            "#calendarGrid"
        );

    const title =
        document.querySelector(
            "#calendarMonth"
        );


    if (!grid || !title) {
        return;
    }


    const year =
        calendarDate.getFullYear();

    const month =
        calendarDate.getMonth();


    title.textContent =
        calendarDate.toLocaleDateString(
            undefined,
            {
                month: "long",
                year: "numeric"
            }
        );


    const firstDay =
        new Date(
            year,
            month,
            1
        );


    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();
    // AceArch uses Monday as the fixed calendar start.
    let startingDay = firstDay.getDay();
    startingDay = startingDay === 0 ? 6 : startingDay - 1;


    grid.innerHTML = "";


    for (
        let i = 0;
        i < startingDay;
        i++
    ) {

        const previousDate =
            new Date(
                year,
                month,
                -startingDay + i + 1
            );

        grid.appendChild(
            createCalendarDay(
                previousDate,
                true
            )
        );

    }


    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const date =
            new Date(
                year,
                month,
                day
            );

        grid.appendChild(
            createCalendarDay(
                date,
                false
            )
        );

    }


    while (
        grid.children.length < 42
    ) {

        const nextDay =
            grid.children.length -
            startingDay -
            daysInMonth +
            1;

        const nextDate =
            new Date(
                year,
                month,
                daysInMonth + nextDay
            );

        grid.appendChild(
            createCalendarDay(
                nextDate,
                true
            )
        );

    }


    renderSelectedDate();

}


function getCalendarItemsForDate(dateString) {
    const explicit = calendarItems.filter(item => item.date === dateString);
    const existingTaskIds = new Set(explicit.filter(item => item.taskId).map(item => item.taskId));
    const derived = settings.autoCalendarTasks !== false
        ? tasks.filter(task => task?.deadline === dateString && task?.id && !existingTaskIds.has(task.id)).map(task => ({
            id: `derived-${task.id}`,
            title: task.title,
            date: task.deadline,
            type: "task",
            taskId: task.id,
            derived: true
        }))
        : [];
    return [...explicit, ...derived];
}

function createCalendarDay(date, muted) {
    const button = document.createElement("button");
    const dateString = dateToString(date);

    button.type = "button";
    button.className = "calendar-day";
    if (muted) button.classList.add("muted");
    if (dateString === todayString()) button.classList.add("today");
    if (dateString === selectedCalendarDate) button.classList.add("selected");

    const items = getCalendarItemsForDate(dateString);
    const taskStates = items
        .filter(item => item.taskId)
        .map(item => tasks.find(candidate => candidate.id === item.taskId))
        .filter(Boolean);

    const hasIncompleteTask = taskStates.some(task => !task.completed);
    const hasCompletedTask = taskStates.some(task => Boolean(task.completed));

    if (hasCompletedTask) button.classList.add("has-completed-task");
    if (hasIncompleteTask) button.classList.add("has-incomplete-task");

    let statusMarkup = "";
    if (hasIncompleteTask) {
        statusMarkup += '<span class="day-status day-status-incomplete" aria-label="Incomplete task">×</span>';
    }
    if (hasCompletedTask) {
        statusMarkup += '<span class="day-status day-status-completed" aria-label="Completed task">✓</span>';
    }

    button.innerHTML = `
        <span class="day-number">${date.getDate()}</span>
        ${statusMarkup}
    `;

    button.addEventListener("click", () => {
        selectedCalendarDate = dateString;
        renderCalendar();
    });

    return button;
}

document
    .querySelector(
        "#previousMonth"
    )
    ?.addEventListener(
        "click",
        () => {

            calendarDate.setMonth(
                calendarDate.getMonth() - 1
            );

            renderCalendar();

        }
    );


document
    .querySelector(
        "#nextMonth"
    )
    ?.addEventListener(
        "click",
        () => {

            calendarDate.setMonth(
                calendarDate.getMonth() + 1
            );

            renderCalendar();

        }
    );


function renderSelectedDate() {
    const title = document.querySelector("#selectedDateTitle");
    const container = document.querySelector("#selectedDateItems");
    if (!title || !container) return;

    title.textContent = formatFullDate(selectedCalendarDate);

    const items = getCalendarItemsForDate(selectedCalendarDate);

    container.innerHTML = items.length
        ? items.map(item => {
            const task = item.taskId ? tasks.find(candidate => candidate.id === item.taskId) : null;
            const completed = Boolean(task?.completed);
            return `
                <div class="calendar-item ${completed ? "calendar-task-completed" : ""}">
                    <strong>${escapeHTML(item.title)}</strong>
                    <small>
                        ${escapeHTML(item.type)}
                        ${item.taskId ? " · Task" : ""}
                        ${completed ? " · Completed" : ""}
                    </small>
                </div>
            `;
        }).join("")
        : `
            <div class="empty-state">
                <div class="empty-icon">□</div>
                <h3>Nothing planned</h3>
                <p>Add a reminder, event or task.</p>
            </div>
        `;
}

document
    .querySelector(
        "#addCalendarItem"
    )
    ?.addEventListener(
        "click",
        () => {

            const dateInput =
                document.querySelector(
                    "#calendarItemDate"
                );

            if (dateInput) {

                dateInput.value =
                    selectedCalendarDate;

                dateInput.min =
                    todayString();

            }

            openModal(
                "#calendarModal"
            );

        }
    );


document
    .querySelector(
        "#addSelectedDateItem"
    )
    ?.addEventListener(
        "click",
        () => {

            const dateInput =
                document.querySelector(
                    "#calendarItemDate"
                );

            if (dateInput) {

                dateInput.value =
                    selectedCalendarDate;

                dateInput.min =
                    todayString();

            }

            openModal(
                "#calendarModal"
            );

        }
    );


document
    .querySelector(
        "#calendarForm"
    )
    ?.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            const title =
                document.querySelector(
                    "#calendarItemTitle"
                )?.value.trim();


            const date =
                document.querySelector(
                    "#calendarItemDate"
                )?.value;


            const type =
                document.querySelector(
                    "#calendarItemType"
                )?.value ||
                "reminder";


            if (!title || !date) {

                showToast(
                    "Please enter a title and date.",
                    "error"
                );

                return;

            }


            if (
                date <
                todayString()
            ) {

                showToast(
                    "Calendar dates cannot be before today.",
                    "error"
                );

                return;

            }


            calendarItems.push({

                id: createId(),

                title,

                date,

                type

            });


            saveData();

            event.target.reset();

            closeModal(
                "#calendarModal"
            );

            selectedCalendarDate =
                date;

            renderCalendar();

            renderDashboard();

            showToast(
                "Calendar item added.",
                "success"
            );

        }
    );


/* =========================================================
   SUBJECTS
========================================================= */

let editingSubjectId = null;
let pendingSubjectColor = "#f97316";

function updateSubjectColorUI() {
    const colorInput = document.querySelector("#subjectColor");
    const value = document.querySelector("#subjectColorValue");
    const swatch = document.querySelector("#subjectPreviewSwatch");
    const namePreview = document.querySelector("#subjectPreviewName");
    const nameInput = document.querySelector("#subjectName");

    const color = pendingSubjectColor || colorInput?.value || "#f97316";
    if (colorInput && colorInput.value.toLowerCase() !== color.toLowerCase()) colorInput.value = color;
    if (value) value.textContent = color.toUpperCase();
    if (swatch) swatch.style.background = color;
    if (namePreview) namePreview.textContent = nameInput?.value.trim() || "Your subject";
}

function prepareSubjectModal() {
    editingSubjectId = null;
    const form = document.querySelector("#subjectForm");
    if (form) form.reset();

    pendingSubjectColor = "#f97316";
    const color = document.querySelector("#subjectColor");
    if (color) color.value = pendingSubjectColor;

    const heading = document.querySelector("#subjectModal h2");
    if (heading) heading.textContent = "Add Subject";

    const submit = document.querySelector("#subjectForm [type='submit']");
    if (submit) submit.textContent = "Create Subject";

    updateSubjectColorUI();
}

document.querySelector("#addSubjectButton")?.addEventListener("click", () => {
    prepareSubjectModal();
    openModal("#subjectModal");
});

document.querySelector("#subjectForm")?.addEventListener("submit", event => {
    event.preventDefault();

    const name = document.querySelector("#subjectName")?.value.trim() || "";
    const color = pendingSubjectColor || document.querySelector("#subjectColor")?.value || "#f97316";

    if (!name) {
        showToast("Enter a subject name.", "error");
        document.querySelector("#subjectName")?.focus();
        return;
    }

    const duplicate = subjects.some(subject =>
        String(subject.name || "").toLowerCase() === name.toLowerCase() &&
        subject.id !== editingSubjectId
    );

    if (duplicate) {
        showToast("That subject already exists.", "error");
        return;
    }

    const wasEditing = Boolean(editingSubjectId);

    if (wasEditing) {
        const subject = subjects.find(item => item.id === editingSubjectId);
        if (subject) {
            const oldName = subject.name;
            subject.name = name;
            subject.color = color;
            tasks.forEach(task => {
                if (task.subject === oldName) task.subject = name;
            });
        }
    } else {
        subjects.push({
            id: createId(),
            name,
            color,
            schedule: [],
            notes: [],
            createdAt: new Date().toISOString()
        });
    }

    saveData();
    event.target.reset();
    closeModal("#subjectModal");
    renderSubjects();
    renderDashboard();
    showToast(wasEditing ? "Subject updated." : "Subject created.", "success");
    editingSubjectId = null;
});

document.querySelector("#subjectName")?.addEventListener("input", updateSubjectColorUI);
document.querySelector("#subjectColor")?.addEventListener("input", event => {
    pendingSubjectColor = event.target.value || "#f97316";
    updateSubjectColorUI();
});

document.querySelector("#subjectColor")?.addEventListener("change", event => {
    pendingSubjectColor = event.target.value || "#f97316";
    updateSubjectColorUI();
    event.target.blur();
});

function editSubject(subjectId) {
    const subject = subjects.find(item => item.id === subjectId);
    if (!subject) return;

    editingSubjectId = subjectId;
    const name = document.querySelector("#subjectName");
    const color = document.querySelector("#subjectColor");
    if (name) name.value = subject.name;
    pendingSubjectColor = subject.color || "#f97316";
    if (color) color.value = pendingSubjectColor;

    const heading = document.querySelector("#subjectModal h2");
    if (heading) heading.textContent = "Edit Subject";
    const submit = document.querySelector("#subjectForm [type='submit']");
    if (submit) submit.textContent = "Save Changes";

    updateSubjectColorUI();
    openModal("#subjectModal");
}

async function deleteSubject(subjectId) {
    const subject = subjects.find(item => item.id === subjectId);
    if (!subject) return;

    if (!(await confirmAction(`Delete "${subject.name}"? The subject will be removed. Existing tasks will remain but will no longer be associated with this subject.`))) return;

    tasks.forEach(task => {
        if (task.subject === subject.name) task.subject = "";
    });

    subjects = subjects.filter(item => item.id !== subjectId);
    saveData();
    renderAll();
    showToast("Subject deleted.", "success");
}

/* =========================================================
   SUBJECT WORKSPACE — SCHEDULE + PDF RESOURCES
   The old full-page Subject Planner is intentionally removed.
   Schedule and PDF management now live inside each subject.
========================================================= */

let activeSubjectWorkspaceId = null;

function getActiveSubjectWorkspace() {
    return subjects.find(subject => subject.id === activeSubjectWorkspaceId) || null;
}

function renderSubjectWorkspace() {
    const subject = getActiveSubjectWorkspace();
    if (!subject) return;

    if (!Array.isArray(subject.schedule)) subject.schedule = [];
    if (!Array.isArray(subject.notes)) subject.notes = [];

    const title = document.querySelector("#subjectWorkspaceTitle");
    const subtitle = document.querySelector("#subjectWorkspaceSubtitle");
    const scheduleList = document.querySelector("#workspaceScheduleList");
    const pdfList = document.querySelector("#workspacePdfList");
    const scheduleCount = document.querySelector("#workspaceScheduleCount");
    const pdfCount = document.querySelector("#workspacePdfCount");

    if (title) title.textContent = subject.name;
    if (subtitle) subtitle.textContent = "Manage this subject's schedule and PDF resources.";
    if (scheduleCount) scheduleCount.textContent = String(subject.schedule.length);
    if (pdfCount) pdfCount.textContent = String(subject.notes.length);

    const sortedSchedule = subject.schedule
        .slice()
        .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));

    if (scheduleList) {
        scheduleList.innerHTML = sortedSchedule.length
            ? sortedSchedule.map(scheduleHTML).join("")
            : `<div class="resource-empty"><strong>No schedule yet</strong><span>Add a class, study session, exam or other plan.</span></div>`;
    }

    if (pdfList) {
        pdfList.innerHTML = subject.notes.length
            ? subject.notes.map(noteHTML).join("")
            : `<div class="resource-empty"><strong>No PDF notes yet</strong><span>Upload lecture notes, study material or reference PDFs.</span></div>`;
    }
}

function openSubjectWorkspace(subjectId) {
    const subject = subjects.find(item => item.id === subjectId);
    if (!subject) return;

    activeSubjectWorkspaceId = subjectId;
    renderSubjectWorkspace();
    openModal("#subjectWorkspaceModal");
}

function closeSubjectWorkspace() {
    closeModal("#subjectWorkspaceModal");
    activeSubjectWorkspaceId = null;
}

document.querySelector("#closeSubjectWorkspace")?.addEventListener("click", closeSubjectWorkspace);
document.querySelector("#workspaceAddSchedule")?.addEventListener("click", () => {
    if (activeSubjectWorkspaceId) openScheduleForm(activeSubjectWorkspaceId);
});
document.querySelector("#workspaceAddPdf")?.addEventListener("click", () => {
    document.querySelector("#workspacePdfInput")?.click();
});
document.querySelector("#workspacePdfInput")?.addEventListener("change", event => {
    if (activeSubjectWorkspaceId) handlePdfUpload(activeSubjectWorkspaceId, event);
});

function scheduleHTML(schedule) {
    const type = String(schedule.type || "other").toLowerCase();
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    const startTime = schedule.startTime || schedule.time || "";
    const endTime = schedule.endTime || "";
    const timeLabel = startTime && endTime ? `${startTime} – ${endTime}` : startTime;

    return `
        <article class="schedule-card schedule-type-${escapeHTML(type)}">
            <div class="schedule-date-badge">
                <span>${escapeHTML(getDateFromString(schedule.date).toLocaleDateString(undefined, { month: "short" }))}</span>
                <strong>${escapeHTML(getDateFromString(schedule.date).getDate())}</strong>
            </div>
            <div class="schedule-main">
                <div class="schedule-title-row">
                    <strong>${escapeHTML(schedule.title)}</strong>
                    <span class="schedule-type-pill">${escapeHTML(typeLabel)}</span>
                </div>
                <div class="schedule-meta-row">
                    <span>${escapeHTML(formatDate(schedule.date))}</span>
                    ${timeLabel ? `<span>• ${escapeHTML(timeLabel)}</span>` : ""}
                </div>
                ${schedule.notes ? `<p class="schedule-notes">${escapeHTML(schedule.notes)}</p>` : ""}
            </div>
            <div class="schedule-actions">
                <button type="button" class="schedule-edit-button" data-schedule-edit="${escapeHTML(schedule.id)}" aria-label="Edit ${escapeHTML(schedule.title)}" title="Edit schedule">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19.5 8.5a2.12 2.12 0 0 0-3-3L5 17v3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m14.5 7.5 2 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                </button>
                <button type="button" class="schedule-delete-button" data-schedule-delete="${escapeHTML(schedule.id)}" aria-label="Delete ${escapeHTML(schedule.title)}" title="Delete schedule">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v6m4-6v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
            </div>
        </article>
    `;
}

/* =========================================================
   SCHEDULE FORM
========================================================= */

function openScheduleForm(subjectId, scheduleId = null) {
    const existing = document.querySelector("#scheduleModal");
    if (existing) existing.remove();

    const subject = subjects.find(item => item.id === subjectId);
    if (!subject) return;

    const existingSchedule = Array.isArray(subject.schedule)
        ? subject.schedule.find(item => item.id === scheduleId)
        : null;
    const isEditing = Boolean(existingSchedule);
    const startTime = existingSchedule?.startTime || existingSchedule?.time || "";
    const endTime = existingSchedule?.endTime || "";

    const modal = document.createElement("div");
    modal.id = "scheduleModal";
    modal.className = "modal-overlay show";
    modal.innerHTML = `
        <div class="modal schedule-modal">
            <div class="modal-header">
                <div>
                    <p class="card-eyebrow">SCHEDULE</p>
                    <h2>${isEditing ? "Edit Schedule" : "Add Schedule"}</h2>
                    <p>${escapeHTML(subject.name)}</p>
                </div>
                <button type="button" class="close-modal" id="closeScheduleModal" aria-label="Close">×</button>
            </div>
            <form id="scheduleForm">
                <div class="form-group">
                    <label for="scheduleTitle">Title</label>
                    <input id="scheduleTitle" type="text" required maxlength="120" autocomplete="off" value="${escapeHTML(existingSchedule?.title || "")}" placeholder="e.g. Mathematics lecture">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="scheduleDate">Date</label>
                        <input id="scheduleDate" type="date" min="${todayString()}" required value="${escapeHTML(existingSchedule?.date || "")}">
                    </div>
                    <div class="form-group">
                        <label for="scheduleType">Type</label>
                        <select id="scheduleType">
                            <option value="class" ${existingSchedule?.type === "class" ? "selected" : ""}>Class</option>
                            <option value="study" ${existingSchedule?.type === "study" ? "selected" : ""}>Study</option>
                            <option value="exam" ${existingSchedule?.type === "exam" ? "selected" : ""}>Exam</option>
                            <option value="assignment" ${existingSchedule?.type === "assignment" ? "selected" : ""}>Assignment</option>
                            <option value="other" ${!existingSchedule?.type || existingSchedule?.type === "other" ? "selected" : ""}>Other</option>
                        </select>
                    </div>
                </div>
                <div class="form-row schedule-time-row">
                    <div class="form-group">
                        <label for="scheduleStartTime">Start time</label>
                        <input id="scheduleStartTime" type="time" value="${escapeHTML(startTime)}">
                    </div>
                    <div class="form-group">
                        <label for="scheduleEndTime">End time</label>
                        <input id="scheduleEndTime" type="time" value="${escapeHTML(endTime)}">
                    </div>
                </div>
                <div class="form-group">
                    <label for="scheduleNotes">Notes <span class="optional-label">Optional</span></label>
                    <textarea id="scheduleNotes" rows="3" maxlength="500" placeholder="Room, chapter, preparation, or anything you need to remember">${escapeHTML(existingSchedule?.notes || "")}</textarea>
                </div>
                <div class="schedule-form-hint">This schedule stays inside the subject and syncs to your account.</div>
                <button type="submit" class="submit-task">${isEditing ? "Save Changes" : "Add Schedule"}</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    const close = () => modal.remove();
    document.querySelector("#closeScheduleModal")?.addEventListener("click", close);
    modal.addEventListener("click", event => { if (event.target === modal) close(); });

    document.querySelector("#scheduleForm")?.addEventListener("submit", event => {
        event.preventDefault();
        const title = document.querySelector("#scheduleTitle")?.value.trim() || "";
        const date = document.querySelector("#scheduleDate")?.value || "";
        const startTime = document.querySelector("#scheduleStartTime")?.value || "";
        const endTime = document.querySelector("#scheduleEndTime")?.value || "";
        const type = document.querySelector("#scheduleType")?.value || "other";
        const notes = document.querySelector("#scheduleNotes")?.value.trim() || "";

        if (!title || !date) {
            showToast("Enter a title and date.", "error");
            return;
        }
        if (date < todayString()) {
            showToast("Schedule dates cannot be before today.", "error");
            return;
        }
        if (startTime && endTime && endTime <= startTime) {
            showToast("End time must be after start time.", "error");
            return;
        }

        const now = new Date().toISOString();
        const payload = {
            id: existingSchedule?.id || createId(),
            title,
            date,
            startTime,
            endTime,
            type,
            notes,
            createdAt: existingSchedule?.createdAt || now,
            updatedAt: now
        };

        if (!Array.isArray(subject.schedule)) subject.schedule = [];
        if (isEditing) {
            const index = subject.schedule.findIndex(item => item.id === scheduleId);
            if (index !== -1) subject.schedule[index] = payload;
        } else {
            subject.schedule.push(payload);
        }

        saveData();
        close();
        renderSubjects();
        if (activeSubjectWorkspaceId === subjectId) renderSubjectWorkspace();
        showToast(isEditing ? "Schedule updated." : "Schedule added.", "success");
    });
}

document.addEventListener("click", async event => {
    const editButton = event.target.closest("[data-schedule-edit]");
    if (editButton) {
        if (activeSubjectWorkspaceId) {
            openScheduleForm(activeSubjectWorkspaceId, editButton.dataset.scheduleEdit);
        }
        return;
    }

    const deleteButton = event.target.closest("[data-schedule-delete]");
    if (!deleteButton) return;

    const subject = getActiveSubjectWorkspace();
    if (!subject) return;

    if (!(await confirmAction("Delete this schedule item?"))) return;

    subject.schedule = (subject.schedule || []).filter(item => item.id !== deleteButton.dataset.scheduleDelete);
    saveData();
    renderSubjects();
    renderSubjectWorkspace();
});

function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function noteHTML(note) {
    return `
        <div class="schedule-item pdf-resource-item">
            <div class="pdf-note-info">
                <strong title="${escapeHTML(note.name)}">${escapeHTML(note.name)}</strong>
                <small>${formatBytes(note.size)} · ${formatDate(String(note.createdAt || "").slice(0, 10))}</small>
            </div>
            <div class="pdf-note-actions">
                <button type="button" class="small-button" data-pdf-open="${escapeHTML(note.id)}">Open</button>
                <button type="button" class="small-button" data-pdf-download="${escapeHTML(note.id)}">Download</button>
                <button type="button" class="task-delete" data-pdf-delete="${escapeHTML(note.id)}" aria-label="Delete PDF" title="Delete PDF">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v6m4-6v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
            </div>
        </div>
    `;
}

/* =========================================================
   PDF STORAGE
   IndexedDB is retained as a local fallback. PostgreSQL is primary.
========================================================= */

const PDF_DB_NAME = "AceArchPDFDatabase";
const PDF_STORE_NAME = "notes";

function openPdfDatabase() {
    return new Promise((resolve, reject) => {
        if (!("indexedDB" in window)) {
            reject(new Error("IndexedDB is not supported."));
            return;
        }
        const request = indexedDB.open(PDF_DB_NAME, 1);
        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(PDF_STORE_NAME)) {
                db.createObjectStore(PDF_STORE_NAME, { keyPath: "id" });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function storePdfFile(fileRecord) {
    const db = await openPdfDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PDF_STORE_NAME, "readwrite");
        transaction.objectStore(PDF_STORE_NAME).put(fileRecord);
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
    });
}

async function getPdfFile(id) {
    const db = await openPdfDatabase();
    return new Promise((resolve, reject) => {
        const request = db.transaction(PDF_STORE_NAME, "readonly").objectStore(PDF_STORE_NAME).get(id);
        request.onsuccess = () => { db.close(); resolve(request.result); };
        request.onerror = () => { db.close(); reject(request.error); };
    });
}

async function deletePdfFile(id) {
    const db = await openPdfDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PDF_STORE_NAME, "readwrite");
        transaction.objectStore(PDF_STORE_NAME).delete(id);
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
    });
}

async function getAllLocalPdfFiles() {
    try {
        const db = await openPdfDatabase();
        return await new Promise((resolve, reject) => {
            const request = db.transaction(PDF_STORE_NAME, "readonly").objectStore(PDF_STORE_NAME).getAll();
            request.onsuccess = () => { db.close(); resolve(Array.isArray(request.result) ? request.result : []); };
            request.onerror = () => { db.close(); reject(request.error); };
        });
    } catch {
        return [];
    }
}

async function deletePdfsForSubjects(subjectIds) {
    if (!Array.isArray(subjectIds) || !subjectIds.length) return;
    try {
        const db = await openPdfDatabase();
        await new Promise((resolve, reject) => {
            const transaction = db.transaction(PDF_STORE_NAME, "readwrite");
            const store = transaction.objectStore(PDF_STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => {
                (request.result || []).forEach(record => {
                    if (subjectIds.includes(record.subjectId)) store.delete(record.id);
                });
            };
            request.onerror = () => reject(request.error);
            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
        });
        db.close();
    } catch (error) {
        console.warn("Could not remove local account PDF files:", error);
    }
}

async function uploadPdfToServer(record) {
    const token = getAuthToken();
    if (!token || !record?.blob) throw new Error("Authentication required.");

    const subjectId = encodeURIComponent(record.subjectId || "");
    const name = encodeURIComponent(record.name || "AceArch document.pdf");
    const response = await fetch(`/api/pdfs/${encodeURIComponent(record.id)}?subjectId=${subjectId}&name=${name}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/pdf",
            "Authorization": `Bearer ${token}`
        },
        body: record.blob
    });

    if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `PDF upload failed: ${response.status}`);
    }
    return true;
}

async function fetchServerPdf(id) {
    const token = getAuthToken();
    if (!token) return null;
    const response = await fetch(`/api/pdfs/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store"
    });
    if (!response.ok) return null;
    return await response.blob();
}

async function downloadPdfFromServer(id, name) {
    const blob = await fetchServerPdf(id);
    if (!blob) return false;

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name || "AceArch-document.pdf";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return true;
}

async function openPdfById(id) {
    try {
        let blob = await fetchServerPdf(id);

        if (!blob) {
            const localRecord = await getPdfFile(id);
            blob = localRecord?.blob || null;
        }

        if (!blob) {
            showToast("PDF could not be found on this device or in the cloud.", "error");
            return;
        }

        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener");
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
        console.error("Could not open PDF:", error);
        showToast("Could not open PDF.", "error");
    }
}

async function handlePdfUpload(subjectId, event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
        showToast("Only PDF files are allowed.", "error");
        event.target.value = "";
        return;
    }

    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
        showToast("PDF must be smaller than 25 MB.", "error");
        event.target.value = "";
        return;
    }

    const subject = subjects.find(item => item.id === subjectId);
    if (!subject) return;
    if (!Array.isArray(subject.notes)) subject.notes = [];

    const id = createId();
    const createdAt = new Date().toISOString();
    const record = {
        id,
        blob: file,
        name: file.name,
        type: file.type,
        size: file.size,
        subjectId,
        createdAt
    };

    try {
        // Always keep a local copy first so the existing offline behavior remains safe.
        await storePdfFile(record);

        let cloudSaved = false;
        try {
            cloudSaved = await uploadPdfToServer(record);
        } catch (serverError) {
            console.warn("Cloud PDF upload failed; keeping local copy:", serverError);
        }

        subject.notes.push({
            id,
            name: file.name,
            size: file.size,
            createdAt
        });

        saveData();

        if (activeSubjectWorkspaceId === subjectId) {
            renderSubjectWorkspace();
        }

        showToast(
            cloudSaved
                ? "PDF uploaded and synced across devices."
                : "PDF saved on this device. It will sync when the server is available.",
            cloudSaved ? "success" : "info"
        );
    } catch (error) {
        console.error("PDF upload error:", error);
        showToast("Could not save the PDF.", "error");
    }

    event.target.value = "";
}

async function syncLocalPdfsToServer() {
    const token = getAuthToken();
    const userId = getAuthUser()?.id;
    if (!token || !userId) return;

    try {
        const localFiles = await getAllLocalPdfFiles();
        if (!localFiles.length) return;

        const results = await Promise.allSettled(localFiles.map(async record => {
            try {
                await uploadPdfToServer(record);
                return record.id;
            } catch {
                return null;
            }
        }));

        const synced = results.filter(result => result.status === "fulfilled" && result.value).length;
        if (synced) console.info(`AceArch synced ${synced} local PDF file(s) to PostgreSQL.`);
    } catch (error) {
        console.warn("PDF background sync skipped:", error);
    }
}

document.addEventListener("click", async event => {
    const openButton = event.target.closest("[data-pdf-open]");
    if (openButton) {
        await openPdfById(openButton.dataset.pdfOpen);
        return;
    }

    const downloadButton = event.target.closest("[data-pdf-download]");
    if (downloadButton) {
        const noteId = downloadButton.dataset.pdfDownload;
        const subject = getActiveSubjectWorkspace();
        const note = subject?.notes?.find(item => item.id === noteId);
        const ok = await downloadPdfFromServer(noteId, note?.name);
        if (!ok) {
            try {
                const localRecord = await getPdfFile(noteId);
                if (!localRecord?.blob) throw new Error("missing");
                const url = URL.createObjectURL(localRecord.blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = note?.name || localRecord.name || "AceArch-document.pdf";
                document.body.appendChild(anchor);
                anchor.click();
                anchor.remove();
                setTimeout(() => URL.revokeObjectURL(url), 60000);
            } catch {
                showToast("PDF download failed.", "error");
                return;
            }
        }
        showToast("PDF download started.", "success");
        return;
    }

    const deleteButton = event.target.closest("[data-pdf-delete]");
    if (!deleteButton) return;

    const subject = getActiveSubjectWorkspace();
    if (!subject) return;
    const note = (subject.notes || []).find(item => item.id === deleteButton.dataset.pdfDelete);
    if (!note) return;

    if (!(await confirmAction(`Delete "${note.name}"?`))) return;

    try {
        const token = getAuthToken();
        if (token) {
            await fetch(`/api/pdfs/${encodeURIComponent(note.id)}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
        }
    } catch (error) {
        console.warn("Cloud PDF deletion warning:", error);
    }

    try {
        await deletePdfFile(note.id);
    } catch (error) {
        console.warn("Local PDF deletion warning:", error);
    }

    subject.notes = subject.notes.filter(item => item.id !== note.id);
    saveData();
    renderSubjects();
    renderSubjectWorkspace();
    showToast("PDF removed.", "success");
});

/* =========================================================
   SUBJECT CARDS
========================================================= */

function renderSubjects() {
    const grid = document.querySelector("#subjectsGrid");
    const empty = document.querySelector("#subjectsEmpty");
    if (!grid) return;

    grid.innerHTML = subjects.map(subject => {
        const taskCount = tasks.filter(task => task.subject === subject.name).length;
        const scheduleCount = Array.isArray(subject.schedule) ? subject.schedule.length : 0;
        const noteCount = Array.isArray(subject.notes) ? subject.notes.length : 0;
        const subjectColor = subject.color || "#f97316";

        return `
            <article class="subject-card" data-subject-id="${escapeHTML(subject.id)}" style="--subject-color:${escapeHTML(subjectColor)}">
                <div class="subject-card-top">
                    <span class="subject-color" style="background:${escapeHTML(subjectColor)}"></span>
                    <span class="subject-card-label">SUBJECT</span>
                </div>
                <h3>${escapeHTML(subject.name)}</h3>
                <p>${taskCount} ${taskCount === 1 ? "task" : "tasks"}</p>
                <div class="subject-card-stats">
                    <span>◷ ${scheduleCount} schedule${scheduleCount === 1 ? "" : "s"}</span>
                    <span>▱ ${noteCount} PDF${noteCount === 1 ? "" : "s"}</span>
                </div>
                <div class="subject-card-actions">
                    <button type="button" class="small-button" data-subject-open="${escapeHTML(subject.id)}">Manage</button>
                    <button type="button" class="small-button" data-subject-edit="${escapeHTML(subject.id)}">Edit</button>
                    <button type="button" class="task-delete" data-subject-delete="${escapeHTML(subject.id)}">Delete</button>
                </div>
            </article>
        `;
    }).join("");

    if (empty) empty.style.display = subjects.length ? "none" : "flex";
}

document.addEventListener("click", event => {
    const open = event.target.closest("[data-subject-open]");
    if (open) {
        event.preventDefault();
        event.stopPropagation();
        openSubjectWorkspace(open.dataset.subjectOpen);
        return;
    }

    const edit = event.target.closest("[data-subject-edit]");
    if (edit) {
        editSubject(edit.dataset.subjectEdit);
        return;
    }

    const deleteButton = event.target.closest("[data-subject-delete]");
    if (deleteButton) {
        deleteSubject(deleteButton.dataset.subjectDelete);
    }
});


/* =========================================================
   FOCUS TIMER
========================================================= */

let focusDurationSeconds = 25 * 60;
let focusRemaining = focusDurationSeconds;
let focusInterval = null;
let focusRunning = false;

function renderTimer() {
    const timer = document.querySelector("#focusTimer");
    if (!timer) return;

    const minutes = Math.floor(focusRemaining / 60);
    const seconds = focusRemaining % 60;

    timer.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateFocusInput() {
    const input = document.querySelector("#focusMinutes");
    if (input) {
        input.value = Math.max(1, Math.round(focusDurationSeconds / 60));
    }
}

function setFocusDuration(minutes, showMessage = true) {
    minutes = Number(minutes);

    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 180) {
        showToast("Focus time must be between 1 and 180 minutes.", "error");
        return false;
    }

    if (focusInterval) {
        clearInterval(focusInterval);
        focusInterval = null;
    }

    focusRunning = false;
    focusDurationSeconds = Math.round(minutes * 60);
    focusRemaining = focusDurationSeconds;

    const button = document.querySelector("#focusStart");
    const status = document.querySelector("#focusStatus");

    if (button) button.textContent = "Start";
    if (status) status.textContent = "Ready to focus";

    updateFocusInput();
    renderTimer();

    document.querySelectorAll(".quick-focus-button").forEach(item => {
        item.classList.toggle(
            "selected",
            Number(item.dataset.focusMinutes) === Math.round(minutes)
        );
    });

    if (showMessage) {
        showToast(`${Math.round(minutes)}-minute focus timer set.`, "success");
    }

    return true;
}

function startFocus() {
    if (focusInterval) return;

    if (focusRemaining <= 0) {
        focusRemaining = focusDurationSeconds;
    }

    focusRunning = true;

    const button = document.querySelector("#focusStart");
    const status = document.querySelector("#focusStatus");

    if (button) button.textContent = "Pause";
    if (status) status.textContent = "Focus session in progress";

    focusInterval = setInterval(() => {
        focusRemaining--;
        renderTimer();

        if (focusRemaining <= 0) {
            finishFocus();
        }
    }, 1000);
}

function pauseFocus() {
    if (focusInterval) {
        clearInterval(focusInterval);
        focusInterval = null;
    }

    focusRunning = false;

    const button = document.querySelector("#focusStart");
    const status = document.querySelector("#focusStatus");

    if (button) button.textContent = "Resume";
    if (status) status.textContent = "Session paused";
}

function finishFocus() {
    if (focusInterval) {
        clearInterval(focusInterval);
        focusInterval = null;
    }

    focusRunning = false;

    const minutes = Math.max(1, Math.round(focusDurationSeconds / 60));

    focusSessions.push({
        id: createId(),
        minutes,
        date: todayString(),
        completedAt: new Date().toISOString()
    });

    saveData();

    focusRemaining = focusDurationSeconds;

    const button = document.querySelector("#focusStart");
    const status = document.querySelector("#focusStatus");

    if (button) button.textContent = "Start";
    if (status) status.textContent = "Session complete";

    renderTimer();
    updateFocusStats();
    updateNotifications();
    updateStats();
    renderAnalytics();

    showToast(`${minutes}-minute focus session completed.`, "success");
}

function resetFocus() {
    if (focusInterval) {
        clearInterval(focusInterval);
        focusInterval = null;
    }

    focusRunning = false;
    focusRemaining = focusDurationSeconds;

    const button = document.querySelector("#focusStart");
    const status = document.querySelector("#focusStatus");

    if (button) button.textContent = "Start";
    if (status) status.textContent = "Ready to focus";

    renderTimer();
}

document.querySelector("#focusStart")?.addEventListener("click", () => {
    if (focusInterval) {
        pauseFocus();
    } else {
        startFocus();
    }
});

document.querySelector("#focusReset")?.addEventListener("click", resetFocus);

document.querySelector("#applyFocusDuration")?.addEventListener("click", () => {
    const input = document.querySelector("#focusMinutes");
    if (input) setFocusDuration(input.value);
});

document.querySelector("#focusMinutes")?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        document.querySelector("#applyFocusDuration")?.click();
    }
});

document.querySelectorAll(".quick-focus-button").forEach(button => {
    button.addEventListener("click", () => {
        setFocusDuration(button.dataset.focusMinutes);
    });
});

function renderFocusPage() {
    updateFocusStats();
    updateFocusInput();
    renderTimer();
}

function updateFocusStats() {
    const today = todayString();

    const sessions = focusSessions.filter(
        session => session.date === today
    );

    const minutes = sessions.reduce(
        (sum, session) => sum + (Number(session.minutes) || 0),
        0
    );

    const sessionsElement = document.querySelector("#todaySessions");
    if (sessionsElement) sessionsElement.textContent = sessions.length;

    const minutesElement = document.querySelector("#todayFocusMinutes");
    if (minutesElement) minutesElement.textContent = minutes;
}

/* =========================================================
   ANALYTICS
========================================================= */

function getLastSevenDays() {

    const days = [];


    for (
        let i = 6;
        i >= 0;
        i--
    ) {

        const date =
            new Date();

        date.setDate(
            date.getDate() - i
        );


        days.push({

            date:
                dateToString(date),

            label:
                date.toLocaleDateString(
                    undefined,
                    {
                        weekday: "short"
                    }
                )

        });

    }


    return days;

}


function niceChartMax(value) {
    const numeric = Math.max(0, Number(value) || 0);
    if (numeric <= 0) return 10;
    if (numeric <= 10) return Math.ceil(numeric);
    const magnitude = 10 ** Math.floor(Math.log10(numeric));
    const normalized = numeric / magnitude;
    const step = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return step * magnitude;
}

function getTaskAnalyticsDate(task) {
    if (!task?.completed) return null;

    const value = task.completedAt || task.updatedAt || task.createdAt;
    if (!value) return null;

    // Preserve date-only values exactly. JavaScript treats YYYY-MM-DD as UTC,
    // which can shift the date backwards in local time zones such as IST.
    const raw = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return dateToString(date);
}

function renderAnalytics() {
    updateStats();

    const container = document.querySelector("#analyticsBars");
    if (!container) return;

    const days = getLastSevenDays();
    const taskValues = days.map(day => tasks.filter(task =>
        getTaskAnalyticsDate(task) === day.date
    ).length);
    const focusValues = days.map(day => focusSessions
        .filter(session => session.date === day.date)
        .reduce((sum, session) => sum + (Number(session.minutes) || 0), 0)
    );

    const taskMax = niceChartMax(Math.max(...taskValues, 0));
    const focusMax = niceChartMax(Math.max(...focusValues, 0));
    const W = 960, H = 330;
    const left = 54, right = 62, top = 28, bottom = 58;
    const plotW = W - left - right;
    const plotH = H - top - bottom;
    const baseY = top + plotH;
    const groupW = plotW / days.length;
    const barW = Math.min(48, groupW * 0.42);

    const y = (value, max) => baseY - (Math.max(0, Number(value) || 0) / max) * plotH;
    const taskTicks = [0, taskMax / 2, taskMax];
    const focusTicks = [0, focusMax / 2, focusMax];

    const linePoints = focusValues.map((value, index) => {
        const x = left + groupW * index + groupW / 2;
        return `${x.toFixed(1)},${y(value, focusMax).toFixed(1)}`;
    }).join(" ");

    const grid = taskTicks.map(tick => {
        const yy = y(tick, taskMax);
        const label = Number.isInteger(tick) ? tick : tick.toFixed(1);
        return `<line class="analytics-grid-line" x1="${left}" y1="${yy}" x2="${W - right}" y2="${yy}"/><text class="analytics-axis-label" x="${left - 12}" y="${yy + 4}" text-anchor="end">${label}</text>`;
    }).join("");

    const rightLabels = focusTicks.map(tick => {
        const yy = y(tick, focusMax);
        const label = Number.isInteger(tick) ? tick : tick.toFixed(1);
        return `<text class="analytics-axis-label" x="${W - right + 12}" y="${yy + 4}" text-anchor="start">${label}m</text>`;
    }).join("");

    const bars = taskValues.map((value, index) => {
        const x = left + groupW * index + (groupW - barW) / 2;
        const finalY = y(value, taskMax);
        const finalHeight = Math.max(0, baseY - finalY);
        return `<rect class="analytics-chart-bar" x="${x.toFixed(1)}" y="${finalY.toFixed(1)}" width="${barW.toFixed(1)}" height="${finalHeight.toFixed(1)}" rx="8"><title>${value} task${value === 1 ? "" : "s"}</title></rect>`;
    }).join("");

    const labels = days.map((day, index) => {
        const x = left + groupW * index + groupW / 2;
        return `<text class="analytics-day-label" x="${x.toFixed(1)}" y="${H - 22}" text-anchor="middle">${escapeHTML(day.label)}</text>`;
    }).join("");

    const points = focusValues.map((value, index) => {
        const x = left + groupW * index + groupW / 2;
        const yy = y(value, focusMax);
        return `<circle class="analytics-chart-point" cx="${x.toFixed(1)}" cy="${yy.toFixed(1)}" r="5"><title>${value} focus minutes</title></circle>`;
    }).join("");

    container.innerHTML = `
        <svg class="analytics-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Last 7 days tasks and focus activity">
            <g class="analytics-grid">${grid}</g>
            <line class="analytics-axis" x1="${left}" y1="${top}" x2="${left}" y2="${baseY}"/>
            <line class="analytics-axis" x1="${W - right}" y1="${top}" x2="${W - right}" y2="${baseY}"/>
            <line class="analytics-axis" x1="${left}" y1="${baseY}" x2="${W - right}" y2="${baseY}"/>
            <g class="analytics-right-labels">${rightLabels}</g>
            <g class="analytics-bars-layer">${bars}</g>
            <polyline class="analytics-focus-line" points="${linePoints}" fill="none"/>
            <g class="analytics-points-layer">${points}</g>
            <g class="analytics-labels">${labels}</g>
        </svg>
    `;

    // Always replay the chart animation whenever Analytics is rendered.
    // The chart is now placed high in the Analytics layout, so no scrolling is required.
    const svg = container.querySelector(".analytics-svg");
    const barsLayer = container.querySelectorAll(".analytics-chart-bar");
    const line = container.querySelector(".analytics-focus-line");
    const pointNodes = container.querySelectorAll(".analytics-chart-point");

    if (svg) {
        svg.classList.remove("analytics-chart-ready");
        barsLayer.forEach((bar, index) => bar.style.setProperty("--analytics-delay", `${index * 70}ms`));
        pointNodes.forEach((point, index) => point.style.setProperty("--analytics-delay", `${180 + index * 75}ms`));
        line?.style.setProperty("--analytics-line-length", "1200");
        void svg.offsetWidth;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                svg.classList.add("analytics-chart-ready");
            });
        });
    }

    const weekFocus = focusValues.reduce((sum, value) => sum + value, 0);
    const weekTasks = taskValues.reduce((sum, value) => sum + value, 0);
    const weekFocusElement = document.querySelector("#analyticsWeekFocus");
    if (weekFocusElement) weekFocusElement.textContent = `${weekFocus}m`;

    const focusProgress = document.querySelector("#analyticsFocusProgress");
    if (focusProgress) focusProgress.style.width = `${Math.min((weekFocus / 300) * 100, 100)}%`;

    const focusProgressText = document.querySelector("#analyticsFocusProgressText");
    if (focusProgressText) {
        focusProgressText.textContent = weekFocus >= 300
            ? "Weekly focus goal reached"
            : `${weekFocus} minutes logged • ${300 - weekFocus} minutes to a 5-hour weekly goal`;
    }

    const insight = document.querySelector("#analyticsInsight");
    const insightDetail = document.querySelector("#analyticsInsightDetail");
    if (insight && insightDetail) {
        const bestIndex = taskValues.indexOf(Math.max(...taskValues));
        const bestDay = days[bestIndex] || days[days.length - 1];
        if (weekTasks === 0 && weekFocus === 0) {
            insight.textContent = "Build your first streak";
            insightDetail.textContent = "Complete a task or focus for a few minutes to start seeing your productivity trend.";
        } else if (weekTasks > 0 && weekFocus > 0) {
            insight.textContent = `${weekTasks} tasks + ${weekFocus} focus minutes`;
            insightDetail.textContent = `Your busiest day was ${bestDay.label}. Keep combining task progress with focused study time.`;
        } else if (weekTasks > 0) {
            insight.textContent = `${weekTasks} task${weekTasks === 1 ? "" : "s"} completed this week`;
            insightDetail.textContent = `Your strongest task day was ${bestDay.label}. Add a focus session to balance your workflow.`;
        } else {
            insight.textContent = `${weekFocus} focus minutes logged`;
            insightDetail.textContent = "Nice focus streak. Add a few completed tasks to make your analytics more complete.";
        }
    }
}

function renderWeeklyBars() {

    const container =
        document.querySelector(
            "#weeklyBars"
        );


    if (!container) {
        return;
    }


    const days =
        getLastSevenDays();


    const values =
        days.map(
            day =>
                tasks.filter(
                    task =>
                        getTaskAnalyticsDate(task) === day.date
                ).length
        );


    const max =
        Math.max(
            ...values,
            1
        );


    container.innerHTML =
        days.map(
            (day, index) => `

                <div
                    class="analytics-bar-wrapper">

                    <div
                        class="analytics-bar"
                        style="height:${Math.max(
                (
                    values[index] /
                    max
                ) * 80,
                3
            )}%">
                    </div>

                    <span>
                        ${escapeHTML(
                day.label
            )}
                    </span>

                </div>

            `
        ).join("");

}


/* =========================================================
   SETTINGS
========================================================= */

document
    .querySelectorAll(
        ".settings-tab"
    )
    .forEach(tab => {

        tab.addEventListener(
            "click",
            () => {

                const target =
                    tab.dataset.settings;


                document
                    .querySelectorAll(
                        ".settings-tab"
                    )
                    .forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );


                document
                    .querySelectorAll(
                        ".settings-panel"
                    )
                    .forEach(
                        panel =>
                            panel.classList.remove(
                                "active"
                            )
                    );


                tab.classList.add(
                    "active"
                );


                document
                    .querySelector(
                        `[data-settings-panel="${target}"]`
                    )
                    ?.classList.add(
                        "active"
                    );

            }
        );

    });


function loadSettingsUI() {
    const user = getAuthUser();
    const accountUsername = document.querySelector("#settingsAccountUsername");
    const accountAvatar = document.querySelector("#settingsAccountAvatar");
    if (accountUsername) accountUsername.textContent = user?.username || "Account";
    if (accountAvatar) accountAvatar.textContent = (user?.username || "A").trim().charAt(0).toUpperCase() || "A";

    const font = document.querySelector("#fontSelector");
    if (font) font.value = settings.font;
    applyCustomization();
}

function applyCustomization() {
    const accent = settings.accent || defaultSettings.accent;
    const font = settings.font || defaultSettings.font;
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--app-font", `"${font.replace(/"/g, "\\\"")}"`);
    document.body.style.fontFamily = `"${font.replace(/"/g, "\\\"")}", system-ui, sans-serif`;

    if (settings.theme === "system") {
        const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
        document.body.classList.toggle("light", prefersLight);
    } else {
        document.body.classList.toggle("light", settings.theme === "light");
    }

    document.querySelectorAll(".color-choice").forEach(button => {
        button.classList.toggle("selected", button.dataset.color === accent);
    });
    document.querySelectorAll("[data-theme]").forEach(button => {
        button.classList.toggle("selected", button.dataset.theme === settings.theme);
    });

    updateCurrentDate();
    renderCalendar();
}


document
    .querySelector(
        "#resetCustomization"
    )
    ?.addEventListener(
        "click",
        () => {

            settings.theme =
                defaultSettings.theme;

            settings.accent =
                defaultSettings.accent;

            settings.font =
                defaultSettings.font;

            saveData();

            loadSettingsUI();

            showToast(
                "Customization reset.",
                "success"
            );

        }
    );






// Customization controls
document.querySelectorAll(".color-choice").forEach(button => {
    button.addEventListener("click", () => {
        const color = button.dataset.color;
        if (!color) return;
        settings.accent = color;
        saveData();
        applyCustomization();
        loadSettingsUI();
    });
});

document.querySelectorAll("[data-theme]").forEach(button => {
    button.addEventListener("click", () => {
        const theme = button.dataset.theme;
        if (!theme) return;
        settings.theme = theme;
        saveData();
        applyCustomization();
        loadSettingsUI();
    });
});

document.getElementById("fontSelector")?.addEventListener("change", event => {
    settings.font = event.target.value;
    saveData();
    applyCustomization();
    loadSettingsUI();
});

/* =========================================================
   PASSWORD RESET MODAL
========================================================= */

function updateResetPasswordToggle(button) {
    const targetId = button?.dataset.passwordTarget;
    const password = targetId ? document.getElementById(targetId) : null;
    if (!password || !button) return;

    const visible = password.type === "text";
    button.setAttribute("aria-pressed", String(visible));
    button.setAttribute("aria-label", visible ? "Hide password" : "Show password");
    button.innerHTML = visible
        ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.8 10.8 0 0 1 12 5c5.1 0 8.8 4.2 10 7a12 12 0 0 1-3.2 4.6M6.2 6.3C4.3 7.9 2.9 9.9 2 12c1.2 2.8 5 7 10 7 1.2 0 2.4-.2 3.4-.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
        : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
}

document.querySelectorAll("[data-password-target]").forEach(button => {
    updateResetPasswordToggle(button);
    button.addEventListener("click", () => {
        const password = document.getElementById(button.dataset.passwordTarget);
        if (!password) return;
        password.type = password.type === "password" ? "text" : "password";
        updateResetPasswordToggle(button);
        password.focus();
        password.setSelectionRange(password.value.length, password.value.length);
    });
});

document.getElementById("openResetPassword")?.addEventListener("click", () => {
    const form = document.getElementById("resetPasswordForm");
    form?.reset();
    const message = document.getElementById("resetPasswordMessage");
    if (message) {
        message.textContent = "";
        message.classList.remove("success");
    }
    document.querySelectorAll("#resetPasswordModal [data-password-target]").forEach(button => {
        const input = document.getElementById(button.dataset.passwordTarget);
        if (input) input.type = "password";
        updateResetPasswordToggle(button);
    });
    openModal("#resetPasswordModal");
});

document.getElementById("resetPasswordForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const currentPassword = document.getElementById("resetCurrentPassword")?.value || "";
    const newPassword = document.getElementById("resetNewPassword")?.value || "";
    const confirmPassword = document.getElementById("resetConfirmPassword")?.value || "";
    const button = document.getElementById("resetPasswordButton");
    const message = document.getElementById("resetPasswordMessage");
    const token = getAuthToken();

    if (!token) {
        showLoginScreen();
        return;
    }

    if (newPassword.length < 6) {
        if (message) message.textContent = "New password must be at least 6 characters.";
        return;
    }
    if (newPassword !== confirmPassword) {
        if (message) message.textContent = "New passwords do not match.";
        return;
    }
    if (currentPassword === newPassword) {
        if (message) message.textContent = "Choose a different new password.";
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = "Resetting...";
    }
    if (message) {
        message.textContent = "";
        message.classList.remove("success");
    }

    try {
        const response = await fetch("/api/auth/password", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            if (response.status === 401) {
                clearAuthData();
                showLoginScreen();
                return;
            }
            throw new Error(result.error || "Could not reset your password.");
        }

        event.target.reset();
        document.querySelectorAll("#resetPasswordModal [data-password-target]").forEach(toggle => {
            const input = document.getElementById(toggle.dataset.passwordTarget);
            if (input) input.type = "password";
            updateResetPasswordToggle(toggle);
        });

        if (message) {
            message.textContent = "Password reset successfully.";
            message.classList.add("success");
        }

        showToast("Password reset successfully.", "success");
        window.setTimeout(() => closeModal("#resetPasswordModal"), 900);
    } catch (error) {
        console.error("Password reset failed:", error);
        if (message) message.textContent = error.message || "Could not reset your password.";
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Reset Password";
        }
    }
});


/* =========================================================
   ACCOUNT DATA / ACCOUNT DELETION
========================================================= */

async function deleteCurrentUserData() {
    const token = getAuthToken();
    const user = getAuthUser();
    if (!token || !user?.id) {
        showLoginScreen();
        return;
    }

    const confirmed = await confirmAction(
        "This permanently deletes this account's AceArch tasks, subjects, settings, notifications, calendar items and focus sessions. Your account will remain active.",
        { force: true, title: "Delete My Data?", confirmText: "Delete My Data" }
    );
    if (!confirmed) return;

    const subjectIds = subjects.map(subject => subject.id);
    dataSessionGeneration += 1;
    databaseSaveQueue = Promise.resolve();

    try {
        const response = await fetch("/api/account/data", {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            if (response.status === 401) {
                clearAuthData();
                showLoginScreen();
                return;
            }
            throw new Error(result.error || "Could not delete your data.");
        }

        await deletePdfsForSubjects(subjectIds);
        tasks = [];
        subjects = [];
        calendarItems = [];
        focusSessions = [];
        notifications = [];
        settings = { ...defaultSettings };
        databaseReady = true;
        databaseUserId = user.id;
        clearUserLocalBackup(user.id);
        saveLocalBackup();
        applyCustomization();
        renderAll();
        renderFocusPage();
        navigate("dashboard");
        showAppForSession();
        showToast(result.message || "Your AceArch data was deleted. Your account is still active.", "success");

    } catch (error) {
        console.error("Delete My Data failed:", error);
        showToast(error.message || "Could not delete your data.", "error");
    }
}

async function deleteCurrentUserAccount() {
    const token = getAuthToken();
    const user = getAuthUser();
    if (!token || !user?.id) {
        showLoginScreen();
        return;
    }

    const confirmed = await confirmAction(
        "This permanently deletes your AceArch account and all of its data. This action cannot be undone.",
        { force: true, title: "Delete My Account?", confirmText: "Delete Account" }
    );
    if (!confirmed) return;

    const subjectIds = subjects.map(subject => subject.id);
    dataSessionGeneration += 1;
    databaseSaveQueue = Promise.resolve();

    try {
        const response = await fetch("/api/account", {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            if (response.status === 401) {
                clearAuthData();
                showLoginScreen();
                return;
            }
            throw new Error(result.error || "Could not delete your account.");
        }

        await deletePdfsForSubjects(subjectIds);
        clearUserLocalBackup(user.id);
        clearAuthData();
        resetUserDataInMemory();
        showLoginScreen();
        authMode = "login";
        updateAuthMode();
        showToast(result.message || "Your account was deleted.", "success");

    } catch (error) {
        console.error("Delete My Account failed:", error);
        showToast(error.message || "Could not delete your account.", "error");
    }
}

document.querySelector("#deleteMyData")?.addEventListener("click", deleteCurrentUserData);
document.querySelector("#deleteMyAccount")?.addEventListener("click", deleteCurrentUserAccount);

/* =========================================================
   DATA CLEAR
========================================================= */

document.querySelector("#clearLocalData")?.addEventListener("click", async () => {
    const userId = getAuthUser()?.id;
    const confirmed = await confirmAction("This will clear this account's local browser backup. Your PostgreSQL data will remain intact. Continue?");
    if (!confirmed) return;

    if (userId) clearUserLocalBackup(userId);
    showToast("Local backup cleared.", "success");
});

/* =========================================================
   NOTIFICATIONS
========================================================= */

const notificationPanel =
    document.querySelector(
        "#notificationPanel"
    );


function updateNotifications() {

    const list =
        document.querySelector(
            "#notificationList"
        );


    const dot =
        document.querySelector(
            "#notificationDot"
        );


    if (!list) {
        return;
    }


    list.innerHTML =
        notifications.length

            ? notifications
                .slice()
                .reverse()
                .map(
                    notification => `

                    <div class="notification">

                        <strong>
                            ${escapeHTML(
                        notification.title
                    )}
                        </strong>

                        <small>
                            ${escapeHTML(
                        notification.message
                    )}
                        </small>

                    </div>

                `
                )
                .join("")

            : `

                <div class="empty-state">

                    <div class="empty-icon">
                        ♢
                    </div>

                    <h3>
                        No notifications
                    </h3>

                    <p>
                        You're all caught up.
                    </p>

                </div>

            `;


    if (dot) {

        dot.classList.toggle(
            "show",
            notifications.length > 0
        );

    }

}


function toggleNotifications() {
    if (!notificationPanel) return;
    const isOpen = notificationPanel.classList.toggle("show");
    notificationPanel.setAttribute("aria-hidden", String(!isOpen));
}


document
    .querySelector(
        "#notificationButton"
    )
    ?.addEventListener(
        "click",
        toggleNotifications
    );

document
    .querySelector("#closeNotifications")
    ?.addEventListener("click", () => {
        notificationPanel?.classList.remove("show");
        notificationPanel?.setAttribute("aria-hidden", "true");
    });

document.addEventListener("click", event => {
    if (!notificationPanel?.classList.contains("show")) return;

    const clickedInsidePanel = notificationPanel.contains(event.target);
    const clickedTrigger = event.target.closest("#notificationButton, #mobileNotificationButton");
    if (!clickedInsidePanel && !clickedTrigger) {
        notificationPanel.classList.remove("show");
        notificationPanel.setAttribute("aria-hidden", "true");
    }
});


document
    .querySelector(
        "#mobileNotificationButton"
    )
    ?.addEventListener(
        "click",
        toggleNotifications
    );


document
    .querySelector(
        "#clearNotifications"
    )
    ?.addEventListener(
        "click",
        () => {

            notifications = [];

            saveData();

            updateNotifications();
            notificationPanel?.classList.remove("show");
            notificationPanel?.setAttribute("aria-hidden", "true");

            showToast(
                "Notifications cleared.",
                "success"
            );

        }
    );


/* =========================================================
   NOTIFICATIONS
   Deadline/schedule reminders are intentionally disabled. Render may sleep,
   so browser-opened reminders are not reliable enough to present as alerts.
   The in-app Updates panel remains available for future app-level notices.
========================================================= */

/* =========================================================
   SYSTEM THEME CHANGE
========================================================= */

if (
    window.matchMedia
) {

    const media =
        window.matchMedia(
            "(prefers-color-scheme: light)"
        );


    const systemThemeChanged =
        () => {

            if (
                settings.theme ===
                "system"
            ) {

                applyCustomization();

            }

        };


    if (
        media.addEventListener
    ) {

        media.addEventListener(
            "change",
            systemThemeChanged
        );

    }

}


/* =========================================================
   RENDER ALL
========================================================= */

function renderAll() {

    renderDashboard();

    renderTasks();

    renderCalendar();

    renderSubjects();

    updateFocusStats();

    // Analytics is rendered when its section is visible. This prevents the chart
    // animation from being consumed while the section is hidden during reload.
    if (sections.analytics?.classList.contains("active-section")) {
        renderAnalytics();
    }

    updateNotifications();

    loadSettingsUI();

    renderTimer();

}


window.renderAll =
    renderAll;


/* =========================================================
   INITIALIZE
========================================================= */

function hideInitialLoadingScreen() {
    document.getElementById("appLoadingScreen")?.classList.add("hidden");
}

async function initializeAceArch() {

    // Wait for authentication and its account-specific database load.
    await authInitializationPromise;
    await databaseLoadPromise;

    if (getAuthToken() && getAuthUser()) {
        applyCustomization();
        renderAll();
        renderFocusPage();
    }


    setMinimumDates();


    /*
        Keep date-related UI fresh if the app remains
        open past midnight.
    */

    setInterval(
        () => {

            updateCurrentDate();

            setMinimumDates();


        },
        30000
    );


    console.log(
        "AceArch loaded successfully."
    );

    hideInitialLoadingScreen();

}


initializeAceArch().catch((error) => {
    console.error("AceArch initialization failed:", error);
    hideInitialLoadingScreen();
});
/* =========================================================
   PWA / INSTALLATION
========================================================= */

let acearchInstallPrompt = null;

function isAceArchStandalone() {
    return window.matchMedia?.("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;
}

function updateInstallAppButton() {
    const card = document.getElementById("installAppCard");
    const button = document.getElementById("installAppButton");
    if (!card || !button) return;

    if (isAceArchStandalone()) {
        card.hidden = true;
        return;
    }

    card.hidden = false;
    button.textContent = "Install AceArch";
}

async function installAceArch() {
    if (isAceArchStandalone()) return;

    if (acearchInstallPrompt) {
        acearchInstallPrompt.prompt();
        const choice = await acearchInstallPrompt.userChoice;
        if (choice.outcome === "accepted") {
            acearchInstallPrompt = null;
        }
        updateInstallAppButton();
        return;
    }

    const button = document.getElementById("installAppButton");
    if (button) {
        const original = button.textContent;
        button.textContent = "Use browser menu to install";
        window.setTimeout(() => { button.textContent = original; }, 3500);
    }
}

function registerAceArchServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js", { scope: "/" })
            .then((registration) => {
                console.log("AceArch PWA service worker registered.", registration.scope);
            })
            .catch((error) => {
                console.warn("AceArch PWA service worker registration failed:", error);
            });
    });
}

window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    acearchInstallPrompt = event;
    updateInstallAppButton();
});

window.addEventListener("appinstalled", () => {
    acearchInstallPrompt = null;
    updateInstallAppButton();
});

document.getElementById("installAppButton")?.addEventListener("click", installAceArch);
window.addEventListener("load", updateInstallAppButton);
registerAceArchServiceWorker();
