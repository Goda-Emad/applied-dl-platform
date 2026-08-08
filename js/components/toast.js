/**
 * ============================================================
 * js/components/toast.js — Toast Notification System
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Toast Component
 * 
 * A reusable notification system for the application.
 * Supports success, error, warning, info, and custom notifications.
 */

import eventBus from '../core/event-bus.js';

class Toast {
    /**
     * Create a new Toast instance
     * @param {Object} options - Configuration options
     * @param {string} options.message - Toast message
     * @param {string} options.title - Toast title (optional)
     * @param {string} options.type - Toast type: 'success', 'error', 'warning', 'info'
     * @param {number} options.duration - Display duration in ms (default: 5000)
     * @param {boolean} options.closable - Show close button (default: true)
     * @param {string} options.position - Position: 'top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'
     * @param {Function} options.onClose - Callback when toast closes
     * @param {Function} options.onClick - Callback when toast is clicked
     * @param {string} options.className - Additional CSS class
     * @param {string} options.icon - Custom icon (emoji or HTML)
     * @param {HTMLElement} options.container - Custom container element
     */
    constructor(options = {}) {
        // Configuration
        this._options = {
            message: options.message || '',
            title: options.title || '',
            type: options.type || 'info',
            duration: options.duration || 5000,
            closable: options.closable !== undefined ? options.closable : true,
            position: options.position || 'top-right',
            className: options.className || '',
            icon: options.icon || '',
            container: options.container || null
        };
        
        // Callbacks
        this._onClose = options.onClose || null;
        this._onClick = options.onClick || null;
        
        // State
        this._element = null;
        this._timer = null;
        this._isVisible = false;
        this._isClosing = false;
        this._id = Toast._instanceCount++;
        
        // Bind methods
        this._handleClose = this._handleClose.bind(this);
        this._handleClick = this._handleClick.bind(this);
        this._handleMouseEnter = this._handleMouseEnter.bind(this);
        this._handleMouseLeave = this._handleMouseLeave.bind(this);
        
        // Render
        this._render();
    }

    /**
     * Static instance tracking
     */
    static _instanceCount = 0;
    static _instances = [];
    static _container = null;
    static _defaultPosition = 'top-right';
    static _maxToasts = 5;

    /**
     * Get or create toast container
     * @param {string} position - Toast position
     * @returns {HTMLElement} Container element
     */
    static _getContainer(position = 'top-right') {
        const containerId = `toast-container-${position}`;
        let container = document.getElementById(containerId);
        
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.className = `toast-container ${position}`;
            container.setAttribute('role', 'region');
            container.setAttribute('aria-live', 'polite');
            document.body.appendChild(container);
        }
        
