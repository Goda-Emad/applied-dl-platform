/**
 * ============================================================
 * js/app.js — Application Entry Point
 * Applied Deep Learning Platform
 * ============================================================
 */

// ── Core Modules ──────────────────────────────────────────────
import state from './core/state.js';
import storage from './core/storage.js';
import eventBus from './core/event-bus.js';
import router from './core/router.js';
import sidebar from './components/sidebar.js';

// ── Page Imports ─────────────────────────────────────────────
import dashboardPage from './pages/dashboard.js';
import lectureBrowser from './pages/lecture-browser.js';
import lectureDetail from './pages/lecture-detail.js';
import examMode from './pages/exam.js';
import resultsPage from './pages/results.js';
import progressPage from './pages/progress.js';
import studyQuestions from './pages/study-questions.js';
import bookmarksPage from './pages/bookmarks.js';
import settingsPage from './pages/settings.js';

// ── Constants ─────────────────────────────────────────────────

const BASE_PATH = '/applied-dl-platform';
const CONTAINER_SELECTOR = '#app';

// ── 404 Page Component ────────────────────────────────────────

const notFoundPage = {
    render() {
        return `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 60vh;
                text-align: center;
                padding: 40px 20px;
            ">
                <div style="font-size: 72px; margin-bottom: 20px;">🔍</div>
                <h1 style="font-size: 28px; color: var(--text-primary); margin-bottom: 12px;">
                    Page Not Found
                </h1>
                <p style="font-size: 16px; color: var(--text-muted); max-width: 400px; margin-bottom: 24px;">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <a href="${BASE_PATH}/dashboard" style="
                    display: inline-block;
                    padding: 10px 24px;
                    background: var(--color-primary, #6366f1);
                    color: #fff;
                    border-radius: 6px;
                    text-decoration: none;
                    font-weight: 500;
                ">Go to Dashboard</a>
            </div>
        `;
    }
};

// ── Data Path Utility ─────────────────────────────────────────

export function getDataPath(path) {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (window.location.pathname.includes(BASE_PATH)) {
        return `${BASE_PATH}${normalized}`;
    }
    return normalized;
}

export function getBasePath() {
    return BASE_PATH;
}

// ── Route Registration ────────────────────────────────────────

function registerRoutes() {
    router.route('/', {
        component: dashboardPage,
        title: 'Dashboard',
        meta: { icon: '📊', nav: true }
    });

    router.route('/dashboard', {
        component: dashboardPage,
        title: 'Dashboard',
        meta: { icon: '📊', nav: true }
    });

    router.route('/lectures', {
        component: lectureBrowser,
        title: 'Lectures',
        meta: { icon: '📚', nav: true }
    });

    router.route('/lectures/:id', {
        component: lectureDetail,
        title: 'Lecture Details',
        meta: { icon: '📖' }
    });

    router.route('/exam/:id', {
        component: examMode,
        title: 'Exam',
        meta: { icon: '📝' }
    });

    router.route('/results/:id', {
        component: resultsPage,
        title: 'Exam Results',
        meta: { icon: '📊' }
    });

    router.route('/progress', {
        component: progressPage,
        title: 'Progress',
        meta: { icon: '📈', nav: true }
    });

    router.route('/study-questions', {
        component: studyQuestions,
        title: 'Study Questions',
        meta: { icon: '📝', nav: true }
    });

    router.route('/bookmarks', {
        component: bookmarksPage,
        title: 'Bookmarks',
        meta: { icon: '⭐', nav: true }
    });

    router.route('/settings', {
        component: settingsPage,
        title: 'Settings',
        meta: { icon: '⚙️', nav: true }
    });

    router.route('/404', {
        component: notFoundPage,
        title: 'Page Not Found',
        meta: { icon: '🔍' }
    });
}

// ── Initial Route Handling ────────────────────────────────────

function handleInitialRoute() {
    let path = window.location.pathname;

    if (path.startsWith(BASE_PATH)) {
        path = path.substring(BASE_PATH.length) || '/';
    }

    if (!path.startsWith('/')) {
        path = '/' + path;
    }

    const query = {};
    const searchParams = new URLSearchParams(window.location.search);
    for (const [key, value] of searchParams) {
        query[key] = value;
    }

    router.navigate(path, {}, query, true);
}

// ── Application Initialization ────────────────────────────────

function initApp() {
    const container = document.querySelector(CONTAINER_SELECTOR);
    if (!container) {
        console.error(`Container "${CONTAINER_SELECTOR}" not found`);
        return;
    }

    router.setContainer(container);
    router.setBasePath(BASE_PATH);

    registerRoutes();

    if (sidebar && typeof sidebar.init === 'function') {
        sidebar.init();
    }

    handleInitialRoute();

    eventBus.emit('app.ready', {
        basePath: BASE_PATH,
        container: container,
        routes: router.getRoutes()
    });

    console.log(`[app] Initialized with ${router.getRoutes().length} routes`);
}

// ── Start Application ─────────────────────────────────────────

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// ── Exports ────────────────────────────────────────────────────

export default {
    init: initApp,
    getBasePath,
    getDataPath,
    router,
    state,
    storage,
    eventBus,
    sidebar
};
