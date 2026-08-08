/**
 * ============================================================
 * js/pages/dashboard.js — Dashboard Page Controller
 * Applied Deep Learning Platform
 * ============================================================
 */

import state from '../core/state.js';
import storage from '../core/storage.js';
import eventBus from '../core/event-bus.js';
import ProgressRing from '../components/progress-ring.js';
import ChartRenderer from '../components/chart-renderer.js';
import Toast from '../components/toast.js';
import { getDataPath } from '../app.js';

class Dashboard {
    constructor() {
        this._data = {
            lectures: [],
            totalQuestions: 0,
            completedQuestions: 0,
            totalLectures: 0,
            completedLectures: 0,
            overallProgress: 0,
            accuracy: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            skippedQuestions: 0,
            strongTopics: [],
            weakTopics: [],
            recentActivity: []
        };

        this._components = {
            progressRing: null,
            accuracyChart: null
        };

        this._container     = null;
        this._focusHandler  = null;   // ✅ FIX: stored reference for cleanup
        this._hasErrorToast = false;  // ✅ FIX: prevent duplicate toasts

        this._handleStateChange   = this._handleStateChange.bind(this);
        this._handleStorageUpdate = this._handleStorageUpdate.bind(this);
    }

    // ── Router lifecycle ──────────────────────────────────────

    render() {
        return `
        <section id="page-dashboard" class="page page--active" data-page="dashboard">

            <!-- Hero -->
            <section class="hero" id="hero">
                <div class="hero__content">
                    <h1 class="hero__title">
                        Applied Deep Learning
                        <span class="hero__title-accent">Exam Platform</span>
                    </h1>
                    <p class="hero__subtitle">
                        Master your course with interactive MCQs across 13 weeks.
                        Practice by lecture, simulate full exams, and track your progress in real time.
                    </p>
                    <div class="hero__actions">
                        <button class="btn btn--primary btn--lg" id="hero-start-exam-btn">
                            <span>🚀</span> Start Practice Exam
                        </button>
                        <button class="btn btn--secondary btn--lg" id="hero-browse-lectures-btn">
                            <span>📚</span> Browse Lectures
                        </button>
                    </div>
                </div>
                <div class="hero__visual">
                    <div class="hero__stat-bubble hero__stat-bubble--1">
                        <span class="hero__stat-number" id="hero-total-questions">–</span>
                        <span class="hero__stat-label">Questions</span>
                    </div>
                    <div class="hero__stat-bubble hero__stat-bubble--2">
                        <span class="hero__stat-number">13</span>
                        <span class="hero__stat-label">Lectures</span>
                    </div>
                    <div class="hero__stat-bubble hero__stat-bubble--3">
                        <span class="hero__stat-number" id="hero-overall-score">–%</span>
                        <span class="hero__stat-label">Your Best</span>
                    </div>
                </div>
            </section>

            <!-- Stats Grid -->
            <section class="dashboard-cards" id="dashboard-cards">
                <h2 class="section-title">Your Overview</h2>
                <div class="stats-grid" id="stats-grid">
                    <!-- filled by _renderStats() -->
                </div>
            </section>

            <!-- Welcome / summary -->
            <section class="welcome-section" id="welcome-section">
                <!-- filled by _renderWelcome() -->
            </section>

            <!-- Quick Actions -->
            <section class="quick-actions" id="quick-actions">
                <h2 class="section-title">Quick Actions</h2>
                <div class="quick-actions-grid"></div>
            </section>

            <!-- Recent Activity -->
            <section class="activity-section" id="activity-section">
                <h2 class="section-title">Recent Activity</h2>
                <div class="activity-list">
                    <!-- filled by _renderActivity() -->
                </div>
            </section>

        </section>`;
    }

    async mounted() {
        this._container = document.querySelector('#page-dashboard');
        if (!this._container) {
            console.warn('Dashboard: #page-dashboard still not found after render');
            return;
        }

        await this._loadData();
        this._renderStats();
        this._renderWelcome();
        this._renderQuickActions();
        this._renderActivity();
        this._updateHeroBubbles();
        this._setupEventListeners();

        console.log('Dashboard mounted');
    }

    // ── Data loading ──────────────────────────────────────────

