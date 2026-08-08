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
        this._elements = {
            container: null,
            statsGrid: null,
            welcomeSection: null,
            progressSection: null,
            performanceSection: null,
            activitySection: null,
            topicsSection: null,
            quickActions: null
        };

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
            accuracyChart: null,
            topicsChart: null
        };

        this._initialized = false;

        this._handleStateChange = this._handleStateChange.bind(this);
        this._handleStorageUpdate = this._handleStorageUpdate.bind(this);
    }

    // ── Called by Router ──────────────────────────────────────

    /**
     * render() — called by the router; returns empty string because
     * the dashboard HTML already exists in index.html (#page-dashboard).
     * The real work happens in mounted().
     */
    render() {
        return '';
    }

    /**
     * mounted() — called by the router after render().
     * This is where we attach to the existing DOM and load data.
     */
    async mounted() {
        await this._init();
    }

    // ── Internals ─────────────────────────────────────────────

    async _init() {
        if (this._initialized) return;

        // FIX 1: use the correct selector that exists in index.html
        this._elements.container = document.querySelector('#page-dashboard');
        if (!this._elements.container) {
            console.warn('Dashboard container (#page-dashboard) not found');
            return;
        }

        this._cacheElements();
        await this._loadData();
        this._render();
        this._setupEventListeners();

        this._initialized = true;
        console.log('Dashboard initialized');
    }

    _cacheElements() {
        this._elements.statsGrid        = this._elements.container.querySelector('.stats-grid');
        this._elements.welcomeSection   = this._elements.container.querySelector('.welcome-section');
        this._elements.progressSection  = this._elements.container.querySelector('.progress-section');
        this._elements.performanceSection = this._elements.container.querySelector('.performance-section');
        this._elements.activitySection  = this._elements.container.querySelector('.activity-section');
        this._elements.topicsSection    = this._elements.container.querySelector('.topics-section');
        this._elements.quickActions     = this._elements.container.querySelector('.quick-actions');
    }

    async _loadData() {
        try {
            // FIX 2: use getDataPath() so the path includes the base path
            const indexResponse = await fetch(getDataPath('/data/index.json'));
            if (!indexResponse.ok) throw new Error('Failed to load lecture index');
            const indexData = await indexResponse.json();

            this._data.lectures      = indexData.lectures || [];
            this._data.totalLectures = this._data.lectures.length;

            const progress         = storage.loadUserProgress();
            const completedLectures = storage.loadCompletedLectures();

            this._data.completedLectures    = completedLectures.length;
            this._data.completedQuestions   = progress.totalQuestionsAttempted || 0;
            this._data.correctAnswers       = progress.correctAnswers  || 0;
            this._data.wrongAnswers         = progress.wrongAnswers    || 0;
            this._data.skippedQuestions     = progress.skippedQuestions || 0;

            const totalAttempted = this._data.correctAnswers + this._data.wrongAnswers;
            this._data.accuracy = totalAttempted > 0
                ? Math.round((this._data.correctAnswers / totalAttempted) * 100)
                : 0;

            this._data.overallProgress = this._data.totalLectures > 0
                ? Math.round((this._data.completedLectures / this._data.totalLectures) * 100)
                : 0;

            this._data.totalQuestions = await this._calculateTotalQuestions();

            await this._calculateTopicPerformance();

            this._data.recentActivity = this._getRecentActivity();

            state.set('lectures.list',        this._data.lectures);
            state.set('lectures.totalLectures', this._data.totalLectures);
            state.set('lectures.completed',   completedLectures);
            state.set('progress',             progress);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            Toast.error('Failed to load dashboard data. Please refresh the page.');
        }
    }

    async _calculateTotalQuestions() {
        let total = 0;
        for (const lecture of this._data.lectures) {
            try {
                // FIX 2 (continued): getDataPath() for all fetch calls
                const response = await fetch(getDataPath(`/data/lectures/${lecture.id}/questions.json`));
                if (response.ok) {
                    const data = await response.json();
                    total += data.questions ? data.questions.length : 0;
                }
            } catch {
                console.debug(`No questions found for ${lecture.id}`);
            }
        }
        return total;
    }

    async _calculateTopicPerformance() {
        const topicPerformance = {};
        const stats     = storage.loadStatistics();
        const topicStats = stats.byTopic || {};

        for (const [topic, data] of Object.entries(topicStats)) {
            const total = (data.correct || 0) + (data.wrong || 0);
            if (total > 0) {
                const score = Math.round(((data.correct || 0) / total) * 100);
                topicPerformance[topic] = { score, attempts: total, correct: data.correct || 0, wrong: data.wrong || 0 };
            }
        }

        const sortedTopics = Object.entries(topicPerformance).sort((a, b) => b[1].score - a[1].score);

        this._data.strongTopics = sortedTopics
            .filter(([_, data]) => data.score >= 70)
            .slice(0, 5)
            .map(([name, data]) => ({ name, ...data }));

        const weakFromStats = sortedTopics
            .filter(([_, data]) => data.score < 70)
            .slice(-5)
            .map(([name, data]) => ({ name, ...data }));

        const attemptedTopics   = new Set(Object.keys(topicPerformance));
        const unattemptedTopics = this._data.lectures
            .flatMap(lecture => lecture.topics || [])
            .filter(topic => !attemptedTopics.has(topic))
            .slice(0, 3)
            .map(name => ({ name, score: 0, attempts: 0, correct: 0, wrong: 0 }));

        this._data.weakTopics = [...weakFromStats, ...unattemptedTopics].slice(0, 5);
    }

    _getRecentActivity() {
        const history = storage.loadExamHistory();
        return history.slice(0, 10).map(entry => ({
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

    _render() {
        if (!this._elements.container) return;
        this._renderWelcome();
        this._renderStats();
        this._renderProgress();
        this._renderPerformance();
        this._renderTopics();
        this._renderActivity();
        this._renderQuickActions();
    }

    _renderWelcome() {
        const section = this._elements.welcomeSection;
        if (!section) return;
        section.innerHTML = `
            <div class="welcome-content">
                <h2>Welcome back, Student! 👋</h2>
                <p>Continue your deep learning journey. You've completed ${this._data.completedLectures} out of ${this._data.totalLectures} lectures.</p>
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
        const grid = this._elements.statsGrid;
        if (!grid) return;

        const stats = [
            { label: 'Lectures Completed', value: `${this._data.completedLectures}/${this._data.totalLectures}`, icon: '📚', color: 'primary', progress: this._data.overallProgress },
            { label: 'Questions Solved',   value: this._data.completedQuestions, icon: '✅', color: 'success',
              progress: this._data.totalQuestions > 0 ? Math.round((this._data.completedQuestions / this._data.totalQuestions) * 100) : 0 },
            { label: 'Accuracy', value: `${this._data.accuracy}%`, icon: '🎯',
              color: this._data.accuracy >= 70 ? 'success' : this._data.accuracy >= 50 ? 'warning' : 'danger',
              progress: this._data.accuracy },
            { label: 'Total Questions', value: this._data.totalQuestions, icon: '📝', color: 'info', progress: 100 }
        ];

        grid.innerHTML = stats.map(stat => `
            <div class="stat-card stat-${stat.color}">
                <div class="stat-icon">${stat.icon}</div>
                <div class="stat-body">
                    <div class="stat-label">${stat.label}</div>
                    <div class="stat-value">${stat.value}</div>
                    ${stat.progress !== undefined ? `
                        <div class="stat-progress">
                            <div class="stat-progress-bar" style="width: ${stat.progress}%"></div>
                        </div>` : ''}
                </div>
            </div>`).join('');
    }

    _renderProgress() {
        const section = this._elements.progressSection;
        if (!section) return;

        const ringContainer = section.querySelector('.progress-ring-container');
        if (ringContainer) {
            if (this._components.progressRing) this._components.progressRing.destroy();
            this._components.progressRing = new ProgressRing({
                container: ringContainer,
                value: this._data.overallProgress,
                size: 140,
                strokeWidth: 8,
                label: 'Overall Progress'
            });
        }

        const listContainer = section.querySelector('.lecture-progress-list');
        if (listContainer) {
            const completedSet = new Set(storage.loadCompletedLectures());
            listContainer.innerHTML = this._data.lectures.slice(0, 8).map(lecture => {
                const isCompleted = completedSet.has(lecture.id);
                const progress    = isCompleted ? 100 : 0;
                return `
                    <div class="lecture-progress-item ${isCompleted ? 'completed' : ''}">
                        <span class="lecture-name">${lecture.title || lecture.id}</span>
                        <div class="progress-bar-track">
                            <div class="progress-bar-fill ${isCompleted ? 'success' : ''}" style="width: ${progress}%"></div>
                        </div>
                        <span class="progress-percentage">${progress}%</span>
                    </div>`;
            }).join('');
        }
    }

    _renderPerformance() {
        const section = this._elements.performanceSection;
        if (!section) return;

        const chartContainer = section.querySelector('.accuracy-chart-container');
        if (chartContainer) {
            if (this._components.accuracyChart) this._components.accuracyChart.destroy();
            const history = storage.loadExamHistory();
            const scores  = history.slice(0, 10).reverse().map(e => e.score || 0);
            const labels  = history.slice(0, 10).reverse().map((_, i) => `Exam ${i + 1}`);
            this._components.accuracyChart = new ChartRenderer({
                container: chartContainer,
                type: 'line',
                data:   scores.length > 0 ? scores : [0],
                labels: labels.length  > 0 ? labels : ['No Data'],
                title: 'Exam Performance History',
                height: 250,
                colors: { primary: 'var(--color-primary)' }
            });
        }

        const breakdownContainer = section.querySelector('.performance-breakdown');
        if (breakdownContainer) {
            const total = this._data.correctAnswers + this._data.wrongAnswers + this._data.skippedQuestions;
            breakdownContainer.innerHTML = `
                <div class="perf-breakdown-item">
                    <span class="perf-breakdown-label">Correct</span>
                    <div class="perf-mini-bar-wrap">
                        <div class="perf-mini-bar-fill correct" style="width: ${total > 0 ? (this._data.correctAnswers / total) * 100 : 0}%"></div>
                    </div>
                    <span class="perf-breakdown-val">${this._data.correctAnswers}</span>
                </div>
                <div class="perf-breakdown-item">
                    <span class="perf-breakdown-label">Wrong</span>
                    <div class="perf-mini-bar-wrap">
                        <div class="perf-mini-bar-fill wrong" style="width: ${total > 0 ? (this._data.wrongAnswers / total) * 100 : 0}%"></div>
                    </div>
                    <span class="perf-breakdown-val">${this._data.wrongAnswers}</span>
                </div>
                <div class="perf-breakdown-item">
                    <span class="perf-breakdown-label">Skipped</span>
                    <div class="perf-mini-bar-wrap">
                        <div class="perf-mini-bar-fill skipped" style="width: ${total > 0 ? (this._data.skippedQuestions / total) * 100 : 0}%"></div>
                    </div>
                    <span class="perf-breakdown-val">${this._data.skippedQuestions}</span>
                </div>`;
        }
    }

    _renderTopics() {
        const section = this._elements.topicsSection;
        if (!section) return;

        const strongContainer = section.querySelector('.strong-topics');
        if (strongContainer) {
            strongContainer.innerHTML = this._data.strongTopics.length === 0
                ? `<div class="empty-state"><span>Complete more questions to identify your strengths 🎯</span></div>`
                : this._data.strongTopics.map((topic, i) => `
                    <div class="topic-item">
                        <span class="topic-rank">${i + 1}</span>
                        <span class="topic-name">${topic.name}</span>
                        <span class="topic-score">${topic.score}%</span>
                        <div class="topic-bar-wrap"><div class="topic-bar-fill" style="width: ${topic.score}%"></div></div>
                    </div>`).join('');
        }

        const weakContainer = section.querySelector('.weak-topics');
        if (weakContainer) {
            weakContainer.innerHTML = this._data.weakTopics.length === 0
                ? `<div class="empty-state"><span>Keep it up! No weak topics detected 🌟</span></div>`
                : this._data.weakTopics.map((topic, i) => `
                    <div class="topic-item">
                        <span class="topic-rank">${i + 1}</span>
                        <span class="topic-name">${topic.name}</span>
                        <span class="topic-score">${topic.score || 0}%</span>
                        <div class="topic-bar-wrap"><div class="topic-bar-fill" style="width: ${topic.score || 0}%"></div></div>
                    </div>`).join('');
        }
    }

    _renderActivity() {
        const section = this._elements.activitySection;
        if (!section) return;
        const container = section.querySelector('.activity-list');
        if (!container) return;

        if (this._data.recentActivity.length === 0) {
            container.innerHTML = `<div class="activity-empty"><span>No recent activity yet. Start practicing to see your progress! 🚀</span></div>`;
            return;
        }

        container.innerHTML = this._data.recentActivity.slice(0, 5).map(item => {
            const timeAgo = this._getTimeAgo(new Date(item.timestamp));
            return `
                <div class="activity-item">
                    <span class="activity-dot ${item.score >= 70 ? 'success' : item.score >= 50 ? 'warning' : 'danger'}"></span>
                    <div class="activity-body">
                        <div class="activity-title">${item.lectureId || 'Unknown Lecture'}</div>
                        <div class="activity-sub">${timeAgo}</div>
                    </div>
                    <span class="activity-score ${item.score >= 70 ? 'high' : item.score >= 50 ? 'medium' : 'low'}">${item.score}%</span>
                </div>`;
        }).join('');
    }

    _renderQuickActions() {
        const section = this._elements.quickActions;
        if (!section) return;
        const actions = [
            { id: 'practice', label: 'Start Practice', icon: '📝', color: 'primary' },
            { id: 'exam',     label: 'Take Exam',      icon: '📋', color: 'success' },
            { id: 'study',    label: 'Study Questions', icon: '📚', color: 'info'    },
            { id: 'review',   label: 'Review Mistakes', icon: '🔍', color: 'warning' }
        ];
        const grid = section.querySelector('.quick-actions-grid');
        if (!grid) return;
        grid.innerHTML = actions.map(a => `
            <div class="quick-action-card qa-${a.color}" data-action="${a.id}">
                <div class="quick-action-icon">${a.icon}</div>
                <div class="quick-action-title">${a.label}</div>
            </div>`).join('');
        grid.querySelectorAll('.quick-action-card').forEach(card => {
            card.addEventListener('click', () => this._handleQuickAction(card.dataset.action));
        });
    }

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
        eventBus.on('theme.changed', () => {
            if (this._components.accuracyChart) this._components.accuracyChart.render();
        });
        window.addEventListener('focus', () => this._refreshData());
    }

    _handleStateChange(newState) {
        if (newState.progress || newState.lectures) this._refreshData();
    }

    _handleStorageUpdate() {
        this._refreshData();
    }

    async _refreshData() {
        await this._loadData();
        this._render();
    }

    async update()  { await this._refreshData(); }
    getData()       { return { ...this._data }; }
    getStats() {
        return {
            totalLectures:      this._data.totalLectures,
            completedLectures:  this._data.completedLectures,
            totalQuestions:     this._data.totalQuestions,
            completedQuestions: this._data.completedQuestions,
            accuracy:           this._data.accuracy,
            overallProgress:    this._data.overallProgress
        };
    }

    destroy() {
        if (this._components.progressRing)  { this._components.progressRing.destroy();  this._components.progressRing  = null; }
        if (this._components.accuracyChart) { this._components.accuracyChart.destroy(); this._components.accuracyChart = null; }
        eventBus.off('state.updated',   this._handleStateChange);
        eventBus.off('storage.updated', this._handleStorageUpdate);
        this._initialized = false;
        console.log('Dashboard destroyed');
    }
}

// FIX 3: export the CLASS itself (not an instance)
// so the router can do `new Dashboard()` and call render() + mounted()
export default Dashboard;
