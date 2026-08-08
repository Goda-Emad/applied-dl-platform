/**
 * ============================================================
 * js/pages/progress.js — Progress & Analytics Page Controller
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Progress Page Controller
 * 
 * Displays comprehensive learning progress, analytics,
 * and performance metrics across the entire course.
 */

import state from '../core/state.js';
import storage from '../core/storage.js';
import eventBus from '../core/event-bus.js';
import router from '../core/router.js';
import Toast from '../components/toast.js';
import ProgressRing from '../components/progress-ring.js';
import ChartRenderer from '../components/chart-renderer.js';

class ProgressPage {
    constructor() {
        // DOM elements
        this._elements = {
            container: null,
            overviewSection: null,
            lectureProgressSection: null,
            performanceSection: null,
            activitySection: null,
            loadingIndicator: null
        };
        
        // Data
        this._lectures = [];
        this._lectureProgress = [];
        this._overallStats = {};
        this._topicPerformance = {};
        this._difficultyPerformance = {};
        this._recentActivity = [];
        this._isLoading = false;
        
        // Components
        this._components = {
            overviewRing: null,
            accuracyChart: null,
            difficultyChart: null,
            topicChart: null
        };
        
        // State
        this._initialized = false;
        
        // Bind methods
        this._handleStateChange = this._handleStateChange.bind(this);
        this._handleStorageUpdate = this._handleStorageUpdate.bind(this);
        this._handleActionClick = this._handleActionClick.bind(this);
        
        // Initialize
        this._init();
    }

    /**
     * Initialize the progress page
     */
    async _init() {
        if (this._initialized) return;
        
        // Get container
        this._elements.container = document.querySelector('#progress-container');
        if (!this._elements.container) {
            console.warn('Progress container not found');
            return;
        }
        
        // Cache DOM elements
        this._cacheElements();
        
        // Load data
        await this._loadData();
        
        // Render
        this._render();
        
        // Setup event listeners
        this._setupEventListeners();
        
        this._initialized = true;
        console.log('Progress page initialized');
    }

    /**
     * Cache DOM elements
     */
    _cacheElements() {
        this._elements.overviewSection = this._elements.container.querySelector('.overview-section');
        this._elements.lectureProgressSection = this._elements.container.querySelector('.lecture-progress-section');
        this._elements.performanceSection = this._elements.container.querySelector('.performance-section');
        this._elements.activitySection = this._elements.container.querySelector('.activity-section');
        this._elements.loadingIndicator = this._elements.container.querySelector('.loading-indicator');
    }

