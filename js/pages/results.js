/**
 * ============================================================
 * js/pages/results.js — Results Page Controller
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Results Page Controller
 * 
 * Displays exam results with detailed performance analysis,
 * question review, and navigation actions.
 */

import state from '../core/state.js';
import storage from '../core/storage.js';
import eventBus from '../core/event-bus.js';
import router from '../core/router.js';
import Toast from '../components/toast.js';
import ProgressRing from '../components/progress-ring.js';
import ChartRenderer from '../components/chart-renderer.js';

class ResultsPage {
    constructor() {
        // DOM elements
        this._elements = {
            container: null,
            scoreSummary: null,
            statsGrid: null,
            performanceSection: null,
            topicsSection: null,
            reviewSection: null,
            actions: null,
            loadingIndicator: null
        };
        
        // Data
        this._results = null;
        this._lectureId = null;
        this._questions = [];
        this._answers = {};
        this._filteredReview = [];
        this._reviewFilter = 'all';
        
        // Components
        this._components = {
            progressRing: null,
            accuracyChart: null,
            distributionChart: null,
            difficultyChart: null
        };
        
        // State
        this._initialized = false;
        this._isLoading = false;
        
        // Bind methods
        this._handleFilterChange = this._handleFilterChange.bind(this);
        this._handleActionClick = this._handleActionClick.bind(this);
        this._handleStateChange = this._handleStateChange.bind(this);
        
        // Initialize
        this._init();
    }

    /**
     * Initialize the results page
     */
    async _init() {
        if (this._initialized) return;
        
        // Get container
        this._elements.container = document.querySelector('#results-container');
        if (!this._elements.container) {
            console.warn('Results container not found');
            return;
        }
        
        // Cache DOM elements
        this._cacheElements();
        
        // Load results
        await this._loadResults();
        
        // Render
        if (this._results) {
            this._render();
        } else {
            this._renderEmptyState();
        }
        
        // Setup event listeners
        this._setupEventListeners();
        
        this._initialized = true;
        console.log('Results page initialized');
    }

    /**
     * Cache DOM elements
     */
    _cacheElements() {
        this._elements.scoreSummary = this._elements.container.querySelector('.score-summary');
        this._elements.statsGrid = this._elements.container.querySelector('.results-stats-grid');
        this._elements.performanceSection = this._elements.container.querySelector('.performance-analysis');
        this._elements.topicsSection = this._elements.container.querySelector('.topics-analysis');
        this._elements.reviewSection = this._elements.container.querySelector('.question-review-section');
        this._elements.actions = this._elements.container.querySelector('.results-actions');
        this._elements.loadingIndicator = this._elements.container.querySelector('.loading-indicator');
    }

    /**
     * Load results data
     */
    async _loadResults() {
        this._isLoading = true;
        this._showLoading(true);
        
        try {
            // Get lecture ID from router
            const route = router.getCurrentRoute();
            this._lectureId = route.params?.id || null;
            
            // Try to get results from state
            const examState = state.get('exam');
            if (examState && examState.results && examState.lectureId === this._lectureId) {
                this._results = examState.results;
                this._questions = examState.questions || [];
                this._answers = examState.answers || {};
            } else {
                // Try to get results from storage
                const history = storage.loadExamHistory();
                const latest = history.find(h => h.lectureId === this._lectureId);
                if (latest) {
                    this._results = {
                        total: latest.total || 0,
                        correct: latest.correct || 0,
                        wrong: latest.wrong || 0,
                        skipped: latest.skipped || 0,
                        score: latest.score || 0,
                        percentage: latest.percentage || 0,
                        grade: this._getGrade(latest.percentage || 0),
                        duration: latest.duration || 0
                    };
                    this._answers = latest.answers || {};
                    
                    // Load questions for review
                    if (this._lectureId) {
                        const response = await fetch(`/data/lectures/${this._lectureId}/questions.json`);
                        if (response.ok) {
                            const data = await response.json();
                            this._questions = data.questions || [];
                        }
                    }
                }
            }
            
            // If still no results, try to get from storage by lecture ID
            if (!this._results && this._lectureId) {
                const history = storage.loadExamHistory();
                const lectureResults = history.filter(h => h.lectureId === this._lectureId);
                if (lectureResults.length > 0) {
                    const latest = lectureResults[0];
                    this._results = {
                        total: latest.total || 0,
                        correct: latest.correct || 0,
                        wrong: latest.wrong || 0,
                        skipped: latest.skipped || 0,
                        score: latest.score || 0,
                        percentage: latest.percentage || 0,
                        grade: this._getGrade(latest.percentage || 0),
                        duration: latest.duration || 0
                    };
                    this._answers = latest.answers || {};
                }
            }
            
        } catch (error) {
            console.error('Error loading results:', error);
            Toast.error('Failed to load results. Please try again.');
        } finally {
            this._isLoading = false;
            this._showLoading(false);
        }
    }

