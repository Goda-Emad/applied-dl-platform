/**
 * ============================================================
 * js/pages/lecture-browser.js — Lecture Browser Page Controller
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Lecture Browser Page Controller
 * 
 * Displays all available course lectures with metadata and allows
 * navigation to individual lecture details.
 */

import state from '../core/state.js';
import storage from '../core/storage.js';
import eventBus from '../core/event-bus.js';
import router from '../core/router.js';
import Toast from '../components/toast.js';

class LectureBrowser {
    constructor() {
        // DOM elements
        this._elements = {
            container: null,
            lectureGrid: null,
            searchInput: null,
            filterControls: null,
            emptyState: null,
            loadingIndicator: null,
            statsBar: null
        };
        
        // Data
        this._lectures = [];
        this._filteredLectures = [];
        this._questionCounts = {};
        this._completedLectures = [];
        this._searchTerm = '';
        this._currentFilter = 'all';
        
        // State
        this._initialized = false;
        this._isLoading = false;
        
        // Bind methods
        this._handleSearch = this._handleSearch.bind(this);
        this._handleFilter = this._handleFilter.bind(this);
        this._handleLectureClick = this._handleLectureClick.bind(this);
        this._handleStateChange = this._handleStateChange.bind(this);
        this._handleStorageUpdate = this._handleStorageUpdate.bind(this);
        
        // Initialize
        this._init();
    }