    async _loadData() {
        try {
            const indexResponse = await fetch(getDataPath('/data/index.json'));
            if (!indexResponse.ok) throw new Error('Failed to load lecture index');
            const indexData = await indexResponse.json();

            this._data.lectures      = indexData.lectures || [];
            this._data.totalLectures = this._data.lectures.length;

            const progress          = storage.loadUserProgress();
            const completedLectures = storage.loadCompletedLectures();

            this._data.completedLectures  = completedLectures.length;
            this._data.completedQuestions = progress.totalQuestionsAttempted || 0;
            this._data.correctAnswers     = progress.correctAnswers           || 0;
            this._data.wrongAnswers       = progress.wrongAnswers             || 0;
            this._data.skippedQuestions   = progress.skippedQuestions         || 0;

            const totalAttempted = this._data.correctAnswers + this._data.wrongAnswers;
            this._data.accuracy  = totalAttempted > 0
                ? Math.round((this._data.correctAnswers / totalAttempted) * 100) : 0;

            this._data.overallProgress = this._data.totalLectures > 0
                ? Math.round((this._data.completedLectures / this._data.totalLectures) * 100) : 0;

            this._data.totalQuestions = await this._calculateTotalQuestions();
            this._data.recentActivity = this._getRecentActivity();

            state.set('lectures.list',          this._data.lectures);
            state.set('lectures.totalLectures', this._data.totalLectures);
            state.set('lectures.completed',     completedLectures);
            state.set('progress',               progress);

            // ✅ FIX: reset error flag on successful load
            this._hasErrorToast = false;

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            // ✅ FIX: show toast only once, not on every retry
            if (!this._hasErrorToast) {
                this._hasErrorToast = true;
                Toast.error('Failed to load dashboard data. Please refresh the page.');
            }
        }
    }

    async _calculateTotalQuestions() {
        let total = 0;
        for (const lecture of this._data.lectures) {
            try {
                const res = await fetch(getDataPath(`/data/lectures/${lecture.id}/questions.json`));
                if (res.ok) {
                    const data = await res.json();
                    total += data.questions ? data.questions.length : 0;
                }
            } catch {
                console.debug(`No questions for ${lecture.id}`);
            }
        }
        return total;
    }

    _getRecentActivity() {
        return storage.loadExamHistory().slice(0, 10).map(entry => ({
            type:      'exam',
            lectureId: entry.lectureId,
            score:     entry.score    || 0,
            correct:   entry.correct  || 0,
            wrong:     entry.wrong    || 0,
            skipped:   entry.skipped  || 0,
            timestamp: entry.timestamp,
            duration:  entry.duration || 0
        }));
    }

    // ── Render helpers ────────────────────────────────────────

    _qs(selector) {
        return this._container ? this._container.querySelector(selector) : null;
    }

    _updateHeroBubbles() {
        const qEl = this._qs('#hero-total-questions');
        const sEl = this._qs('#hero-overall-score');
        if (qEl) qEl.textContent = this._data.totalQuestions || '–';
        if (sEl) sEl.textContent = this._data.accuracy ? `${this._data.accuracy}%` : '–%';
    }

    _renderWelcome() {
        const section = this._qs('#welcome-section');
        if (!section) return;
        section.innerHTML = `
            <div class="welcome-content">
                <h2>Welcome back, Student! 👋</h2>
                <p>You've completed <strong>${this._data.completedLectures}</strong> out of
                   <strong>${this._data.totalLectures}</strong> lectures.</p>
                <div class="welcome-stats">
                    <div class="stat-item">
                        <span class="stat-number">${this._data.completedLectures}</span>
                        <span class="stat-label">Lectures Completed</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this._data.completedQuestions}</span>
                        <span class="stat-label">Questions Solved</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${this._data.accuracy}%</span>
                        <span class="stat-label">Accuracy</span>
                    </div>
                </div>
            </div>`;
    }

    _renderStats() {
        const grid = this._qs('#stats-grid');
        if (!grid) return;

        const pct = this._data.totalQuestions > 0
            ? Math.round((this._data.completedQuestions / this._data.totalQuestions) * 100) : 0;

        const stats = [
            { label: 'Lectures Completed', value: `${this._data.completedLectures}/${this._data.totalLectures}`,
              icon: '📚', color: 'primary', progress: this._data.overallProgress },
            { label: 'Questions Solved', value: this._data.completedQuestions,
              icon: '✅', color: 'success', progress: pct },
            { label: 'Accuracy', value: `${this._data.accuracy}%`, icon: '🎯',
              color: this._data.accuracy >= 70 ? 'success' : this._data.accuracy >= 50 ? 'warning' : 'danger',
              progress: this._data.accuracy },
            { label: 'Total Questions', value: this._data.totalQuestions || '–',
              icon: '📝', color: 'info', progress: 100 }
        ];

        grid.innerHTML = stats.map(s => `
            <div class="stat-card stat-${s.color}">
                <div class="stat-icon">${s.icon}</div>
                <div class="stat-body">
                    <div class="stat-label">${s.label}</div>
                    <div class="stat-value">${s.value}</div>
                    <div class="stat-progress">
                        <div class="stat-progress-bar" style="width:${s.progress}%"></div>
                    </div>
                </div>
            </div>`).join('');
    }

