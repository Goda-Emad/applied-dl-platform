/**
 * ============================================================
 * js/core/state.js — Central Application State Management
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * State Manager
 * 
 * Central state management for the entire application.
 * Provides a single source of truth for all application data.
 * Implements the observer pattern for state change notifications.
 */

class StateManager {
    constructor() {
        // Private state object - immutable from outside
        this._state = this._getInitialState();
        
        // Observer system
        this._observers = new Map();
        this._globalObservers = new Set();
        
        // Prevent direct modification of state
        this._frozen = false;
    }

    /**
     * Get the initial application state
     * @returns {Object} Initial state object
     */
    _getInitialState() {
        return {
            // ── Page Management ──────────────────────────────────
            page: {
                current: 'dashboard', // dashboard | lectures | exam | results | study-questions | settings
                previous: null,
                params: {}
            },

            // ── Lecture Data ─────────────────────────────────────
            lectures: {
                list: [],                    // Array of lecture objects
                current: null,               // Current lecture ID
                progress: {},                // { lectureId: { completed: false, score: 0, attempts: 0 } }
                completed: [],               // Array of completed lecture IDs
                questionCount: 0,
                totalLectures: 14
            },

            // ── Exam Session ─────────────────────────────────────
            exam: {
                active: false,
                lectureId: null,
                questions: [],               // Array of question objects
                currentIndex: 0,
                answers: {},                 // { questionIndex: selectedOptionIndex }
                flagged: {},                 // { questionIndex: true }
                startedAt: null,
                submitted: false,
                results: null,               // { correct: 0, wrong: 0, skipped: 0, score: 0, grade: '' }
                timer: {
                    started: false,
                    timeRemaining: 0,        // seconds
                    totalTime: 0,            // seconds
                    warningThreshold: 60,    // seconds
                    dangerThreshold: 30      // seconds
                },
                reviewMode: false
            },

            // ── User Progress ────────────────────────────────────
            progress: {
                totalQuestionsAttempted: 0,
                correctAnswers: 0,
                wrongAnswers: 0,
                skippedQuestions: 0,
                accuracy: 0,
                streak: 0,
                bestStreak: 0,
                lastActivity: null,
                studyTime: 0,                // seconds
                achievements: [],            // Array of achievement objects
                topicPerformance: {}         // { topicId: { correct: 0, wrong: 0, score: 0 } }
            },

            // ── Statistics ───────────────────────────────────────
            stats: {
                overall: {
                    totalQuestions: 0,
                    completedQuestions: 0,
                    averageScore: 0,
                    averageTime: 0
                },
                byLecture: {},               // { lectureId: { score: 0, attempts: 0, time: 0 } },
                byTopic: {},                 // { topicId: { score: 0, attempts: 0 } },
                daily: [],                   // Array of daily stats objects
                weekly: [],                  // Array of weekly stats objects
                monthly: []                  // Array of monthly stats objects
            },

            // ── Study Questions ─────────────────────────────────
            studyQuestions: {
                list: [],                    // Array of study question objects
                filtered: [],                // Filtered list for display
                filters: {
                    category: 'all',         // all | quiz | assignment | revision | screenshot | instructor
                    difficulty: 'all',       // all | easy | medium | hard
                    searchTerm: '',
                    sortBy: 'date'           // date | difficulty | category | favorite
                },
                favorites: new Set(),        // Set of question IDs
                attempted: new Set(),        // Set of attempted question IDs
                selected: null,              // Current selected question ID
                totalQuestions: 0
            },

            // ── UI Preferences ──────────────────────────────────
            ui: {
                theme: this._getInitialTheme(), // light | dark
                sidebarOpen: false,
                sidebarCollapsed: false,
                fontSize: 'medium',          // small | medium | large
                showAnimations: true,
                compactMode: false,
                notifications: true,
                soundEffects: true,
                highContrast: false
            },

            // ── Notification System ─────────────────────────────
            notifications: {
                list: [],                    // Array of notification objects
                unreadCount: 0,
                lastRead: null
            },

            // ── Loading & Error States ──────────────────────────
            app: {
                isLoading: false,
                loadingMessage: '',
                error: null,
                isOffline: false,
                lastSync: null,
                version: '1.0.0'
            }
        };
    }

