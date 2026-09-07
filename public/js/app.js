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
    document.body.style.fontFamily = defaultSettings.font;
    document.body.dataset.density = defaultSettings.density;
    document.body.classList.remove("light");
    document.querySelectorAll("[data-theme], [data-density], .color-choice").forEach(element => element.classList.remove("selected"));
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

    const username = user?.username || "Account";
    const avatar = username.trim().charAt(0).toUpperCase() || "A";

    if (usernameElement) usernameElement.textContent = username;
    if (avatarElement) avatarElement.textContent = avatar;
    if (settingsUsername) settingsUsername.textContent = username;
    if (settingsAvatar) settingsAvatar.textContent = avatar;
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

    document.getElementById("logoutButton")?.addEventListener("click", () => {
        clearAuthData();
        showLoginScreen();
        authMode = "login";
        updateAuthMode();
    });

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
    accent: "#7c5cff",
    font: "Inter",
    density: "comfortable",

    deadlineNotifications: true,
    deadlineReminderDays: 3,
    deadlineReminderTime: "18:00",
    dailyDeadlineReminders: false,
    dailyDeadlineReminderDays: 3,

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
 * Calendar and focus data are stored in PostgreSQL. PDFs remain
 * in the existing IndexedDB system because they are binary files.
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
        notifications = Array.isArray(data.notifications) ? data.notifications : [];
        calendarItems = Array.isArray(data.calendarItems) ? data.calendarItems : [];
        focusSessions = Array.isArray(data.focusSessions) ? data.focusSessions : [];
        settings = { ...defaultSettings, ...(data.settings || {}) };

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

    if (title) {

        title.textContent =
            pageTitles[section] ||
            "AceArch";

    }


    closeSidebar();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
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
            renderAnalytics();
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

    element.textContent =
        new Date().toLocaleDateString(
            undefined,
            {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );

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

    modal.classList.add(
        "show"
    );

}


function closeModal(id) {

    const modal =
        document.querySelector(id);

    if (!modal) {
        return;
    }

    modal.classList.remove(
        "show"
    );

}


document
    .querySelectorAll(
        "[data-close-modal]"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => closeModal(
                "#taskModal"
            )
        );

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

    task.completed =
        completed;

    task.completedAt =
        completed
            ? new Date().toISOString()
            : null;

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


