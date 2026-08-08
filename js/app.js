/**
 * ============================================================
 * js/app.js — Application Entry Point
 * Applied Deep Learning Platform
 * ============================================================
 */

// ── Core Modules ──────────────────────────────────────────────
import state     from './core/state.js';
import storage   from './core/storage.js';
import eventBus  from './core/event-bus.js';
import router    from './core/router.js';
import sidebar   from './components/sidebar.js';

// ── Page Imports (Classes) ────────────────────────────────────
// FIX: all pages should now export their CLASS (not an instance)
// so the router can do `new PageClass()` → render() → mounted()
import Dashboard      from './pages/dashboard.js';
import LectureBrowser from './pages/lecture-browser.js';
import LectureDetail  from './pages/lecture-detail.js';
import ExamMode       from './pages/exam.js';
import ResultsPage    from './pages/results.js';
import ProgressPage   from './pages/progress.js';
import StudyQuestions from './pages/study-questions.js';
import BookmarksPage  from './pages/bookmarks.js';
import SettingsPage   from './pages/settings.js';

// ── Constants ─────────────────────────────────────────────────
const BASE_PATH          = '/applied-dl-platform';
const CONTAINER_SELECTOR = '#main-content';

// ── 404 Page ──────────────────────────────────────────────────
const notFoundPage = {
    render() {
        return `
            <div style="
                display:flex;flex-direction:column;align-items:center;
                justify-content:center;min-height:60vh;text-align:center;padding:40px 20px;">
                <div style="font-size:72px;margin-bottom:20px;">🔍</div>
                <h1 style="font-size:28px;color:var(--text-primary);margin-bottom:12px;">Page Not Found</h1>
                <p style="font-size:16px;color:var(--text-muted);max-width:400px;margin-bottom:24px;">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <a href="${BASE_PATH}/dashboard" style="
                    display:inline-block;padding:10px 24px;
                    background:var(--color-primary,#6366f1);color:#fff;
                    border-radius:6px;text-decoration:none;font-weight:500;">
                    Go to Dashboard
                </a>
            </div>`;
    }
};

// ── Data Path Utilities ───────────────────────────────────────
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
        component: Dashboard,
        title: 'Dashboard',
        meta: { icon: '📊', nav: true }
    });
    router.route('/dashboard', {
        component: Dashboard,
        title: 'Dashboard',
        meta: { icon: '📊', nav: true }
    });
    router.route('/lectures', {
        component: LectureBrowser,
        title: 'Lectures',
        meta: { icon: '📚', nav: true }
    });
    router.route('/lectures/:id', {
        component: LectureDetail,
        title: 'Lecture Details',
        meta: { icon: '📖' }
    });
    router.route('/exam/:id', {
        component: ExamMode,
        title: 'Exam',
        meta: { icon: '📝' }
    });
    router.route('/results/:id', {
        component: ResultsPage,
        title: 'Exam Results',
        meta: { icon: '📊' }
    });
    router.route('/progress', {
        component: ProgressPage,
        title: 'Progress',
        meta: { icon: '📈', nav: true }
    });
    router.route('/study-questions', {
        component: StudyQuestions,
        title: 'Study Questions',
        meta: { icon: '📝', nav: true }
    });
    router.route('/bookmarks', {
        component: BookmarksPage,
        title: 'Bookmarks',
        meta: { icon: '⭐', nav: true }
    });
    router.route('/settings', {
        component: SettingsPage,
        title: 'Settings',
        meta: { icon: '⚙️', nav: true }
    });
    router.route('/404', {
        component: notFoundPage,
        title: 'Page Not Found',
        meta: { icon: '🔍' }
    });
}

// ── Initial Route ─────────────────────────────────────────────
function handleInitialRoute() {
    let path = window.location.pathname;
    if (path.startsWith(BASE_PATH)) path = path.substring(BASE_PATH.length) || '/';
    if (!path.startsWith('/'))     path = '/' + path;

    const query = {};
    const searchParams = new URLSearchParams(window.location.search);
    for (const [key, value] of searchParams) query[key] = value;

    router.navigate(path, {}, query, true);
}

// ── Initialization ────────────────────────────────────────────
function initApp() {
    const container = document.querySelector(CONTAINER_SELECTOR);
    if (!container) {
        console.error(`Container "${CONTAINER_SELECTOR}" not found`);
        return;
    }

    router.setContainer(container);
    router.setBasePath(BASE_PATH);

    registerRoutes();

    if (sidebar && typeof sidebar.init === 'function') sidebar.init();

    handleInitialRoute();

    eventBus.emit('app.ready', {
        basePath:  BASE_PATH,
        container: container,
        routes:    router.getRoutes()
    });

    console.log(`[app] Initialized with ${router.getRoutes().length} routes`);
}

// ── Start ─────────────────────────────────────────────────────
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// ── Exports ───────────────────────────────────────────────────
export default { init: initApp, getBasePath, getDataPath, router, state, storage, eventBus, sidebar };
