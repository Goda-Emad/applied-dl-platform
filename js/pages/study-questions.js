/**
 * ============================================================
 * js/pages/study-questions.js — Study Questions Page Controller
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Study Questions Page Controller
 * 
 * Manages the independent personal question bank for study,
 * revision, and practice. Completely separate from lecture questions.
 */

import state from '../core/state.js';
import storage from '../core/storage.js';
import eventBus from '../core/event-bus.js';
import router from '../core/router.js';
import Toast from '../components/toast.js';
import QuestionCard from '../components/question-card.js';

class StudyQuestions {
    constructor() {
        // DOM elements
        this._elements = {
            container: null,
            header: null,
            searchSection: null,
            filterControls: null,
            questionList: null,
            emptyState: null,
            statsBar: null,
            loadingIndicator: null
        };
        
        // Data
        this._questions = [];
        this._filteredQuestions = [];
        this._favorites = new Set();
        this._attempted = new Set();
        this._studyStats = {
            total: 0,
            attempted: 0,
            correct: 0,
            wrong: 0,
            accuracy: 0
        };
        
        // Filters
        this._filters = {
            search: '',
            source: 'all',
            topic: 'all',
            difficulty: 'all',
            status: 'all', // all | correct | wrong | unattempted | flagged
            type: 'all'
        };
        
        // State
        this._initialized = false;
        this._isLoading = false;
        this._questionCards = [];
        
        // Bind methods
        this._handleSearch = this._handleSearch.bind(this);
        this._handleFilterChange = this._handleFilterChange.bind(this);
        this._handleSelect = this._handleSelect.bind(this);
        this._handleFlag = this._handleFlag.bind(this);
        this._handleStateChange = this._handleStateChange.bind(this);
        this._handleStorageUpdate = this._handleStorageUpdate.bind(this);
        this._handleResetFilters = this._handleResetFilters.bind(this);
        
        // Initialize
        this._init();
    }