    /**
     * Get initial theme based on system preference
     * @returns {string} 'dark' or 'light'
     */
    _getInitialTheme() {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('app-theme');
            if (savedTheme === 'dark' || savedTheme === 'light') {
                return savedTheme;
            }
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
            }
        }
        return 'light';
    }

    /**
     * Get the current state (read-only)
     * @returns {Object} The current state object (frozen)
     */
    get state() {
        return Object.freeze(this._state);
    }

    /**
     * Get a specific slice of state
     * @param {string} path - Dot notation path (e.g., 'exam.answers')
     * @returns {*} The value at the specified path
     */
    get(path) {
        if (!path) return this._state;
        
        const parts = path.split('.');
        let current = this._state;
        
        for (const part of parts) {
            if (current === undefined || current === null) {
                return undefined;
            }
            current = current[part];
        }
        
        return current;
    }

    /**
     * Update the state (with immutability)
     * @param {string} path - Dot notation path
     * @param {*} value - New value
     * @param {boolean} silent - If true, don't notify observers
     */
    set(path, value, silent = false) {
        if (this._frozen) {
            console.warn('State is frozen. Cannot update.');
            return;
        }

        const parts = path.split('.');
        const lastKey = parts.pop();
        let target = this._state;
        
        // Navigate to the parent object
        for (const part of parts) {
            if (!target[part] || typeof target[part] !== 'object') {
                target[part] = {};
            }
            target = target[part];
        }
        
        // Update the value
        const oldValue = target[lastKey];
        target[lastKey] = value;
        
        // Notify observers if not silent
        if (!silent) {
            this._notifyObservers(path, value, oldValue);
        }
    }

    /**
     * Update multiple state paths at once
     * @param {Object} updates - Object with path-value pairs
     * @param {boolean} silent - If true, don't notify observers
     */
    update(updates, silent = false) {
        if (this._frozen) {
            console.warn('State is frozen. Cannot update.');
            return;
        }

        const changedPaths = [];
        
        for (const [path, value] of Object.entries(updates)) {
            const parts = path.split('.');
            const lastKey = parts.pop();
            let target = this._state;
            
            for (const part of parts) {
                if (!target[part] || typeof target[part] !== 'object') {
                    target[part] = {};
                }
                target = target[part];
            }
            
            const oldValue = target[lastKey];
            target[lastKey] = value;
            changedPaths.push({ path, value, oldValue });
        }
        
        // Notify observers if not silent
        if (!silent) {
            for (const change of changedPaths) {
                this._notifyObservers(change.path, change.value, change.oldValue);
            }
        }
    }

    /**
     * Reset the state to initial values
     * @param {string} path - Optional path to reset (if not provided, reset all)
     */
    reset(path = null) {
        if (this._frozen) {
            console.warn('State is frozen. Cannot reset.');
            return;
        }

        if (path) {
            // Reset specific path
            const parts = path.split('.');
            const lastKey = parts.pop();
            let target = this._state;
            
            for (const part of parts) {
                if (!target[part]) {
                    return;
                }
                target = target[part];
            }
            
            // Get initial state for this path
            const initialState = this._getInitialState();
            let initialTarget = initialState;
            for (const part of parts) {
                initialTarget = initialTarget[part];
            }
            
            target[lastKey] = initialTarget[lastKey];
            this._notifyObservers(path, target[lastKey], null);
        } else {
            // Reset all state
            const oldState = { ...this._state };
            this._state = this._getInitialState();
            this._notifyObservers('*', this._state, oldState);
        }
    }

    /**
     * Subscribe to state changes
     * @param {string} path - Dot notation path to watch
     * @param {Function} callback - Function called with (newValue, oldValue, path)
     * @returns {Function} Unsubscribe function
     */
    subscribe(path, callback) {
        if (!this._observers.has(path)) {
            this._observers.set(path, new Set());
        }
        this._observers.get(path).add(callback);
        
        // Return unsubscribe function
        return () => {
            if (this._observers.has(path)) {
                this._observers.get(path).delete(callback);
            }
        };
    }

    /**
     * Subscribe to all state changes
     * @param {Function} callback - Function called with (newState, oldState)
     * @returns {Function} Unsubscribe function
     */
    subscribeAll(callback) {
        this._globalObservers.add(callback);
        return () => {
            this._globalObservers.delete(callback);
        };
    }

    /**
     * Notify observers of a state change
     * @param {string} path - The path that changed
     * @param {*} newValue - The new value
     * @param {*} oldValue - The old value
     */
    _notifyObservers(path, newValue, oldValue) {
        // Notify path-specific observers
        if (this._observers.has(path)) {
            for (const callback of this._observers.get(path)) {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    console.error(`Error in state observer for path "${path}":`, error);
                }
            }
        }
        
        // Notify global observers
        for (const callback of this._globalObservers) {
            try {
                callback(this._state, path, newValue, oldValue);
            } catch (error) {
                console.error('Error in global state observer:', error);
            }
        }
    }

    /**
     * Freeze the state (prevent further updates)
     * Useful for read-only modes
     */
    freeze() {
        this._frozen = true;
    }

    /**
     * Unfreeze the state (allow updates)
     */
    unfreeze() {
        this._frozen = false;
    }

    /**
     * Check if the state is frozen
     * @returns {boolean}
     */
    isFrozen() {
        return this._frozen;
    }

    /**
     * Persist state to localStorage
     * @param {string} key - Storage key
     * @param {Array} paths - Array of paths to persist (if empty, persist all)
     */
    persist(key = 'app-state', paths = []) {
        try {
            let data;
            if (paths.length > 0) {
                // Only persist specific paths
                data = {};
                for (const path of paths) {
                    data[path] = this.get(path);
                }
            } else {
                // Persist all state (but exclude large data)
                data = this._getPersistableState();
            }
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to persist state:', error);
        }
    }

    /**
     * Load state from localStorage
     * @param {string} key - Storage key
     * @returns {boolean} Success status
     */
    load(key = 'app-state') {
        try {
            const data = JSON.parse(localStorage.getItem(key));
            if (!data) return false;
            
            // Restore data to state
            for (const [path, value] of Object.entries(data)) {
                this.set(path, value, true);
            }
            
            // Rebuild Sets from arrays
            if (data['studyQuestions.favorites']) {
                this._state.studyQuestions.favorites = new Set(data['studyQuestions.favorites']);
            }
            if (data['studyQuestions.attempted']) {
                this._state.studyQuestions.attempted = new Set(data['studyQuestions.attempted']);
            }
            
            return true;
        } catch (error) {
            console.warn('Failed to load state:', error);
            return false;
        }
    }

    /**
     * Get persistable state (excludes large arrays and runtime data)
     * @returns {Object} Clean state object for persistence
     */
    _getPersistableState() {
        return {
            'page.current': this._state.page.current,
            'lectures.progress': this._state.lectures.progress,
            'lectures.completed': this._state.lectures.completed,
            'exam.answers': this._state.exam.answers,
            'exam.flagged': Array.from(this._state.exam.flagged ? Object.keys(this._state.exam.flagged) : []),
            'progress': this._state.progress,
            'stats': this._state.stats,
            'studyQuestions.favorites': Array.from(this._state.studyQuestions.favorites),
            'studyQuestions.attempted': Array.from(this._state.studyQuestions.attempted),
            'studyQuestions.filters': this._state.studyQuestions.filters,
            'ui.theme': this._state.ui.theme,
            'ui.sidebarCollapsed': this._state.ui.sidebarCollapsed,
            'ui.fontSize': this._state.ui.fontSize,
            'ui.highContrast': this._state.ui.highContrast,
            'notifications.list': this._state.notifications.list.slice(0, 50) // Keep last 50
        };
    }

    /**
     * Clear all persisted state
     * @param {string} key - Storage key
     */
    clearPersisted(key = 'app-state') {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn('Failed to clear persisted state:', error);
        }
    }

    /**
     * Get a snapshot of the current state
     * @returns {Object} Deep copy of the state
     */
    snapshot() {
        return JSON.parse(JSON.stringify(this._state));
    }

    /**
     * Check if a path exists in the state
     * @param {string} path - Dot notation path
     * @returns {boolean}
     */
    has(path) {
        const parts = path.split('.');
        let current = this._state;
        
        for (const part of parts) {
            if (current === undefined || current === null || !(part in current)) {
                return false;
            }
            current = current[part];
        }
        
        return true;
    }
}

/**
 * Create and export a singleton instance
 */
const state = new StateManager();

// Freeze the state object to prevent direct modification
Object.freeze(state);

// Export the state manager
export default state;
