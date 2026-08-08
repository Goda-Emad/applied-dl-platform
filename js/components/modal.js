/**
 * ============================================================
 * js/components/modal.js — Modal/Dialog Component
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Modal Component
 * 
 * A reusable modal/dialog system for the application.
 * Supports opening, closing, confirmation, and accessibility.
 */

import eventBus from '../core/event-bus.js';
import state from '../core/state.js';

class Modal {
    /**
     * Create a new Modal instance
     * @param {Object} options - Configuration options
     * @param {string} options.title - Modal title
     * @param {string|HTMLElement} options.content - Modal content
     * @param {Object} options.buttons - Button configurations
     * @param {string} options.size - Modal size: 'sm', 'md', 'lg', 'xl', 'full'
     * @param {boolean} options.closeOnOverlay - Close when clicking overlay (default: true)
     * @param {boolean} options.closeOnEscape - Close with Escape key (default: true)
     * @param {boolean} options.preventScroll - Prevent background scroll (default: true)
     * @param {Function} options.onOpen - Callback when modal opens
     * @param {Function} options.onClose - Callback when modal closes
     * @param {Function} options.onConfirm - Callback for confirm button
     * @param {Function} options.onCancel - Callback for cancel button
     * @param {Function} options.beforeOpen - Callback before opening
     * @param {Function} options.beforeClose - Callback before closing
     * @param {string} options.className - Additional CSS class
     * @param {Object} options.data - Data to pass to callbacks
     */
    constructor(options = {}) {
        // Configuration
        this._options = {
            title: options.title || '',
            content: options.content || '',
            buttons: options.buttons || [],
            size: options.size || 'md',
            closeOnOverlay: options.closeOnOverlay !== undefined ? options.closeOnOverlay : true,
            closeOnEscape: options.closeOnEscape !== undefined ? options.closeOnEscape : true,
            preventScroll: options.preventScroll !== undefined ? options.preventScroll : true,
            className: options.className || '',
            data: options.data || {}
        };
        
        // Callbacks
        this._onOpen = options.onOpen || null;
        this._onClose = options.onClose || null;
        this._onConfirm = options.onConfirm || null;
        this._onCancel = options.onCancel || null;
        this._beforeOpen = options.beforeOpen || null;
        this._beforeClose = options.beforeClose || null;
        
        // State
        this._isOpen = false;
        this._element = null;
        this._overlay = null;
        this._container = null;
        this._focusableElements = [];
        this._focusedElement = null;
        this._isClosing = false;
        
        // Bind methods
        this._handleKeydown = this._handleKeydown.bind(this);
        this._handleOverlayClick = this._handleOverlayClick.bind(this);
        this._handleClose = this._handleClose.bind(this);
        
        // Track open modals
        this._id = Modal._instanceCount++;
        Modal._instances.set(this._id, this);
    }

    /**
     * Static instance tracking
     */
    static _instanceCount = 0;
    static _instances = new Map();
    static _activeModal = null;

    /**
     * Open the modal
     * @param {Object} data - Optional data to pass to callbacks
     * @returns {Promise} Promise that resolves when modal is opened
     */
    open(data = null) {
        if (this._isOpen) return Promise.resolve();
        
        // Before open hook
        if (this._beforeOpen) {
            const shouldOpen = this._beforeOpen(data || this._options.data);
            if (shouldOpen === false) {
                return Promise.reject(new Error('Modal opening cancelled'));
            }
        }
        
        // Close any open modal
        if (Modal._activeModal) {
            Modal._activeModal.close();
        }
        
        // Build modal
        this._buildModal();
        
        // Add to DOM
        document.body.appendChild(this._element);
        
        // Store current focused element
        this._focusedElement = document.activeElement;
        
        // Set active modal
        Modal._activeModal = this;
        this._isOpen = true;
        this._isClosing = false;
        
        // Prevent scroll
        if (this._options.preventScroll) {
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = this._getScrollbarWidth() + 'px';
        }
        
        // Trigger open animation
        requestAnimationFrame(() => {
            this._container.classList.add('active');
            this._overlay.classList.add('active');
        });
        
        // Focus management
        setTimeout(() => {
            this._focusFirstElement();
        }, 100);
        
        // Emit event
        eventBus.emit('modal.opened', {
            id: this._id,
            title: this._options.title,
            data: data || this._options.data
        });
        
        // Callback
        if (this._onOpen) {
            this._onOpen(data || this._options.data);
        }
        
        return Promise.resolve();
    }

