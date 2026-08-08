/**
 * ============================================================
 * js/pages/lecture-detail.js — Lecture Details Page Controller
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Lecture Details Page Controller
 * 
 * Displays a specific lecture with its questions, statistics,
 * and provides access to Practice Mode, Exam Mode, and Review Mode.
 */

import state from '../core/state.js';
import storage from '../core/storage.js';
import eventBus from '../core/event-bus.js';
import router from '../core/router.js';
import Toast from '../components/toast.js';
import ProgressRing from '../components/progress-ring.js';
import ChartRenderer from '../components/chart-renderer.js';
import QuestionCard from '../components/question-card.js';

class LectureDetail {
    constructor() {
        // DOM elements
        this._elements = {
            container: null,
            header: null,
            stats: null,
            questionList: null,
            questionFilters: null,
            emptyState: null,
            loadingIndicator: null,
            actions: null
        };
        
        // Data
        this._lectureId = null;
        this._lecture = null;
        this._questions = [];
        this._filteredQuestions = [];
        this._meta = null;
        this._progress = null;
        this._questionCards = [];
        
        // Filters
        this._filters = {
            difficulty: 'all',
            topic: 'all',
            status: 'all', // all | correct | wrong | skipped | unflagged
            search: ''
        };
        
        // State
        this._initialized = false;
        this._isLoading = false;
        this._isExamMode = false;
        
        // Components
        this._components = {
            progressRing: null,
            difficultyChart: null,
            topicChart: null
        };
        
        // Bind methods
        this._handleFilterChange = this._handleFilterChange.bind(this);
        this._handleSearch = this._handleSearch.bind(this);
        this._handleActionClick = this._handleActionClick.bind(this);
        this._handleQuestionNavigate = this._handleQuestionNavigate.bind(this);
        this._handleStateChange = this._handleStateChange.bind(this);
        this._handleStorageUpdate = this._handleStorageUpdate.bind(this);
        
        // Initialize
        this._init();
    }

    /**
     * Initialize the lecture detail page
     */
    async _init() {
        if (this._initialized) return;
        
        // Get container
        this._elements.container = document.querySelector('#lecture-detail-container');
        if (!this._elements.container) {
            console.warn('Lecture detail container not found');
            return;
        }
        
        // Cache DOM elements
        this._cacheElements();
        
        // Get lecture ID from router
        const route = router.getCurrentRoute();
        this._lectureId = route.params?.id || null;
        
        if (!this._lectureId) {
            this._showError('No lecture specified');
            return;
        }
        
        // Load data
        await this._loadData();
        
        // Render
        this._render();
        
        // Setup event listeners
        this._setupEventListeners();
        
        // Listen for route changes
        eventBus.on('routechange', (detail) => {
            if (detail.path && detail.path.startsWith('/lectures/')) {
                const newId = detail.params?.id || null;
                if (newId !== this._lectureId) {
                    this._lectureId = newId;
                    this._loadData().then(() => this._render());
                }
            }
        });
        
        this._initialized = true;
        console.log(`Lecture detail initialized for: ${this._lectureId}`);
    }

    /**
     * Cache DOM elements
     */
    _cacheElements() {
        this._elements.header = this._elements.container.querySelector('.lecture-detail-header');
        this._elements.stats = this._elements.container.querySelector('.lecture-detail-stats');
        this._elements.questionList = this._elements.container.querySelector('.question-list');
        this._elements.questionFilters = this._elements.container.querySelector('.question-filters');
        this._elements.emptyState = this._elements.container.querySelector('.empty-state');
        this._elements.loadingIndicator = this._elements.container.querySelector('.loading-indicator');
        this._elements.actions = this._elements.container.querySelector('.lecture-actions');
    }