    /**
     * Initialize the study questions page
     */
    async _init() {
        if (this._initialized) return;
        
        // Get container
        this._elements.container = document.querySelector('#study-questions-container');
        if (!this._elements.container) {
            console.warn('Study questions container not found');
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
        console.log('Study questions initialized');
    }

    /**
     * Cache DOM elements
     */
    _cacheElements() {
        this._elements.header = this._elements.container.querySelector('.study-page-header');
        this._elements.searchSection = this._elements.container.querySelector('.study-search-section');
        this._elements.filterControls = this._elements.container.querySelector('.study-filters');
        this._elements.questionList = this._elements.container.querySelector('.study-questions-grid');
        this._elements.emptyState = this._elements.container.querySelector('.empty-study-bank');
        this._elements.statsBar = this._elements.container.querySelector('.study-stats-bar');
        this._elements.loadingIndicator = this._elements.container.querySelector('.loading-indicator');
    }

    /**
     * Load study questions data
     */
    async _loadData() {
        this._isLoading = true;
        this._showLoading(true);
        
        try {
            // Load bank.json
            const response = await fetch('/data/study-questions/bank.json');
            if (!response.ok) {
                // If file doesn't exist, start with empty bank
                console.warn('No study questions bank found. Starting empty.');
                this._questions = [];
            } else {
                const data = await response.json();
                this._questions = data.questions || [];
            }
            
            // Load favorites and attempted from storage
            const studyState = storage.loadStudyQuestions();
            this._favorites = new Set(studyState.favorites || []);
            this._attempted = new Set(studyState.attempted || []);
            
            // Calculate statistics
            this._calculateStats();
            
            // Update state
            state.set('studyQuestions.list', this._questions);
            state.set('studyQuestions.totalQuestions', this._questions.length);
            state.set('studyQuestions.favorites', this._favorites);
            state.set('studyQuestions.attempted', this._attempted);
            
            console.log(`Loaded ${this._questions.length} study questions`);
            
        } catch (error) {
            console.error('Error loading study questions:', error);
            Toast.error('Failed to load study questions. Please refresh the page.');
            this._questions = [];
        } finally {
            this._isLoading = false;
            this._showLoading(false);
        }
    }

    /**
     * Calculate study question statistics
     */
    _calculateStats() {
        let correct = 0;
        let wrong = 0;
        let attempted = 0;
        
        this._questions.forEach(question => {
            const questionId = String(question.id || this._questions.indexOf(question));
            if (this._attempted.has(questionId)) {
                attempted++;
                // Check if question was answered correctly
                // We need to check if this question was correctly answered
                // This requires tracking answers in storage
                const history = storage.loadExamHistory();
                // For study questions, we store attempts separately
                const studyHistory = storage.loadStudyQuestions();
                if (studyHistory.results && studyHistory.results[questionId] !== undefined) {
                    if (studyHistory.results[questionId] === question.answer) {
                        correct++;
                    } else {
                        wrong++;
                    }
                }
            }
        });
        
        this._studyStats = {
            total: this._questions.length,
            attempted: attempted,
            correct: correct,
            wrong: wrong,
            accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0
        };
    }

    /**
     * Render the study questions page
     */
    _render() {
        if (!this._elements.container) return;
        
        // Apply filters
        this._applyFilters();
        
        // Render header
        this._renderHeader();
        
        // Render stats
        this._renderStats();
        
        // Render search and filters
        this._renderSearchAndFilters();
        
        // Render questions
        this._renderQuestions();
        
        // Render empty state if needed
        this._toggleEmptyState();
    }

    /**
     * Render header
     */
    _renderHeader() {
        const header = this._elements.header;
        if (!header) return;
        
        header.innerHTML = `
            <div class="study-page-header-left">
                <div class="header-icon">📝</div>
                <div class="study-page-header-info">
                    <h1>Study Questions</h1>
                    <p>Your personal question bank for revision and practice</p>
                </div>
            </div>
            <div class="study-page-header-right">
                <span class="study-question-count">
                    📚 <span class="count-number">${this._questions.length}</span> questions
                </span>
            </div>
        `;
    }

    /**
     * Render stats bar
     */
    _renderStats() {
        const stats = this._elements.statsBar;
        if (!stats) return;
        
        const { total, attempted, correct, wrong, accuracy } = this._studyStats;
        
        stats.innerHTML = `
            <div class="stats-item">
                <span class="stats-label">Total:</span>
                <span class="stats-value">${total}</span>
            </div>
            <div class="stats-item">
                <span class="stats-label">Attempted:</span>
                <span class="stats-value">${attempted}</span>
            </div>
            <div class="stats-item">
                <span class="stats-label">Correct:</span>
                <span class="stats-value" style="color: var(--color-success);">${correct}</span>
            </div>
            <div class="stats-item">
                <span class="stats-label">Wrong:</span>
                <span class="stats-value" style="color: var(--color-danger);">${wrong}</span>
            </div>
            <div class="stats-item">
                <span class="stats-label">Accuracy:</span>
                <span class="stats-value">${accuracy}%</span>
            </div>
        `;
    }

    /**
     * Render search and filter controls
     */
    _renderSearchAndFilters() {
        const section = this._elements.searchSection;
        if (!section) return;
        
        // Get unique sources, topics
        const sources = this._getUniqueSources();
        const topics = this._getUniqueTopics();
        const difficulties = ['easy', 'medium', 'hard', 'expert'];
        
        section.innerHTML = `
            <div class="study-search-bar">
                <span class="search-icon">🔍</span>
                <input type="text" class="study-search-input" 
                       placeholder="Search questions..." 
                       value="${this._filters.search}" />
                ${this._filters.search ? '<button class="search-clear">✕</button>' : ''}
            </div>
            <div class="study-search-filters">
                <div class="study-filter-group">
                    <span class="study-filter-label">Source:</span>
                    <button class="study-filter-btn ${this._filters.source === 'all' ? 'active' : ''}" data-filter="source" data-value="all">All</button>
                    ${sources.map(source => `
                        <button class="study-filter-btn ${this._filters.source === source ? 'active' : ''}" 
                                data-filter="source" data-value="${source}">${source}</button>
                    `).join('')}
                </div>
                <div class="study-filter-group">
                    <span class="study-filter-label">Topic:</span>
                    <button class="study-filter-btn ${this._filters.topic === 'all' ? 'active' : ''}" data-filter="topic" data-value="all">All</button>
                    ${topics.map(topic => `
                        <button class="study-filter-btn ${this._filters.topic === topic ? 'active' : ''}" 
                                data-filter="topic" data-value="${topic}">${topic}</button>
                    `).join('')}
                </div>
                <div class="study-filter-group">
                    <span class="study-filter-label">Difficulty:</span>
                    <button class="study-filter-btn ${this._filters.difficulty === 'all' ? 'active' : ''}" data-filter="difficulty" data-value="all">All</button>
                    ${difficulties.map(diff => `
                        <button class="study-filter-btn ${this._filters.difficulty === diff ? 'active' : ''}" 
                                data-filter="difficulty" data-value="${diff}">${diff.charAt(0).toUpperCase() + diff.slice(1)}</button>
                    `).join('')}
                </div>
                <div class="study-filter-group">
                    <span class="study-filter-label">Status:</span>
                    <button class="study-filter-btn ${this._filters.status === 'all' ? 'active' : ''}" data-filter="status" data-value="all">All</button>
                    <button class="study-filter-btn ${this._filters.status === 'correct' ? 'active' : ''}" data-filter="status" data-value="correct">✅ Correct</button>
                    <button class="study-filter-btn ${this._filters.status === 'wrong' ? 'active' : ''}" data-filter="status" data-value="wrong">❌ Wrong</button>
                    <button class="study-filter-btn ${this._filters.status === 'flagged' ? 'active' : ''}" data-filter="status" data-value="flagged">⭐ Flagged</button>
                    <button class="study-filter-btn ${this._filters.status === 'unattempted' ? 'active' : ''}" data-filter="status" data-value="unattempted">📖 Unattempted</button>
                </div>
                <button class="study-filter-btn reset-filters">🔄 Reset Filters</button>
            </div>
        `;
        
        // Attach events
        const searchInput = section.querySelector('.study-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', this._handleSearch);
        }
        
        const clearBtn = section.querySelector('.search-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this._filters.search = '';
                this._render();
            });
        }
        
        section.querySelectorAll('[data-filter]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                const value = e.currentTarget.dataset.value;
                this._handleFilterChange(filter, value);
            });
        });
        
        const resetBtn = section.querySelector('.reset-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', this._handleResetFilters);
        }
    }

    /**
     * Render questions
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
                mode: 'review',
                onSelect: this._handleSelect,
                onFlag: this._handleFlag
            });
            
            const container = document.createElement('div');
            container.className = 'study-question-wrapper';
            card.render(container);
            list.appendChild(container);
            this._questionCards.push(card);
            
            // Restore selected state
            const questionId = String(question.id || index);
            if (this._attempted.has(questionId)) {
                // Check if correct (we need to track this)
                // For now, just mark as attempted
                const studyState = storage.loadStudyQuestions();
                if (studyState.results && studyState.results[questionId] !== undefined) {
                    card.setSelectedOption(studyState.results[questionId]);
                }
            }
            
            // Restore favorite state
            if (this._favorites.has(questionId)) {
                card.setFlagged(true);
            }
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
                <div class="empty-icon">📚</div>
                <div class="empty-title">No Study Questions Yet</div>
                <div class="empty-description">
                    Your personal question bank is empty. 
                    Questions will appear here when added to <code>data/study-questions/bank.json</code>.
                </div>
                <div class="empty-actions">
                    <button class="btn-empty-action" data-action="refresh">🔄 Refresh</button>
                </div>
            `;
            const refreshBtn = emptyState.querySelector('[data-action="refresh"]');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    this._refreshData();
                });
            }
        } else if (this._filteredQuestions.length === 0) {
            emptyState.style.display = 'flex';
            emptyState.innerHTML = `
                <div class="empty-icon">🔍</div>
                <div class="empty-title">No Matching Questions</div>
                <div class="empty-description">
                    Try adjusting your search or filter criteria.
                </div>
                <div class="empty-actions">
                    <button class="btn-empty-action btn-empty-action-secondary" data-action="reset-filters">Reset Filters</button>
                </div>
            `;
            const resetBtn = emptyState.querySelector('[data-action="reset-filters"]');
            if (resetBtn) {
                resetBtn.addEventListener('click', this._handleResetFilters);
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
            const questionId = String(question.id || this._questions.indexOf(question));
            
            // Search filter
            if (this._filters.search) {
                const searchLower = this._filters.search.toLowerCase();
                const questionMatch = question.question.toLowerCase().includes(searchLower);
                const topicMatch = (question.topic || '').toLowerCase().includes(searchLower);
                const sourceMatch = (question.source || '').toLowerCase().includes(searchLower);
                if (!questionMatch && !topicMatch && !sourceMatch) {
                    return false;
                }
            }
            
            // Source filter
            if (this._filters.source !== 'all') {
                const source = question.source || 'Unknown';
                if (source !== this._filters.source) {
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
            
            // Difficulty filter
            if (this._filters.difficulty !== 'all') {
                const difficulty = (question.difficulty || 'medium').toLowerCase();
                if (difficulty !== this._filters.difficulty) {
                    return false;
                }
            }
            
            // Status filter
            if (this._filters.status !== 'all') {
                const isAttempted = this._attempted.has(questionId);
                const isFlagged = this._favorites.has(questionId);
                
                switch (this._filters.status) {
                    case 'correct':
                        if (!isAttempted) return false;
                        // Check if correctly answered
                        const studyState = storage.loadStudyQuestions();
                        if (!studyState.results || studyState.results[questionId] !== question.answer) {
                            return false;
                        }
                        break;
                    case 'wrong':
                        if (!isAttempted) return false;
                        const studyState2 = storage.loadStudyQuestions();
                        if (!studyState2.results || studyState2.results[questionId] === question.answer) {
                            return false;
                        }
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
     * Get unique sources from questions
     * @returns {Array} Unique sources
     */
    _getUniqueSources() {
        const sources = new Set();
        this._questions.forEach(q => {
            if (q.source) {
                sources.add(q.source);
            }
        });
        return Array.from(sources);
    }

    /**
     * Get unique topics from questions
     * @returns {Array} Unique topics
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
     * Handle search input
     * @param {Event} e - Input event
     */
    _handleSearch(e) {
        this._filters.search = e.target.value.trim();
        this._render();
    }

    /**
     * Handle filter change
     * @param {string} filter - Filter name
     * @param {string} value - Filter value
     */
    _handleFilterChange(filter, value) {
        if (this._filters[filter] === value) {
            // If clicking the same filter, reset to 'all' (for non-search filters)
            if (filter !== 'search') {
                this._filters[filter] = 'all';
            }
        } else {
            this._filters[filter] = value;
        }
        this._render();
    }

    /**
     * Reset all filters
     */
    _handleResetFilters() {
        this._filters = {
            search: '',
            source: 'all',
            topic: 'all',
            difficulty: 'all',
            status: 'all',
            type: 'all'
        };
        this._render();
        Toast.info('Filters reset');
    }

    /**
     * Handle answer selection
     * @param {number} index - Question index
     * @param {number} selected - Selected option
     * @param {boolean} correct - Whether correct
     */
    _handleSelect(index, selected, correct) {
        const question = this._filteredQuestions[index];
        if (!question) return;
        
        const questionId = String(question.id || this._questions.indexOf(question));
        
        // Mark as attempted
        this._attempted.add(questionId);
        
        // Save result
        const studyState = storage.loadStudyQuestions();
        if (!studyState.results) {
            studyState.results = {};
        }
        studyState.results[questionId] = selected;
        studyState.attempted = Array.from(this._attempted);
        storage.saveStudyQuestions(studyState);
        
        // Update stats
        this._calculateStats();
        this._renderStats();
        
        // Emit event
        eventBus.emit('study.question.answered', {
            questionId,
            selected,
            correct
        });
        
        // Show feedback
        if (correct) {
            Toast.success('✅ Correct answer!');
        } else {
            Toast.warning(`❌ Incorrect. The correct answer was ${String.fromCharCode(65 + question.answer)}.`);
        }
    }

    /**
     * Handle flag toggle
     * @param {number} index - Question index
     * @param {boolean} flagged - Whether flagged
     */
    _handleFlag(index, flagged) {
        const question = this._filteredQuestions[index];
        if (!question) return;
        
        const questionId = String(question.id || this._questions.indexOf(question));
        
        if (flagged) {
            this._favorites.add(questionId);
        } else {
            this._favorites.delete(questionId);
        }
        
        // Save to storage
        const studyState = storage.loadStudyQuestions();
        studyState.favorites = Array.from(this._favorites);
        storage.saveStudyQuestions(studyState);
        
        // Update state
        state.set('studyQuestions.favorites', this._favorites);
        
        // Show feedback
        if (flagged) {
            Toast.success('⭐ Added to favorites');
        } else {
            Toast.info('Removed from favorites');
        }
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
     * Refresh data
     */
    async _refreshData() {
        await this._loadData();
        this._render();
        Toast.success('Study questions refreshed');
    }

    /**
     * Get all study questions
     * @returns {Array} All questions
     */
    getQuestions() {
        return [...this._questions];
    }

    /**
     * Get filtered questions
     * @returns {Array} Filtered questions
     */
    getFilteredQuestions() {
        return [...this._filteredQuestions];
    }

    /**
     * Get favorites
     * @returns {Set} Favorites set
     */
    getFavorites() {
        return new Set(this._favorites);
    }

    /**
     * Get attempted questions
     * @returns {Set} Attempted set
     */
    getAttempted() {
        return new Set(this._attempted);
    }

    /**
     * Get statistics
     * @returns {Object} Statistics
     */
    getStats() {
        return { ...this._studyStats };
    }

    /**
     * Get current filters
     * @returns {Object} Filters
     */
    getFilters() {
        return { ...this._filters };
    }

    /**
     * Add a new study question (for future use)
     * @param {Object} question - Question object
     */
    addQuestion(question) {
        if (!question || !question.question) {
            console.warn('Invalid question data');
            return;
        }
        
        // Generate ID if not provided
        if (!question.id) {
            question.id = `SQ-${Date.now()}`;
        }
        
        this._questions.push(question);
        this._render();
        
        // Save to JSON would require server-side support
        // For now, we'll just update the UI
        Toast.success('Question added to study bank');
    }

    /**
     * Remove a study question (for future use)
     * @param {string} questionId - Question ID
     */
    removeQuestion(questionId) {
        const index = this._questions.findIndex(q => q.id === questionId);
        if (index > -1) {
            this._questions.splice(index, 1);
            this._favorites.delete(questionId);
            this._attempted.delete(questionId);
            this._render();
            Toast.success('Question removed');
        }
    }

    /**
     * Destroy the study questions page
     */
    destroy() {
        // Destroy question cards
        this._questionCards.forEach(card => card.destroy());
        this._questionCards = [];
        
        // Clear event listeners
        eventBus.off('state.updated', this._handleStateChange);
        eventBus.off('storage.updated', this._handleStorageUpdate);
        
        this._initialized = false;
        console.log('Study questions destroyed');
    }
}

/**
 * Create and export the study questions instance
 */
export default StudyQuestions;