    /**
     * Close the modal
     * @param {Object} data - Optional data to pass to callbacks
     * @returns {Promise} Promise that resolves when modal is closed
     */
    close(data = null) {
        if (!this._isOpen || this._isClosing) return Promise.resolve();
        
        this._isClosing = true;
        
        // Before close hook
        if (this._beforeClose) {
            const shouldClose = this._beforeClose(data);
            if (shouldClose === false) {
                this._isClosing = false;
                return Promise.reject(new Error('Modal closing cancelled'));
            }
        }
        
        // Trigger close animation
        this._container.classList.remove('active');
        this._overlay.classList.remove('active');
        
        // Restore scroll
        if (this._options.preventScroll) {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (this._element && this._element.parentNode) {
                this._element.parentNode.removeChild(this._element);
            }
            
            // Restore focus
            if (this._focusedElement && this._focusedElement.focus) {
                this._focusedElement.focus();
            }
            
            // Clear active modal
            if (Modal._activeModal === this) {
                Modal._activeModal = null;
            }
            
            this._isOpen = false;
            this._isClosing = false;
            this._element = null;
            this._overlay = null;
            this._container = null;
            
            // Emit event
            eventBus.emit('modal.closed', {
                id: this._id,
                title: this._options.title,
                data: data
            });
            
            // Callback
            if (this._onClose) {
                this._onClose(data);
            }
        }, 300);
        