    /**
     * Load progress data
     */
    async _loadData() {
        this._isLoading = true;
        this._showLoading(true);
        
        try {
            // Load lecture index
            const indexResponse = await fetch('/data/index.json');
            if (!indexResponse.ok) {
                throw new Error('Failed to load lecture index');
            }
            const indexData = await indexResponse.json();
            this._lectures = indexData.lectures || [];
            
            // Load question counts for each lecture
            const questionCounts = {};
            for (const lecture of this._lectures) {
                try {
                    const response = await fetch(`/data/lectures/${lecture.id}/questions.json`);
                    if (response.ok) {
                        const data = await response.json();
                        questionCounts[lecture.id] = data.questions ? data.questions.length : 0;
                    } else {
                        questionCounts[lecture.id] = 0;
                    }
                } catch (error) {
                    questionCounts[lecture.id] = 0;
                }
            }
            
            // Load user progress
            const progress = storage.loadUserProgress();
            const completedLectures = storage.loadCompletedLectures();
            const examHistory = storage.loadExamHistory();
            
            // Calculate lecture progress
            this._lectureProgress = this._lectures.map(lecture => {
                const totalQuestions = questionCounts[lecture.id] || 0;
                const isCompleted = completedLectures.includes(lecture.id);
                
                // Get exam history for this lecture
                const lectureHistory = examHistory.filter(h => h.lectureId === lecture.id);
                const latestExam = lectureHistory.length > 0 ? lectureHistory[0] : null;
                
                // Calculate solved questions from exam history
                let solvedQuestions = 0;
                let correctAnswers = 0;
                let wrongAnswers = 0;
                
                lectureHistory.forEach(exam => {
                    if (exam.answers) {
                        const answers = Object.values(exam.answers);
                        solvedQuestions += answers.length;
                        // We can't determine correct/wrong from history alone without question data
                        // So we'll use the exam results if available
                        correctAnswers += exam.correct || 0;
                        wrongAnswers += exam.wrong || 0;
                    }
                });
                
                // If completed, all questions are solved
                if (isCompleted) {
                    solvedQuestions = totalQuestions;
                }
                
                const completion = totalQuestions > 0 ? Math.round((solvedQuestions / totalQuestions) * 100) : 0;
                const attempted = correctAnswers + wrongAnswers;
                const accuracy = attempted > 0 ? Math.round((correctAnswers / attempted) * 100) : 0;
                
                return {
                    ...lecture,
                    totalQuestions,
                    solvedQuestions,
                    correctAnswers,
                    wrongAnswers,
                    completion,
                    accuracy,
                    isCompleted,
                    attempts: lectureHistory.length,
                    latestScore: latestExam ? latestExam.percentage || 0 : 0,
                    lastAttempt: lectureHistory.length > 0 ? lectureHistory[0].timestamp : null
                };
            });
            
            // Calculate overall statistics
            this._overallStats = this._calculateOverallStats();
            
            // Calculate topic performance
            this._topicPerformance = await this._calculateTopicPerformance();
            
            // Calculate difficulty performance
            this._difficultyPerformance = await this._calculateDifficultyPerformance();
            
            // Get recent activity
            this._recentActivity = this._getRecentActivity(examHistory);
            
        } catch (error) {
            console.error('Error loading progress data:', error);
            Toast.error('Failed to load progress data. Please refresh the page.');
        } finally {
            this._isLoading = false;
            this._showLoading(false);
        }
    }

    /**
     * Calculate overall statistics
     * @returns {Object} Overall statistics
     */
    _calculateOverallStats() {
        const totalLectures = this._lectures.length;
        const completedLectures = this._lectureProgress.filter(l => l.isCompleted).length;
        const inProgress = this._lectureProgress.filter(l => l.completion > 0 && l.completion < 100).length;
        const notStarted = this._lectureProgress.filter(l => l.completion === 0).length;
        
        const totalQuestions = this._lectureProgress.reduce((sum, l) => sum + l.totalQuestions, 0);
        const solvedQuestions = this._lectureProgress.reduce((sum, l) => sum + l.solvedQuestions, 0);
        const correctAnswers = this._lectureProgress.reduce((sum, l) => sum + l.correctAnswers, 0);
        const wrongAnswers = this._lectureProgress.reduce((sum, l) => sum + l.wrongAnswers, 0);
        const attempted = correctAnswers + wrongAnswers;
        const accuracy = attempted > 0 ? Math.round((correctAnswers / attempted) * 100) : 0;
        const completion = totalQuestions > 0 ? Math.round((solvedQuestions / totalQuestions) * 100) : 0;
        
        const avgScore = this._lectureProgress.length > 0 
            ? Math.round(this._lectureProgress.reduce((sum, l) => sum + l.latestScore, 0) / this._lectureProgress.length) 
            : 0;
        
        return {
            totalLectures,
            completedLectures,
            inProgress,
            notStarted,
            totalQuestions,
            solvedQuestions,
            correctAnswers,
            wrongAnswers,
            accuracy,
            completion,
            avgScore,
            bestLecture: this._lectureProgress.sort((a, b) => b.latestScore - a.latestScore)[0] || null,
            worstLecture: this._lectureProgress.sort((a, b) => a.latestScore - b.latestScore)[0] || null
        };
    }

