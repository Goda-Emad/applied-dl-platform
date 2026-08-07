/**
 * ============================================================
 * js/components/sidebar.js — Sidebar Navigation Component
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Sidebar Component
 * 
 * Manages the sidebar navigation menu including:
 * - Toggle open/close
 * - Mobile responsive behavior
 * - Active route highlighting
 * - Navigation event handling
 * - Keyboard accessibility
 */

import state from '../core/state.js';
import storage from '../core/storage.js';
import eventBus from '../core/event-bus.js';
import router from '../core/router.js';

class Sidebar {
    constructor() {
        // DOM elements (lazy loaded)
        this._elements = {
            sidebar: null,
            toggle: null,
            backdrop: null,
            navItems: null,
            navLinks: null,
            themeToggle: null,
            settingsLink: null,
            progressIndicator: null,
            closeButton: null
        };

        // Component state
        this._isOpen = false;
        this._isMobile = window.innerWidth <= 1024;
        this._currentRoute = null;
        this._initialized = false;

        // Navigation items configuration
        this._navItems = [
            { id: 'dashboard', label: 'Dashboard', icon: '📊', route: '/dashboard' },
            { id: 'lectures', label: 'Lectures', icon: '📚', route: '/lectures' },
            { id: 'study-questions', label: 'Study Questions', icon: '📝', route: '/study-questions' },
            { id: 'progress', label: 'Progress', icon: '📈', route: '/progress' },
            { id: 'bookmarks', label: 'Bookmarks', icon: '⭐', route: '/bookmarks' },
            { id: 'settings', label: 'Settings', icon: '⚙️', route: '/settings' }
        ];

        // Bind methods
        this._handleResize = this._handleResize.bind(this);
        this._handleRouteChange = this._handleRouteChange.bind(this);
        this._handleToggle = this._handleToggle.bind(this);
        this._handleBackdrop = this._handleBackdrop.bind(this);
        this._handleNavClick = this._handleNavClick.bind(this);
        this._handleKeydown = this._handleKeydown.bind(this);
        this._handleThemeToggle = this._handleThemeToggle.bind(this);
        this._handleSettingsClick = this._handleSettingsClick.bind(this);
        this._handleOutsideClick = this._handleOutsideClick.bind(this);

        // Initialize if DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    /**
     * Initialize the sidebar component
     */
    init() {
        if (this._initialized) return;

        // Get DOM elements
        this._getElements();

        // Set initial state from saved preference
        this._loadState();

        // Setup event listeners
        this._setupEventListeners();

        // Apply active state based on current route
        this._updateActiveState(router.getCurrentRoute().path);

        // Update progress indicator
        this._updateProgress();

        // Mark as initialized
        this._initialized = true;

        console.log('Sidebar component initialized');
    }

    /**
     * Get DOM elements and cache them
     */
    _getElements() {
        this._elements.sidebar = document.querySelector('.sidebar');
        this._elements.toggle = document.querySelector('.sidebar-toggle');
        this._elements.backdrop = document.querySelector('.sidebar-backdrop');
        this._elements.navItems = document.querySelectorAll('.sidebar-nav-item');
        this._elements.navLinks = document.querySelectorAll('.sidebar-nav-link');
        this._elements.themeToggle = document.querySelector('.sidebar-theme-toggle');
        this._elements.settingsLink = document.querySelector('.sidebar-settings');
        this._elements.progressIndicator = document.querySelector('.sidebar-progress');
        this._elements.closeButton = document.querySelector('.sidebar-close');

        // If sidebar doesn't exist, create it dynamically (fallback)
        if (!this._elements.sidebar) {
            this._createSidebar();
        }
    }

    /**
     * Create sidebar dynamically if it doesn't exist in DOM
     */
    _createSidebar() {
        // This is a fallback - sidebar should exist in HTML
        console.warn('Sidebar element not found in DOM. Creating dynamically...');

        const sidebar = document.createElement('nav');
        sidebar.className = 'sidebar';
        sidebar.setAttribute('aria-label', 'Main navigation');
        sidebar.setAttribute('role', 'navigation');

        // Create sidebar content
        sidebar.innerHTML = this._generateSidebarHTML();

        // Append to body
        document.body.appendChild(sidebar);

        // Also create backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'sidebar-backdrop';
        document.body.appendChild(backdrop);

        // Re-fetch elements
        this._getElements();

        // Need to re-setup after creation
        this._setupEventListeners();
    }

    /**
     * Generate sidebar HTML
     * @returns {string} Sidebar HTML
     */
    _generateSidebarHTML() {
        const navItemsHTML = this._navItems.map(item => `
            <li class="sidebar-nav-item" data-route="${item.route}">
                <a href="${item.route}" class="sidebar-nav-link" data-route="${item.route}">
                    <span class="sidebar-nav-icon">${item.icon}</span>
                    <span class="sidebar-nav-label">${item.label}</span>
                </a>
            </li>
        `).join('');

        return `
            <div class="sidebar-header">
                <div class="sidebar-brand">
                    <span class="sidebar-brand-icon">🧠</span>
                    <span class="sidebar-brand-text">ADL Platform</span>
                </div>
                <button class="sidebar-close" aria-label="Close sidebar">
                    <span class="sidebar-close-icon">×</span>
                </button>
            </div>
            <ul class="sidebar-nav">
                ${navItemsHTML}
            </ul>
            <div class="sidebar-footer">
                <button class="sidebar-theme-toggle" aria-label="Toggle theme">
                    <span class="theme-icon">🌓</span>
                    <span class="theme-label">Toggle Theme</span>
                </button>
                <a href="/settings" class="sidebar-settings">
                    <span class="settings-icon">⚙️</span>
                    <span class="settings-label">Settings</span>
                </a>
                <div class="sidebar-progress">
                    <span class="progress-label">Progress</span>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                    <span class="progress-text">0%</span>
                </div>
            </div>
        `;
    }

    /**
     * Load saved state from storage
     */
    _loadState() {
        // Load theme preference
        const theme = storage.loadThemePreference();
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            this._updateThemeIcon('dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            this._updateThemeIcon('light');
        }

        // Load sidebar state
        const settings = storage.loadUserSettings();
        if (settings.sidebarCollapsed) {
            this.close();
        }
    }

    /**
     * Setup all event listeners
     */
    _setupEventListeners() {
        // Toggle button
        if (this._elements.toggle) {
            this._elements.toggle.addEventListener('click', this._handleToggle);
            this._elements.toggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this._handleToggle(e);
                }
            });
        }

        // Backdrop
        if (this._elements.backdrop) {
            this._elements.backdrop.addEventListener('click', this._handleBackdrop);
        }

        // Close button
        if (this._elements.closeButton) {
            this._elements.closeButton.addEventListener('click', this._handleBackdrop);
        }

        // Navigation links
        if (this._elements.navLinks && this._elements.navLinks.length > 0) {
            this._elements.navLinks.forEach(link => {
                link.addEventListener('click', this._handleNavClick);
            });
        }

        // Theme toggle
        if (this._elements.themeToggle) {
            this._elements.themeToggle.addEventListener('click', this._handleThemeToggle);
        }

        // Settings link
        if (this._elements.settingsLink) {
            this._elements.settingsLink.addEventListener('click', this._handleSettingsClick);
        }

        // Window resize
        window.addEventListener('resize', this._handleResize);

        // Route change events
        eventBus.on('routechange', this._handleRouteChange);

        // Keyboard events
        document.addEventListener('keydown', this._handleKeydown);

        // Close sidebar on outside click (for desktop)
        document.addEventListener('click', this._handleOutsideClick);

        // Storage updates
        eventBus.on('storage.progress.updated', () => {
            this._updateProgress();
        });

        // Theme changes from other components
        eventBus.on('theme.changed', (theme) => {
            this._updateThemeIcon(theme);
        });
    }

    /**
     * Handle sidebar toggle
     * @param {Event} e - Click event
     */
    _handleToggle(e) {
        e.preventDefault();
        e.stopPropagation();

        if (this._isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Handle backdrop click
     * @param {Event} e - Click event
     */
    _handleBackdrop(e) {
        e.preventDefault();
        if (this._isOpen) {
            this.close();
        }
    }

    /**
     * Handle navigation link click
     * @param {Event} e - Click event
     */
    _handleNavClick(e) {
        e.preventDefault();

        const link = e.currentTarget;
        const route = link.getAttribute('data-route');

        if (route) {
            // Update active state immediately for visual feedback
            this._updateActiveState(route);

            // Navigate
            router.navigate(route).catch(error => {
                console.error('Navigation error:', error);
                // Revert active state on error
                this._updateActiveState(router.getCurrentRoute().path);
            });

            // Close sidebar on mobile
            if (this._isMobile) {
                this.close();
            }
        }
    }

    /**
     * Handle theme toggle
     */
    _handleThemeToggle() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';

        // Update theme
        if (newTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }

        // Save preference
        storage.saveThemePreference(newTheme);

        // Update UI
        this._updateThemeIcon(newTheme);

        // Update state
        state.set('ui.theme', newTheme);

        // Emit event
        eventBus.emit('theme.changed', newTheme);
    }

    /**
     * Handle settings link click
     * @param {Event} e - Click event
     */
    _handleSettingsClick(e) {
        e.preventDefault();
        router.navigate('/settings');
        if (this._isMobile) {
            this.close();
        }
    }

    /**
     * Handle route change events
     * @param {Object} detail - Route change detail
     */
    _handleRouteChange(detail) {
        if (detail && detail.path) {
            this._updateActiveState(detail.path);
            this._currentRoute = detail.path;
        }
    }

    /**
     * Handle window resize
     */
    _handleResize() {
        const wasMobile = this._isMobile;
        this._isMobile = window.innerWidth <= 1024;

        // Auto-close when switching from mobile to desktop
        if (wasMobile && !this._isMobile && this._isOpen) {
            this.close();
        }

        // Update sidebar classes
        if (this._elements.sidebar) {
            if (this._isMobile) {
                this._elements.sidebar.classList.add('is-mobile');
            } else {
                this._elements.sidebar.classList.remove('is-mobile');
            }
        }
    }

    /**
     * Handle keyboard events
     * @param {KeyboardEvent} e - Keyboard event
     */
    _handleKeydown(e) {
        // Close sidebar with Escape key
        if (e.key === 'Escape' && this._isOpen) {
            this.close();
        }

        // Keyboard navigation within sidebar
        if (this._isOpen && this._elements.sidebar) {
            // Tab cycling within sidebar
            if (e.key === 'Tab') {
                const focusableElements = this._elements.sidebar.querySelectorAll(
                    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusableElements.length > 0) {
                    const first = focusableElements[0];
                    const last = focusableElements[focusableElements.length - 1];

                    if (e.shiftKey && document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    } else if (!e.shiftKey && document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }
        }
    }

    /**
     * Handle clicks outside the sidebar
     * @param {Event} e - Click event
     */
    _handleOutsideClick(e) {
        // Only close if click is outside sidebar and toggle is not clicked
        if (this._isOpen && this._elements.sidebar) {
            const isClickInside = this._elements.sidebar.contains(e.target);
            const isClickOnToggle = this._elements.toggle && this._elements.toggle.contains(e.target);

            if (!isClickInside && !isClickOnToggle && !this._isMobile) {
                this.close();
            }
        }
    }

    /**
     * Update active state of navigation items
     * @param {string} route - Current route
     */
    _updateActiveState(route) {
        if (!route) return;

        const normalizedRoute = route.replace(/^\//, '');
        
        // Update nav items
        if (this._elements.navLinks && this._elements.navLinks.length > 0) {
            this._elements.navLinks.forEach(link => {
                const linkRoute = link.getAttribute('data-route') || '';
                const isActive = this._isRouteMatch(linkRoute, route);
                
                if (isActive) {
                    link.closest('.sidebar-nav-item')?.classList.add('active');
                    link.setAttribute('aria-current', 'page');
                } else {
                    link.closest('.sidebar-nav-item')?.classList.remove('active');
                    link.removeAttribute('aria-current');
                }
            });
        }
    }

    /**
     * Check if a route matches the current route
     * @param {string} linkRoute - Route from nav link
     * @param {string} currentRoute - Current route
     * @returns {boolean} True if matches
     */
    _isRouteMatch(linkRoute, currentRoute) {
        if (!linkRoute || !currentRoute) return false;
        
        // Exact match
        if (linkRoute === currentRoute) return true;
        
        // Handle root
        if (linkRoute === '/' && currentRoute === '/') return true;
        
        // Check if current route starts with link route (for nested routes)
        if (linkRoute !== '/' && currentRoute.startsWith(linkRoute)) {
            // Make sure it's a path segment match (e.g., /lectures/1 matches /lectures)
            const nextChar = currentRoute[linkRoute.length];
            return nextChar === '/' || nextChar === '?' || !nextChar;
        }
        
        return false;
    }

    /**
     * Open the sidebar
     */
    open() {
        this._isOpen = true;
        
        if (this._elements.sidebar) {
            this._elements.sidebar.classList.add('open');
            this._elements.sidebar.setAttribute('aria-hidden', 'false');
        }
        
        if (this._elements.backdrop) {
            this._elements.backdrop.classList.add('active');
        }
        
        if (this._elements.toggle) {
            this._elements.toggle.setAttribute('aria-expanded', 'true');
        }
        
        // Update state
        state.set('ui.sidebarOpen', true);
        
        // Prevent body scroll on mobile
        if (this._isMobile) {
            document.body.style.overflow = 'hidden';
        }
        
        // Focus management
        if (this._elements.sidebar) {
            setTimeout(() => {
                const firstFocusable = this._elements.sidebar.querySelector(
                    'a[href], button, [tabindex]:not([tabindex="-1"])'
                );
                if (firstFocusable) {
                    firstFocusable.focus();
                }
            }, 100);
        }
        
        // Emit event
        eventBus.emit('sidebar.opened');
    }

    /**
     * Close the sidebar
     */
    close() {
        this._isOpen = false;
        
        if (this._elements.sidebar) {
            this._elements.sidebar.classList.remove('open');
            this._elements.sidebar.setAttribute('aria-hidden', 'true');
        }
        
        if (this._elements.backdrop) {
            this._elements.backdrop.classList.remove('active');
        }
        
        if (this._elements.toggle) {
            this._elements.toggle.setAttribute('aria-expanded', 'false');
        }
        
        // Update state
        state.set('ui.sidebarOpen', false);
        
        // Restore body scroll
        if (this._isMobile) {
            document.body.style.overflow = '';
        }
        
        // Save state
        storage.updateUserSettings({ sidebarCollapsed: true });
        
        // Emit event
        eventBus.emit('sidebar.closed');
    }

    /**
     * Toggle the sidebar
     */
    toggle() {
        if (this._isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Update progress indicator
     */
    _updateProgress() {
        const progress = state.get('progress');
        const completedLectures = state.get('lectures.completed') || [];
        const totalLectures = state.get('lectures.totalLectures') || 14;
        
        const percentage = totalLectures > 0 
            ? Math.round((completedLectures.length / totalLectures) * 100) 
            : 0;
        
        // Update progress bar
        const progressFill = document.querySelector('.sidebar-progress .progress-fill');
        const progressText = document.querySelector('.sidebar-progress .progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${percentage}%`;
        }
    }

    /**
     * Update theme icon based on current theme
     * @param {string} theme - 'dark' or 'light'
     */
    _updateThemeIcon(theme) {
        const icon = document.querySelector('.sidebar-theme-toggle .theme-icon');
        const label = document.querySelector('.sidebar-theme-toggle .theme-label');
        
        if (icon) {
            icon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
        
        if (label) {
            label.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
        }
    }

    /**
     * Get current open state
     * @returns {boolean} True if sidebar is open
     */
    isOpen() {
        return this._isOpen;
    }

    /**
     * Get current mobile state
     * @returns {boolean} True if mobile view
     */
    isMobile() {
        return this._isMobile;
    }

    /**
     * Get nav items configuration
     * @returns {Array} Navigation items
     */
    getNavItems() {
        return [...this._navItems];
    }

    /**
     * Update nav items (if needed)
     * @param {Array} items - New navigation items
     */
    setNavItems(items) {
        this._navItems = items;
        // Rebuild sidebar if needed
        if (this._elements.sidebar) {
            // Update nav items in DOM
            this._updateNavItems();
        }
    }

    /**
     * Update navigation items in DOM
     */
    _updateNavItems() {
        const nav = this._elements.sidebar?.querySelector('.sidebar-nav');
        if (!nav) return;
        
        const itemsHTML = this._navItems.map(item => `
            <li class="sidebar-nav-item" data-route="${item.route}">
                <a href="${item.route}" class="sidebar-nav-link" data-route="${item.route}">
                    <span class="sidebar-nav-icon">${item.icon}</span>
                    <span class="sidebar-nav-label">${item.label}</span>
                </a>
            </li>
        `).join('');
        
        nav.innerHTML = itemsHTML;
        
        // Re-attach event listeners
        this._elements.navLinks = nav.querySelectorAll('.sidebar-nav-link');
        this._elements.navLinks.forEach(link => {
            link.addEventListener('click', this._handleNavClick);
        });
    }

    /**
     * Destroy the sidebar component
     */
    destroy() {
        // Remove event listeners
        if (this._elements.toggle) {
            this._elements.toggle.removeEventListener('click', this._handleToggle);
        }
        if (this._elements.backdrop) {
            this._elements.backdrop.removeEventListener('click', this._handleBackdrop);
        }
        if (this._elements.closeButton) {
            this._elements.closeButton.removeEventListener('click', this._handleBackdrop);
        }
        if (this._elements.navLinks) {
            this._elements.navLinks.forEach(link => {
                link.removeEventListener('click', this._handleNavClick);
            });
        }
        if (this._elements.themeToggle) {
            this._elements.themeToggle.removeEventListener('click', this._handleThemeToggle);
        }
        if (this._elements.settingsLink) {
            this._elements.settingsLink.removeEventListener('click', this._handleSettingsClick);
        }

        window.removeEventListener('resize', this._handleResize);
        document.removeEventListener('keydown', this._handleKeydown);
        document.removeEventListener('click', this._handleOutsideClick);

        eventBus.off('routechange', this._handleRouteChange);
        eventBus.off('storage.progress.updated', this._updateProgress);
        eventBus.off('theme.changed', this._updateThemeIcon);

        this._initialized = false;
        console.log('Sidebar component destroyed');
    }
}

/**
 * Create and export a singleton instance
 */
const sidebar = new Sidebar();

// Freeze the sidebar instance
Object.freeze(sidebar);

// Export the sidebar component
export default sidebar;
