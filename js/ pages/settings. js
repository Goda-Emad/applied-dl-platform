/**
 * ============================================================
 * js/pages/settings.js — Settings Page Controller
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Settings Page Controller
 * 
 * Manages user preferences and application settings.
 * Supports appearance, exam preferences, study preferences, and data management.
 */

import state from '../core/state.js';
import storage from '../core/storage.js';
import eventBus from '../core/event-bus.js';
import router from '../core/router.js';
import Modal from '../components/modal.js';
import Toast from '../components/toast.js';

class SettingsPage {
    constructor() {
        // DOM elements
        this._elements = {
            container: null,
            appearanceSection: null,
            examSection: null,
            studySection: null,
            dataSection: null,
            loadingIndicator: null
        };
        
        // Settings state
        this._settings = {
            // Appearance
            theme: 'light',
            fontSize: 'medium',
            compactMode: false,
            highContrast: false,
            showAnimations: true,
            
            // Exam Preferences
            defaultQuestionCount: 10,
            defaultDifficulty: 'all',
            timerEnabled: true,
            confirmBeforeSubmit: true,
            
            // Study Preferences
            showExplanations: true,
            autoSaveProgress: true,
            defaultSort: 'date',
            
            // Data Management
            lastCleared: null
        };
        
        // State
        this._initialized = false;
        this._isLoading = false;
        
        // Bind methods
        this._handleSettingChange = this._handleSettingChange.bind(this);
        this._handleReset = this._handleReset.bind(this);
        this._handleClearData = this._handleClearData.bind(this);
        this._handleStateChange = this._handleStateChange.bind(this);
        
        // Initialize
        this._init();
    }

    /**
     * Initialize the settings page
     */
    async _init() {
        if (this._initialized) return;
        
        // Get container
        this._elements.container = document.querySelector('#settings-container');
        if (!this._elements.container) {
            console.warn('Settings container not found');
            return;
        }
        
        // Cache DOM elements
        this._cacheElements();
        
        // Load settings
        await this._loadSettings();
        
        // Render
        this._render();
        
        // Setup event listeners
        this._setupEventListeners();
        
        this._initialized = true;
        console.log('Settings page initialized');
    }

    /**
     * Cache DOM elements
     */
    _cacheElements() {
        this._elements.appearanceSection = this._elements.container.querySelector('.settings-appearance');
        this._elements.examSection = this._elements.container.querySelector('.settings-exam');
        this._elements.studySection = this._elements.container.querySelector('.settings-study');
        this._elements.dataSection = this._elements.container.querySelector('.settings-data');
        this._elements.loadingIndicator = this._elements.container.querySelector('.loading-indicator');
    }

    /**
     * Load settings from storage
     */
    async _loadSettings() {
        this._isLoading = true;
        this._showLoading(true);
        
        try {
            // Load user settings from storage
            const saved = storage.loadUserSettings();
            
            // Load theme preference
            const theme = storage.loadThemePreference();
            
            // Merge with defaults
            this._settings = {
                ...this._settings,
                ...saved,
                theme: theme || saved.theme || 'light'
            };
            
            // Apply theme to document
            this._applyTheme(this._settings.theme);
            
            // Update state
            state.set('ui.theme', this._settings.theme);
            state.set('ui.fontSize', this._settings.fontSize);
            state.set('ui.compactMode', this._settings.compactMode);
            state.set('ui.highContrast', this._settings.highContrast);
            state.set('ui.showAnimations', this._settings.showAnimations);
            
            console.log('Settings loaded');
            
        } catch (error) {
            console.error('Error loading settings:', error);
            Toast.error('Failed to load settings. Using defaults.');
        } finally {
            this._isLoading = false;
            this._showLoading(false);
        }
    }

    /**
     * Render the settings page
     */
    _render() {
        if (!this._elements.container) return;
        
        // Render appearance section
        this._renderAppearance();
        
        // Render exam preferences
        this._renderExamPreferences();
        
        // Render study preferences
        this._renderStudyPreferences();
        
        // Render data management
        this._renderDataManagement();
    }