        return container;
    }

    /**
     * Show the toast
     * @returns {Toast} This instance for chaining
     */
    show() {
        if (this._isVisible) return this;
        
        // Get container
        const container = this._options.container || Toast._getContainer(this._options.position);
        
        // Add toast to container
        container.appendChild(this._element);
        
        // Trigger show animation
        requestAnimationFrame(() => {
            this._element.classList.add('visible');
            this._isVisible = true;
        });
        
        // Start auto-dismiss timer
        if (this._options.duration > 0) {
            this._startTimer();
        }
        
        // Limit toasts
        this._limitToasts(container);
        
        // Emit event
        eventBus.emit('toast.shown', {
            id: this._id,
            type: this._options.type,
            message: this._options.message
        });
        
        return this;
    }

    /**
     * Close the toast
     * @returns {Toast} This instance for chaining
     */
    close() {
        if (this._isClosing || !this._isVisible) return this;
        
        this._isClosing = true;
        this._clearTimer();
        
        // Trigger close animation
        this._element.classList.remove('visible');
        this._element.classList.add('exiting');
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (this._element && this._element.parentNode) {
                this._element.parentNode.removeChild(this._element);
            }
            this._isVisible = false;
            
            // Emit event
            eventBus.emit('toast.closed', {
                id: this._id,
                type: this._options.type,
                message: this._options.message
            });
            
            // Callback
            if (this._onClose) {
                this._onClose();
            }
        }, 300);
        
        return this;
    }

    /**
     * Render the toast element
     */
    _render() {
        this._element = document.createElement('div');
        this._element.className = `toast toast-${this._options.type}`;
        this._element.setAttribute('role', 'alert');
        this._element.setAttribute('aria-live', 'polite');
        
        if (this._options.className) {
            this._element.classList.add(this._options.className);
        }
        
        // Icon
        const icon = this._getIcon();
        
        // Progress bar (for auto-dismiss)
        const progressHTML = this._options.duration > 0 ? `
            <div class="toast-progress">
                <div class="toast-progress-bar" style="animation-duration: ${this._options.duration}ms;"></div>
            </div>
        ` : '';
        
        // Close button
        const closeHTML = this._options.closable ? `
            <button class="toast-close-btn" aria-label="Close notification">×</button>
        ` : '';
        
        this._element.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                ${this._options.title ? `<div class="toast-title">${this._options.title}</div>` : ''}
                <div class="toast-message">${this._options.message}</div>
            </div>
            ${closeHTML}
            ${progressHTML}
        `;
        
        // Attach events
        this._attachEvents();
    }

    /**
     * Get icon for toast type
     * @returns {string} Icon HTML
     */
    _getIcon() {
        if (this._options.icon) {
            return this._options.icon;
        }
        
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        
        return icons[this._options.type] || icons.info;
    }

    /**
     * Attach event listeners
     */
    _attachEvents() {
        // Close button
        const closeBtn = this._element.querySelector('.toast-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', this._handleClose);
        }
        
        // Click handler
        this._element.addEventListener('click', this._handleClick);
        
        // Hover handlers for pausing timer
        this._element.addEventListener('mouseenter', this._handleMouseEnter);
        this._element.addEventListener('mouseleave', this._handleMouseLeave);
        
        // Keyboard accessibility
        this._element.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        });
    }

    /**
     * Handle close button click
     * @param {Event} e - Click event
     */
    _handleClose(e) {
        e.stopPropagation();
        this.close();
    }

    /**
     * Handle toast click
     * @param {Event} e - Click event
     */
    _handleClick(e) {
        // Ignore if click is on close button
        if (e.target.closest('.toast-close-btn')) {
            return;
        }
        
        if (this._onClick) {
            this._onClick(e);
        }
        
        // Emit event
        eventBus.emit('toast.clicked', {
            id: this._id,
            type: this._options.type,
            message: this._options.message
        });
    }

    /**
     * Handle mouse enter (pause timer)
     */
    _handleMouseEnter() {
        this._clearTimer();
    }

    /**
     * Handle mouse leave (resume timer)
     */
    _handleMouseLeave() {
        if (this._isVisible && !this._isClosing) {
            this._startTimer();
        }
    }

    /**
     * Start auto-dismiss timer
     */
    _startTimer() {
        this._clearTimer();
        if (this._options.duration > 0) {
            this._timer = setTimeout(() => {
                this.close();
            }, this._options.duration);
        }
    }

    /**
     * Clear auto-dismiss timer
     */
    _clearTimer() {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
    }

    /**
     * Limit number of toasts in container
     * @param {HTMLElement} container - Toast container
     */
    _limitToasts(container) {
        const toasts = container.querySelectorAll('.toast:not(.exiting)');
        if (toasts.length > Toast._maxToasts) {
            // Remove oldest toasts
            for (let i = 0; i < toasts.length - Toast._maxToasts; i++) {
                const toast = toasts[i];
                if (toast._toastInstance) {
                    toast._toastInstance.close();
                } else {
                    // Fallback: remove directly
                    toast.classList.add('exiting');
                    setTimeout(() => {
                        if (toast.parentNode) {
                            toast.parentNode.removeChild(toast);
                        }
                    }, 300);
                }
            }
        }
    }

    // ── Public Methods ────────────────────────────────────────

    /**
     * Update toast message
     * @param {string} message - New message
     */
    updateMessage(message) {
        this._options.message = message;
        const messageElement = this._element?.querySelector('.toast-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
    }

    /**
     * Update toast title
     * @param {string} title - New title
     */
    updateTitle(title) {
        this._options.title = title;
        const titleElement = this._element?.querySelector('.toast-title');
        if (titleElement) {
            titleElement.textContent = title;
        } else if (title && this._element) {
            // Create title element
            const content = this._element.querySelector('.toast-content');
            if (content) {
                const newTitle = document.createElement('div');
                newTitle.className = 'toast-title';
                newTitle.textContent = title;
                content.prepend(newTitle);
            }
        }
    }

    /**
     * Update toast type
     * @param {string} type - New type
     */
    updateType(type) {
        if (this._element) {
            this._element.classList.remove(`toast-${this._options.type}`);
            this._element.classList.add(`toast-${type}`);
        }
        this._options.type = type;
        // Update icon
        const iconElement = this._element?.querySelector('.toast-icon');
        if (iconElement) {
            iconElement.textContent = this._getIcon();
        }
    }

    /**
     * Pause the toast (stop auto-dismiss)
     */
    pause() {
        this._clearTimer();
    }

    /**
     * Resume the toast (restart auto-dismiss)
     */
    resume() {
        if (this._isVisible && !this._isClosing) {
            this._startTimer();
        }
    }

    /**
     * Check if toast is visible
     * @returns {boolean} True if visible
     */
    isVisible() {
        return this._isVisible;
    }

    /**
     * Get toast ID
     * @returns {number} Toast ID
     */
    getId() {
        return this._id;
    }

    /**
     * Get toast element
     * @returns {HTMLElement} Toast element
     */
    getElement() {
        return this._element;
    }

    /**
     * Destroy the toast
     */
    destroy() {
        this._clearTimer();
        if (this._element && this._element.parentNode) {
            this._element.parentNode.removeChild(this._element);
        }
        this._element = null;
        this._isVisible = false;
    }

    // ── Static Methods ────────────────────────────────────────

    /**
     * Show a success toast
     * @param {string} message - Toast message
     * @param {Object} options - Additional options
     * @returns {Toast} Toast instance
     */
    static success(message, options = {}) {
        return new Toast({
            message,
            type: 'success',
            icon: '✓',
            ...options
        }).show();
    }

    /**
     * Show an error toast
     * @param {string} message - Toast message
     * @param {Object} options - Additional options
     * @returns {Toast} Toast instance
     */
    static error(message, options = {}) {
        return new Toast({
            message,
            type: 'error',
            icon: '✗',
            duration: 8000,
            ...options
        }).show();
    }

    /**
     * Show a warning toast
     * @param {string} message - Toast message
     * @param {Object} options - Additional options
     * @returns {Toast} Toast instance
     */
    static warning(message, options = {}) {
        return new Toast({
            message,
            type: 'warning',
            icon: '⚠',
            ...options
        }).show();
    }

    /**
     * Show an info toast
     * @param {string} message - Toast message
     * @param {Object} options - Additional options
     * @returns {Toast} Toast instance
     */
    static info(message, options = {}) {
        return new Toast({
            message,
            type: 'info',
            icon: 'ℹ',
            ...options
        }).show();
    }

    /**
     * Show a custom toast
     * @param {Object} options - Toast options
     * @returns {Toast} Toast instance
     */
    static custom(options = {}) {
        return new Toast(options).show();
    }

    /**
     * Close all visible toasts
     */
    static closeAll() {
        const containers = document.querySelectorAll('.toast-container');
        containers.forEach(container => {
            const toasts = container.querySelectorAll('.toast:not(.exiting)');
            toasts.forEach(toast => {
                if (toast._toastInstance) {
                    toast._toastInstance.close();
                }
            });
        });
    }

    /**
     * Set default position for all toasts
     * @param {string} position - Position string
     */
    static setDefaultPosition(position) {
        Toast._defaultPosition = position;
    }

    /**
     * Set max number of toasts
     * @param {number} max - Maximum number
     */
    static setMaxToasts(max) {
        Toast._maxToasts = Math.max(1, max);
    }

    /**
     * Get all visible toast instances
     * @returns {Array} Array of toast instances
     */
    static getAll() {
        const instances = [];
        const containers = document.querySelectorAll('.toast-container');
        containers.forEach(container => {
            const toasts = container.querySelectorAll('.toast:not(.exiting)');
            toasts.forEach(toast => {
                if (toast._toastInstance) {
                    instances.push(toast._toastInstance);
                }
            });
        });
        return instances;
    }

    /**
     * Clear all toast containers
     */
    static clearContainers() {
        const containers = document.querySelectorAll('.toast-container');
        containers.forEach(container => {
            container.innerHTML = '';
        });
    }

    /**
     * Remove all toast containers from DOM
     */
    static removeContainers() {
        const containers = document.querySelectorAll('.toast-container');
        containers.forEach(container => {
            container.remove();
        });
    }
}

/**
 * Store instance reference on element for cleanup
 */
const originalShow = Toast.prototype.show;
Toast.prototype.show = function() {
    if (this._element) {
        this._element._toastInstance = this;
    }
    return originalShow.call(this);
};

/**
 * Create and export the component
 */
export default Toast;
