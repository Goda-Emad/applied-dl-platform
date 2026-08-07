/**
 * ============================================================
 * js/core/storage.js — Local Storage Management System
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Storage Manager
 * 
 * Handles all localStorage operations for the application.
 * Provides a clean API for persisting and retrieving user data.
 * Includes error handling and data validation.
 */

class StorageManager {
    constructor() {
        // Storage keys
        this.KEYS = {
            USER_PROGRESS: 'app_user_progress',
            COMPLETED_LECTURES: 'app_completed_lectures',
            EXAM_HISTORY: 'app_exam_history',
            FAVORITES: 'app_favorites',
            ATTEMPTED_QUESTIONS: 'app_attempted_questions',
            THEME_PREFERENCE: 'app_theme_preference',
            USER_SETTINGS: 'app_user_settings',
            STUDY_QUESTIONS: 'app_study_questions',
            STATISTICS: 'app_statistics',
            NOTIFICATIONS: 'app_notifications',
            STATE_SNAPSHOT: 'app_state_snapshot',
            LAST_ACTIVITY: 'app_last_activity'
        };

        // Default data structures
        this.DEFAULTS = {
            userProgress: {
                totalQuestionsAttempted: 0,
                correctAnswers: 0,
                wrongAnswers: 0,
                skippedQuestions: 0,
                accuracy: 0,
                streak: 0,
                bestStreak: 0,
                studyTime: 0
            },
            completedLectures: [],
            examHistory: [],
            favorites: [],
            attemptedQuestions: [],
            userSettings: {
                fontSize: 'medium',
                showAnimations: true,
                notifications: true,
                soundEffects: true,
                compactMode: false,
                highContrast: false
            },
            statistics: {
                overall: {
                    totalQuestions: 0,
                    completedQuestions: 0,
                    averageScore: 0,
                    averageTime: 0
                },
                byLecture: {},
                byTopic: {},
                daily: [],
                weekly: [],
                monthly: []
            },
            notifications: [],
            studyQuestions: {
                favorites: [],
                attempted: []
            }
        };

        // Flag to track if storage is available
        this._isAvailable = this._checkStorageAvailability();
    }