    /**
     * Render appearance section
     */
    _renderAppearance() {
        const section = this._elements.appearanceSection;
        if (!section) return;
        
        const { theme, fontSize, compactMode, highContrast, showAnimations } = this._settings;
        
        section.innerHTML = `
            <div class="settings-section">
                <h2 class="settings-section-title">🎨 Appearance</h2>
                <p class="settings-section-description">Customize the look and feel of the application.</p>
                
                <div class="settings-group">
                    <label class="settings-label">Theme</label>
                    <div class="settings-options">
                        <button class="settings-option ${theme === 'light' ? 'active' : ''}" data-setting="theme" data-value="light">
                            ☀️ Light
                        </button>
                        <button class="settings-option ${theme === 'dark' ? 'active' : ''}" data-setting="theme" data-value="dark">
                            🌙 Dark
                        </button>
                        <button class="settings-option ${theme === 'system' ? 'active' : ''}" data-setting="theme" data-value="system">
                            💻 System
                        </button>
                    </div>
                </div>
                
                <div class="settings-group">
                    <label class="settings-label">Font Size</label>
                    <div class="settings-options">
                        <button class="settings-option ${fontSize === 'small' ? 'active' : ''}" data-setting="fontSize" data-value="small">
                            Small
                        </button>
                        <button class="settings-option ${fontSize === 'medium' ? 'active' : ''}" data-setting="fontSize" data-value="medium">
                            Medium
                        </button>
                        <button class="settings-option ${fontSize === 'large' ? 'active' : ''}" data-setting="fontSize" data-value="large">
                            Large
                        </button>
                    </div>
                </div>
                
                <div class="settings-group">
                    <label class="settings-label">Display Options</label>
                    <div class="settings-toggle">
                        <label class="toggle-label">
                            <input type="checkbox" class="settings-toggle-input" data-setting="compactMode" ${compactMode ? 'checked' : ''} />
                            <span class="toggle-slider"></span>
                            <span class="toggle-text">Compact Mode</span>
                        </label>
                    </div>
                    <div class="settings-toggle">
                        <label class="toggle-label">
                            <input type="checkbox" class="settings-toggle-input" data-setting="highContrast" ${highContrast ? 'checked' : ''} />
                            <span class="toggle-slider"></span>
                            <span class="toggle-text">High Contrast</span>
                        </label>
                    </div>
                    <div class="settings-toggle">
                        <label class="toggle-label">
                            <input type="checkbox" class="settings-toggle-input" data-setting="showAnimations" ${showAnimations ? 'checked' : ''} />
                            <span class="toggle-slider"></span>
                            <span class="toggle-text">Show Animations</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
        
        // Attach events
        this._attachSettingEvents(section);
    }

    /**
     * Render exam preferences section
     */
    _renderExamPreferences() {
        const section = this._elements.examSection;
        if (!section) return;
        
        const { defaultQuestionCount, defaultDifficulty, timerEnabled, confirmBeforeSubmit } = this._settings;
        
        section.innerHTML = `
            <div class="settings-section">
                <h2 class="settings-section-title">📋 Exam Preferences</h2>
                <p class="settings-section-description">Configure your default exam settings.</p>
                
                <div class="settings-group">
                    <label class="settings-label">Default Number of Questions</label>
                    <div class="settings-options">
                        <button class="settings-option ${defaultQuestionCount === 10 ? 'active' : ''}" data-setting="defaultQuestionCount" data-value="10">
                            10
                        </button>
                        <button class="settings-option ${defaultQuestionCount === 20 ? 'active' : ''}" data-setting="defaultQuestionCount" data-value="20">
                            20
                        </button>
                        <button class="settings-option ${defaultQuestionCount === 30 ? 'active' : ''}" data-setting="defaultQuestionCount" data-value="30">
                            30
                        </button>
                        <button class="settings-option ${defaultQuestionCount === 50 ? 'active' : ''}" data-setting="defaultQuestionCount" data-value="50">
                            50
                        </button>
                        <button class="settings-option ${defaultQuestionCount === 'all' ? 'active' : ''}" data-setting="defaultQuestionCount" data-value="all">
                            All
                        </button>
                    </div>
                </div>
                
                <div class="settings-group">
                    <label class="settings-label">Default Difficulty</label>
                    <div class="settings-options">
                        <button class="settings-option ${defaultDifficulty === 'all' ? 'active' : ''}" data-setting="defaultDifficulty" data-value="all">
                            All
                        </button>
                        <button class="settings-option ${defaultDifficulty === 'easy' ? 'active' : ''}" data-setting="defaultDifficulty" data-value="easy">
                            Easy
                        </button>
                        <button class="settings-option ${defaultDifficulty === 'medium' ? 'active' : ''}" data-setting="defaultDifficulty" data-value="medium">
                            Medium
                        </button>
                        <button class="settings-option ${defaultDifficulty === 'hard' ? 'active' : ''}" data-setting="defaultDifficulty" data-value="hard">
                            Hard
                        </button>
                        <button class="settings-option ${defaultDifficulty === 'expert' ? 'active' : ''}" data-setting="defaultDifficulty" data-value="expert">
                            Expert
                        </button>
                    </div>
                </div>
                
                <div class="settings-group">
                    <label class="settings-label">Timer & Confirmation</label>
                    <div class="settings-toggle">
                        <label class="toggle-label">
                            <input type="checkbox" class="settings-toggle-input" data-setting="timerEnabled" ${timerEnabled ? 'checked' : ''} />
                            <span class="toggle-slider"></span>
                            <span class="toggle-text">Enable Timer in Exams</span>
                        </label>
                    </div>
                    <div class="settings-toggle">
                        <label class="toggle-label">
                            <input type="checkbox" class="settings-toggle-input" data-setting="confirmBeforeSubmit" ${confirmBeforeSubmit ? 'checked' : ''} />
                            <span class="toggle-slider"></span>
                            <span class="toggle-text">Confirm Before Submitting Exam</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
        
        // Attach events
        this._attachSettingEvents(section);
    }