    /**
     * Calculate topic performance
     * @returns {Object} Topic performance data
     */
    async _calculateTopicPerformance() {
        const performance = {};
        
        // Load all questions and aggregate by topic
        for (const lecture of this._lectures) {
            try {
                const response = await fetch(`/data/lectures/${lecture.id}/questions.json`);
                if (!response.ok) continue;
                
                const data = await response.json();
                const questions = data.questions || [];
                
                // Get exam history for this lecture
                const history = storage.getExamHistoryByLecture(lecture.id);
                const latestExam = history.length > 0 ? history[0] : null;
                
                questions.forEach((question, index) => {
                    const topic = question.topic || 'General';
                    if (!performance[topic]) {
                        performance[topic] = {
                            correct: 0,
                            wrong: 0,
                            skipped: 0,
                            total: 0,
                            lectures: new Set()
                        };
                    }
                    
                    performance[topic].total++;
                    performance[topic].lectures.add(lecture.id);
                    
                    // Check if this question was answered
                    if (latestExam && latestExam.answers && latestExam.answers[index] !== undefined) {
                        const userAnswer = latestExam.answers[index];
                        if (userAnswer === question.answer) {
                            performance[topic].correct++;
                        } else {
                            performance[topic].wrong++;
                        }
                    } else {
                        performance[topic].skipped++;
                    }
                });
            } catch (error) {
                // Skip if no questions available
            }
        }
        
        // Calculate scores
        const result = {};
        for (const [topic, data] of Object.entries(performance)) {
            const attempted = data.correct + data.wrong;
            result[topic] = {
                ...data,
                score: attempted > 0 ? Math.round((data.correct / attempted) * 100) : 0,
                attempted,
                lectures: Array.from(data.lectures)
            };
            delete result[topic].lectures;
        }
        
        return result;
    }

    /**
     * Calculate difficulty performance
     * @returns {Object} Difficulty performance data
     */
    async _calculateDifficultyPerformance() {
        const performance = {
            easy: { correct: 0, wrong: 0, total: 0 },
            medium: { correct: 0, wrong: 0, total: 0 },
            hard: { correct: 0, wrong: 0, total: 0 },
            expert: { correct: 0, wrong: 0, total: 0 }
        };
        
        // Load all questions and aggregate by difficulty
        for (const lecture of this._lectures) {
            try {
                const response = await fetch(`/data/lectures/${lecture.id}/questions.json`);
                if (!response.ok) continue;
                
                const data = await response.json();
                const questions = data.questions || [];
                
                // Get exam history for this lecture
                const history = storage.getExamHistoryByLecture(lecture.id);
                const latestExam = history.length > 0 ? history[0] : null;
                
                questions.forEach((question, index) => {
                    const difficulty = (question.difficulty || 'medium').toLowerCase();
                    if (!performance[difficulty]) {
                        performance[difficulty] = { correct: 0, wrong: 0, total: 0 };
                    }
                    
                    performance[difficulty].total++;
                    
                    if (latestExam && latestExam.answers && latestExam.answers[index] !== undefined) {
                        const userAnswer = latestExam.answers[index];
                        if (userAnswer === question.answer) {
                            performance[difficulty].correct++;
                        } else {
                            performance[difficulty].wrong++;
                        }
                    }
                });
            } catch (error) {
                // Skip if no questions available
            }
        }
        
        // Calculate scores
        const result = {};
        for (const [difficulty, data] of Object.entries(performance)) {
            const attempted = data.correct + data.wrong;
            result[difficulty] = {
                ...data,
                score: attempted > 0 ? Math.round((data.correct / attempted) * 100) : 0,
                attempted
            };
        }
        
        return result;
    }

    /**
     * Get recent activity
     * @param {Array} examHistory - Exam history from storage
     * @returns {Array} Recent activity items
     */
    _getRecentActivity(examHistory) {
        const activity = [];
        
        // Add exam completions
        examHistory.slice(0, 10).forEach(exam => {
            const lecture = this._lectures.find(l => l.id === exam.lectureId);
            activity.push({
                type: 'exam',
                lectureId: exam.lectureId,
                lectureName: lecture ? lecture.title || lecture.id : exam.lectureId,
                score: exam.percentage || 0,
                correct: exam.correct || 0,
                wrong: exam.wrong || 0,
                skipped: exam.skipped || 0,
                timestamp: exam.timestamp,
                duration: exam.duration || 0
            });
        });
        
        // Sort by timestamp (most recent first)
        activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return activity;
    }

    /**
     * Render the progress page
     */
    _render() {
        if (!this._elements.container) return;
        
        // Render overview
        this._renderOverview();
        
        // Render lecture progress
        this._renderLectureProgress();
        
        // Render performance analytics
        this._renderPerformance();
        
        // Render activity
        this._renderActivity();
    }