    /**
     * Load lecture data
     */
    async _loadData() {
        this._isLoading = true;
        this._showLoading(true);
        
        try {
            // Load meta.json
            const metaResponse = await fetch(`/data/lectures/${this._lectureId}/meta.json`);
            if (metaResponse.ok) {
                this._meta = await metaResponse.json();
            } else {
                console.warn(`No meta.json found for ${this._lectureId}`);
                this._meta = null;
            }
            
            // Load questions.json
            const questionsResponse = await fetch(`/data/lectures/${this._lectureId}/questions.json`);
            if (questionsResponse.ok) {
                const data = await questionsResponse.json();
                this._questions = data.questions || [];
            } else {
                console.warn(`No questions.json found for ${this._lectureId}`);
                this._questions = [];
            }
            
            // Load progress
            this._progress = {
                completed: storage.loadCompletedLectures().includes(this._lectureId),
                attempts: storage.getExamHistoryByLecture(this._lectureId),
                favorites: storage.loadFavorites(),
                attempted: storage.loadAttemptedQuestions()
            };
            
            // Update state
            state.set('lectures.current', this._lectureId);
            state.set('exam.questions', this._questions);
            
            console.log(`Loaded ${this._questions.length} questions for ${this._lectureId}`);
            
        } catch (error) {
            console.error('Error loading lecture data:', error);
            Toast.error('Failed to load lecture data. Please refresh the page.');
        } finally {
            this._isLoading = false;
            this._showLoading(false);
        }
    }

    /**
     * Render the lecture detail page
     */
    _render() {
        if (!this._elements.container) return;
        
        // Apply filters
        this._applyFilters();
        
        // Render header
        this._renderHeader();
        
        // Render stats
        this._renderStats();
        
        // Render actions
        this._renderActions();
        
        // Render filters
        this._renderFilters();
        
        // Render questions
        this._renderQuestions();
        
        // Render empty state if needed
        this._toggleEmptyState();
        
        // Update URL with filters
        this._updateURL();
    }

    /**
     * Render header section
     */
    _renderHeader() {
        const header = this._elements.header;
        if (!header) return;
        
        const title = this._meta?.title || this._lectureId || 'Lecture';
        const description = this._meta?.description || 'No description available.';
        const weekMatch = this._lectureId?.match(/week(\d+)/i);
        const weekNumber = weekMatch ? weekMatch[1] : '?';
        
        header.innerHTML = `
            <div class="lecture-detail-title">
                <h1>${title}</h1>
                <span class="lecture-week-badge">Week ${weekNumber}</span>
            </div>
            <p class="lecture-detail-description">${description}</p>
            <div class="lecture-detail-meta">
                <span class="meta-item">📝 ${this._questions.length} questions</span>
                <span class="meta-item">📊 ${this._getCompletionPercentage()}% complete</span>
                <span class="meta-item">🎯 ${this._getAccuracy()}% accuracy</span>
            </div>
        `;
    }