    /**
     * Render study preferences section
     */
    _renderStudyPreferences() {
        const section = this._elements.studySection;
        if (!section) return;
        
        const { showExplanations, autoSaveProgress, defaultSort } = this._settings;
        
        section.innerHTML = `
            <div class="settings-section">
                <h2 class="settings-section-title">📚 Study Preferences</h2>
                <p class="settings-section-description">Configure your study and practice settings.</p>
                
                <div class="settings-group">
                    <label class="settings-label">Default Sort</label>
                    <div class="settings-options">
                        <button class="settings-option ${defaultSort === 'date' ? 'active' : ''}" data-setting="defaultSort" data-value="date">
                            📅 Date
                        </button>
                        <button class="settings-option ${defaultSort === 'difficulty' ? 'active' : ''}" data-setting="defaultSort" data-value="difficulty">
                            📊 Difficulty
                        </button>
                        <button class="settings-option ${defaultSort === 'topic' ? 'active' : ''}" data-setting="defaultSort" data-value="topic">
                            📂 Topic
                        </button>
                        <button class="settings-option ${defaultSort === 'source' ? 'active' : ''}" data-setting="defaultSort" data-value="source">
                            📚 Source
                        </button>
                    </div>
                </div>
                
                <div class="settings-group">
                    <label class="settings-label">Study Options</label>
                    <div class="settings-toggle">
                        <label class="toggle-label">
                            <input type="checkbox" class="settings-toggle-input" data-setting="showExplanations" ${showExplanations ? 'checked' : ''} />
                            <span class="toggle-slider"></span>
                            <span class="toggle-text">Show Explanations in Practice Mode</span>
                        </label>
                    </div>
                    <div class="settings-toggle">
                        <label class="toggle-label">
                            <input type="checkbox" class="settings-toggle-input" data-setting="autoSaveProgress" ${autoSaveProgress ? 'checked' : ''} />
                            <span class="toggle-slider"></span>
                            <span class="toggle-text">Auto-Save Progress</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
        
        // Attach events
        this._attachSettingEvents(section);
    }

    /**
     * Render data management section
     */
    _renderDataManagement() {
        const section = this._elements.dataSection;
        if (!section) return;
        
        const progress = storage.loadUserProgress();
        const history = storage.loadExamHistory();
        const favorites = storage.loadFavorites();
        const completed = storage.loadCompletedLectures();
        
        section.innerHTML = `
            <div class="settings-section">
                <h2 class="settings-section-title">💾 Data Management</h2>
                <p class="settings-section-description">Manage your stored data and progress.</p>
                
                <div class="settings-group">
                    <div class="settings-data-stats">
                        <div class="data-stat">
                            <span class="data-stat-value">${completed.length}</span>
                            <span class="data-stat-label">Completed Lectures</span>
                        </div>
                        <div class="data-stat">
                            <span class="data-stat-value">${progress.totalQuestionsAttempted || 0}</span>
                            <span class="data-stat-label">Questions Attempted</span>
                        </div>
                        <div class="data-stat">
                            <span class="data-stat-value">${favorites.length}</span>
                            <span class="data-stat-label">Bookmarks</span>
                        </div>
                        <div class="data-stat">
                            <span class="data-stat-value">${history.length}</span>
                            <span class="data-stat-label">Exam History</span>
                        </div>
                    </div>
                </div>
                
                <div class="settings-group">
                    <label class="settings-label">Actions</label>
                    <div class="settings-actions">
                        <button class="settings-action-btn settings-action-danger" data-action="reset-progress">
                            🔄 Reset Progress
                        </button>
                        <button class="settings-action-btn settings-action-danger" data-action="clear-history">
                            🗑️ Clear Exam History
                        </button>
                        <button class="settings-action-btn settings-action-danger" data-action="clear-bookmarks">
                            ⭐ Clear Bookmarks
                        </button>
                        <button class="settings-action-btn settings-action-danger" data-action="reset-all">
                            ⚠️ Reset All Data
                        </button>
                    </div>
                </div>
                
                <div class="settings-group">
                    <label class="settings-label">Storage Info</label>
                    <div class="settings-storage-info">
                        <span class="storage-info-text">${this._getStorageInfo()}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Attach events
        section.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', this._handleDataAction.bind(this));
        });
    }

    /**
     * Attach setting events to a section
     * @param {HTMLElement} section - Section element
     */
    _attachSettingEvents(section) {
        // Button options
        section.querySelectorAll('.settings-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const setting = e.currentTarget.dataset.setting;
                const value = e.currentTarget.dataset.value;
                this._handleSettingChange(setting, value);
            });
        });
        
        // Toggle switches
        section.querySelectorAll('.settings-toggle-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const setting = e.currentTarget.dataset.setting;
                const value = e.currentTarget.checked;
                this._handleSettingChange(setting, value);
            });
        });
    }

    /**
     * Handle setting change
     * @param {string} setting - Setting name
     * @param {*} value - New value
     */
    _handleSettingChange(setting, value) {
        // Update settings
        this._settings[setting] = value;
        
        // Handle specific settings
        switch (setting) {
            case 'theme':
                this._applyTheme(value);
                storage.saveThemePreference(value);
                eventBus.emit('theme.changed', value);
                break;
            case 'fontSize':
                this._applyFontSize(value);
                break;
            case 'compactMode':
                document.documentElement.classList.toggle('compact-mode', value);
                break;
            case 'highContrast':
                document.documentElement.classList.toggle('high-contrast', value);
                break;
            case 'showAnimations':
                document.documentElement.classList.toggle('reduce-animations', !value);
                break;
            default:
                // General setting
                break;
        }
        
        // Update state
        state.set(`ui.${setting}`, value);
        
        // Save settings
        this._saveSettings();
        
        // Emit event
        eventBus.emit('settings.updated', { setting, value });
        
        // Show feedback
        Toast.success(`${this._getSettingLabel(setting)} updated`);
        
        // Re-render the specific section to update UI
        this._render();
    }

    /**
     * Handle data management actions
     * @param {Event} e - Click event
     */
    _handleDataAction(e) {
        const action = e.currentTarget.dataset.action;
        
        switch (action) {
            case 'reset-progress':
                this._handleReset();
                break;
            case 'clear-history':
                this._handleClearData('history');
                break;
            case 'clear-bookmarks':
                this._handleClearData('bookmarks');
                break;
            case 'reset-all':
                this._handleClearData('all');
                break;
        }
    }

    /**
     * Handle reset progress
     */
    _handleReset() {
        const modal = new Modal.confirm({
            title: 'Reset Progress',
            message: 'Are you sure you want to reset all your progress?',
            detail: 'This will remove all completed lectures, exam history, and progress statistics.',
            confirmText: 'Reset Progress',
            confirmType: 'danger',
            onConfirm: () => {
                // Reset progress
                storage.saveUserProgress({
                    totalQuestionsAttempted: 0,
                    correctAnswers: 0,
                    wrongAnswers: 0,
                    skippedQuestions: 0,
                    accuracy: 0,
                    streak: 0,
                    bestStreak: 0,
                    studyTime: 0
                });
                storage.saveCompletedLectures([]);
                storage.saveExamHistory([]);
                
                // Update state
                state.reset('progress');
                state.reset('lectures.completed');
                
                Toast.success('Progress has been reset');
                this._render();
                eventBus.emit('data.reset', { type: 'progress' });
            }
        });
        modal.open();
    }

    /**
     * Handle clear data
     * @param {string} type - Data type to clear
     */
    _handleClearData(type) {
        let title, message, detail, confirmText;
        
        switch (type) {
            case 'history':
                title = 'Clear Exam History';
                message = 'Are you sure you want to clear all exam history?';
                detail = 'This action cannot be undone. Your progress statistics will be preserved.';
                confirmText = 'Clear History';
                break;
            case 'bookmarks':
                title = 'Clear Bookmarks';
                message = 'Are you sure you want to clear all bookmarks?';
                detail = 'This action cannot be undone. All bookmarked questions will be removed.';
                confirmText = 'Clear Bookmarks';
                break;
            case 'all':
                title = 'Reset All Data';
                message = 'Are you sure you want to reset ALL application data?';
                detail = 'This will permanently delete all progress, exam history, bookmarks, and settings. This action cannot be undone!';
                confirmText = 'Reset Everything';
                break;
        }
        
        const modal = new Modal.confirm({
            title,
            message,
            detail,
            confirmText,
            confirmType: 'danger',
            onConfirm: () => {
                switch (type) {
                    case 'history':
                        storage.saveExamHistory([]);
                        Toast.success('Exam history cleared');
                        break;
                    case 'bookmarks':
                        storage.saveFavorites([]);
                        const studyState = storage.loadStudyQuestions();
                        studyState.favorites = [];
                        storage.saveStudyQuestions(studyState);
                        Toast.success('Bookmarks cleared');
                        break;
                    case 'all':
                        storage.resetAllData(true);
                        Toast.success('All data has been reset');
                        // Reload page to reset everything
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                        break;
                }
                
                this._render();
                eventBus.emit('data.cleared', { type });
            }
        });
        modal.open();
    }

    /**
     * Save settings to storage
     */
    _saveSettings() {
        const settings = { ...this._settings };
        // Don't save theme separately as it's handled by storage.saveThemePreference
        const { theme, ...rest } = settings;
        storage.saveUserSettings(rest);
        
        // Emit event
        eventBus.emit('settings.saved', settings);
    }

    /**
     * Apply theme
     * @param {string} theme - 'light', 'dark', or 'system'
     */
    _applyTheme(theme) {
        let effectiveTheme = theme;
        
        if (theme === 'system') {
            effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        
        if (effectiveTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        
        this._settings.theme = theme;
        state.set('ui.theme', effectiveTheme);
    }

    /**
     * Apply font size
     * @param {string} size - 'small', 'medium', or 'large'
     */
    _applyFontSize(size) {
        const sizes = {
            small: '14px',
            medium: '16px',
            large: '18px'
        };
        document.documentElement.style.fontSize = sizes[size] || '16px';
    }

    /**
     * Get storage info
     * @returns {string} Storage info text
     */
    _getStorageInfo() {
        try {
            const info = storage.getStorageInfo();
            if (info.available) {
                const usedMB = (info.used / (1024 * 1024)).toFixed(2);
                const totalMB = (info.total / (1024 * 1024)).toFixed(2);
                return `📊 ${usedMB} MB / ${totalMB} MB used (${info.percentage.toFixed(1)}%)`;
            }
            return 'Storage not available';
        } catch (error) {
            return 'Storage info not available';
        }
    }

    /**
     * Get setting label for feedback
     * @param {string} setting - Setting name
     * @returns {string} Human-readable label
     */
    _getSettingLabel(setting) {
        const labels = {
            theme: 'Theme',
            fontSize: 'Font size',
            compactMode: 'Compact mode',
            highContrast: 'High contrast',
            showAnimations: 'Animations',
            defaultQuestionCount: 'Default question count',
            defaultDifficulty: 'Default difficulty',
            timerEnabled: 'Timer',
            confirmBeforeSubmit: 'Confirmation before submit',
            showExplanations: 'Explanations',
            autoSaveProgress: 'Auto-save',
            defaultSort: 'Default sort'
        };
        return labels[setting] || setting;
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
        
        // Theme changes from other components
        eventBus.on('theme.changed', (theme) => {
            if (theme !== this._settings.theme) {
                this._settings.theme = theme;
                this._render();
            }
        });
        
        // System theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (this._settings.theme === 'system') {
                this._applyTheme('system');
            }
        });
    }

    /**
     * Handle state changes
     */
    _handleStateChange() {
        // Check if settings changed elsewhere
        const uiState = state.get('ui');
        if (uiState) {
            // Sync with state if needed
        }
    }

    /**
     * Get all settings
     * @returns {Object} Settings object
     */
    getSettings() {
        return { ...this._settings };
    }

    /**
     * Get a specific setting
     * @param {string} key - Setting key
     * @returns {*} Setting value
     */
    getSetting(key) {
        return this._settings[key];
    }

    /**
     * Update a setting programmatically
     * @param {string} key - Setting key
     * @param {*} value - New value
     */
    updateSetting(key, value) {
        this._handleSettingChange(key, value);
    }

    /**
     * Destroy the settings page
     */
    destroy() {
        // Clear event listeners
        eventBus.off('state.updated', this._handleStateChange);
        eventBus.off('theme.changed', this._handleThemeChange);
        
        this._initialized = false;
        console.log('Settings page destroyed');
    }
}

/**
 * Create and export the settings page instance
 */
const settingsPage = new SettingsPage();

// Export the settings page
export default settingsPage;