    /**
     * Render overview section
     */
    _renderOverview() {
        const section = this._elements.overviewSection;
        if (!section) return;
        
        const stats = this._overallStats;
        
        // Create progress ring
        const ringContainer = section.querySelector('.overview-ring-container');
        if (ringContainer) {
            if (this._components.overviewRing) {
                this._components.overviewRing.destroy();
            }
            this._components.overviewRing = new ProgressRing({
                container: ringContainer,
                value: stats.completion,
                size: 140,
                strokeWidth: 8,
                label: 'Course Progress'
            });
        }
        
        // Render stats grid
        const statsGrid = section.querySelector('.overview-stats-grid');
        if (statsGrid) {
            statsGrid.innerHTML = `
                <div class="stat-item highlight-primary">
                    <span class="stat-number">${stats.completedLectures}/${stats.totalLectures}</span>
                    <span class="stat-description">Lectures Completed</span>
                </div>
                <div class="stat-item highlight-success">
                    <span class="stat-number">${stats.solvedQuestions}</span>
                    <span class="stat-description">Questions Solved</span>
                </div>
                <div class="stat-item highlight-warning">
                    <span class="stat-number">${stats.accuracy}%</span>
                    <span class="stat-description">Overall Accuracy</span>
                </div>
                <div class="stat-item highlight-info">
                    <span class="stat-number">${stats.avgScore}%</span>
                    <span class="stat-description">Average Score</span>
                </div>
                <div class="stat-item highlight-secondary">
                    <span class="stat-number">${stats.inProgress}</span>
                    <span class="stat-description">In Progress</span>
                </div>
                <div class="stat-item highlight-danger">
                    <span class="stat-number">${stats.notStarted}</span>
                    <span class="stat-description">Not Started</span>
                </div>
            `;
        }
    }