function createCalendarDay(
    date,
    muted
) {

    const button =
        document.createElement(
            "button"
        );


    const dateString =
        dateToString(date);


    button.type =
        "button";

    button.className =
        "calendar-day";


    if (muted) {
        button.classList.add(
            "muted"
        );
    }


    if (
        dateString ===
        todayString()
    ) {

        button.classList.add(
            "today"
        );

    }


    if (
        dateString ===
        selectedCalendarDate
    ) {

        button.classList.add(
            "selected"
        );

    }


    const items =
        calendarItems.filter(
            item =>
                item.date ===
                dateString
        );


    button.innerHTML = `

        <span class="day-number">
            ${date.getDate()}
        </span>

        ${items.length
            ? `<span class="day-dot"></span>`
            : ""
        }

    `;


    button.addEventListener(
        "click",
        () => {

            selectedCalendarDate =
                dateString;

            renderCalendar();

        }
    );


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

    const title =
        document.querySelector(
            "#selectedDateTitle"
        );

    const container =
        document.querySelector(
            "#selectedDateItems"
        );


    if (!title || !container) {
        return;
    }


    title.textContent =
        formatFullDate(
            selectedCalendarDate
        );


    const items =
        calendarItems.filter(
            item =>
                item.date ===
                selectedCalendarDate
        );


    container.innerHTML =
        items.length

            ? items.map(item => `

                <div class="calendar-item">

                    <strong>
                        ${escapeHTML(
                item.title
            )}
                    </strong>

                    <small>
                        ${escapeHTML(
                item.type
            )}

                        ${item.taskId
                    ? " · Task"
                    : ""
                }
                    </small>

                </div>

            `).join("")

            : `

                <div class="empty-state">

                    <div class="empty-icon">
                        □
                    </div>

                    <h3>
                        Nothing planned
                    </h3>

                    <p>
                        Add a reminder, event or task.
                    </p>

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
let pendingSubjectColor = "#7c5cff";

function updateSubjectColorUI() {
    const colorInput = document.querySelector("#subjectColor");
    const value = document.querySelector("#subjectColorValue");
    const swatch = document.querySelector("#subjectPreviewSwatch");
    const namePreview = document.querySelector("#subjectPreviewName");
    const nameInput = document.querySelector("#subjectName");

    const color = pendingSubjectColor || colorInput?.value || "#7c5cff";
    if (colorInput && colorInput.value.toLowerCase() !== color.toLowerCase()) colorInput.value = color;
    if (value) value.textContent = color.toUpperCase();
    if (swatch) swatch.style.background = color;
    if (namePreview) namePreview.textContent = nameInput?.value.trim() || "Your subject";
}

function prepareSubjectModal() {
    editingSubjectId = null;
    const form = document.querySelector("#subjectForm");
    if (form) form.reset();

    pendingSubjectColor = "#7c5cff";
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
    const color = pendingSubjectColor || document.querySelector("#subjectColor")?.value || "#7c5cff";

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
    pendingSubjectColor = event.target.value || "#7c5cff";
    updateSubjectColorUI();
});

document.querySelector("#subjectColor")?.addEventListener("change", event => {
    pendingSubjectColor = event.target.value || "#7c5cff";
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
    pendingSubjectColor = subject.color || "#7c5cff";
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
   SUBJECT SCHEDULE + NOTES UI
========================================================= */

function ensureSubjectExtras() {

    const section =
        document.querySelector(
            "#subjectsSection"
        );

    if (!section) {
        return;
    }


    if (
        document.querySelector(
            "#subjectPlannerArea"
        )
    ) {
        return;
    }


    const area =
        document.createElement("div");

    area.id =
        "subjectPlannerArea";

    area.className =
        "card subject-planner-area";

    area.innerHTML = `

        <div class="card-header">

            <div>
                <p class="card-eyebrow">
                    PLANNER
                </p>

                <h2>Subject Planner</h2>

                <p>
                    Select a subject to manage its schedule
                    and PDF notes.
                </p>
            </div>

        </div>

        <div
            id="subjectPlannerContent">
        </div>

    `;


    const grid =
        document.querySelector(
            "#subjectsGrid"
        );

    if (grid) {
        grid.after(area);
    } else {
        section.appendChild(area);
    }

}


function renderSubjectPlanner() {

    ensureSubjectExtras();

    const container =
        document.querySelector(
            "#subjectPlannerContent"
        );

    if (!container) {
        return;
    }


    if (!subjects.length) {

        container.innerHTML = `

            <div class="empty-state">

                <h3>
                    Create a subject first
                </h3>

                <p>
                    Your subject schedule and PDF notes
                    will appear here.
                </p>

            </div>

        `;

        return;

    }


    let selectedId =
        container.dataset.selectedSubject ||
        subjects[0].id;


    if (
        !subjects.some(
            subject =>
                subject.id === selectedId
        )
    ) {

        selectedId =
            subjects[0].id;

    }


    container.dataset.selectedSubject =
        selectedId;


    const subject =
        subjects.find(
            item =>
                item.id === selectedId
        );


    if (!subject) {
        return;
    }


    if (!Array.isArray(subject.schedule)) {
        subject.schedule = [];
    }

    if (!Array.isArray(subject.notes)) {
        subject.notes = [];
    }


    container.innerHTML = `

        <div class="subject-planner-hero">
            <div>
                <p class="card-eyebrow">SUBJECT PLANNER</p>
                <h2>${escapeHTML(subject.name)} <span class="subject-planner-color-dot" style="background:${escapeHTML(subject.color || "#7c5cff")}"></span></h2>
                <p>Plan classes, study sessions and exams in one calm timeline. Your reminder settings apply automatically.</p>
            </div>
            <div class="subject-planner-next">
                <span>Reminder</span>
                <strong>${Math.max(1, Number(settings.deadlineReminderDays) || 3)} days · ${escapeHTML(settings.deadlineReminderTime || "18:00")}</strong>
            </div>
        </div>

        <div class="subject-planner-toolbar">

            <select id="plannerSubjectSelect">

                ${subjects.map(item => `

                    <option
                        value="${escapeHTML(item.id)}"
                        ${item.id === selectedId ? "selected" : ""}>
                        ${escapeHTML(item.name)}
                    </option>

                `).join("")}

            </select>

            <button
                type="button"
                class="primary-button"
                id="addScheduleButton">
                + Add Schedule
            </button>

            <button
                type="button"
                class="secondary-button"
                id="uploadSubjectPdfButton">
                + Add PDF Note
            </button>

            <input
                type="file"
                id="subjectPdfInput"
                accept="application/pdf"
                hidden>

        </div>


        <div class="subject-planner-columns">

            <div class="planner-column">

                <div class="planner-column-heading">
                    <div>
                        <p class="card-eyebrow">UPCOMING</p>
                        <h3>Schedule</h3>
                    </div>
                    <span class="planner-count">${subject.schedule.length}</span>
                </div>

                <div
                    id="subjectScheduleList">

                    ${subject.schedule.length
            ? subject.schedule
                .sort(
                    (a, b) =>
                        a.date.localeCompare(
                            b.date
                        )
                )
                .map(
                    scheduleHTML
                )
                .join("")
            : `
                                <div class="empty-state">
                                    <h3>
                                        No schedule yet
                                    </h3>

                                    <p>
                                        Add classes, study sessions,
                                        exams or other plans.
                                    </p>
                                </div>
                            `
        }

                </div>

            </div>


            <div class="planner-column">

                <div class="planner-column-heading">
                    <div>
                        <p class="card-eyebrow">REFERENCE</p>
                        <h3>PDF Notes</h3>
                    </div>
                    <span class="planner-count">${subject.notes.length}</span>
                </div>

                <div
                    id="subjectNotesList">

                    ${subject.notes.length
            ? subject.notes
                .map(
                    noteHTML
                )
                .join("")
            : `
                                <div class="empty-state">
                                    <h3>
                                        No PDF notes
                                    </h3>

                                    <p>
                                        Upload PDF notes for this subject.
                                    </p>
                                </div>
                            `
        }

                </div>

            </div>

        </div>

    `;


    document
        .querySelector(
            "#plannerSubjectSelect"
        )
        ?.addEventListener(
            "change",
            event => {

                container.dataset.selectedSubject =
                    event.target.value;

                renderSubjectPlanner();

            }
        );


    document
        .querySelector(
            "#addScheduleButton"
        )
        ?.addEventListener(
            "click",
            () => openScheduleForm(
                selectedId
            )
        );


    document
        .querySelector(
            "#uploadSubjectPdfButton"
        )
        ?.addEventListener(
            "click",
            () =>
                document
                    .querySelector(
                        "#subjectPdfInput"
                    )
                    ?.click()
        );


    document
        .querySelector(
            "#subjectPdfInput"
        )
        ?.addEventListener(
            "change",
            event =>
                handlePdfUpload(
                    selectedId,
                    event
                )
        );

}


function scheduleHTML(schedule) {
    const type = String(schedule.type || "other").toLowerCase();
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    const reminderDays = Math.max(1, Number(settings.deadlineReminderDays) || 3);
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
                    <span class="schedule-reminder-pill">⏰ ${reminderDays}d</span>
                </div>
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

function noteHTML(note) {

    return `

        <div class="schedule-item">

            <div>

                <strong>
                    ${escapeHTML(
        note.name
    )}
                </strong>

                <small>
                    ${formatBytes(
        note.size
    )}

                    ·
                    ${formatDate(
        note.createdAt.slice(0, 10)
    )}
                </small>

            </div>

            <div>

                <button
                    type="button"
                    class="small-button"
                    data-pdf-open="${escapeHTML(note.id)}">
                    Open
                </button>

                <button
                    type="button"
                    class="task-delete"
                    data-pdf-delete="${escapeHTML(note.id)}"
                    aria-label="Delete PDF">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v6m4-6v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>

            </div>

        </div>

    `;

}


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
                    <p class="card-eyebrow">SUBJECT PLANNER</p>
                    <h2>${isEditing ? "Edit Schedule" : "Add Schedule"}</h2>
                </div>
                <button type="button" class="close-modal" id="closeScheduleModal" aria-label="Close">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
                </button>
            </div>
            <form id="scheduleForm">
                <div class="form-group">
                    <label for="scheduleTitle">Title</label>
                    <input id="scheduleTitle" type="text" required maxlength="120" autocomplete="off" value="${escapeHTML(existingSchedule?.title || "")}" placeholder="Schedule title">
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
                        <label for="scheduleStartTime">Start</label>
                        <input id="scheduleStartTime" type="time" value="${escapeHTML(startTime)}">
                    </div>
                    <div class="form-group">
                        <label for="scheduleEndTime">End</label>
                        <input id="scheduleEndTime" type="time" value="${escapeHTML(endTime)}">
                    </div>
                </div>
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
        renderSubjectPlanner();
    });
}

document.addEventListener(
    "click",
    async event => {

        const editButton = event.target.closest("[data-schedule-edit]");
        if (editButton) {
            const container = document.querySelector("#subjectPlannerContent");
            const subjectId = container?.dataset.selectedSubject;
            if (subjectId) openScheduleForm(subjectId, editButton.dataset.scheduleEdit);
            return;
        }

        const button =
            event.target.closest(
                "[data-schedule-delete]"
            );

        if (!button) {
            return;
        }


        const container =
            document.querySelector(
                "#subjectPlannerContent"
            );

        const subjectId =
            container?.dataset
                .selectedSubject;


        const subject =
            subjects.find(
                item =>
                    item.id ===
                    subjectId
            );


        if (!subject) {
            return;
        }


        if (!(await confirmAction("Delete this schedule item?"))) {
            return;
        }


        subject.schedule =
            subject.schedule.filter(
                item =>
                    item.id !==
                    button.dataset.scheduleDelete
            );


        saveData();

        renderSubjectPlanner();

    }
);


/* =========================================================
   PDF NOTES
========================================================= */

/*
    PDF files are stored using IndexedDB rather than
    localStorage. This prevents large PDFs from filling
    localStorage immediately.
*/

const PDF_DB_NAME =
    "AceArchPDFDatabase";

const PDF_STORE_NAME =
    "notes";


function openPdfDatabase() {

    return new Promise(
        (resolve, reject) => {

            if (
                !("indexedDB" in window)
            ) {

                reject(
                    new Error(
                        "IndexedDB is not supported."
                    )
                );

                return;

            }


            const request =
                indexedDB.open(
                    PDF_DB_NAME,
                    1
                );


            request.onupgradeneeded =
                event => {

                    const db =
                        event.target.result;

                    if (
                        !db.objectStoreNames
                            .contains(
                                PDF_STORE_NAME
                            )
                    ) {

                        db.createObjectStore(
                            PDF_STORE_NAME,
                            {
                                keyPath: "id"
                            }
                        );

                    }

                };


            request.onsuccess =
                () =>
                    resolve(
                        request.result
                    );


            request.onerror =
                () =>
                    reject(
                        request.error
                    );

        }
    );

}


async function storePdfFile(fileRecord) {

    const db =
        await openPdfDatabase();


    return new Promise(
        (resolve, reject) => {

            const transaction =
                db.transaction(
                    PDF_STORE_NAME,
                    "readwrite"
                );


            transaction
                .objectStore(
                    PDF_STORE_NAME
                )
                .put(fileRecord);


            transaction.oncomplete =
                () => {

                    db.close();

                    resolve();

                };


            transaction.onerror =
                () => {

                    db.close();

                    reject(
                        transaction.error
                    );

                };

        }
    );

}


async function getPdfFile(id) {

    const db =
        await openPdfDatabase();


    return new Promise(
        (resolve, reject) => {

            const request =
                db
                    .transaction(
                        PDF_STORE_NAME,
                        "readonly"
                    )
                    .objectStore(
                        PDF_STORE_NAME
                    )
                    .get(id);


            request.onsuccess =
                () => {

                    db.close();

                    resolve(
                        request.result
                    );

                };


            request.onerror =
                () => {

                    db.close();

                    reject(
                        request.error
                    );

                };

        }
    );

}


async function deletePdfFile(id) {

    const db =
        await openPdfDatabase();


    return new Promise(
        (resolve, reject) => {

            const transaction =
                db.transaction(
                    PDF_STORE_NAME,
                    "readwrite"
                );


            transaction
                .objectStore(
                    PDF_STORE_NAME
                )
                .delete(id);


            transaction.oncomplete =
                () => {

                    db.close();

                    resolve();

                };


            transaction.onerror =
                () => {

                    db.close();

                    reject(
                        transaction.error
                    );

                };

        }
    );

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
                const records = Array.isArray(request.result) ? request.result : [];
                records.forEach(record => {
                    if (subjectIds.includes(record.subjectId)) store.delete(record.id);
                });
            };
            request.onerror = () => reject(request.error);
            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
        });
        db.close();
    } catch (error) {
        console.warn("Could not remove account PDF files:", error);
    }
}

async function handlePdfUpload(
    subjectId,
    event
) {

    const file =
        event.target.files?.[0];


    if (!file) {
        return;
    }


    if (
        file.type !==
        "application/pdf"
    ) {

        showToast(
            "Only PDF files are allowed.",
            "error"
        );

        event.target.value = "";

        return;

    }


    /*
        25 MB safety limit for this browser version.
    */

    const maxSize =
        25 * 1024 * 1024;


    if (
        file.size >
        maxSize
    ) {

        showToast(
            "PDF must be smaller than 25 MB.",
            "error"
        );

        event.target.value = "";

        return;

    }


    const subject =
        subjects.find(
            item =>
                item.id === subjectId
        );


    if (!subject) {
        return;
    }


    if (
        !Array.isArray(
            subject.notes
        )
    ) {

        subject.notes = [];

    }


    const id =
        createId();


    try {

        await storePdfFile({

            id,

            blob: file,

            name: file.name,

            type: file.type,

            size: file.size,

            subjectId,

            createdAt:
                new Date().toISOString()

        });


        subject.notes.push({

            id,

            name: file.name,

            size: file.size,

            createdAt:
                new Date().toISOString()

        });


        saveData();

        renderSubjectPlanner();

        showToast(
            "PDF note added.",
            "success"
        );

    } catch (error) {

        console.error(
            "PDF upload error:",
            error
        );

        showToast(
            "Could not save the PDF.",
            "error"
        );

    }


    event.target.value = "";

}


function formatBytes(bytes) {

    if (!bytes) {
        return "0 KB";
    }

    const units = [
        "Bytes",
        "KB",
        "MB",
        "GB"
    ];

    let size =
        Number(bytes);

    let index = 0;


    while (
        size >= 1024 &&
        index <
        units.length - 1
    ) {

        size /= 1024;

        index++;

    }


    return `${size.toFixed(
        index === 0 ? 0 : 1
    )} ${units[index]}`;

}


document.addEventListener(
    "click",
    async event => {

        const openButton =
            event.target.closest(
                "[data-pdf-open]"
            );


        if (openButton) {

            try {

                const record =
                    await getPdfFile(
                        openButton.dataset.pdfOpen
                    );


                if (
                    !record?.blob
                ) {

                    showToast(
                        "PDF could not be found.",
                        "error"
                    );

                    return;

                }


                const url =
                    URL.createObjectURL(
                        record.blob
                    );


                window.open(
                    url,
                    "_blank",
                    "noopener"
                );


                setTimeout(
                    () =>
                        URL.revokeObjectURL(
                            url
                        ),
                    60000
                );

            } catch (error) {

                console.error(error);

                showToast(
                    "Could not open PDF.",
                    "error"
                );

            }

            return;

        }


        const deleteButton =
            event.target.closest(
                "[data-pdf-delete]"
            );


        if (
            deleteButton
        ) {

            const container =
                document.querySelector(
                    "#subjectPlannerContent"
                );


            const subjectId =
                container?.dataset
                    .selectedSubject;


            const subject =
                subjects.find(
                    item =>
                        item.id ===
                        subjectId
                );


            if (!subject) {
                return;
            }


            const note =
                subject.notes.find(
                    item =>
                        item.id ===
                        deleteButton.dataset
                            .pdfDelete
                );


            if (!note) {
                return;
            }


            if (!(await confirmAction(`Delete "${note.name}"?`))) {
                return;
            }


            try {

                await deletePdfFile(
                    note.id
                );

            } catch (error) {

                console.warn(
                    "PDF deletion warning:",
                    error
                );

            }


            subject.notes =
                subject.notes.filter(
                    item =>
                        item.id !==
                        note.id
                );


            saveData();

            renderSubjectPlanner();

            showToast(
                "PDF note deleted.",
                "success"
            );

        }

    }
);


/* =========================================================
   SUBJECT CARDS
========================================================= */

function renderSubjects() {

    const grid =
        document.querySelector(
            "#subjectsGrid"
        );

    const empty =
        document.querySelector(
            "#subjectsEmpty"
        );


    if (!grid) {
        return;
    }


    grid.innerHTML =
        subjects
            .map(subject => {

                const taskCount =
                    tasks.filter(
                        task =>
                            task.subject ===
                            subject.name
                    ).length;


                const scheduleCount =
                    Array.isArray(
                        subject.schedule
                    )
                        ? subject.schedule.length
                        : 0;


                const noteCount =
                    Array.isArray(
                        subject.notes
                    )
                        ? subject.notes.length
                        : 0;


                return `

                    <div
                        class="subject-card"
                        data-subject-id="${escapeHTML(subject.id)}">

                        <div
                            class="subject-color"
                            style="background:${escapeHTML(subject.color || "#7c5cff")}">
                        </div>

                        <h3>
                            ${escapeHTML(
                    subject.name
                )}
                        </h3>

                        <p>
                            ${taskCount}
                            ${taskCount === 1 ? "task" : "tasks"}
                        </p>

                        <small>
                            ${scheduleCount}
                            schedule
                            ·
                            ${noteCount}
                            PDF
                        </small>

                        <div class="subject-card-actions">

                            <button
                                type="button"
                                class="small-button"
                                data-subject-edit="${escapeHTML(subject.id)}">
                                Edit
                            </button>

                            <button
                                type="button"
                                class="small-button"
                                data-subject-plan="${escapeHTML(subject.id)}">
                                Plan
                            </button>

                            <button
                                type="button"
                                class="task-delete"
                                data-subject-delete="${escapeHTML(subject.id)}">
                                Delete
                            </button>

                        </div>

                    </div>

                `;

            })
            .join("");


    if (empty) {

        empty.style.display =
            subjects.length
                ? "none"
                : "flex";

    }


    renderSubjectPlanner();

}


document.addEventListener(
    "click",
    event => {

        const edit =
            event.target.closest(
                "[data-subject-edit]"
            );

        if (edit) {

            editSubject(
                edit.dataset.subjectEdit
            );

            return;

        }


        const plan =
            event.target.closest(
                "[data-subject-plan]"
            );

        if (plan) {

            ensureSubjectExtras();

            const container =
                document.querySelector(
                    "#subjectPlannerContent"
                );

            if (container) {

                container.dataset
                    .selectedSubject =
                    plan.dataset.subjectPlan;

            }

            renderSubjectPlanner();

            document
                .querySelector(
                    "#subjectPlannerArea"
                )
                ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            return;

        }


        const deleteButton =
            event.target.closest(
                "[data-subject-delete]"
            );

        if (deleteButton) {

            deleteSubject(
                deleteButton.dataset.subjectDelete
            );

        }

    }
);


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

function renderAnalytics() {
    updateStats();

    const container = document.querySelector("#analyticsBars");
    if (!container) return;

    const days = getLastSevenDays();
    const taskValues = days.map(day => tasks.filter(task =>
        task.completed && (task.completedAt || task.createdAt)?.startsWith(day.date)
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
        return `<line class="analytics-grid-line" x1="${left}" y1="${yy}" x2="${W-right}" y2="${yy}"/><text class="analytics-axis-label" x="${left-12}" y="${yy+4}" text-anchor="end">${label}</text>`;
    }).join("");

    const rightLabels = focusTicks.map(tick => {
        const yy = y(tick, focusMax);
        const label = Number.isInteger(tick) ? tick : tick.toFixed(1);
        return `<text class="analytics-axis-label" x="${W-right+12}" y="${yy+4}" text-anchor="start">${label}m</text>`;
    }).join("");

    const bars = taskValues.map((value, index) => {
        const x = left + groupW * index + (groupW - barW) / 2;
        const finalY = y(value, taskMax);
        const finalHeight = Math.max(0, baseY - finalY);
        return `<rect class="analytics-chart-bar" x="${x.toFixed(1)}" y="${finalY.toFixed(1)}" width="${barW.toFixed(1)}" height="${finalHeight.toFixed(1)}" rx="8"><title>${value} task${value === 1 ? "" : "s"}</title></rect>`;
    }).join("");

    const labels = days.map((day, index) => {
        const x = left + groupW * index + groupW / 2;
        return `<text class="analytics-day-label" x="${x.toFixed(1)}" y="${H-22}" text-anchor="middle">${escapeHTML(day.label)}</text>`;
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
            <line class="analytics-axis" x1="${W-right}" y1="${top}" x2="${W-right}" y2="${baseY}"/>
            <line class="analytics-axis" x1="${left}" y1="${baseY}" x2="${W-right}" y2="${baseY}"/>
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
        void svg.offsetWidth;
        requestAnimationFrame(() => {
            svg.classList.add("analytics-chart-ready");
            barsLayer.forEach((bar, index) => {
                bar.style.setProperty("--analytics-delay", `${index * 70}ms`);
            });
            pointNodes.forEach((point, index) => {
                point.style.setProperty("--analytics-delay", `${180 + index * 75}ms`);
            });
            line?.style.setProperty("--analytics-line-length", "1200");
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
                        task.completed &&
                        (
                            task.completedAt ||
                            task.createdAt
                        )?.startsWith(
                            day.date
                        )
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

    const font =
        document.querySelector(
            "#fontSelector"
        );

    if (font) {
        font.value =
            settings.font;
    }


    const deadlineNotifications = document.querySelector("#deadlineNotifications");
    if (deadlineNotifications) {
        deadlineNotifications.checked = settings.deadlineNotifications !== false;
    }

    const reminderDays = document.querySelector("#deadlineReminderDays");
    if (reminderDays) {
        reminderDays.value = String(Math.max(1, Number(settings.deadlineReminderDays) || 3));
    }

    const reminderTime = document.querySelector("#deadlineReminderTime");
    if (reminderTime) {
        reminderTime.value = /^([01]\d|2[0-3]):[0-5]\d$/.test(settings.deadlineReminderTime || "")
            ? settings.deadlineReminderTime
            : "18:00";
    }

    const dailyReminders = document.querySelector("#dailyDeadlineReminders");
    if (dailyReminders) {
        dailyReminders.checked = settings.dailyDeadlineReminders === true;
    }
    const dailyReminderDays = document.querySelector("#dailyDeadlineReminderDays");
    if (dailyReminderDays) {
        dailyReminderDays.value = String(Math.max(1, Number(settings.dailyDeadlineReminderDays) || 3));
    }
    updateDailyReminderDaysVisibility();


    applyCustomization();

}


function applyCustomization() {

    document.documentElement.style
        .setProperty(
            "--accent",
            settings.accent
        );


    document.body.style.fontFamily =
        settings.font;


    document.body.dataset.density =
        settings.density;


    /*
        Proper system theme support.
    */

    if (
        settings.theme === "system"
    ) {

        const prefersLight =
            window.matchMedia &&
            window.matchMedia(
                "(prefers-color-scheme: light)"
            ).matches;


        document.body.classList.toggle(
            "light",
            prefersLight
        );

    } else {

        document.body.classList.toggle(
            "light",
            settings.theme === "light"
        );

    }


    document
        .querySelectorAll(
            ".color-choice"
        )
        .forEach(button => {

            button.classList.toggle(
                "selected",
                button.dataset.color ===
                settings.accent
            );

        });


    document
        .querySelectorAll(
            "[data-theme]"
        )
        .forEach(button => {

            button.classList.toggle(
                "selected",
                button.dataset.theme ===
                settings.theme
            );

        });


    document
        .querySelectorAll(
            "[data-density]"
        )
        .forEach(button => {

            button.classList.toggle(
                "selected",
                button.dataset.density ===
                settings.density
            );

        });


    updateCurrentDate();

    renderCalendar();

}


document
    .querySelectorAll(
        "[data-theme]"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                settings.theme =
                    button.dataset.theme;

                saveData();

                applyCustomization();

            }
        );

    });


document
    .querySelectorAll(
        ".color-choice"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                settings.accent =
                    button.dataset.color;

                saveData();

                applyCustomization();

            }
        );

    });


document
    .querySelector(
        "#fontSelector"
    )
    ?.addEventListener(
        "change",
        event => {

            settings.font =
                event.target.value;

            saveData();

            applyCustomization();

        }
    );


document
    .querySelectorAll(
        "[data-density]"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                settings.density =
                    button.dataset.density;

                saveData();

                applyCustomization();

            }
        );

    });




function normalizeReminderDaysValue(input, fallback = 3) {
    const parsed = Number.parseInt(input?.value, 10);
    const value = Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
    if (input) input.value = String(value);
    return value;
}

function updateDailyReminderDaysVisibility() {
    const field = document.querySelector("#dailyReminderDaysField");
    const checkbox = document.querySelector("#dailyDeadlineReminders");
    if (!field || !checkbox) return;
    field.classList.toggle("hidden", !checkbox.checked);
}

document.querySelector("#deadlineNotifications")?.addEventListener("change", async event => {
    settings.deadlineNotifications = event.target.checked;
    saveData();
    if (event.target.checked) {
        await requestDesktopNotificationPermission();
        checkScheduledReminders();
    }
});

document.querySelector("#deadlineReminderDays")?.addEventListener("change", event => {
    settings.deadlineReminderDays = normalizeReminderDaysValue(event.target, 3);
    saveData();
    checkScheduledReminders();
});

document.querySelector("#deadlineReminderDays")?.addEventListener("blur", event => {
    settings.deadlineReminderDays = normalizeReminderDaysValue(event.target, 3);
    saveData();
});

document.querySelector("#deadlineReminderTime")?.addEventListener("change", event => {
    settings.deadlineReminderTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(event.target.value)
        ? event.target.value
        : "18:00";
    saveData();
    checkScheduledReminders();
});

document.querySelector("#dailyDeadlineReminders")?.addEventListener("change", event => {
    settings.dailyDeadlineReminders = event.target.checked;
    updateDailyReminderDaysVisibility();
    saveData();
    checkScheduledReminders();
});

document.querySelector("#dailyDeadlineReminderDays")?.addEventListener("change", event => {
    settings.dailyDeadlineReminderDays = normalizeReminderDaysValue(event.target, 3);
    saveData();
    checkScheduledReminders();
});

document.querySelector("#dailyDeadlineReminderDays")?.addEventListener("blur", event => {
    settings.dailyDeadlineReminderDays = normalizeReminderDaysValue(event.target, 3);
    saveData();
});

document.addEventListener("click", event => {
    const button = event.target.closest("[data-stepper-target]");
    if (!button) return;
    const input = document.getElementById(button.dataset.stepperTarget);
    if (!input) return;
    const current = Math.max(1, Number.parseInt(input.value, 10) || 1);
    const direction = button.dataset.stepperDirection === "up" ? 1 : -1;
    const next = direction > 0 ? (current < 7 ? current + 1 : current) : Math.max(1, current - 1);
    input.value = String(next);
    input.dispatchEvent(new Event("change", { bubbles: true }));
});

document.addEventListener("wheel", event => {
    const input = event.target.closest("#deadlineReminderDays, #dailyDeadlineReminderDays");
    if (!input || event.deltaY === 0) return;
    event.preventDefault();
    const current = Math.max(1, Number.parseInt(input.value, 10) || 1);
    const direction = event.deltaY < 0 ? 1 : -1;
    const next = direction > 0 ? (current < 7 ? current + 1 : current) : Math.max(1, current - 1);
    input.value = String(next);
    input.dispatchEvent(new Event("change", { bubbles: true }));
}, { passive: false });


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

            settings.density =
                defaultSettings.density;

            saveData();

            loadSettingsUI();

            showToast(
                "Customization reset.",
                "success"
            );

        }
    );





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

    notificationPanel
        ?.classList.toggle(
            "show"
        );

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

            showToast(
                "Notifications cleared.",
                "success"
            );

        }
    );


/* =========================================================
   SMART DEADLINE / SCHEDULE NOTIFICATIONS
========================================================= */

function getReminderTimeParts() {
    const value = /^([01]\d|2[0-3]):([0-5]\d)$/.test(settings.deadlineReminderTime || "")
        ? settings.deadlineReminderTime
        : "18:00";
    const [hours, minutes] = value.split(":").map(Number);
    return { hours, minutes };
}

function dateDaysBetween(start, end) {
    const a = getDateFromString(start);
    const b = getDateFromString(end);
    return Math.round((b - a) / 86400000);
}

function subtractDays(dateString, amount) {
    const date = getDateFromString(dateString);
    date.setDate(date.getDate() - amount);
    return dateToString(date);
}

async function requestDesktopNotificationPermission() {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    try {
        return (await Notification.requestPermission()) === "granted";
    } catch (error) {
        console.warn("Desktop notification permission request failed:", error);
        return false;
    }
}

function sendDesktopReminder(title, message) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    try {
        new Notification(title, {
            body: message,
            silent: false
        });
    } catch (error) {
        console.warn("Desktop reminder could not be shown:", error);
    }
}

function addReminderNotification(key, title, message) {
    if (notifications.some(notification => notification.key === key)) return false;

    notifications.push({
        id: createId(),
        key,
        title,
        message,
        createdAt: new Date().toISOString(),
        read: false
    });

    sendDesktopReminder(title, message);
    saveData();
    updateNotifications();
    return true;
}

function getReminderStartDate(eventDate, createdAt) {
    const reminderDays = Math.max(1, Number(settings.deadlineReminderDays) || 3);
    const plannedStart = subtractDays(eventDate, reminderDays);
    const createdDate = createdAt ? String(createdAt).slice(0, 10) : plannedStart;
    return createdDate > plannedStart ? createdDate : plannedStart;
}

function shouldRemindToday(eventDate, createdAt, itemId) {
    if (!eventDate || eventDate < todayString()) return false;

    const today = todayString();
    const startDate = getReminderStartDate(eventDate, createdAt);
    if (today < startDate || today > eventDate) return false;

    const { hours, minutes } = getReminderTimeParts();
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const reminderMinutes = hours * 60 + minutes;
    if (currentMinutes < reminderMinutes) return false;

    if (settings.dailyDeadlineReminders) {
        const dailyDays = Math.max(1, Number(settings.dailyDeadlineReminderDays) || 3);
        const dailyEnd = getDateFromString(startDate);
        dailyEnd.setDate(dailyEnd.getDate() + dailyDays - 1);
        if (today > dateToString(dailyEnd)) return false;
    } else if (today !== startDate) {
        return false;
    }

    return `${itemId}_${today}`;
}


function checkScheduledReminders() {
    if (!getAuthToken() || !getAuthUser()?.id || settings.deadlineNotifications === false) return;

    let changed = false;

    // Tasks: reminders are based on the task deadline.
    tasks.forEach(task => {
        if (task.completed || !task.deadline) return;

        const keyDate = shouldRemindToday(task.deadline, task.createdAt, task.id);
        if (!keyDate) return;

        const title = task.deadline === todayString()
            ? "Task due today"
            : `Task reminder: ${task.title}`;
        const message = `${task.title} is due ${formatDate(task.deadline)}${task.subject ? ` · ${task.subject}` : ""}.`;

        if (addReminderNotification(`task-reminder-${task.id}-${keyDate}`, title, message)) {
            changed = true;
        }
    });

    // Subject schedules use the exact same reminder rules as tasks.
    subjects.forEach(subject => {
        (Array.isArray(subject.schedule) ? subject.schedule : []).forEach(schedule => {
            if (!schedule?.date) return;

            const keyDate = shouldRemindToday(schedule.date, schedule.createdAt, schedule.id);
            if (!keyDate) return;

            const when = schedule.time ? ` at ${schedule.time}` : "";
            const title = schedule.date === todayString()
                ? `${subject.name}: schedule today`
                : `${subject.name}: upcoming schedule`;
            const message = `${schedule.title} is scheduled for ${formatDate(schedule.date)}${when}.`;

            if (addReminderNotification(`schedule-reminder-${subject.id}-${schedule.id}-${keyDate}`, title, message)) {
                changed = true;
            }
        });
    });

    if (changed) {
        renderAll();
    }
}

// Keep the old function name available for compatibility with any existing code.
function checkDeadlineNotifications() {
    checkScheduledReminders();
}

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

    renderAnalytics();

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

    checkScheduledReminders();

    setMinimumDates();


    /*
        Keep date-related UI fresh if the app remains
        open past midnight.
    */

    setInterval(
        () => {

            updateCurrentDate();

            setMinimumDates();

            checkScheduledReminders();

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
    button.textContent = acearchInstallPrompt ? "Install AceArch" : "Add to Home Screen";
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