    /**
     * Check if localStorage is available
     * @returns {boolean} True if localStorage is available
     */
    _checkStorageAvailability() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            console.warn('localStorage is not available:', error);
            return false;
        }
    }

    /**
     * Check if storage is available
     * @returns {boolean}
     */
    isAvailable() {
        return this._isAvailable;
    }

    /**
     * Safely get data from localStorage
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if key doesn't exist
     * @returns {*} Parsed data or defaultValue
     */
    _get(key, defaultValue = null) {
        if (!this._isAvailable) {
            return defaultValue;
        }

        try {
            const data = localStorage.getItem(key);
            if (data === null) {
                return defaultValue;
            }
            return JSON.parse(data);
        } catch (error) {
            console.warn(`Failed to read from storage key "${key}":`, error);
            return defaultValue;
        }
    }

    /**
     * Safely set data to localStorage
     * @param {string} key - Storage key
     * @param {*} value - Data to store
     * @returns {boolean} Success status
     */
    _set(key, value) {
        if (!this._isAvailable) {
            return false;
        }

        try {
            const data = JSON.stringify(value);
            localStorage.setItem(key, data);
            return true;
        } catch (error) {
            console.warn(`Failed to write to storage key "${key}":`, error);
            return false;
        }
    }

    /**
     * Safely remove data from localStorage
     * @param {string} key - Storage key
     * @returns {boolean} Success status
     */
    _remove(key) {
        if (!this._isAvailable) {
            return false;
        }

        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn(`Failed to remove storage key "${key}":`, error);
            return false;
        }
    }

    /**
     * Merge data with defaults
     * @param {Object} data - Data to merge
     * @param {Object} defaults - Default values
     * @returns {Object} Merged data
     */
    _mergeWithDefaults(data, defaults) {
        if (!data || typeof data !== 'object') {
            return { ...defaults };
        }

        const result = { ...defaults };
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && value !== null) {
                if (typeof value === 'object' && !Array.isArray(value) && defaults[key]) {
                    result[key] = this._mergeWithDefaults(value, defaults[key]);
                } else {
                    result[key] = value;
                }
            }
        }
        return result;
    }

    // ── User Progress ──────────────────────────────────────────

    /**
     * Save user progress data
     * @param {Object} progress - Progress data object
     * @returns {boolean} Success status
     */
    saveUserProgress(progress) {
        const merged = this._mergeWithDefaults(progress, this.DEFAULTS.userProgress);
        return this._set(this.KEYS.USER_PROGRESS, merged);
    }

    /**
     * Load user progress data
     * @returns {Object} User progress data
     */
    loadUserProgress() {
        const data = this._get(this.KEYS.USER_PROGRESS);
        return this._mergeWithDefaults(data, this.DEFAULTS.userProgress);
    }

    /**
     * Update specific progress fields
     * @param {Object} updates - Fields to update
     * @returns {boolean} Success status
     */
    updateUserProgress(updates) {
        const current = this.loadUserProgress();
        const updated = { ...current, ...updates };
        return this.saveUserProgress(updated);
    }

    // ── Completed Lectures ─────────────────────────────────────

    /**
     * Save completed lectures list
     * @param {Array} lectures - Array of lecture IDs
     * @returns {boolean} Success status
     */
    saveCompletedLectures(lectures) {
        const data = Array.isArray(lectures) ? lectures : [];
        return this._set(this.KEYS.COMPLETED_LECTURES, data);
    }

    /**
     * Load completed lectures list
     * @returns {Array} Array of lecture IDs
     */
    loadCompletedLectures() {
        const data = this._get(this.KEYS.COMPLETED_LECTURES);
        return Array.isArray(data) ? data : [...this.DEFAULTS.completedLectures];
    }

    /**
     * Add a lecture to completed list
     * @param {string} lectureId - Lecture ID
     * @returns {boolean} Success status
     */
    addCompletedLecture(lectureId) {
        const completed = this.loadCompletedLectures();
        if (!completed.includes(lectureId)) {
            completed.push(lectureId);
            return this.saveCompletedLectures(completed);
        }
        return true;
    }

    /**
     * Remove a lecture from completed list
     * @param {string} lectureId - Lecture ID
     * @returns {boolean} Success status
     */
    removeCompletedLecture(lectureId) {
        const completed = this.loadCompletedLectures();
        const index = completed.indexOf(lectureId);
        if (index > -1) {
            completed.splice(index, 1);
            return this.saveCompletedLectures(completed);
        }
        return true;
    }

    /**
     * Check if a lecture is completed
     * @param {string} lectureId - Lecture ID
     * @returns {boolean} True if completed
     */
    isLectureCompleted(lectureId) {
        const completed = this.loadCompletedLectures();
        return completed.includes(lectureId);
    }

    // ── Exam History ───────────────────────────────────────────

    /**
     * Save exam history
     * @param {Array} history - Array of exam result objects
     * @returns {boolean} Success status
     */
    saveExamHistory(history) {
        const data = Array.isArray(history) ? history : [];
        return this._set(this.KEYS.EXAM_HISTORY, data);
    }

    /**
     * Load exam history
     * @returns {Array} Array of exam result objects
     */
    loadExamHistory() {
        const data = this._get(this.KEYS.EXAM_HISTORY);
        return Array.isArray(data) ? data : [...this.DEFAULTS.examHistory];
    }

    /**
     * Add an exam result to history
     * @param {Object} result - Exam result object
     * @returns {boolean} Success status
     */
    addExamResult(result) {
        const history = this.loadExamHistory();
        const entry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ...result
        };
        history.unshift(entry); // Add to beginning
        // Keep only last 100 entries
        if (history.length > 100) {
            history.splice(100);
        }
        return this.saveExamHistory(history);
    }

    /**
     * Get exam history for a specific lecture
     * @param {string} lectureId - Lecture ID
     * @returns {Array} Filtered exam history
     */
    getExamHistoryByLecture(lectureId) {
        const history = this.loadExamHistory();
        return history.filter(entry => entry.lectureId === lectureId);
    }

    /**
     * Get latest exam result for a lecture
     * @param {string} lectureId - Lecture ID
     * @returns {Object|null} Latest result or null
     */
    getLatestExamResult(lectureId) {
        const history = this.getExamHistoryByLecture(lectureId);
        return history.length > 0 ? history[0] : null;
    }

    // ── Favorites ──────────────────────────────────────────────

    /**
     * Save favorite questions
     * @param {Array} favorites - Array of question IDs
     * @returns {boolean} Success status
     */
    saveFavorites(favorites) {
        const data = Array.isArray(favorites) ? favorites : [];
        return this._set(this.KEYS.FAVORITES, data);
    }

    /**
     * Load favorite questions
     * @returns {Array} Array of question IDs
     */
    loadFavorites() {
        const data = this._get(this.KEYS.FAVORITES);
        return Array.isArray(data) ? data : [...this.DEFAULTS.favorites];
    }

    /**
     * Add a question to favorites
     * @param {string} questionId - Question ID
     * @returns {boolean} Success status
     */
    addFavorite(questionId) {
        const favorites = this.loadFavorites();
        if (!favorites.includes(questionId)) {
            favorites.push(questionId);
            return this.saveFavorites(favorites);
        }
        return true;
    }

    /**
     * Remove a question from favorites
     * @param {string} questionId - Question ID
     * @returns {boolean} Success status
     */
    removeFavorite(questionId) {
        const favorites = this.loadFavorites();
        const index = favorites.indexOf(questionId);
        if (index > -1) {
            favorites.splice(index, 1);
            return this.saveFavorites(favorites);
        }
        return true;
    }

    /**
     * Toggle favorite status
     * @param {string} questionId - Question ID
     * @returns {boolean} New favorite status
     */
    toggleFavorite(questionId) {
        const favorites = this.loadFavorites();
        const index = favorites.indexOf(questionId);
        if (index > -1) {
            favorites.splice(index, 1);
            this.saveFavorites(favorites);
            return false;
        } else {
            favorites.push(questionId);
            this.saveFavorites(favorites);
            return true;
        }
    }

    /**
     * Check if a question is favorited
     * @param {string} questionId - Question ID
     * @returns {boolean} True if favorited
     */
    isFavorite(questionId) {
        const favorites = this.loadFavorites();
        return favorites.includes(questionId);
    }

    // ── Attempted Questions ────────────────────────────────────

    /**
     * Save attempted questions
     * @param {Array} attempted - Array of question IDs
     * @returns {boolean} Success status
     */
    saveAttemptedQuestions(attempted) {
        const data = Array.isArray(attempted) ? attempted : [];
        return this._set(this.KEYS.ATTEMPTED_QUESTIONS, data);
    }

    /**
     * Load attempted questions
     * @returns {Array} Array of question IDs
     */
    loadAttemptedQuestions() {
        const data = this._get(this.KEYS.ATTEMPTED_QUESTIONS);
        return Array.isArray(data) ? data : [...this.DEFAULTS.attemptedQuestions];
    }

    /**
     * Mark a question as attempted
     * @param {string} questionId - Question ID
     * @returns {boolean} Success status
     */
    markQuestionAttempted(questionId) {
        const attempted = this.loadAttemptedQuestions();
        if (!attempted.includes(questionId)) {
            attempted.push(questionId);
            return this.saveAttemptedQuestions(attempted);
        }
        return true;
    }

    /**
     * Check if a question has been attempted
     * @param {string} questionId - Question ID
     * @returns {boolean} True if attempted
     */
    isQuestionAttempted(questionId) {
        const attempted = this.loadAttemptedQuestions();
        return attempted.includes(questionId);
    }

    // ── Theme Preference ───────────────────────────────────────

    /**
     * Save theme preference
     * @param {string} theme - 'dark' or 'light'
     * @returns {boolean} Success status
     */
    saveThemePreference(theme) {
        return this._set(this.KEYS.THEME_PREFERENCE, theme);
    }

    /**
     * Load theme preference
     * @returns {string} 'dark' or 'light' (defaults to 'light')
     */
    loadThemePreference() {
        const data = this._get(this.KEYS.THEME_PREFERENCE);
        if (data === 'dark' || data === 'light') {
            return data;
        }
        return 'light';
    }

    // ── User Settings ──────────────────────────────────────────

    /**
     * Save user settings
     * @param {Object} settings - Settings object
     * @returns {boolean} Success status
     */
    saveUserSettings(settings) {
        const merged = this._mergeWithDefaults(settings, this.DEFAULTS.userSettings);
        return this._set(this.KEYS.USER_SETTINGS, merged);
    }

    /**
     * Load user settings
     * @returns {Object} User settings
     */
    loadUserSettings() {
        const data = this._get(this.KEYS.USER_SETTINGS);
        return this._mergeWithDefaults(data, this.DEFAULTS.userSettings);
    }

    /**
     * Update specific settings
     * @param {Object} updates - Fields to update
     * @returns {boolean} Success status
     */
    updateUserSettings(updates) {
        const current = this.loadUserSettings();
        const updated = { ...current, ...updates };
        return this.saveUserSettings(updated);
    }

    // ── Statistics ─────────────────────────────────────────────

    /**
     * Save statistics data
     * @param {Object} stats - Statistics data
     * @returns {boolean} Success status
     */
    saveStatistics(stats) {
        const merged = this._mergeWithDefaults(stats, this.DEFAULTS.statistics);
        return this._set(this.KEYS.STATISTICS, merged);
    }

    /**
     * Load statistics data
     * @returns {Object} Statistics data
     */
    loadStatistics() {
        const data = this._get(this.KEYS.STATISTICS);
        return this._mergeWithDefaults(data, this.DEFAULTS.statistics);
    }

    /**
     * Update specific statistics
     * @param {Object} updates - Fields to update
     * @returns {boolean} Success status
     */
    updateStatistics(updates) {
        const current = this.loadStatistics();
        const updated = { ...current, ...updates };
        return this.saveStatistics(updated);
    }

    // ── Study Questions ────────────────────────────────────────

    /**
     * Save study questions state
     * @param {Object} state - Study questions state
     * @returns {boolean} Success status
     */
    saveStudyQuestions(state) {
        const data = {
            favorites: state.favorites || [],
            attempted: state.attempted || []
        };
        return this._set(this.KEYS.STUDY_QUESTIONS, data);
    }

    /**
     * Load study questions state
     * @returns {Object} Study questions state
     */
    loadStudyQuestions() {
        const data = this._get(this.KEYS.STUDY_QUESTIONS);
        if (data && typeof data === 'object') {
            return {
                favorites: Array.isArray(data.favorites) ? data.favorites : [],
                attempted: Array.isArray(data.attempted) ? data.attempted : []
            };
        }
        return {
            favorites: [],
            attempted: []
        };
    }

    // ── Notifications ──────────────────────────────────────────

    /**
     * Save notifications
     * @param {Array} notifications - Array of notification objects
     * @returns {boolean} Success status
     */
    saveNotifications(notifications) {
        const data = Array.isArray(notifications) ? notifications : [];
        return this._set(this.KEYS.NOTIFICATIONS, data);
    }

    /**
     * Load notifications
     * @returns {Array} Array of notification objects
     */
    loadNotifications() {
        const data = this._get(this.KEYS.NOTIFICATIONS);
        return Array.isArray(data) ? data : [...this.DEFAULTS.notifications];
    }

    /**
     * Add a notification
     * @param {Object} notification - Notification object
     * @returns {boolean} Success status
     */
    addNotification(notification) {
        const notifications = this.loadNotifications();
        const entry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            read: false,
            ...notification
        };
        notifications.unshift(entry);
        if (notifications.length > 100) {
            notifications.splice(100);
        }
        return this.saveNotifications(notifications);
    }

    /**
     * Mark notification as read
     * @param {number} notificationId - Notification ID
     * @returns {boolean} Success status
     */
    markNotificationRead(notificationId) {
        const notifications = this.loadNotifications();
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            return this.saveNotifications(notifications);
        }
        return true;
    }

    /**
     * Mark all notifications as read
     * @returns {boolean} Success status
     */
    markAllNotificationsRead() {
        const notifications = this.loadNotifications();
        notifications.forEach(n => n.read = true);
        return this.saveNotifications(notifications);
    }

    /**
     * Get unread notification count
     * @returns {number} Unread count
     */
    getUnreadNotificationCount() {
        const notifications = this.loadNotifications();
        return notifications.filter(n => !n.read).length;
    }

    // ── Last Activity ──────────────────────────────────────────

    /**
     * Save last activity timestamp
     * @param {string} timestamp - ISO timestamp
     * @returns {boolean} Success status
     */
    saveLastActivity(timestamp) {
        return this._set(this.KEYS.LAST_ACTIVITY, timestamp);
    }

    /**
     * Load last activity timestamp
     * @returns {string|null} ISO timestamp or null
     */
    loadLastActivity() {
        return this._get(this.KEYS.LAST_ACTIVITY, null);
    }

    /**
     * Update last activity to now
     * @returns {string} Current timestamp
     */
    updateLastActivity() {
        const now = new Date().toISOString();
        this.saveLastActivity(now);
        return now;
    }

    // ── State Snapshot ─────────────────────────────────────────

    /**
     * Save a complete state snapshot
     * @param {Object} state - Complete state object
     * @returns {boolean} Success status
     */
    saveStateSnapshot(state) {
        return this._set(this.KEYS.STATE_SNAPSHOT, state);
    }

    /**
     * Load state snapshot
     * @returns {Object|null} State snapshot or null
     */
    loadStateSnapshot() {
        return this._get(this.KEYS.STATE_SNAPSHOT, null);
    }

    // ── Utility Functions ──────────────────────────────────────

    /**
     * Get all storage keys (excluding test keys)
     * @returns {Array} Array of storage keys
     */
    getAllKeys() {
        if (!this._isAvailable) {
            return [];
        }
        try {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && !key.startsWith('__')) {
                    keys.push(key);
                }
            }
            return keys;
        } catch (error) {
            console.warn('Failed to get storage keys:', error);
            return [];
        }
    }

    /**
     * Get storage usage information
     * @returns {Object} Usage info
     */
    getStorageInfo() {
        if (!this._isAvailable) {
            return { available: false, used: 0, total: 0, percentage: 0 };
        }

        try {
            let total = 0;
            const keys = this.getAllKeys();
            for (const key of keys) {
                const value = localStorage.getItem(key);
                total += value ? value.length * 2 : 0; // UTF-16 uses 2 bytes per character
            }
            // Most browsers limit to ~5MB (5,242,880 bytes)
            const limit = 5 * 1024 * 1024;
            return {
                available: true,
                used: total,
                total: limit,
                percentage: (total / limit) * 100,
                keys: keys.length
            };
        } catch (error) {
            console.warn('Failed to get storage info:', error);
            return { available: true, used: 0, total: 0, percentage: 0 };
        }
    }

    /**
     * Reset all application data
     * @param {boolean} confirm - Require confirmation
     * @returns {boolean} Success status
     */
    resetAllData(confirm = false) {
        if (!confirm) {
            console.warn('Data reset requires confirmation');
            return false;
        }

        if (!this._isAvailable) {
            return false;
        }

        try {
            const keys = Object.values(this.KEYS);
            for (const key of keys) {
                localStorage.removeItem(key);
            }
            return true;
        } catch (error) {
            console.warn('Failed to reset all data:', error);
            return false;
        }
    }

    /**
     * Export all application data as JSON
     * @returns {Object} Complete data export
     */
    exportAllData() {
        if (!this._isAvailable) {
            return null;
        }

        const data = {};
        const keys = Object.values(this.KEYS);
        for (const key of keys) {
            data[key] = this._get(key, null);
        }
        data._exportedAt = new Date().toISOString();
        data._version = '1.0.0';
        return data;
    }

    /**
     * Import application data from JSON
     * @param {Object} data - Data to import
     * @param {boolean} overwrite - Overwrite existing data
     * @returns {boolean} Success status
     */
    importAllData(data, overwrite = false) {
        if (!this._isAvailable || !data || typeof data !== 'object') {
            return false;
        }

        try {
            for (const [key, value] of Object.entries(data)) {
                if (key.startsWith('_')) continue;
                if (Object.values(this.KEYS).includes(key)) {
                    if (overwrite || this._get(key, null) === null) {
                        this._set(key, value);
                    }
                }
            }
            return true;
        } catch (error) {
            console.warn('Failed to import data:', error);
            return false;
        }
    }

    /**
     * Clear expired or old data
     * @param {number} maxAge - Maximum age in days
     * @returns {boolean} Success status
     */
    clearOldData(maxAge = 30) {
        if (!this._isAvailable) {
            return false;
        }

        try {
            const now = Date.now();
            const maxAgeMs = maxAge * 24 * 60 * 60 * 1000;

            // Clear old exam history
            const history = this.loadExamHistory();
            const filteredHistory = history.filter(entry => {
                const entryDate = new Date(entry.timestamp).getTime();
                return now - entryDate < maxAgeMs;
            });
            this.saveExamHistory(filteredHistory);

            // Clear old notifications
            const notifications = this.loadNotifications();
            const filteredNotifications = notifications.filter(entry => {
                const entryDate = new Date(entry.timestamp).getTime();
                return now - entryDate < maxAgeMs;
            });
            this.saveNotifications(filteredNotifications);

            return true;
        } catch (error) {
            console.warn('Failed to clear old data:', error);
            return false;
        }
    }
}

/**
 * Create and export a singleton instance
 */
const storage = new StorageManager();

// Freeze the storage object
Object.freeze(storage);

// Export the storage manager
export default storage;
