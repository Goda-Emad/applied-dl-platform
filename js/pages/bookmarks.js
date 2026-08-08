/**
 * ============================================================
 * js/pages/bookmarks.js — Bookmarks/Favorites Page Controller
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Bookmarks Page Controller
 * 
 * Displays all bookmarked/favorited questions from across the entire course.
 * Supports filtering, searching, and removing bookmarks.
 */

import state from '../core/state.js';
import storage from '../core/storage.js';
import eventBus from '../core/event-bus.js';
import router from '../core/router.js';
import Toast from '../components/toast.js';
import QuestionCard from '../components/question-card.js';

class BookmarksPage {
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
        this._bookmarks = [];
        this._filteredBookmarks = [];
        this._allQuestions = {};
        this._lectureMap = {};
        this._studyQuestions = [];
        
        // Filters
        this._filters = {
            search: '',
            source: 'all',
            lecture: 'all',
            topic: 'all',
            difficulty: 'all'
        };
        
        // State
        this._initialized = false;
        this._isLoading = false;
        this._questionCards = [];
        
        // Bind methods
        this._handleSearch = this._handleSearch.bind(this);
        this._handleFilterChange = this._handleFilterChange.bind(this);
        this._handleFlag = this._handleFlag.bind(this);
        this._handleStateChange = this._handleStateChange.bind(this);
        this._handleStorageUpdate = this._handleStorageUpdate.bind(this);
        this._handleResetFilters = this._handleResetFilters.bind(this);
        this._handleQuestionClick = this._handleQuestionClick.bind(this);
        