    /**
     * Render the results page
     */
    _render() {
        if (!this._results || !this._elements.container) return;
        
        // Render score summary
        this._renderScoreSummary();
        
        // Render stats grid
        this._renderStatsGrid();
        
        // Render performance analysis
        this._renderPerformanceAnalysis();
        
        // Render topics analysis
        this._renderTopicsAnalysis();
        
        // Render review section
        this._renderReviewSection();
        
        // Render actions
        this._renderActions();
    }

    /**
     * Render score summary
     */
    _renderScoreSummary() {
        const section = this._elements.scoreSummary;
        if (!section) return;
        
        const { percentage, grade, score, total, duration } = this._results;
        const gradeClass = this._getGradeClass(percentage);
        
        section.innerHTML = `
            <div class="score-summary-card">
                <div class="final-score-display">
                    <div class="score-number">${score}</div>
                    <div class="score-total">/${total}</div>
                </div>
                <div class="percentage-indicator">
                    <div class="grade-badge ${gradeClass}">${grade}</div>
                    <div class="percentage-value">${percentage}%</div>
                    <div class="percentage-label">Score</div>
                </div>
                <div class="score-details">
                    <div class="score-detail-item">
                        <span class="detail-label">Time Taken</span>
                        <span class="detail-value">${this._formatDuration(duration)}</span>
                    </div>
                    <div class="score-detail-item">
                        <span class="detail-label">Grade</span>
                        <span class="detail-value">${grade}</span>
                    </div>
                    <div class="score-detail-item">
                        <span class="detail-label">Questions</span>
                        <span class="detail-value">${total}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render stats grid
     */
    _renderStatsGrid() {
        const grid = this._elements.statsGrid;
        if (!grid) return;
        
        const { correct, wrong, skipped, total, percentage } = this._results;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
        
        grid.innerHTML = `
            <div class="results-stat-card stat-correct">
                <span class="stat-icon">✅</span>
                <span class="stat-number">${correct}</span>
                <span class="stat-label">Correct</span>
            </div>
            <div class="results-stat-card stat-wrong">
                <span class="stat-icon">❌</span>
                <span class="stat-number">${wrong}</span>
                <span class="stat-label">Wrong</span>
            </div>
            <div class="results-stat-card stat-skipped">
                <span class="stat-icon">⏭️</span>
                <span class="stat-number">${skipped}</span>
                <span class="stat-label">Skipped</span>
            </div>
            <div class="results-stat-card stat-accuracy">
                <span class="stat-icon">🎯</span>
                <span class="stat-number">${accuracy}%</span>
                <span class="stat-label">Accuracy</span>
            </div>
        `;
    }

    /**
     * Render performance analysis
     */
    _renderPerformanceAnalysis() {
        const section = this._elements.performanceSection;
        if (!section) return;
        
        const { correct, wrong, skipped, total, percentage } = this._results;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
        
        // Create progress ring for overall performance
        const ringContainer = section.querySelector('.performance-ring-container');
        if (ringContainer) {
            if (this._components.progressRing) {
                this._components.progressRing.destroy();
            }
            this._components.progressRing = new ProgressRing({
                container: ringContainer,
                value: percentage,
                size: 120,
                strokeWidth: 8,
                label: 'Overall Score'
            });
        }
        
        // Create distribution chart
        const chartContainer = section.querySelector('.distribution-chart-container');
        if (chartContainer) {
            if (this._components.distributionChart) {
                this._components.distributionChart.destroy();
            }
            
            this._components.distributionChart = new ChartRenderer({
                container: chartContainer,
                type: 'doughnut',
                data: [correct, wrong, skipped],
                labels: ['Correct', 'Wrong', 'Skipped'],
                title: 'Answer Distribution',
                height: 200,
                colors: {
                    palette: ['#22c55e', '#ef4444', '#f59e0b']
                }
            });
        }
        
        // Performance metrics
        const metricsContainer = section.querySelector('.performance-metrics');
        if (metricsContainer) {
            metricsContainer.innerHTML = `
                <div class="metric-item">
                    <span class="metric-value">${accuracy}%</span>
                    <span class="metric-label">Accuracy</span>
                </div>
                <div class="metric-item">
                    <span class="metric-value">${total - skipped}</span>
                    <span class="metric-label">Attempted</span>
                </div>
                <div class="metric-item">
                    <span class="metric-value">${Math.round(correct / Math.max(1, correct + wrong) * 100)}%</span>
                    <span class="metric-label">Success Rate</span>
                </div>
                <div class="metric-item">
                    <span class="metric-value">${this._getGrade(percentage)}</span>
                    <span class="metric-label">Grade</span>
                </div>
            `;
        }
    }

    /**
     * Render topics analysis
     */
    _renderTopicsAnalysis() {
        const section = this._elements.topicsSection;
        if (!section) return;
        
        // Calculate topic performance
        const topicPerformance = this._calculateTopicPerformance();
        
        // Sort topics by performance
        const sorted = Object.entries(topicPerformance)
            .sort((a, b) => b[1].score - a[1].score);
        
        // Get strong and weak topics
        const strong = sorted.filter(([_, data]) => data.score >= 70).slice(0, 5);
        const weak = sorted.filter(([_, data]) => data.score < 70).slice(-5);
        
        // Render strong topics
        const strongContainer = section.querySelector('.strong-topics-list');
        if (strongContainer) {
            if (strong.length === 0) {
                strongContainer.innerHTML = `
                    <div class="empty-topics">
                        <span>No strong topics identified yet</span>
                    </div>
                `;
            } else {
                strongContainer.innerHTML = strong.map(([name, data], index) => `
                    <div class="topic-performance-item">
                        <span class="topic-rank">${index + 1}</span>
                        <span class="topic-name">${name}</span>
                        <span class="topic-score">${data.score}%</span>
                        <div class="topic-bar">
                            <div class="bar-fill" style="width: ${data.score}%"></div>
                        </div>
                    </div>
                `).join('');
            }
        }
        
        // Render weak topics
        const weakContainer = section.querySelector('.weak-topics-list');
        if (weakContainer) {
            if (weak.length === 0) {
                weakContainer.innerHTML = `
                    <div class="empty-topics">
                        <span>No weak topics identified! Great job! 🎉</span>
                    </div>
                `;
            } else {
                weakContainer.innerHTML = weak.map(([name, data], index) => `
                    <div class="topic-performance-item">
                        <span class="topic-rank">${index + 1}</span>
                        <span class="topic-name">${name}</span>
                        <span class="topic-score">${data.score}%</span>
                        <div class="topic-bar">
                            <div class="bar-fill" style="width: ${data.score}%"></div>
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    /**
     * Render review section
     */
    _renderReviewSection() {
        const section = this._elements.reviewSection;
        if (!section) return;
        
        // Apply filter
        this._applyReviewFilter();
        
        // Render filter controls
        this._renderReviewFilters(section);
        
        // Render questions
        const list = section.querySelector('.review-questions-list');
        if (!list) return;
        
        if (this._filteredReview.length === 0) {
            list.innerHTML = `
                <div class="review-empty">
                    <span>No questions match the current filter</span>
                </div>
            `;
            return;
        }
        
        list.innerHTML = this._filteredReview.map((item, index) => {
            const isCorrect = item.userAnswer === item.question.answer;
            const isSkipped = item.userAnswer === undefined;
            const statusClass = isSkipped ? 'skipped' : (isCorrect ? 'correct' : 'wrong');
            const statusLabel = isSkipped ? 'Skipped' : (isCorrect ? 'Correct' : 'Wrong');
            
            return `
                <div class="question-review-item ${statusClass}">
                    <div class="review-item-header">
                        <span class="review-item-number">Question ${index + 1}</span>
                        <span class="review-item-status ${statusClass}">${statusLabel}</span>
                    </div>
                    <div class="review-item-question">
                        <strong>Topic:</strong> ${item.question.topic || 'General'}
                        <span style="margin-left: 12px;"><strong>Difficulty:</strong> ${item.question.difficulty || 'Medium'}</span>
                    </div>
                    <div class="review-item-question">${item.question.question}</div>
                    <div class="review-item-answers">
                        ${item.question.options.map((option, optIndex) => {
                            const isSelected = optIndex === item.userAnswer;
                            const isCorrectAnswer = optIndex === item.question.answer;
                            let className = 'review-answer';
                            if (isCorrectAnswer) className += ' correct';
                            if (isSelected && !isCorrectAnswer) className += ' wrong';
                            if (isSelected) className += ' selected';
                            return `
                                <div class="${className}">
                                    <span class="answer-marker">${String.fromCharCode(65 + optIndex)}.</span>
                                    <span>${option}</span>
                                    ${isCorrectAnswer ? ' ✅' : ''}
                                    ${isSelected && !isCorrectAnswer ? ' ❌' : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                    ${item.question.explanation ? `
                        <div class="review-explanation">
                            <span class="explanation-label">💡 Explanation:</span>
                            ${item.question.explanation}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    /**
     * Render review filters
     * @param {HTMLElement} section - Review section element
     */
    _renderReviewFilters(section) {
        const filterContainer = section.querySelector('.review-filters');
        if (!filterContainer) return;
        
        const filters = [
            { value: 'all', label: 'All Questions' },
            { value: 'correct', label: '✅ Correct' },
            { value: 'wrong', label: '❌ Wrong' },
            { value: 'skipped', label: '⏭️ Skipped' }
        ];
        
        filterContainer.innerHTML = `
            <div class="review-filter-group">
                ${filters.map(f => `
                    <button class="review-filter-btn ${this._reviewFilter === f.value ? 'active' : ''}" data-filter="${f.value}">
                        ${f.label}
                    </button>
                `).join('')}
            </div>
            <span class="review-count">${this._filteredReview.length} questions</span>
        `;
        
        // Attach filter events
        filterContainer.querySelectorAll('.review-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this._handleFilterChange(filter);
            });
        });
    }

    /**
     * Render actions
     */
    _renderActions() {
        const actions = this._elements.actions;
        if (!actions) return;
        
        actions.innerHTML = `
            <button class="btn-results btn-results-primary" data-action="retry">
                🔄 Retry Exam
            </button>
            <button class="btn-results btn-results-success" data-action="review-wrong">
                🔍 Review Wrong Answers
            </button>
            <button class="btn-results btn-results-secondary" data-action="lecture">
                📚 Back to Lecture
            </button>
            <button class="btn-results btn-results-secondary" data-action="dashboard">
                📊 Dashboard
            </button>
        `;
        
        // Attach action events
        actions.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', this._handleActionClick);
        });
    }

    /**
     * Render empty state
     */
    _renderEmptyState() {
        if (!this._elements.container) return;
        
        this._elements.container.innerHTML = `
            <div class="empty-results">
                <div class="empty-icon">📊</div>
                <h2>No Exam Result Available</h2>
                <p>Complete an exam to see your results here.</p>
                <button class="btn btn-primary" data-action="dashboard">Go to Dashboard</button>
            </div>
        `;
        
        // Attach dashboard action
        const dashboardBtn = this._elements.container.querySelector('[data-action="dashboard"]');
        if (dashboardBtn) {
            dashboardBtn.addEventListener('click', () => {
                router.navigate('/dashboard');
            });
        }
    }

    /**
     * Apply review filter
     */
    _applyReviewFilter() {
        this._filteredReview = this._questions.map((question, index) => {
            const userAnswer = this._answers[index];
            return {
                question,
                userAnswer,
                index
            };
        }).filter(item => {
            switch (this._reviewFilter) {
                case 'correct':
                    return item.userAnswer !== undefined && item.userAnswer === item.question.answer;
                case 'wrong':
                    return item.userAnswer !== undefined && item.userAnswer !== item.question.answer;
                case 'skipped':
                    return item.userAnswer === undefined;
                default:
                    return true;
            }
        });
    }

    /**
     * Calculate topic performance
     * @returns {Object} Topic performance data
     */
    _calculateTopicPerformance() {
        const performance = {};
        
        this._questions.forEach((question, index) => {
            const topic = question.topic || 'General';
            if (!performance[topic]) {
                performance[topic] = { correct: 0, wrong: 0, skipped: 0, total: 0 };
            }
            
            const userAnswer = this._answers[index];
            if (userAnswer === undefined) {
                performance[topic].skipped++;
            } else if (userAnswer === question.answer) {
                performance[topic].correct++;
            } else {
                performance[topic].wrong++;
            }
            performance[topic].total++;
        });
        
        // Calculate scores
        const result = {};
        for (const [topic, data] of Object.entries(performance)) {
            const attempted = data.correct + data.wrong;
            result[topic] = {
                ...data,
                score: attempted > 0 ? Math.round((data.correct / attempted) * 100) : 0,
                attempted
            };
        }
        
        return result;
    }

    /**
     * Handle filter change
     * @param {string} filter - Filter value
     */
    _handleFilterChange(filter) {
        this._reviewFilter = filter;
        this._renderReviewSection();
    }

    /**
     * Handle action button clicks
     * @param {Event} e - Click event
     */
    _handleActionClick(e) {
        const action = e.currentTarget.dataset.action;
        
        switch (action) {
            case 'retry':
                this._retryExam();
                break;
            case 'review-wrong':
                this._reviewWrong();
                break;
            case 'lecture':
                if (this._lectureId) {
                    router.navigate(`/lectures/${this._lectureId}`);
                } else {
                    router.navigate('/lectures');
                }
                break;
            case 'dashboard':
                router.navigate('/dashboard');
                break;
            default:
                console.warn('Unknown action:', action);
        }
    }

    /**
     * Retry the exam
     */
    _retryExam() {
        if (this._lectureId) {
            router.navigate(`/exam/${this._lectureId}`);
        } else {
            Toast.warning('Cannot retry: lecture ID not found');
        }
    }

    /**
     * Review wrong answers
     */
    _reviewWrong() {
        this._reviewFilter = 'wrong';
        this._renderReviewSection();
        
        // Scroll to review section
        if (this._elements.reviewSection) {
            this._elements.reviewSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Handle state changes
     */
    _handleStateChange() {
        // Refresh data if state changes
        this._loadResults().then(() => {
            if (this._results) {
                this._render();
            }
        });
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
     * Get grade based on percentage
     * @param {number} percentage - Score percentage
     * @returns {string} Grade
     */
    _getGrade(percentage) {
        if (percentage >= 90) return 'Excellent';
        if (percentage >= 75) return 'Good';
        if (percentage >= 60) return 'Average';
        if (percentage >= 40) return 'Below Average';
        return 'Needs Improvement';
    }

    /**
     * Get grade CSS class
     * @param {number} percentage - Score percentage
     * @returns {string} CSS class
     */
    _getGradeClass(percentage) {
        if (percentage >= 90) return 'excellent';
        if (percentage >= 75) return 'good';
        if (percentage >= 60) return 'average';
        return 'poor';
    }

    /**
     * Format duration in seconds to readable string
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration
     */
    _formatDuration(seconds) {
        if (!seconds || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        if (mins > 60) {
            const hours = Math.floor(mins / 60);
            const remainingMins = mins % 60;
            return `${hours}h ${remainingMins}m ${secs}s`;
        }
        return `${mins}:${String(secs).padStart(2, '0')}`;
    }

    /**
     * Setup event listeners
     */
    _setupEventListeners() {
        // State changes
        eventBus.on('state.updated', this._handleStateChange);
        
        // Theme changes
        eventBus.on('theme.changed', () => {
            // Re-render charts
            if (this._results) {
                this._renderPerformanceAnalysis();
            }
        });
    }

    /**
     * Get results data
     * @returns {Object|null} Results data
     */
    getData() {
        return this._results ? { ...this._results } : null;
    }

    /**
     * Get review data
     * @returns {Array} Review data
     */
    getReviewData() {
        return this._filteredReview.map(item => ({
            ...item,
            isCorrect: item.userAnswer === item.question.answer,
            isSkipped: item.userAnswer === undefined
        }));
    }

    /**
     * Get statistics
     * @returns {Object} Statistics
     */
    getStats() {
        if (!this._results) return null;
        
        const { total, correct, wrong, skipped, percentage } = this._results;
        return {
            total,
            correct,
            wrong,
            skipped,
            percentage,
            accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
            grade: this._getGrade(percentage)
        };
    }

    /**
     * Destroy the results page
     */
    destroy() {
        // Destroy components
        if (this._components.progressRing) {
            this._components.progressRing.destroy();
            this._components.progressRing = null;
        }
        if (this._components.distributionChart) {
            this._components.distributionChart.destroy();
            this._components.distributionChart = null;
        }
        
        // Clear event listeners
        eventBus.off('state.updated', this._handleStateChange);
        
        this._initialized = false;
        console.log('Results page destroyed');
    }
}

/**
 * Create and export the results page instance
 */
export default ResultsPage;