    /**
     * Render lecture progress section
     */
    _renderLectureProgress() {
        const section = this._elements.lectureProgressSection;
        if (!section) return;
        
        const list = section.querySelector('.lecture-progress-list');
        if (!list) return;
        
        if (this._lectureProgress.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <span>No lectures available</span>
                </div>
            `;
            return;
        }
        
        list.innerHTML = this._lectureProgress.map(lecture => {
            const status = lecture.isCompleted ? 'Completed' : 
                          lecture.completion > 0 ? 'In Progress' : 'Not Started';
            const statusClass = lecture.isCompleted ? 'completed' : 
                               lecture.completion > 0 ? 'in-progress' : 'not-started';
            
            return `
                <div class="lecture-progress-item" data-lecture="${lecture.id}">
                    <div class="lecture-info">
                        <span class="lecture-name">${lecture.title || lecture.id}</span>
                        <span class="lecture-status ${statusClass}">${status}</span>
                    </div>
                    <div class="lecture-stats">
                        <span class="stat">${lecture.solvedQuestions}/${lecture.totalQuestions} questions</span>
                        <span class="stat">${lecture.accuracy}% accuracy</span>
                        <span class="stat">${lecture.attempts} attempts</span>
                    </div>
                    <div class="progress-bar-track">
                        <div class="progress-bar-fill ${lecture.isCompleted ? 'success' : ''}" 
                             style="width: ${lecture.completion}%">
                        </div>
                    </div>
                    <div class="progress-labels">
                        <span>${lecture.completion}% complete</span>
                        ${lecture.latestScore > 0 ? `<span>Best score: ${lecture.latestScore}%</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Attach click events
        list.querySelectorAll('.lecture-progress-item').forEach(item => {
            item.addEventListener('click', () => {
                const lectureId = item.dataset.lecture;
                if (lectureId) {
                    router.navigate(`/lectures/${lectureId}`);
                }
            });
        });
    }

    /**
     * Render performance analytics section
     */
    _renderPerformance() {
        const section = this._elements.performanceSection;
        if (!section) return;
        
        // Render accuracy chart
        const accuracyContainer = section.querySelector('.accuracy-chart-container');
        if (accuracyContainer) {
            if (this._components.accuracyChart) {
                this._components.accuracyChart.destroy();
            }
            
            const data = this._lectureProgress.map(l => l.accuracy || 0);
            const labels = this._lectureProgress.map(l => l.title || l.id);
            
            this._components.accuracyChart = new ChartRenderer({
                container: accuracyContainer,
                type: 'bar',
                data: data.length > 0 ? data : [0],
                labels: labels.length > 0 ? labels : ['No Data'],
                title: 'Accuracy by Lecture',
                height: 250,
                colors: {
                    palette: ['var(--color-primary)']
                }
            });
        }
        
        // Render difficulty chart
        const difficultyContainer = section.querySelector('.difficulty-chart-container');
        if (difficultyContainer) {
            if (this._components.difficultyChart) {
                this._components.difficultyChart.destroy();
            }
            
            const difficulties = ['easy', 'medium', 'hard', 'expert'];
            const data = difficulties.map(d => this._difficultyPerformance[d]?.score || 0);
            
            this._components.difficultyChart = new ChartRenderer({
                container: difficultyContainer,
                type: 'bar',
                data: data,
                labels: ['Easy', 'Medium', 'Hard', 'Expert'],
                title: 'Performance by Difficulty',
                height: 200,
                colors: {
                    palette: ['#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']
                }
            });
        }
        
        // Render topics chart
        const topicsContainer = section.querySelector('.topics-chart-container');
        if (topicsContainer) {
            if (this._components.topicChart) {
                this._components.topicChart.destroy();
            }
            
            const topics = Object.entries(this._topicPerformance)
                .sort((a, b) => b[1].score - a[1].score)
                .slice(0, 10);
            
            const data = topics.map(([_, d]) => d.score);
            const labels = topics.map(([name, _]) => name);
            
            this._components.topicChart = new ChartRenderer({
                container: topicsContainer,
                type: 'horizontal-bar',
                data: data.length > 0 ? data : [0],
                labels: labels.length > 0 ? labels : ['No Topics'],
                title: 'Performance by Topic',
                height: 250,
                colors: {
                    palette: ['var(--color-secondary)']
                }
            });
        }
        
        // Render strong/weak topics
        const strongContainer = section.querySelector('.strong-topics-list');
        const weakContainer = section.querySelector('.weak-topics-list');
        
        const sorted = Object.entries(this._topicPerformance)
            .sort((a, b) => b[1].score - a[1].score);
        
        const strong = sorted.filter(([_, d]) => d.score >= 70).slice(0, 5);
        const weak = sorted.filter(([_, d]) => d.score < 70).slice(-5);
        
        if (strongContainer) {
            if (strong.length === 0) {
                strongContainer.innerHTML = `
                    <div class="empty-state">
                        <span>Complete more questions to identify strengths</span>
                    </div>
                `;
            } else {
                strongContainer.innerHTML = strong.map(([name, data]) => `
                    <div class="topic-item">
                        <span class="topic-name">${name}</span>
                        <span class="topic-score">${data.score}%</span>
                        <div class="topic-bar-wrap">
                            <div class="topic-bar-fill" style="width: ${data.score}%"></div>
                        </div>
                    </div>
                `).join('');
            }
        }
        
        if (weakContainer) {
            if (weak.length === 0) {
                weakContainer.innerHTML = `
                    <div class="empty-state">
                        <span>No weak topics detected! Great job! 🎉</span>
                    </div>
                `;
            } else {
                weakContainer.innerHTML = weak.map(([name, data]) => `
                    <div class="topic-item">
                        <span class="topic-name">${name}</span>
                        <span class="topic-score">${data.score}%</span>
                        <div class="topic-bar-wrap">
                            <div class="topic-bar-fill" style="width: ${data.score}%"></div>
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    /**
     * Render activity section
     */
    _renderActivity() {
        const section = this._elements.activitySection;
        if (!section) return;
        
        const list = section.querySelector('.activity-list');
        if (!list) return;
        
        if (this._recentActivity.length === 0) {
            list.innerHTML = `
                <div class="activity-empty">
                    <span>No recent activity yet. Start learning to see your progress! 🚀</span>
                </div>
            `;
            return;
        }
        
        list.innerHTML = this._recentActivity.slice(0, 10).map(item => {
            const date = new Date(item.timestamp);
            const timeAgo = this._getTimeAgo(date);
            const scoreClass = item.score >= 70 ? 'high' : item.score >= 50 ? 'medium' : 'low';
            
            return `
                <div class="activity-item">
                    <span class="activity-dot ${item.score >= 70 ? 'success' : item.score >= 50 ? 'warning' : 'danger'}"></span>
                    <div class="activity-body">
                        <div class="activity-title">${item.lectureName || item.lectureId}</div>
                        <div class="activity-sub">${timeAgo}</div>
                    </div>
                    <span class="activity-score ${scoreClass}">${item.score}%</span>
                </div>
            `;
        }).join('');
    }

    /**
     * Get time ago string
     * @param {Date} date - Date object
     * @returns {string} Time ago string
     */
    _getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffDay > 0) {
            return `${diffDay}d ago`;
        }
        if (diffHour > 0) {
            return `${diffHour}h ago`;
        }
        if (diffMin > 0) {
            return `${diffMin}m ago`;
        }
        return `${diffSec}s ago`;
    }

    /**
     * Show/hide loading indicator
     * @param {boolean} show - Show loading
     */
    _showLoading(show) {
        if (this._elements.loadingIndicator) {
            this._elements.loadingIndicator.style.display = show ? 'flex' : 'none';
        }
        if (this._elements.container) {
            this._elements.container.style.opacity = show ? '0.5' : '1';
            this._elements.container.style.pointerEvents = show ? 'none' : 'auto';
        }
    }

    /**
     * Setup event listeners
     */
    _setupEventListeners() {
        // State changes
        eventBus.on('state.updated', this._handleStateChange);
        eventBus.on('storage.updated', this._handleStorageUpdate);
        
        // Theme changes
        eventBus.on('theme.changed', () => {
            // Re-render charts
            this._renderPerformance();
        });
        
        // Refresh button
        const refreshBtn = this._elements.container?.querySelector('[data-action="refresh"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this._refreshData();
            });
        }
    }

    /**
     * Handle state changes
     */
    _handleStateChange() {
        this._refreshData();
    }

    /**
     * Handle storage updates
     */
    _handleStorageUpdate() {
        this._refreshData();
    }

    /**
     * Handle action button clicks
     * @param {Event} e - Click event
     */
    _handleActionClick(e) {
        const action = e.currentTarget.dataset.action;
        if (action === 'refresh') {
            this._refreshData();
        }
    }

    /**
     * Refresh data
     */
    async _refreshData() {
        await this._loadData();
        this._render();
        Toast.success('Progress data refreshed');
    }

    /**
     * Get overall statistics
     * @returns {Object} Overall statistics
     */
    getStats() {
        return { ...this._overallStats };
    }

    /**
     * Get lecture progress
     * @returns {Array} Lecture progress data
     */
    getLectureProgress() {
        return [...this._lectureProgress];
    }

    /**
     * Get topic performance
     * @returns {Object} Topic performance data
     */
    getTopicPerformance() {
        return { ...this._topicPerformance };
    }

    /**
     * Get recent activity
     * @returns {Array} Recent activity
     */
    getRecentActivity() {
        return [...this._recentActivity];
    }

    /**
     * Destroy the progress page
     */
    destroy() {
        // Destroy components
        if (this._components.overviewRing) {
            this._components.overviewRing.destroy();
            this._components.overviewRing = null;
        }
        if (this._components.accuracyChart) {
            this._components.accuracyChart.destroy();
            this._components.accuracyChart = null;
        }
        if (this._components.difficultyChart) {
            this._components.difficultyChart.destroy();
            this._components.difficultyChart = null;
        }
        if (this._components.topicChart) {
            this._components.topicChart.destroy();
            this._components.topicChart = null;
        }
        
        // Clear event listeners
        eventBus.off('state.updated', this._handleStateChange);
        eventBus.off('storage.updated', this._handleStorageUpdate);
        
        this._initialized = false;
        console.log('Progress page destroyed');
    }
}

/**
 * Create and export the progress page instance
 */
export default ProgressPage;