        return Promise.resolve();
    }

    /**
     * Toggle the modal
     * @param {Object} data - Optional data to pass to callbacks
     * @returns {Promise} Promise that resolves when toggled
     */
    toggle(data = null) {
        if (this._isOpen) {
            return this.close(data);
        } else {
            return this.open(data);
        }
    }

    /**
     * Build the modal DOM
     */
    _buildModal() {
        // Create overlay
        this._overlay = document.createElement('div');
        this._overlay.className = 'modal-overlay';
        this._overlay.setAttribute('role', 'dialog');
        this._overlay.setAttribute('aria-modal', 'true');
        this._overlay.setAttribute('aria-labelledby', 'modal-title');
        this._overlay.dataset.modalId = this._id;
        
        // Create container
        this._container = document.createElement('div');
        this._container.className = `modal-container modal-${this._options.size}`;
        if (this._options.className) {
            this._container.classList.add(this._options.className);
        }
        
        // Build content
        this._container.innerHTML = this._getHTML();
        
        // Attach events
        this._attachEvents();
        
        // Append container to overlay
        this._overlay.appendChild(this._container);
        
        // Store element
        this._element = this._overlay;
    }

    /**
     * Get modal HTML
     * @returns {string} HTML string
     */
    _getHTML() {
        const title = this._options.title;
        const content = this._getContentHTML();
        const buttons = this._getButtonsHTML();
        
        return `
            <div class="modal-header">
                <div class="modal-header-left">
                    <h2 class="modal-title" id="modal-title">${title}</h2>
                </div>
                <button class="modal-close-btn" data-modal-close aria-label="Close modal">
                    <span class="modal-close-icon">×</span>
                </button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            ${buttons ? `<div class="modal-footer">${buttons}</div>` : ''}
        `;
    }

    /**
     * Get content HTML
     * @returns {string} HTML string
     */
    _getContentHTML() {
        const content = this._options.content;
        if (typeof content === 'string') {
            return content;
        }
        if (content instanceof HTMLElement) {
            // We'll append this after rendering
            return '<div class="modal-content-wrapper"></div>';
        }
        return '';
    }

    /**
     * Get buttons HTML
     * @returns {string} HTML string
     */
    _getButtonsHTML() {
        const buttons = this._options.buttons;
        if (buttons && buttons.length > 0) {
            return buttons.map(btn => {
                const type = btn.type || 'secondary';
                const classes = `btn-modal btn-modal-${type}`;
                const dataAttrs = btn.data ? Object.entries(btn.data).map(([k, v]) => `data-${k}="${v}"`).join(' ') : '';
                return `<button class="${classes}" data-modal-action="${btn.action || 'custom'}" ${dataAttrs}>${btn.label || 'Button'}</button>`;
            }).join('');
        }
        
        // Default buttons if not provided but callbacks exist
        let buttonsHTML = '';
        if (this._onConfirm) {
            buttonsHTML += `<button class="btn-modal btn-modal-primary" data-modal-action="confirm">Confirm</button>`;
        }
        if (this._onCancel) {
            buttonsHTML += `<button class="btn-modal btn-modal-secondary" data-modal-action="cancel">Cancel</button>`;
        }
        if (!buttonsHTML && (this._onConfirm || this._onCancel)) {
            buttonsHTML = `
                ${this._onConfirm ? '<button class="btn-modal btn-modal-primary" data-modal-action="confirm">Confirm</button>' : ''}
                ${this._onCancel ? '<button class="btn-modal btn-modal-secondary" data-modal-action="cancel">Cancel</button>' : ''}
            `;
        }
        return buttonsHTML;
    }

    /**
     * Attach event listeners
     */
    _attachEvents() {
        // Close button
        const closeBtn = this._container.querySelector('[data-modal-close]');
        if (closeBtn) {
            closeBtn.addEventListener('click', this._handleClose);
        }
        
        // Overlay click
        if (this._options.closeOnOverlay) {
            this._overlay.addEventListener('click', this._handleOverlayClick);
        }
        
        // Escape key
        if (this._options.closeOnEscape) {
            document.addEventListener('keydown', this._handleKeydown);
        }
        
        // Action buttons
        const actionButtons = this._container.querySelectorAll('[data-modal-action]');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.modalAction;
                this._handleAction(action, e);
            });
        });
        
        // Focus trap
        this._container.addEventListener('focusin', (e) => {
            this._trapFocus(e);
        });
        
        // Handle content element
        const contentWrapper = this._container.querySelector('.modal-content-wrapper');
        if (contentWrapper && this._options.content instanceof HTMLElement) {
            contentWrapper.appendChild(this._options.content);
        }
    }

    /**
     * Handle close
     */
    _handleClose() {
        this.close();
    }

    /**
     * Handle overlay click
     * @param {Event} e - Click event
     */
    _handleOverlayClick(e) {
        if (e.target === this._overlay) {
            this.close();
        }
    }

    /**
     * Handle keydown
     * @param {KeyboardEvent} e - Keyboard event
     */
    _handleKeydown(e) {
        if (e.key === 'Escape' && this._isOpen) {
            e.preventDefault();
            this.close();
        }
        
        // Tab trap
        if (e.key === 'Tab' && this._isOpen) {
            this._handleTabTrap(e);
        }
    }

    /**
     * Handle tab trap
     * @param {KeyboardEvent} e - Keyboard event
     */
    _handleTabTrap(e) {
        const focusable = this._getFocusableElements();
        if (focusable.length === 0) return;
        
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    /**
     * Handle action button click
     * @param {string} action - Action name
     * @param {Event} e - Click event
     */
    _handleAction(action, e) {
        const data = this._options.data;
        
        switch (action) {
            case 'confirm':
                if (this._onConfirm) {
                    const result = this._onConfirm(data, e);
                    if (result !== false) {
                        this.close(data);
                    }
                }
                break;
            case 'cancel':
                if (this._onCancel) {
                    const result = this._onCancel(data, e);
                    if (result !== false) {
                        this.close(data);
                    }
                } else {
                    this.close();
                }
                break;
            case 'close':
                this.close();
                break;
            default:
                // Custom action
                const customButtons = this._options.buttons || [];
                const btnConfig = customButtons.find(b => b.action === action);
                if (btnConfig && btnConfig.onClick) {
                    const result = btnConfig.onClick(data, e);
                    if (result !== false && btnConfig.closeOnClick !== false) {
                        this.close(data);
                    }
                }
                break;
        }
    }

    /**
     * Get focusable elements
     * @returns {Array} Focusable elements
     */
    _getFocusableElements() {
        if (!this._container) return [];
        const selectors = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])'
        ];
        return Array.from(this._container.querySelectorAll(selectors.join(',')));
    }

    /**
     * Focus first focusable element
     */
    _focusFirstElement() {
        const focusable = this._getFocusableElements();
        if (focusable.length > 0) {
            focusable[0].focus();
        } else {
            // Focus the container itself
            this._container.setAttribute('tabindex', '-1');
            this._container.focus();
        }
    }

    /**
     * Trap focus within modal
     * @param {Event} e - Focus event
     */
    _trapFocus(e) {
        if (!this._container.contains(e.target)) {
            this._focusFirstElement();
        }
    }

    /**
     * Get scrollbar width
     * @returns {number} Scrollbar width in pixels
     */
    _getScrollbarWidth() {
        return window.innerWidth - document.documentElement.clientWidth;
    }

    // ── Public Methods ────────────────────────────────────────

    /**
     * Update modal content
     * @param {string|HTMLElement} content - New content
     * @param {boolean} keepOpen - Keep modal open (default: true)
     */
    updateContent(content, keepOpen = true) {
        this._options.content = content;
        if (this._isOpen && keepOpen) {
            const body = this._container?.querySelector('.modal-body');
            if (body) {
                body.innerHTML = '';
                if (typeof content === 'string') {
                    body.innerHTML = content;
                } else if (content instanceof HTMLElement) {
                    body.appendChild(content);
                }
            }
        }
    }

    /**
     * Update modal title
     * @param {string} title - New title
     * @param {boolean} keepOpen - Keep modal open (default: true)
     */
    updateTitle(title, keepOpen = true) {
        this._options.title = title;
        if (this._isOpen && keepOpen) {
            const titleElement = this._container?.querySelector('#modal-title');
            if (titleElement) {
                titleElement.textContent = title;
            }
        }
    }

    /**
     * Update modal buttons
     * @param {Array} buttons - New button configurations
     * @param {boolean} keepOpen - Keep modal open (default: true)
     */
    updateButtons(buttons, keepOpen = true) {
        this._options.buttons = buttons;
        if (this._isOpen && keepOpen) {
            const footer = this._container?.querySelector('.modal-footer');
            if (footer) {
                footer.innerHTML = this._getButtonsHTML();
                // Reattach events for new buttons
                const actionButtons = footer.querySelectorAll('[data-modal-action]');
                actionButtons.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const action = btn.dataset.modalAction;
                        this._handleAction(action, e);
                    });
                });
            }
        }
    }

    /**
     * Set loading state
     * @param {boolean} loading - Loading state
     * @param {string} message - Loading message (optional)
     */
    setLoading(loading, message = 'Loading...') {
        if (!this._container) return;
        
        const body = this._container.querySelector('.modal-body');
        const buttons = this._container.querySelectorAll('.btn-modal');
        
        if (loading) {
            // Disable buttons
            buttons.forEach(btn => btn.disabled = true);
            // Show loading overlay
            if (!this._loadingElement) {
                this._loadingElement = document.createElement('div');
                this._loadingElement.className = 'modal-loading';
                this._loadingElement.style.cssText = `
                    position: absolute;
                    inset: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255,255,255,0.8);
                    backdrop-filter: blur(2px);
                    border-radius: inherit;
                    z-index: 10;
                `;
                this._loadingElement.innerHTML = `
                    <div class="spinner" style="
                        width: 32px;
                        height: 32px;
                        border: 3px solid var(--bg-surface-alt);
                        border-top-color: var(--color-primary);
                        border-radius: 50%;
                        animation: spin 0.8s linear infinite;
                    "></div>
                    <p style="margin-top: 12px; color: var(--text-secondary); font-size: 14px;">${message}</p>
                `;
                this._container.style.position = 'relative';
                this._container.appendChild(this._loadingElement);
            } else {
                this._loadingElement.style.display = 'flex';
                const msg = this._loadingElement.querySelector('p');
                if (msg) msg.textContent = message;
            }
        } else {
            // Enable buttons
            buttons.forEach(btn => btn.disabled = false);
            // Hide loading overlay
            if (this._loadingElement) {
                this._loadingElement.style.display = 'none';
            }
        }
    }

    /**
     * Check if modal is open
     * @returns {boolean} True if open
     */
    isOpen() {
        return this._isOpen;
    }

    /**
     * Get modal ID
     * @returns {number} Modal ID
     */
    getId() {
        return this._id;
    }

    /**
     * Get modal element
     * @returns {HTMLElement} Modal element
     */
    getElement() {
        return this._element;
    }

    /**
     * Get modal container
     * @returns {HTMLElement} Modal container
     */
    getContainer() {
        return this._container;
    }

    /**
     * Set data for callbacks
     * @param {Object} data - Data to pass to callbacks
     */
    setData(data) {
        this._options.data = { ...this._options.data, ...data };
    }

    /**
     * Get data
     * @returns {Object} Current data
     */
    getData() {
        return { ...this._options.data };
    }

    /**
     * Destroy the modal
     */
    destroy() {
        if (this._isOpen) {
            this.close();
        }
        // Remove instance from tracking
        Modal._instances.delete(this._id);
        // Clean up event listeners
        document.removeEventListener('keydown', this._handleKeydown);
    }

    // ── Static Methods ────────────────────────────────────────

    /**
     * Close all open modals
     */
    static closeAll() {
        for (const [id, modal] of Modal._instances) {
            if (modal.isOpen()) {
                modal.close();
            }
        }
    }

    /**
     * Get active modal
     * @returns {Modal|null} Active modal instance
     */
    static getActiveModal() {
        return Modal._activeModal;
    }

    /**
     * Create a confirmation modal
     * @param {Object} options - Configuration
     * @param {string} options.title - Modal title
     * @param {string} options.message - Confirmation message
     * @param {string} options.confirmText - Confirm button text
     * @param {string} options.cancelText - Cancel button text
     * @param {string} options.confirmType - Button type: 'danger', 'primary', 'success'
     * @param {Function} options.onConfirm - Confirm callback
     * @param {Function} options.onCancel - Cancel callback
     * @returns {Modal} Modal instance
     */
    static confirm(options = {}) {
        const modal = new Modal({
            title: options.title || 'Confirm Action',
            content: `
                <div class="confirmation-content" style="text-align: center; padding: 20px 0;">
                    <div style="font-size: 48px; margin-bottom: 16px;">${options.icon || '⚠️'}</div>
                    <p style="font-size: 16px; color: var(--text-primary); margin-bottom: 8px;">
                        ${options.message || 'Are you sure you want to proceed?'}
                    </p>
                    ${options.detail ? `<p style="font-size: 14px; color: var(--text-muted);">${options.detail}</p>` : ''}
                </div>
            `,
            buttons: [
                {
                    label: options.cancelText || 'Cancel',
                    type: 'secondary',
                    action: 'cancel',
                    closeOnClick: true
                },
                {
                    label: options.confirmText || 'Confirm',
                    type: options.confirmType || 'danger',
                    action: 'confirm',
                    closeOnClick: true
                }
            ],
            size: 'sm',
            closeOnOverlay: false,
            onConfirm: options.onConfirm || null,
            onCancel: options.onCancel || null
        });
        
        return modal;
    }

    /**
     * Create an alert modal
     * @param {Object} options - Configuration
     * @param {string} options.title - Modal title
     * @param {string} options.message - Alert message
     * @param {string} options.buttonText - Button text
     * @param {Function} options.onClose - Close callback
     * @returns {Modal} Modal instance
     */
    static alert(options = {}) {
        const modal = new Modal({
            title: options.title || 'Alert',
            content: `
                <div style="padding: 20px 0;">
                    <p style="font-size: 16px; color: var(--text-primary);">
                        ${options.message || 'Alert message'}
                    </p>
                </div>
            `,
            buttons: [
                {
                    label: options.buttonText || 'OK',
                    type: 'primary',
                    action: 'close',
                    closeOnClick: true
                }
            ],
            size: 'sm',
            closeOnOverlay: true,
            onClose: options.onClose || null
        });
        
        return modal;
    }

    /**
     * Create a success modal
     * @param {Object} options - Configuration
     * @param {string} options.title - Modal title
     * @param {string} options.message - Success message
     * @param {string} options.buttonText - Button text
     * @param {Function} options.onClose - Close callback
     * @returns {Modal} Modal instance
     */
    static success(options = {}) {
        return Modal.alert({
            title: options.title || 'Success!',
            message: options.message || 'Operation completed successfully.',
            buttonText: options.buttonText || 'Great!',
            onClose: options.onClose || null
        });
    }

    /**
     * Create an error modal
     * @param {Object} options - Configuration
     * @param {string} options.title - Modal title
     * @param {string} options.message - Error message
     * @param {string} options.buttonText - Button text
     * @param {Function} options.onClose - Close callback
     * @returns {Modal} Modal instance
     */
    static error(options = {}) {
        return Modal.alert({
            title: options.title || 'Error',
            message: options.message || 'An error occurred.',
            buttonText: options.buttonText || 'OK',
            onClose: options.onClose || null
        });
    }
}

/**
 * Create and export the component
 */
export default Modal;