    _renderActivity() {
        const container = this._qs('.activity-list');
        if (!container) return;

        if (!this._data.recentActivity.length) {
            container.innerHTML = `
                <div class="activity-empty">
                    <span>No recent activity yet. Start practicing to see your progress! 🚀</span>
                </div>`;
            return;
        }

        container.innerHTML = this._data.recentActivity.slice(0, 5).map(item => `
            <div class="activity-item">
                <span class="activity-dot ${item.score >= 70 ? 'success' : item.score >= 50 ? 'warning' : 'danger'}"></span>
                <div class="activity-body">
                    <div class="activity-title">${item.lectureId || 'Unknown Lecture'}</div>
                    <div class="activity-sub">${this._getTimeAgo(new Date(item.timestamp))}</div>
                </div>
                <span class="activity-score ${item.score >= 70 ? 'high' : item.score >= 50 ? 'medium' : 'low'}">
                    ${item.score}%
                </span>
            </div>`).join('');
    }

    _renderQuickActions() {
        const grid = this._qs('.quick-actions-grid');
        if (!grid) return;

        const actions = [
            { id: 'practice', label: 'Start Practice', icon: '📝', color: 'primary'  },
            { id: 'exam',     label: 'Take Exam',      icon: '📋', color: 'success'  },
            { id: 'study',    label: 'Study Questions', icon: '📚', color: 'info'    },
            { id: 'review',   label: 'Review Mistakes', icon: '🔍', color: 'warning' }
        ];

        grid.innerHTML = actions.map(a => `
            <div class="quick-action-card qa-${a.color}" data-action="${a.id}">
                <div class="quick-action-icon">${a.icon}</div>
                <div class="quick-action-title">${a.label}</div>
            </div>`).join('');

        grid.querySelectorAll('.quick-action-card').forEach(card => {
            card.addEventListener('click', () => this._handleQuickAction(card.dataset.action));
        });
    }

    // ── Helpers ───────────────────────────────────────────────

    _handleQuickAction(action) {
        switch (action) {
            case 'practice': eventBus.emit('navigate', '/lectures');        break;
            case 'exam':     eventBus.emit('navigate', '/lectures');        break;
            case 'study':    eventBus.emit('navigate', '/study-questions'); break;
            case 'review':   Toast.info('Review feature coming soon!');     break;
            default:         console.warn('Unknown quick action:', action);
        }
    }

    _getTimeAgo(date) {
        const diff = Date.now() - date;
        const s = Math.floor(diff / 1000);
        const m = Math.floor(s / 60);
        const h = Math.floor(m / 60);
        const d = Math.floor(h / 24);
        if (d > 0) return `${d}d ago`;
        if (h > 0) return `${h}h ago`;
        if (m > 0) return `${m}m ago`;
        return `${s}s ago`;
    }

    _setupEventListeners() {
        eventBus.on('state.updated',   this._handleStateChange);
        eventBus.on('storage.updated', this._handleStorageUpdate);

        // ✅ FIX: store reference so we can remove it in destroy()
        this._focusHandler = () => this._refreshData();
        window.addEventListener('focus', this._focusHandler);

        // Hero buttons
        const startBtn  = this._qs('#hero-start-exam-btn');
        const browseBtn = this._qs('#hero-browse-lectures-btn');
        if (startBtn)  startBtn.addEventListener('click',  () => eventBus.emit('navigate', '/lectures'));
        if (browseBtn) browseBtn.addEventListener('click', () => eventBus.emit('navigate', '/lectures'));
    }

    _handleStateChange(newState) {
        if (newState.progress || newState.lectures) this._refreshData();
    }

    _handleStorageUpdate() { this._refreshData(); }

    async _refreshData() {
        await this._loadData();
        this._renderStats();
        this._renderWelcome();
        this._renderActivity();
        this._updateHeroBubbles();
    }

    // ── Public API ────────────────────────────────────────────

    async update() { await this._refreshData(); }

    destroy() {
        if (this._components.progressRing)  { this._components.progressRing.destroy();  this._components.progressRing  = null; }
        if (this._components.accuracyChart) { this._components.accuracyChart.destroy(); this._components.accuracyChart = null; }

        // ✅ FIX: remove focus listener properly
        if (this._focusHandler) {
            window.removeEventListener('focus', this._focusHandler);
            this._focusHandler = null;
        }

        // ✅ FIX: reset error flag so next mount can show toast if needed
        this._hasErrorToast = false;

        eventBus.off('state.updated',   this._handleStateChange);
        eventBus.off('storage.updated', this._handleStorageUpdate);

        console.log('Dashboard destroyed');
    }
}

export default Dashboard;