        // Initialize
        this._init();
    }

    /**
     * Initialize the bookmarks page
     */
    async _init() {
        if (this._initialized) return;
        
        // Get container
        this._elements.container = document.querySelector('#bookmarks-container');
        if (!this._elements.container) {
            console.warn('Bookmarks container not found');
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
        console.log('Bookmarks page initialized');
    }

    /**
     * Cache DOM elements
     */
    _cacheElements() {
        this._elements.header = this._elements.container.querySelector('.bookmarks-header');
        this._elements.searchSection = this._elements.container.querySelector('.bookmarks-search-section');
        this._elements.filterControls = this._elements.container.querySelector('.bookmarks-filters');
        this._elements.questionList = this._elements.container.querySelector('.bookmarks-grid');
        this._elements.emptyState = this._elements.container.querySelector('.empty-bookmarks');
        this._elements.statsBar = this._elements.container.querySelector('.bookmarks-stats-bar');
        this._elements.loadingIndicator = this._elements.container.querySelector('.loading-indicator');
    }

    /**
     * Load all bookmark data
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
            const lectures = indexData.lectures || [];
            
            // Build lecture map
            this._lectureMap = {};
            lectures.forEach(lecture => {
                this._lectureMap[lecture.id] = lecture.title || lecture.id;
            });
            
            // Load all questions from all lectures
            this._allQuestions = {};
            for (const lecture of lectures) {
                try {
                    const response = await fetch(`/data/lectures/${lecture.id}/questions.json`);
                    if (response.ok) {
                        const data = await response.json();
                        const questions = data.questions || [];
                        this._allQuestions[lecture.id] = questions.map(q => ({
                            ...q,
                            _source: 'lecture',
                            _lectureId: lecture.id,
                            _lectureTitle: this._lectureMap[lecture.id] || lecture.id,
                            _questionId: `${lecture.id}_${q.id || questions.indexOf(q)}`
                        }));
                    }
                } catch (error) {
                    // Skip if no questions
                }
            }
            
            // Load study questions
            try {
                const response = await fetch('/data/study-questions/bank.json');
                if (response.ok) {
                    const data = await response.json();
                    const questions = data.questions || [];
                    this._studyQuestions = questions.map(q => ({
                        ...q,
                        _source: 'study',
                        _lectureId: 'study-questions',
                        _lectureTitle: 'Study Questions',
                        _questionId: `study_${q.id || questions.indexOf(q)}`
                    }));
                }
            } catch (error) {
                // Skip if no study questions
            }
            
            // Load favorites from storage
            const favorites = storage.loadFavorites();
            const studyState = storage.loadStudyQuestions();
            const studyFavorites = studyState.favorites || [];
            
            // Resolve bookmarks
            this._bookmarks = [];
            
            // Add lecture bookmarks
            for (const [lectureId, questions] of Object.entries(this._allQuestions)) {
                questions.forEach(question => {
                    const questionId = question._questionId;
                    if (favorites.includes(questionId) || favorites.includes(String(question.id))) {
                        this._bookmarks.push(question);
                    }
                });
            }
            
            // Add study bookmarks
            this._studyQuestions.forEach(question => {
                const questionId = question._questionId;
                if (studyFavorites.includes(questionId) || studyFavorites.includes(String(question.id))) {
                    this._bookmarks.push(question);
                }
            });
            
            // Update state
            state.set('bookmarks.list', this._bookmarks);
            
            console.log(`Loaded ${this._bookmarks.length} bookmarks`);
            
        } catch (error) {
            console.error('Error loading bookmarks:', error);
            Toast.error('Failed to load bookmarks. Please refresh the page.');
            this._bookmarks = [];
        } finally {
            this._isLoading = false;
            this._showLoading(false);
        }
    }

    /**
     * Render the bookmarks page
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
        
        // Render bookmarks
        this._renderBookmarks();
        
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
            <div class="bookmarks-header-left">
                <div class="header-icon">⭐</div>
                <div class="bookmarks-header-info">
                    <h1>Your Bookmarks</h1>
                    <p>All questions you've bookmarked across the course</p>
                </div>
            </div>
            <div class="bookmarks-header-right">
                <span class="bookmarks-count">
                    ⭐ <span class="count-number">${this._bookmarks.length}</span> bookmarks
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
        
        const total = this._bookmarks.length;
        const lectures = new Set(this._bookmarks.map(b => b._lectureId)).size;
        const topics = new Set(this._bookmarks.map(b => b.topic).filter(Boolean)).size;
        
        stats.innerHTML = `
            <div class="stats-item">
                <span class="stats-label">Total:</span>
                <span class="stats-value">${total}</span>
            </div>
            <div class="stats-item">
                <span class="stats-label">Lectures:</span>
                <span class="stats-value">${lectures}</span>
            </div>
            <div class="stats-item">
                <span class="stats-label">Topics:</span>
                <span class="stats-value">${topics}</span>
            </div>
        `;
    }

    /**
     * Render search and filter controls
     */
    _renderSearchAndFilters() {
        const section = this._elements.searchSection;
        if (!section) return;
        
        // Get unique sources, lectures, topics
        const sources = this._getUniqueSources();
        const lectures = this._getUniqueLectures();
        const topics = this._getUniqueTopics();
        const difficulties = ['easy', 'medium', 'hard', 'expert'];
        
        section.innerHTML = `
            <div class="bookmarks-search-bar">
                <span class="search-icon">🔍</span>
                <input type="text" class="bookmarks-search-input" 
                       placeholder="Search bookmarks..." 
                       value="${this._filters.search}" />
                ${this._filters.search ? '<button class="search-clear">✕</button>' : ''}
            </div>
            <div class="bookmarks-search-filters">
                <div class="filter-group">
                    <span class="filter-label">Source:</span>
                    <button class="filter-btn ${this._filters.source === 'all' ? 'active' : ''}" data-filter="source" data-value="all">All</button>
                    ${sources.map(source => `
                        <button class="filter-btn ${this._filters.source === source ? 'active' : ''}" 
                                data-filter="source" data-value="${source}">${source}</button>
                    `).join('')}
                </div>
                <div class="filter-group">
                    <span class="filter-label">Lecture:</span>
                    <button class="filter-btn ${this._filters.lecture === 'all' ? 'active' : ''}" data-filter="lecture" data-value="all">All</button>
                    ${lectures.map(lecture => `
                        <button class="filter-btn ${this._filters.lecture === lecture ? 'active' : ''}" 
                                data-filter="lecture" data-value="${lecture}">${this._lectureMap[lecture] || lecture}</button>
                    `).join('')}
                </div>
                <div class="filter-group">
                    <span class="filter-label">Topic:</span>
                    <button class="filter-btn ${this._filters.topic === 'all' ? 'active' : ''}" data-filter="topic" data-value="all">All</button>
                    ${topics.map(topic => `
                        <button class="filter-btn ${this._filters.topic === topic ? 'active' : ''}" 
                                data-filter="topic" data-value="${topic}">${topic}</button>
                    `).join('')}
                </div>
                <div class="filter-group">
                    <span class="filter-label">Difficulty:</span>
                    <button class="filter-btn ${this._filters.difficulty === 'all' ? 'active' : ''}" data-filter="difficulty" data-value="all">All</button>
                    ${difficulties.map(diff => `
                        <button class="filter-btn ${this._filters.difficulty === diff ? 'active' : ''}" 
                                data-filter="difficulty" data-value="${diff}">${diff.charAt(0).toUpperCase() + diff.slice(1)}</button>
                    `).join('')}
                </div>
                <button class="filter-btn reset-filters">🔄 Reset Filters</button>
            </div>
        `;
        
        // Attach events
        const searchInput = section.querySelector('.bookmarks-search-input');
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
     * Render bookmarks
     */
    _renderBookmarks() {
        const list = this._elements.questionList;
        if (!list) return;
        
        // Clear existing question cards
        this._questionCards.forEach(card => card.destroy());
        this._questionCards = [];
        list.innerHTML = '';
        
        if (this._filteredBookmarks.length === 0) {
            return;
        }
        
        // Create question cards
        this._filteredBookmarks.forEach((question, index) => {
            const card = new QuestionCard({
                question: question,
                index: index,
                total: this._filteredBookmarks.length,
                mode: 'review',
                onFlag: this._handleFlag,
                onNavigate: this._handleQuestionClick
            });
            
            const container = document.createElement('div');
            container.className = 'bookmark-item-wrapper';
            card.render(container);
            list.appendChild(container);
            this._questionCards.push(card);
            
            // Set flagged state
            card.setFlagged(true);
            
            // Add source label
            const sourceLabel = document.createElement('div');
            sourceLabel.className = 'bookmark-source-label';
            sourceLabel.style.cssText = `
                font-size: 12px;
                color: var(--text-muted);
                padding: 4px 12px;
                margin-top: 4px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            sourceLabel.innerHTML = `
                <span>📚 ${question._lectureTitle || question._lectureId || 'Unknown'}</span>
                <span>${question.topic ? `📂 ${question.topic}` : ''}</span>
            `;
            container.appendChild(sourceLabel);
            
            // Add click to navigate to source
            container.style.cursor = 'pointer';
            container.addEventListener('click', (e) => {
                // Don't trigger if click is on interactive elements
                if (e.target.closest('.btn-flag, .option-item')) {
                    return;
                }
                this._handleQuestionClick('goto', question);
            });
        });
    }

    /**
     * Toggle empty state
     */
    _toggleEmptyState() {
        const emptyState = this._elements.emptyState;
        if (!emptyState) return;
        
        if (this._bookmarks.length === 0) {
            emptyState.style.display = 'flex';
            emptyState.innerHTML = `
                <div class="empty-icon">⭐</div>
                <div class="empty-title">No Bookmarks Yet</div>
                <div class="empty-description">
                    Start bookmarking questions you want to review later.
                    You can bookmark questions from lectures or study questions.
                </div>
                <div class="empty-actions">
                    <button class="btn-empty-action" data-action="go-lectures">📚 Browse Lectures</button>
                    <button class="btn-empty-action btn-empty-action-secondary" data-action="go-study">📝 Study Questions</button>
                </div>
            `;
            const goLectures = emptyState.querySelector('[data-action="go-lectures"]');
            if (goLectures) {
                goLectures.addEventListener('click', () => {
                    router.navigate('/lectures');
                });
            }
            const goStudy = emptyState.querySelector('[data-action="go-study"]');
            if (goStudy) {
                goStudy.addEventListener('click', () => {
                    router.navigate('/study-questions');
                });
            }
        } else if (this._filteredBookmarks.length === 0) {
            emptyState.style.display = 'flex';
            emptyState.innerHTML = `
                <div class="empty-icon">🔍</div>
                <div class="empty-title">No Matching Bookmarks</div>
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
     * Apply filters to bookmarks
     */
    _applyFilters() {
        this._filteredBookmarks = this._bookmarks.filter(question => {
            // Search filter
            if (this._filters.search) {
                const searchLower = this._filters.search.toLowerCase();
                const questionMatch = question.question.toLowerCase().includes(searchLower);
                const topicMatch = (question.topic || '').toLowerCase().includes(searchLower);
                const sourceMatch = (question._lectureTitle || '').toLowerCase().includes(searchLower);
                if (!questionMatch && !topicMatch && !sourceMatch) {
                    return false;
                }
            }
            
            // Source filter
            if (this._filters.source !== 'all') {
                const source = question._source === 'study' ? 'Study Questions' : 'Lecture';
                if (source !== this._filters.source) {
                    return false;
                }
            }
            
            // Lecture filter
            if (this._filters.lecture !== 'all') {
                const lectureId = question._lectureId || '';
                if (lectureId !== this._filters.lecture) {
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
            
            return true;
        });
    }

    /**
     * Get unique sources
     * @returns {Array} Unique sources
     */
    _getUniqueSources() {
        const sources = new Set();
        this._bookmarks.forEach(q => {
            const source = q._source === 'study' ? 'Study Questions' : 'Lecture';
            sources.add(source);
        });
        return Array.from(sources);
    }

    /**
     * Get unique lectures
     * @returns {Array} Unique lecture IDs
     */
    _getUniqueLectures() {
        const lectures = new Set();
        this._bookmarks.forEach(q => {
            if (q._lectureId) {
                lectures.add(q._lectureId);
            }
        });
        return Array.from(lectures);
    }

    /**
     * Get unique topics
     * @returns {Array} Unique topics
     */
    _getUniqueTopics() {
        const topics = new Set();
        this._bookmarks.forEach(q => {
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
            this._filters[filter] = 'all';
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
            lecture: 'all',
            topic: 'all',
            difficulty: 'all'
        };
        this._render();
        Toast.info('Filters reset');
    }

    /**
     * Handle flag toggle (remove bookmark)
     * @param {number} index - Question index
     * @param {boolean} flagged - Whether flagged
     */
    _handleFlag(index, flagged) {
        const question = this._filteredBookmarks[index];
        if (!question) return;
        
        // If flagged is false, we're removing the bookmark
        if (!flagged) {
            this._removeBookmark(question);
        }
    }

    /**
     * Remove a bookmark
     * @param {Object} question - Question object
     */
    _removeBookmark(question) {
        const questionId = question._questionId || String(question.id);
        
        // Remove from storage
        if (question._source === 'study') {
            const studyState = storage.loadStudyQuestions();
            studyState.favorites = studyState.favorites.filter(id => id !== questionId && id !== String(question.id));
            storage.saveStudyQuestions(studyState);
        } else {
            const favorites = storage.loadFavorites();
            const filtered = favorites.filter(id => id !== questionId && id !== String(question.id));
            storage.saveFavorites(filtered);
        }
        
        // Remove from local data
        const index = this._bookmarks.findIndex(q => q._questionId === questionId || String(q.id) === String(question.id));
        if (index > -1) {
            this._bookmarks.splice(index, 1);
        }
        
        // Re-render
        this._render();
        Toast.success('Bookmark removed');
        
        // Emit event
        eventBus.emit('bookmark.removed', { questionId });
    }

    /**
     * Handle question click - navigate to source
     * @param {string} action - Action
     * @param {Object} question - Question object
     */
    _handleQuestionClick(action, question) {
        if (question._source === 'study') {
            router.navigate('/study-questions');
        } else if (question._lectureId) {
            router.navigate(`/lectures/${question._lectureId}`);
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
        
        // Bookmark events from other components
        eventBus.on('question.flagged', (data) => {
            // Refresh if a bookmark was added/removed elsewhere
            if (data.flagged) {
                // Bookmark added - refresh
                this._refreshData();
            } else {
                // Bookmark removed - refresh
                this._refreshData();
            }
        });
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
        Toast.success('Bookmarks refreshed');
    }

    /**
     * Get all bookmarks
     * @returns {Array} All bookmarks
     */
    getBookmarks() {
        return [...this._bookmarks];
    }

    /**
     * Get filtered bookmarks
     * @returns {Array} Filtered bookmarks
     */
    getFilteredBookmarks() {
        return [...this._filteredBookmarks];
    }

    /**
     * Get bookmark count
     * @returns {number} Count
     */
    getCount() {
        return this._bookmarks.length;
    }

    /**
     * Check if a question is bookmarked
     * @param {string} questionId - Question ID
     * @returns {boolean} True if bookmarked
     */
    isBookmarked(questionId) {
        return this._bookmarks.some(q => q._questionId === questionId || String(q.id) === questionId);
    }

    /**
     * Get unique lectures with bookmarks
     * @returns {Array} Lecture IDs
     */
    getBookmarkedLectures() {
        return this._getUniqueLectures();
    }

    /**
     * Destroy the bookmarks page
     */
    destroy() {
        // Destroy question cards
        this._questionCards.forEach(card => card.destroy());
        this._questionCards = [];
        
        // Clear event listeners
        eventBus.off('state.updated', this._handleStateChange);
        eventBus.off('storage.updated', this._handleStorageUpdate);
        eventBus.off('question.flagged', this._handleRefresh);
        
        this._initialized = false;
        console.log('Bookmarks page destroyed');
    }

    /**
     * Handle refresh from events
     */
    _handleRefresh() {
        this._refreshData();
    }
}

/**
 * Create and export the bookmarks page instance
 */
export default BookmarksPage;