    /**
     * Initialize the lecture browser
     */
    async _init() {
        if (this._initialized) return;
        
        // Get container
        this._elements.container = document.querySelector('#lecture-browser-container');
        if (!this._elements.container) {
            console.warn('Lecture browser container not found');
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
        console.log('Lecture browser initialized');
    }

    /**
     * Cache DOM elements
     */
    _cacheElements() {
        this._elements.lectureGrid = this._elements.container.querySelector('.lecture-grid');
        this._elements.searchInput = this._elements.container.querySelector('.lecture-search-input');
        this._elements.filterControls = this._elements.container.querySelector('.lecture-filters');
        this._elements.emptyState = this._elements.container.querySelector('.lecture-empty-state');
        this._elements.loadingIndicator = this._elements.container.querySelector('.lecture-loading');
        this._elements.statsBar = this._elements.container.querySelector('.lecture-stats-bar');
    }

    /**
     * Load lecture data
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
            
            // Get lectures from index
            this._lectures = indexData.lectures || [];
            
            // Get completed lectures from storage
            this._completedLectures = storage.loadCompletedLectures();
            
            // Load question counts for each lecture
            await this._loadQuestionCounts();
            
            // Update state
            state.set('lectures.list', this._lectures);
            
            // Log success
            console.log(`Loaded ${this._lectures.length} lectures`);
            
        } catch (error) {
            console.error('Error loading lecture data:', error);
            Toast.error('Failed to load lecture data. Please refresh the page.');
        } finally {
            this._isLoading = false;
            this._showLoading(false);
        }
    }

    /**
     * Load question counts for each lecture
     */
    async _loadQuestionCounts() {
        this._questionCounts = {};
        
        for (const lecture of this._lectures) {
            const questionCount = await this._getQuestionCount(lecture.id);
            this._questionCounts[lecture.id] = questionCount;
        }
    }

    /**
     * Get question count for a lecture
     * @param {string} lectureId - Lecture ID
     * @returns {Promise<number>} Number of questions
     */
    async _getQuestionCount(lectureId) {
        try {
            const response = await fetch(`/data/lectures/${lectureId}/questions.json`);
            if (!response.ok) {
                return 0;
            }
            const data = await response.json();
            return data.questions ? data.questions.length : 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Render the lecture browser
     */
    _render() {
        if (!this._elements.container) return;
        
        // Apply search and filter
        this._filterLectures();
        
        // Render stats
        this._renderStats();
        
        // Render lecture grid
        this._renderLectureGrid();
        
        // Render empty state if needed
        this._toggleEmptyState();
        
        // Update URL if needed
        this._updateURL();
    }

    /**
     * Filter lectures based on search and filter criteria
     */
    _filterLectures() {
        this._filteredLectures = this._lectures.filter(lecture => {
            // Search filter
            if (this._searchTerm) {
                const searchLower = this._searchTerm.toLowerCase();
                const titleMatch = lecture.title.toLowerCase().includes(searchLower);
                const idMatch = lecture.id.toLowerCase().includes(searchLower);
                if (!titleMatch && !idMatch) {
                    return false;
                }
            }
            
            // Status filter
            if (this._currentFilter === 'completed') {
                return this._completedLectures.includes(lecture.id);
            } else if (this._currentFilter === 'in-progress') {
                return !this._completedLectures.includes(lecture.id) && 
                       this._hasProgress(lecture.id);
            } else if (this._currentFilter === 'not-started') {
                return !this._completedLectures.includes(lecture.id) && 
                       !this._hasProgress(lecture.id);
            } else if (this._currentFilter === 'has-questions') {
                return (this._questionCounts[lecture.id] || 0) > 0;
            } else if (this._currentFilter === 'no-questions') {
                return (this._questionCounts[lecture.id] || 0) === 0;
            }
            
            // 'all' or unknown filter
            return true;
        });
    }

    /**
     * Check if a lecture has progress
     * @param {string} lectureId - Lecture ID
     * @returns {boolean} True if has progress
     */
    _hasProgress(lectureId) {
        const progress = storage.loadUserProgress();
        // Check if there are any exam attempts for this lecture
        const history = storage.getExamHistoryByLecture(lectureId);
        return history.length > 0;
    }

    /**
     * Render statistics bar
     */
    _renderStats() {
        const statsBar = this._elements.statsBar;
        if (!statsBar) return;
        
        const total = this._lectures.length;
        const completed = this._completedLectures.length;
        const withQuestions = this._lectures.filter(l => (this._questionCounts[l.id] || 0) > 0).length;
        const totalQuestions = Object.values(this._questionCounts).reduce((sum, count) => sum + count, 0);
        
        statsBar.innerHTML = `
            <div class="stats-item">
                <span class="stats-label">Total Lectures:</span>
                <span class="stats-value">${total}</span>
            </div>
            <div class="stats-item">
                <span class="stats-label">Completed:</span>
                <span class="stats-value">${completed}</span>
            </div>
            <div class="stats-item">
                <span class="stats-label">With Questions:</span>
                <span class="stats-value">${withQuestions}</span>
            </div>
            <div class="stats-item">
                <span class="stats-label">Total Questions:</span>
                <span class="stats-value">${totalQuestions}</span>
            </div>
        `;
    }

    /**
     * Render lecture grid
     */
    _renderLectureGrid() {
        const grid = this._elements.lectureGrid;
        if (!grid) return;
        
        if (this._filteredLectures.length === 0) {
            grid.innerHTML = '';
            return;
        }
        
        grid.innerHTML = this._filteredLectures.map(lecture => {
            const questionCount = this._questionCounts[lecture.id] || 0;
            const isCompleted = this._completedLectures.includes(lecture.id);
            const hasQuestions = questionCount > 0;
            const status = isCompleted ? 'completed' : 
                          this._hasProgress(lecture.id) ? 'in-progress' : 'not-started';
            
            return this._createLectureCard(lecture, questionCount, isCompleted, hasQuestions, status);
        }).join('');
        
        // Attach click events to cards
        grid.querySelectorAll('.lecture-card').forEach(card => {
            card.addEventListener('click', this._handleLectureClick);
        });
    }

    /**
     * Create a lecture card HTML
     * @param {Object} lecture - Lecture object
     * @param {number} questionCount - Number of questions
     * @param {boolean} isCompleted - Whether completed
     * @param {boolean} hasQuestions - Whether has questions
     * @param {string} status - Status string
     * @returns {string} HTML string
     */
    _createLectureCard(lecture, questionCount, isCompleted, hasQuestions, status) {
        const progress = isCompleted ? 100 : 0;
        const weekMatch = lecture.id.match(/week(\d+)/i);
        const weekNumber = weekMatch ? weekMatch[1] : '?';
        const displayTitle = lecture.title || `Week ${weekNumber}`;
        
        return `
            <div class="lecture-card status-${status}" data-lecture-id="${lecture.id}" data-status="${status}">
                <div class="lecture-card-header">
                    <div class="lecture-week-badge">
                        <span class="week-number">${weekNumber}</span>
                        <span class="week-label">Week</span>
                    </div>
                    <div class="lecture-card-title-area">
                        <div class="lecture-card-title">${displayTitle}</div>
                        <div class="lecture-card-subtitle">
                            <span>${lecture.id}</span>
                            ${isCompleted ? '<span class="divider">•</span><span style="color: var(--color-success);">✓ Completed</span>' : ''}
                        </div>
                    </div>
                </div>
                <div class="lecture-card-body">
                    ${lecture.description ? `<div class="lecture-description">${lecture.description}</div>` : ''}
                    <div class="lecture-meta-row">
                        <div class="lecture-meta-item">
                            <span>📝</span>
                            <span><span class="meta-value">${questionCount}</span> questions</span>
                        </div>
                        ${hasQuestions ? '' : '<div class="lecture-meta-item"><span>📭</span><span>No questions yet</span></div>'}
                    </div>
                    <div class="lecture-badges">
                        ${isCompleted ? '<span class="lecture-badge status-completed">✅ Completed</span>' : 
                          status === 'in-progress' ? '<span class="lecture-badge status-in-progress">⏳ In Progress</span>' :
                          '<span class="lecture-badge status-not-started">📖 Not Started</span>'}
                        ${hasQuestions ? `<span class="lecture-badge question-count">${questionCount} questions</span>` : 
                                         '<span class="lecture-badge" style="background: var(--bg-surface-alt); color: var(--text-muted);">Empty</span>'}
                    </div>
                    ${isCompleted ? `
                        <div class="lecture-progress-section">
                            <div class="lecture-progress-header">
                                <span class="progress-label">Completed</span>
                                <span class="progress-percentage">100%</span>
                            </div>
                            <div class="lecture-progress-bar">
                                <div class="lecture-progress-fill" style="width: 100%;"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="lecture-card-actions">
                    ${hasQuestions ? `
                        <button class="btn btn-lecture-primary" data-action="open">
                            ${isCompleted ? '📖 Review' : 'Start Practice'}
                        </button>
                    ` : `
                        <button class="btn btn-lecture-secondary" disabled style="cursor: not-allowed; opacity: 0.6;">
                            🔒 No Questions Available
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    /**
     * Toggle empty state
     */
    _toggleEmptyState() {
        const emptyState = this._elements.emptyState;
        if (!emptyState) return;
        
        if (this._filteredLectures.length === 0) {
            emptyState.style.display = 'flex';
            if (this._lectures.length === 0) {
                emptyState.innerHTML = `
                    <div class="empty-icon">📚</div>
                    <div class="empty-title">No Lectures Found</div>
                    <div class="empty-description">There are no lectures available at the moment. Please check back later.</div>
                `;
            } else if (this._searchTerm || this._currentFilter !== 'all') {
                emptyState.innerHTML = `
                    <div class="empty-icon">🔍</div>
                    <div class="empty-title">No Matching Lectures</div>
                    <div class="empty-description">Try adjusting your search or filter criteria.</div>
                    <button class="btn btn-primary" data-action="clear-filters">Clear Filters</button>
                `;
                const clearBtn = emptyState.querySelector('[data-action="clear-filters"]');
                if (clearBtn) {
                    clearBtn.addEventListener('click', () => {
                        this._clearFilters();
                    });
                }
            } else {
                emptyState.innerHTML = `
                    <div class="empty-icon">📝</div>
                    <div class="empty-title">No Questions Available</div>
                    <div class="empty-description">Questions are being prepared for this course. Please check back soon.</div>
                `;
            }
        } else {
            emptyState.style.display = 'none';
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
        if (this._elements.lectureGrid) {
            this._elements.lectureGrid.style.opacity = show ? '0.5' : '1';
            this._elements.lectureGrid.style.pointerEvents = show ? 'none' : 'auto';
        }
    }

    /**
     * Update URL with search/filter parameters
     */
    _updateURL() {
        const params = new URLSearchParams();
        if (this._searchTerm) {
            params.set('search', this._searchTerm);
        }
        if (this._currentFilter !== 'all') {
            params.set('filter', this._currentFilter);
        }
        
        const queryString = params.toString();
        const currentPath = router.getCurrentRoute().path || '/lectures';
        
        // Update URL without triggering navigation
        if (queryString) {
            const newUrl = `${currentPath}?${queryString}`;
            window.history.replaceState({}, '', newUrl);
        } else {
            window.history.replaceState({}, '', currentPath);
        }
    }

    /**
     * Parse URL parameters
     */
    _parseURLParams() {
        const params = new URLSearchParams(window.location.search);
        this._searchTerm = params.get('search') || '';
        this._currentFilter = params.get('filter') || 'all';
        
        if (this._elements.searchInput) {
            this._elements.searchInput.value = this._searchTerm;
        }
    }

    /**
     * Setup event listeners
     */
    _setupEventListeners() {
        // Search input
        if (this._elements.searchInput) {
            this._elements.searchInput.addEventListener('input', this._handleSearch);
        }
        
        // Filter controls
        if (this._elements.filterControls) {
            this._elements.filterControls.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-filter]');
                if (btn) {
                    this._handleFilter(btn.dataset.filter);
                }
            });
        }
        
        // State changes
        eventBus.on('state.updated', this._handleStateChange);
        eventBus.on('storage.updated', this._handleStorageUpdate);
        
        // Theme changes
        eventBus.on('theme.changed', () => {
            // Re-render to update any theme-specific styling
            this._render();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+K or Cmd+K to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (this._elements.searchInput) {
                    this._elements.searchInput.focus();
                }
            }
            // Escape to clear search
            if (e.key === 'Escape' && this._elements.searchInput === document.activeElement) {
                this._searchTerm = '';
                this._elements.searchInput.value = '';
                this._render();
            }
        });
        
        // Parse URL parameters on load
        this._parseURLParams();
    }

    /**
     * Handle search input
     * @param {Event} e - Input event
     */
    _handleSearch(e) {
        this._searchTerm = e.target.value.trim();
        this._render();
    }

    /**
     * Handle filter click
     * @param {string} filter - Filter key
     */
    _handleFilter(filter) {
        if (this._currentFilter === filter) {
            // If clicking the same filter, reset to 'all'
            this._currentFilter = 'all';
        } else {
            this._currentFilter = filter;
        }
        
        // Update active filter buttons
        if (this._elements.filterControls) {
            const buttons = this._elements.filterControls.querySelectorAll('[data-filter]');
            buttons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === this._currentFilter);
            });
        }
        
        this._render();
    }

    /**
     * Clear all filters
     */
    _clearFilters() {
        this._searchTerm = '';
        this._currentFilter = 'all';
        
        if (this._elements.searchInput) {
            this._elements.searchInput.value = '';
        }
        
        if (this._elements.filterControls) {
            const buttons = this._elements.filterControls.querySelectorAll('[data-filter]');
            buttons.forEach(btn => {
                btn.classList.remove('active');
            });
        }
        
        this._render();
    }

    /**
     * Handle lecture card click
     * @param {Event} e - Click event
     */
    _handleLectureClick(e) {
        const card = e.currentTarget;
        const lectureId = card.dataset.lectureId;
        const actionBtn = e.target.closest('[data-action]');
        
        if (actionBtn) {
            // Button click - handle separately
            return;
        }
        
        if (lectureId) {
            this._openLecture(lectureId);
        }
    }

    /**
     * Open a lecture
     * @param {string} lectureId - Lecture ID
     */
    _openLecture(lectureId) {
        const lecture = this._lectures.find(l => l.id === lectureId);
        if (!lecture) {
            Toast.error('Lecture not found');
            return;
        }
        
        const questionCount = this._questionCounts[lectureId] || 0;
        if (questionCount === 0) {
            Toast.warning('This lecture does not have any questions yet.');
            return;
        }
        
        // Navigate to lecture detail
        router.navigate(`/lectures/${lectureId}`);
    }

    /**
     * Handle state changes
     * @param {Object} newState - New state
     */
    _handleStateChange(newState) {
        if (newState.lectures || newState.progress) {
            this._completedLectures = storage.loadCompletedLectures();
            this._render();
        }
    }

    /**
     * Handle storage updates
     */
    _handleStorageUpdate() {
        this._completedLectures = storage.loadCompletedLectures();
        this._render();
    }

    /**
     * Refresh lecture data
     */
    async refresh() {
        await this._loadData();
        this._render();
        Toast.success('Lecture data refreshed');
    }

    /**
     * Get lecture data
     * @returns {Object} Lecture data
     */
    getData() {
        return {
            lectures: this._lectures,
            filteredLectures: this._filteredLectures,
            questionCounts: this._questionCounts,
            completedLectures: this._completedLectures
        };
    }

    /**
     * Get lecture by ID
     * @param {string} lectureId - Lecture ID
     * @returns {Object|null} Lecture object
     */
    getLecture(lectureId) {
        return this._lectures.find(l => l.id === lectureId) || null;
    }

    /**
     * Get question count for a lecture
     * @param {string} lectureId - Lecture ID
     * @returns {number} Question count
     */
    getQuestionCount(lectureId) {
        return this._questionCounts[lectureId] || 0;
    }

    /**
     * Set search term
     * @param {string} term - Search term
     */
    setSearch(term) {
        this._searchTerm = term;
        if (this._elements.searchInput) {
            this._elements.searchInput.value = term;
        }
        this._render();
    }

    /**
     * Set filter
     * @param {string} filter - Filter key
     */
    setFilter(filter) {
        this._currentFilter = filter;
        if (this._elements.filterControls) {
            const buttons = this._elements.filterControls.querySelectorAll('[data-filter]');
            buttons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === filter);
            });
        }
        this._render();
    }

    /**
     * Destroy the lecture browser
     */
    destroy() {
        // Clear event listeners
        if (this._elements.searchInput) {
            this._elements.searchInput.removeEventListener('input', this._handleSearch);
        }
        
        eventBus.off('state.updated', this._handleStateChange);
        eventBus.off('storage.updated', this._handleStorageUpdate);
        
        // Clear data
        this._lectures = [];
        this._filteredLectures = [];
        this._questionCounts = {};
        
        this._initialized = false;
        console.log('Lecture browser destroyed');
    }
}

/**
 * Create and export the lecture browser instance
 */
export default LectureBrowser;