    /**
     * Render statistics section
     */
    _renderStats() {
        const stats = this._elements.stats;
        if (!stats) return;
        
        const total = this._questions.length;
        const attempted = this._getAttemptedCount();
        const correct = this._getCorrectCount();
        const wrong = this._getWrongCount();
        const completion = this._getCompletionPercentage();
        const accuracy = this._getAccuracy();
        
        stats.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-value">${total}</span>
                    <span class="stat-label">Total Questions</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${attempted}</span>
                    <span class="stat-label">Attempted</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${correct}</span>
                    <span class="stat-label">Correct</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${wrong}</span>
                    <span class="stat-label">Wrong</span>
                </div>
            </div>
            <div class="progress-ring-container">
                <div class="progress-ring-wrapper"></div>
                <div class="progress-stats">
                    <div class="progress-stat">
                        <span class="progress-label">Completion</span>
                        <span class="progress-value">${completion}%</span>
                    </div>
                    <div class="progress-stat">
                        <span class="progress-label">Accuracy</span>
                        <span class="progress-value">${accuracy}%</span>
                    </div>
                </div>
            </div>
        `;
        
        // Create progress ring
        const ringWrapper = stats.querySelector('.progress-ring-wrapper');
        if (ringWrapper && this._components.progressRing) {
            this._components.progressRing.destroy();
        }
        if (ringWrapper) {
            this._components.progressRing = new ProgressRing({
                container: ringWrapper,
                value: completion,
                size: 120,
                strokeWidth: 6,
                label: 'Complete'
            });
        }
    }

    /**
     * Render actions section
     */
    _renderActions() {
        const actions = this._elements.actions;
        if (!actions) return;
        
        const hasQuestions = this._questions.length > 0;
        const isCompleted = storage.loadCompletedLectures().includes(this._lectureId);
        
        actions.innerHTML = `
            <button class="btn btn-primary" data-action="practice" ${!hasQuestions ? 'disabled' : ''}>
                ${hasQuestions ? '📝 Practice Mode' : '🔒 No Questions'}
            </button>
            <button class="btn btn-success" data-action="exam" ${!hasQuestions ? 'disabled' : ''}>
                ${hasQuestions ? '📋 Exam Mode' : '🔒 No Questions'}
            </button>
            <button class="btn btn-secondary" data-action="review" ${!hasQuestions ? 'disabled' : ''}>
                ${hasQuestions ? '🔍 Review Mode' : '🔒 No Questions'}
            </button>
            ${isCompleted ? `<button class="btn btn-info" data-action="reset">🔄 Reset Progress</button>` : ''}
        `;
        
        // Attach action events
        actions.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', this._handleActionClick);
        });
    }

    /**
     * Render filters section
     */
    _renderFilters() {
        const filters = this._elements.questionFilters;
        if (!filters) return;
        
        // Get unique topics
        const topics = this._getUniqueTopics();
        
        filters.innerHTML = `
            <div class="filter-group">
                <input type="text" class="filter-search" placeholder="🔍 Search questions..." value="${this._filters.search}" />
            </div>
            <div class="filter-group">
                <label>Difficulty</label>
                <div class="filter-options" data-filter="difficulty">
                    <button class="filter-btn ${this._filters.difficulty === 'all' ? 'active' : ''}" data-value="all">All</button>
                    <button class="filter-btn ${this._filters.difficulty === 'easy' ? 'active' : ''}" data-value="easy">Easy</button>
                    <button class="filter-btn ${this._filters.difficulty === 'medium' ? 'active' : ''}" data-value="medium">Medium</button>
                    <button class="filter-btn ${this._filters.difficulty === 'hard' ? 'active' : ''}" data-value="hard">Hard</button>
                    <button class="filter-btn ${this._filters.difficulty === 'expert' ? 'active' : ''}" data-value="expert">Expert</button>
                </div>
            </div>
            <div class="filter-group">
                <label>Topic</label>
                <div class="filter-options" data-filter="topic">
                    <button class="filter-btn ${this._filters.topic === 'all' ? 'active' : ''}" data-value="all">All</button>
                    ${topics.map(topic => `
                        <button class="filter-btn ${this._filters.topic === topic ? 'active' : ''}" data-value="${topic}">${topic}</button>
                    `).join('')}
                </div>
            </div>
            <div class="filter-group">
                <label>Status</label>
                <div class="filter-options" data-filter="status">
                    <button class="filter-btn ${this._filters.status === 'all' ? 'active' : ''}" data-value="all">All</button>
                    <button class="filter-btn ${this._filters.status === 'correct' ? 'active' : ''}" data-value="correct">✅ Correct</button>
                    <button class="filter-btn ${this._filters.status === 'wrong' ? 'active' : ''}" data-value="wrong">❌ Wrong</button>
                    <button class="filter-btn ${this._filters.status === 'flagged' ? 'active' : ''}" data-value="flagged">⭐ Flagged</button>
                    <button class="filter-btn ${this._filters.status === 'unattempted' ? 'active' : ''}" data-value="unattempted">📖 Unattempted</button>
                </div>
            </div>
        `;
        
        // Attach filter events
        filters.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filterGroup = e.target.closest('[data-filter]');
                if (filterGroup) {
                    const filterName = filterGroup.dataset.filter;
                    const value = e.target.dataset.value;
                    this._handleFilterChange(filterName, value);
                }
            });
        });
        
        const searchInput = filters.querySelector('.filter-search');
        if (searchInput) {
            searchInput.addEventListener('input', this._handleSearch);
        }
    }

    /**
     * Render questions list
     */
    _renderQuestions() {
        const list = this._elements.questionList;
        if (!list) return;
        
        // Clear existing question cards
        this._questionCards.forEach(card => card.destroy());
        this._questionCards = [];
        list.innerHTML = '';
        
        if (this._filteredQuestions.length === 0) {
            return;
        }
        
        // Create question cards
        this._filteredQuestions.forEach((question, index) => {
            const card = new QuestionCard({
                question: question,
                index: index,
                total: this._filteredQuestions.length,
                mode: 'review', // Default to review mode for browsing
                lectureId: this._lectureId,
                onNavigate: this._handleQuestionNavigate
            });
            
            const container = document.createElement('div');
            container.className = 'question-wrapper';
            card.render(container);
            list.appendChild(container);
            this._questionCards.push(card);
        });
    }

    /**
     * Toggle empty state
     */
    _toggleEmptyState() {
        const emptyState = this._elements.emptyState;
        if (!emptyState) return;
        
        if (this._questions.length === 0) {
            emptyState.style.display = 'flex';
            emptyState.innerHTML = `
                <div class="empty-icon">📝</div>
                <div class="empty-title">No Questions Available</div>
                <div class="empty-description">
                    Questions for this lecture are being prepared. 
                    Please check back later.
                </div>
            `;
        } else if (this._filteredQuestions.length === 0) {
            emptyState.style.display = 'flex';
            emptyState.innerHTML = `
                <div class="empty-icon">🔍</div>
                <div class="empty-title">No Matching Questions</div>
                <div class="empty-description">
                    Try adjusting your filters or search criteria.
                </div>
                <button class="btn btn-secondary" data-action="clear-filters">Clear Filters</button>
            `;
            const clearBtn = emptyState.querySelector('[data-action="clear-filters"]');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    this._clearFilters();
                });
            }
        } else {
            emptyState.style.display = 'none';
        }
    }

    /**
     * Apply filters to questions
     */
    _applyFilters() {
        this._filteredQuestions = this._questions.filter(question => {
            // Search filter
            if (this._filters.search) {
                const searchLower = this._filters.search.toLowerCase();
                const questionMatch = question.question.toLowerCase().includes(searchLower);
                const topicMatch = (question.topic || '').toLowerCase().includes(searchLower);
                if (!questionMatch && !topicMatch) {
                    return false;
                }
            }
            
            // Difficulty filter
            if (this._filters.difficulty !== 'all') {
                const difficulty = question.difficulty || 'medium';
                if (difficulty.toLowerCase() !== this._filters.difficulty) {
                    return false;
                }
            }
            
            // Topic filter
            if (this._filters.topic !== 'all') {
                const topic = question.topic || '';
                if (topic !== this._filters.topic) {
                    return false;
                }
            }
            
            // Status filter
            if (this._filters.status !== 'all') {
                const questionId = String(question.id || this._questions.indexOf(question));
                const isAttempted = storage.isQuestionAttempted(questionId);
                const isCorrect = this._isQuestionCorrect(question);
                const isFlagged = storage.isFavorite(questionId);
                
                switch (this._filters.status) {
                    case 'correct':
                        if (!isAttempted || !isCorrect) return false;
                        break;
                    case 'wrong':
                        if (!isAttempted || isCorrect) return false;
                        break;
                    case 'flagged':
                        if (!isFlagged) return false;
                        break;
                    case 'unattempted':
                        if (isAttempted) return false;
                        break;
                }
            }
            
            return true;
        });
    }

    /**
     * Check if a question was answered correctly
     * @param {Object} question - Question object
     * @returns {boolean} True if correct
     */
    _isQuestionCorrect(question) {
        const history = storage.getExamHistoryByLecture(this._lectureId);
        if (history.length === 0) return false;
        
        // Check if this question was answered correctly in any attempt
        const questionId = String(question.id || this._questions.indexOf(question));
        for (const exam of history) {
            if (exam.answers && exam.answers[questionId] !== undefined) {
                return exam.answers[questionId] === question.answer;
            }
        }
        return false;
    }

    /**
     * Get unique topics from questions
     * @returns {Array} Array of unique topics
     */
    _getUniqueTopics() {
        const topics = new Set();
        this._questions.forEach(q => {
            if (q.topic) {
                topics.add(q.topic);
            }
        });
        return Array.from(topics);
    }

    /**
     * Get completion percentage
     * @returns {number} Completion percentage
     */
    _getCompletionPercentage() {
        if (this._questions.length === 0) return 0;
        const attempted = this._getAttemptedCount();
        return Math.round((attempted / this._questions.length) * 100);
    }

    /**
     * Get attempted count
     * @returns {number} Number of attempted questions
     */
    _getAttemptedCount() {
        const history = storage.getExamHistoryByLecture(this._lectureId);
        if (history.length === 0) return 0;
        
        const attemptedQuestions = new Set();
        history.forEach(exam => {
            if (exam.answers) {
                Object.keys(exam.answers).forEach(qId => {
                    attemptedQuestions.add(qId);
                });
            }
        });
        return attemptedQuestions.size;
    }

    /**
     * Get correct count
     * @returns {number} Number of correct answers
     */
    _getCorrectCount() {
        let correct = 0;
        this._questions.forEach((question, index) => {
            if (this._isQuestionCorrect(question)) {
                correct++;
            }
        });
        return correct;
    }

    /**
     * Get wrong count
     * @returns {number} Number of wrong answers
     */
    _getWrongCount() {
        let wrong = 0;
        this._questions.forEach((question, index) => {
            const questionId = String(question.id || index);
            if (storage.isQuestionAttempted(questionId) && !this._isQuestionCorrect(question)) {
                wrong++;
            }
        });
        return wrong;
    }

    /**
     * Get accuracy percentage
     * @returns {number} Accuracy percentage
     */
    _getAccuracy() {
        const attempted = this._getAttemptedCount();
        if (attempted === 0) return 0;
        const correct = this._getCorrectCount();
        return Math.round((correct / attempted) * 100);
    }

    /**
     * Handle filter change
     * @param {string} filterName - Filter name
     * @param {string} value - Filter value
     */
    _handleFilterChange(filterName, value) {
        if (this._filters[filterName] === value) {
            // If same filter, reset to 'all'
            if (filterName === 'difficulty' || filterName === 'topic' || filterName === 'status') {
                this._filters[filterName] = 'all';
            }
        } else {
            this._filters[filterName] = value;
        }
        this._render();
    }

    /**
     * Handle search input
     * @param {Event} e - Input event
     */
    _handleSearch(e) {
        this._filters.search = e.target.value.trim();
        this._render();
    }

    /**
     * Handle action button clicks
     * @param {Event} e - Click event
     */
    _handleActionClick(e) {
        const action = e.currentTarget.dataset.action;
        
        switch (action) {
            case 'practice':
                this._startPractice();
                break;
            case 'exam':
                this._startExam();
                break;
            case 'review':
                this._startReview();
                break;
            case 'reset':
                this._resetProgress();
                break;
            default:
                console.warn('Unknown action:', action);
        }
    }

    /**
     * Start practice mode
     */
    _startPractice() {
        if (this._questions.length === 0) {
            Toast.warning('No questions available for practice.');
            return;
        }
        
        // Navigate to practice mode
        router.navigate(`/practice/${this._lectureId}`);
    }

    /**
     * Start exam mode
     */
    _startExam() {
        if (this._questions.length === 0) {
            Toast.warning('No questions available for exam.');
            return;
        }
        
        // Navigate to exam mode
        router.navigate(`/exam/${this._lectureId}`);
    }

    /**
     * Start review mode
     */
    _startReview() {
        if (this._questions.length === 0) {
            Toast.warning('No questions available for review.');
            return;
        }
        
        // Navigate to review mode
        router.navigate(`/review/${this._lectureId}`);
    }

    /**
     * Reset progress for this lecture
     */
    _resetProgress() {
        const confirmReset = confirm('Are you sure you want to reset all progress for this lecture? This cannot be undone.');
        if (!confirmReset) return;
        
        // Remove from completed lectures
        storage.removeCompletedLecture(this._lectureId);
        
        // Remove exam history
        const history = storage.loadExamHistory();
        const filtered = history.filter(entry => entry.lectureId !== this._lectureId);
        storage.saveExamHistory(filtered);
        
        // Refresh data
        this._loadData().then(() => {
            this._render();
            Toast.success('Progress reset successfully.');
        });
    }

    /**
     * Handle question navigation from cards
     * @param {string} action - Navigation action
     * @param {number} index - Current index
     */
    _handleQuestionNavigate(action, index) {
        // This is used for navigation within question cards
        // We don't implement this fully for lecture detail view
    }

    /**
     * Clear all filters
     */
    _clearFilters() {
        this._filters = {
            difficulty: 'all',
            topic: 'all',
            status: 'all',
            search: ''
        };
        this._render();
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
     * Show error message
     * @param {string} message - Error message
     */
    _showError(message) {
        if (this._elements.container) {
            this._elements.container.innerHTML = `
                <div class="error-state">
                    <span class="error-icon">❌</span>
                    <h2>Error</h2>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">Reload Page</button>
                </div>
            `;
        }
    }

    /**
     * Update URL with filter parameters
     */
    _updateURL() {
        const params = new URLSearchParams();
        if (this._filters.difficulty !== 'all') {
            params.set('difficulty', this._filters.difficulty);
        }
        if (this._filters.topic !== 'all') {
            params.set('topic', this._filters.topic);
        }
        if (this._filters.status !== 'all') {
            params.set('status', this._filters.status);
        }
        if (this._filters.search) {
            params.set('search', this._filters.search);
        }
        
        const queryString = params.toString();
        const basePath = `/lectures/${this._lectureId}`;
        
        if (queryString) {
            window.history.replaceState({}, '', `${basePath}?${queryString}`);
        } else {
            window.history.replaceState({}, '', basePath);
        }
    }

    /**
     * Parse URL parameters
     */
    _parseURLParams() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('difficulty')) {
            this._filters.difficulty = params.get('difficulty');
        }
        if (params.get('topic')) {
            this._filters.topic = params.get('topic');
        }
        if (params.get('status')) {
            this._filters.status = params.get('status');
        }
        if (params.get('search')) {
            this._filters.search = params.get('search');
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
            // Re-render stats charts
            this._renderStats();
        });
        
        // Parse URL parameters
        this._parseURLParams();
    }

    /**
     * Handle state changes
     */
    _handleStateChange() {
        // Refresh data when state changes
        this._loadData().then(() => this._render());
    }

    /**
     * Handle storage updates
     */
    _handleStorageUpdate() {
        // Refresh data when storage changes
        this._loadData().then(() => this._render());
    }

    /**
     * Get lecture data
     * @returns {Object} Lecture data
     */
    getData() {
        return {
            lectureId: this._lectureId,
            lecture: this._lecture,
            questions: this._questions,
            filteredQuestions: this._filteredQuestions,
            meta: this._meta,
            progress: this._progress
        };
    }

    /**
     * Get statistics
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            total: this._questions.length,
            attempted: this._getAttemptedCount(),
            correct: this._getCorrectCount(),
            wrong: this._getWrongCount(),
            completion: this._getCompletionPercentage(),
            accuracy: this._getAccuracy()
        };
    }

    /**
     * Destroy the lecture detail
     */
    destroy() {
        // Destroy components
        if (this._components.progressRing) {
            this._components.progressRing.destroy();
            this._components.progressRing = null;
        }
        if (this._components.difficultyChart) {
            this._components.difficultyChart.destroy();
            this._components.difficultyChart = null;
        }
        if (this._components.topicChart) {
            this._components.topicChart.destroy();
            this._components.topicChart = null;
        }
        
        // Destroy question cards
        this._questionCards.forEach(card => card.destroy());
        this._questionCards = [];
        
        // Clear event listeners
        eventBus.off('state.updated', this._handleStateChange);
        eventBus.off('storage.updated', this._handleStorageUpdate);
        
        this._initialized = false;
        console.log('Lecture detail destroyed');
    }
}

/**
 * Create and export the lecture detail instance
 */
const lectureDetail = new LectureDetail();

// Export the lecture detail
export default lectureDetail;
