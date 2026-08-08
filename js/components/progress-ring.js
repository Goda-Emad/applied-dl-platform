/**
 * ============================================================
 * js/components/progress-ring.js — Circular Progress Ring
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Progress Ring Component
 * 
 * A reusable circular progress indicator with animated transitions.
 * Supports percentage values, custom sizes, labels, and accessibility.
 */

import eventBus from '../core/event-bus.js';

class ProgressRing {
    /**
     * Create a new ProgressRing instance
     * @param {Object} options - Configuration options
     * @param {HTMLElement} options.container - Container element
     * @param {number} options.value - Initial value (0-100)
     * @param {number} options.size - Size in pixels (default: 120)
     * @param {number} options.strokeWidth - Stroke width in pixels (default: 6)
     * @param {string} options.color - Progress color (default: 'var(--color-primary)')
     * @param {string} options.backgroundColor - Background color (default: 'var(--bg-surface-alt)')
     * @param {string} options.label - Label text
     * @param {string} options.format - Display format: 'percentage' | 'number' | 'fraction'
     * @param {number} options.maxValue - Maximum value for fraction format (default: 100)
     * @param {boolean} options.animate - Enable animation (default: true)
     * @param {number} options.animationDuration - Animation duration in ms (default: 800)
     * @param {string} options.tooltip - Tooltip text
     * @param {Function} options.onComplete - Callback when animation completes
     */
    constructor(options = {}) {
        // Configuration
        this._container = options.container || null;
        this._value = Math.min(100, Math.max(0, options.value || 0));
        this._size = options.size || 120;
        this._strokeWidth = options.strokeWidth || 6;
        this._color = options.color || 'var(--color-primary)';
        this._backgroundColor = options.backgroundColor || 'var(--bg-surface-alt)';
        this._label = options.label || '';
        this._format = options.format || 'percentage'; // percentage | number | fraction
        this._maxValue = options.maxValue || 100;
        this._animate = options.animate !== undefined ? options.animate : true;
        this._animationDuration = options.animationDuration || 800;
        this._tooltip = options.tooltip || '';
        this._onComplete = options.onComplete || null;
        
        // State
        this._currentValue = this._value;
        this._animationId = null;
        this._isAnimating = false;
        
        // DOM elements
        this._element = null;
        this._svg = null;
        this._circle = null;
        this._backgroundCircle = null;
        this._centerElement = null;
        this._labelElement = null;
        
        // Calculate dimensions
        this._radius = (this._size - this._strokeWidth) / 2;
        this._circumference = 2 * Math.PI * this._radius;
        
        // Bind methods
        this._handleResize = this._handleResize.bind(this);
        
        // Initialize
        if (this._container) {
            this.render();
        }
    }

    /**
     * Render the progress ring
     * @param {HTMLElement} container - Optional container override
     * @returns {HTMLElement} The rendered element
     */
    render(container = null) {
        if (container) {
            this._container = container;
        }
        
        if (!this._container) {
            console.warn('ProgressRing: No container provided');
            return null;
        }
        
        // Clear container
        this._container.innerHTML = '';
        
        // Create ring element
        this._element = document.createElement('div');
        this._element.className = 'progress-ring-container';
        this._element.setAttribute('role', 'progressbar');
        this._element.setAttribute('aria-valuenow', this._value);
        this._element.setAttribute('aria-valuemin', '0');
        this._element.setAttribute('aria-valuemax', '100');
        this._element.style.width = `${this._size}px`;
        this._element.style.height = `${this._size}px`;
        this._element.style.position = 'relative';
        this._element.style.display = 'inline-flex';
        this._element.style.alignItems = 'center';
        this._element.style.justifyContent = 'center';
        
        if (this._tooltip) {
            this._element.setAttribute('title', this._tooltip);
        }
        
        // Create SVG
        this._svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this._svg.setAttribute('width', this._size);
        this._svg.setAttribute('height', this._size);
        this._svg.setAttribute('viewBox', `0 0 ${this._size} ${this._size}`);
        this._svg.style.transform = 'rotate(-90deg)';
        this._svg.style.overflow = 'visible';
        
        // Create background circle
        this._backgroundCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this._backgroundCircle.setAttribute('cx', this._size / 2);
        this._backgroundCircle.setAttribute('cy', this._size / 2);
        this._backgroundCircle.setAttribute('r', this._radius);
        this._backgroundCircle.setAttribute('fill', 'none');
        this._backgroundCircle.setAttribute('stroke', this._backgroundColor);
        this._backgroundCircle.setAttribute('stroke-width', this._strokeWidth);
        this._backgroundCircle.setAttribute('stroke-linecap', 'round');
        this._svg.appendChild(this._backgroundCircle);
        
        // Create progress circle
        this._circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this._circle.setAttribute('cx', this._size / 2);
        this._circle.setAttribute('cy', this._size / 2);
        this._circle.setAttribute('r', this._radius);
        this._circle.setAttribute('fill', 'none');
        this._circle.setAttribute('stroke', this._color);
        this._circle.setAttribute('stroke-width', this._strokeWidth);
        this._circle.setAttribute('stroke-linecap', 'round');
        this._circle.setAttribute('stroke-dasharray', this._circumference);
        this._circle.setAttribute('stroke-dashoffset', this._circumference);
        this._svg.appendChild(this._circle);
        
        this._element.appendChild(this._svg);
        
        // Create center element
        this._centerElement = document.createElement('div');
        this._centerElement.className = 'progress-ring-center';
        this._centerElement.style.position = 'absolute';
        this._centerElement.style.top = '50%';
        this._centerElement.style.left = '50%';
        this._centerElement.style.transform = 'translate(-50%, -50%)';
        this._centerElement.style.display = 'flex';
        this._centerElement.style.flexDirection = 'column';
        this._centerElement.style.alignItems = 'center';
        this._centerElement.style.justifyContent = 'center';
        this._centerElement.style.textAlign = 'center';
        this._centerElement.style.width = '100%';
        this._centerElement.style.height = '100%';
        this._centerElement.style.padding = '4px';
        this._centerElement.style.pointerEvents = 'none';
        this._element.appendChild(this._centerElement);
        
        // Create value display
        this._valueElement = document.createElement('span');
        this._valueElement.className = 'progress-ring-value';
        this._valueElement.style.fontSize = `${this._size * 0.28}px`;
        this._valueElement.style.fontWeight = 'bold';
        this._valueElement.style.lineHeight = '1';
        this._valueElement.style.color = 'var(--text-primary)';
        this._centerElement.appendChild(this._valueElement);
        
        // Create label
        if (this._label) {
            this._labelElement = document.createElement('span');
            this._labelElement.className = 'progress-ring-label';
            this._labelElement.textContent = this._label;
            this._labelElement.style.fontSize = `${this._size * 0.1}px`;
            this._labelElement.style.color = 'var(--text-muted)';
            this._labelElement.style.marginTop = '2px';
            this._centerElement.appendChild(this._labelElement);
        }
        
        // Append to container
        this._container.appendChild(this._element);
        
        // Update display
        this._updateDisplay(false);
        
        // Setup resize observer
        if (window.ResizeObserver) {
            this._resizeObserver = new ResizeObserver(this._handleResize);
            this._resizeObserver.observe(this._container);
        }
        
        return this._element;
    }

    /**
     * Update the progress value
     * @param {number} value - New value (0-100)
     * @param {boolean} animate - Whether to animate the transition
     * @returns {Promise} Promise that resolves when animation completes
     */
    setValue(value, animate = true) {
        const newValue = Math.min(100, Math.max(0, value));
        const oldValue = this._value;
        
        if (newValue === oldValue) {
            return Promise.resolve();
        }
        
        this._value = newValue;
        this._element?.setAttribute('aria-valuenow', newValue);
        
        return this._updateDisplay(animate);
    }

    /**
     * Update the display with current value
     * @param {boolean} animate - Whether to animate
     * @returns {Promise} Promise that resolves when animation completes
     */
    _updateDisplay(animate = true) {
        return new Promise((resolve) => {
            const targetValue = this._value;
            const currentValue = this._currentValue;
            
            if (this._animate && animate && targetValue !== currentValue) {
                // Cancel any existing animation
                if (this._animationId) {
                    cancelAnimationFrame(this._animationId);
                    this._animationId = null;
                }
                
                this._isAnimating = true;
                const startTime = performance.now();
                const startValue = currentValue;
                const diff = targetValue - startValue;
                
                const animateFrame = (timestamp) => {
                    const progress = Math.min(1, (timestamp - startTime) / this._animationDuration);
                    const eased = this._easeInOutCubic(progress);
                    const currentVal = startValue + (diff * eased);
                    
                    this._currentValue = currentVal;
                    this._setProgress(currentVal);
                    
                    if (progress < 1) {
                        this._animationId = requestAnimationFrame(animateFrame);
                    } else {
                        this._currentValue = targetValue;
                        this._setProgress(targetValue);
                        this._isAnimating = false;
                        this._animationId = null;
                        
                        if (this._onComplete) {
                            this._onComplete(targetValue);
                        }
                        eventBus.emit('progress-ring.complete', {
                            value: targetValue,
                            element: this._element
                        });
                        resolve();
                    }
                };
                
                this._animationId = requestAnimationFrame(animateFrame);
            } else {
                // No animation, set directly
                this._currentValue = targetValue;
                this._setProgress(targetValue);
                resolve();
            }
        });
    }

    /**
     * Set the progress value directly (no animation)
     * @param {number} value - Value to set (0-100)
     */
    _setProgress(value) {
        const clampedValue = Math.min(100, Math.max(0, value));
        const offset = this._circumference - (clampedValue / 100) * this._circumference;
        
        if (this._circle) {
            this._circle.setAttribute('stroke-dashoffset', offset);
        }
        
        // Update center value
        this._updateCenterValue(clampedValue);
    }

    /**
     * Update the center value display
     * @param {number} value - Current value
     */
    _updateCenterValue(value) {
        if (!this._valueElement) return;
        
        let displayText;
        switch (this._format) {
            case 'number':
                displayText = Math.round(value);
                break;
            case 'fraction':
                const current = Math.round((value / 100) * this._maxValue);
                displayText = `${current}/${this._maxValue}`;
                break;
            case 'percentage':
            default:
                displayText = `${Math.round(value)}%`;
                break;
        }
        
        this._valueElement.textContent = displayText;
    }

    /**
     * Easing function for smooth animation
     * @param {number} t - Progress (0-1)
     * @returns {number} Eased value
     */
    _easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    /**
     * Handle resize of container
     */
    _handleResize() {
        // Check if container size changed and update accordingly
        // (Component can adapt to parent size if needed)
    }

    /**
     * Get the current value
     * @returns {number} Current value (0-100)
     */
    getValue() {
        return this._value;
    }

    /**
     * Get the current displayed value (with animation progress)
     * @returns {number} Current displayed value
     */
    getCurrentDisplayValue() {
        return this._currentValue;
    }

    /**
     * Set the color of the progress ring
     * @param {string} color - CSS color value
     */
    setColor(color) {
        this._color = color;
        if (this._circle) {
            this._circle.setAttribute('stroke', color);
        }
    }

    /**
     * Set the background color of the ring
     * @param {string} color - CSS color value
     */
    setBackgroundColor(color) {
        this._backgroundColor = color;
        if (this._backgroundCircle) {
            this._backgroundCircle.setAttribute('stroke', color);
        }
    }

    /**
     * Set the label text
     * @param {string} label - Label text
     */
    setLabel(label) {
        this._label = label;
        if (this._labelElement) {
            this._labelElement.textContent = label;
        } else if (this._label && this._centerElement) {
            // Create label element if it doesn't exist
            this._labelElement = document.createElement('span');
            this._labelElement.className = 'progress-ring-label';
            this._labelElement.textContent = label;
            this._labelElement.style.fontSize = `${this._size * 0.1}px`;
            this._labelElement.style.color = 'var(--text-muted)';
            this._labelElement.style.marginTop = '2px';
            this._centerElement.appendChild(this._labelElement);
        }
    }

    /**
     * Set the display format
     * @param {string} format - 'percentage' | 'number' | 'fraction'
     */
    setFormat(format) {
        this._format = format;
        this._updateCenterValue(this._currentValue);
    }

    /**
     * Set the max value for fraction format
     * @param {number} maxValue - Maximum value
     */
    setMaxValue(maxValue) {
        this._maxValue = maxValue;
        this._updateCenterValue(this._currentValue);
    }

    /**
     * Set the size of the ring
     * @param {number} size - Size in pixels
     * @param {boolean} rebuild - Rebuild the component
     */
    setSize(size, rebuild = true) {
        this._size = size;
        this._radius = (this._size - this._strokeWidth) / 2;
        this._circumference = 2 * Math.PI * this._radius;
        
        if (rebuild && this._container) {
            // Rebuild with new size
            this.render();
        } else if (this._element) {
            // Update existing element
            this._element.style.width = `${size}px`;
            this._element.style.height = `${size}px`;
            if (this._svg) {
                this._svg.setAttribute('width', size);
                this._svg.setAttribute('height', size);
                this._svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
            }
        }
    }

    /**
     * Set the stroke width
     * @param {number} width - Stroke width in pixels
     * @param {boolean} rebuild - Rebuild the component
     */
    setStrokeWidth(width, rebuild = true) {
        this._strokeWidth = width;
        this._radius = (this._size - this._strokeWidth) / 2;
        this._circumference = 2 * Math.PI * this._radius;
        
        if (rebuild && this._container) {
            this.render();
        } else {
            if (this._circle) {
                this._circle.setAttribute('stroke-width', width);
                this._circle.setAttribute('r', this._radius);
                this._circle.setAttribute('stroke-dasharray', this._circumference);
            }
            if (this._backgroundCircle) {
                this._backgroundCircle.setAttribute('stroke-width', width);
                this._backgroundCircle.setAttribute('r', this._radius);
            }
        }
    }

    /**
     * Show the ring
     */
    show() {
        if (this._element) {
            this._element.style.display = 'inline-flex';
        }
    }

    /**
     * Hide the ring
     */
    hide() {
        if (this._element) {
            this._element.style.display = 'none';
        }
    }

    /**
     * Get the DOM element
     * @returns {HTMLElement} The rendered element
     */
    getElement() {
        return this._element;
    }

    /**
     * Get the SVG element
     * @returns {SVGElement} The SVG element
     */
    getSVG() {
        return this._svg;
    }

    /**
     * Reset the ring to 0%
     * @param {boolean} animate - Whether to animate
     * @returns {Promise} Promise that resolves when reset completes
     */
    reset(animate = true) {
        return this.setValue(0, animate);
    }

    /**
     * Set the ring to 100%
     * @param {boolean} animate - Whether to animate
     * @returns {Promise} Promise that resolves when set completes
     */
    complete(animate = true) {
        return this.setValue(100, animate);
    }

    /**
     * Update the tooltip
     * @param {string} tooltip - Tooltip text
     */
    setTooltip(tooltip) {
        this._tooltip = tooltip;
        if (this._element) {
            this._element.setAttribute('title', tooltip);
        }
    }

    /**
     * Check if currently animating
     * @returns {boolean} True if animating
     */
    isAnimating() {
        return this._isAnimating;
    }

    /**
     * Get the percentage value
     * @returns {number} Value as percentage (0-100)
     */
    asPercentage() {
        return this._value;
    }

    /**
     * Get the value as a fraction
     * @returns {Object} { current, max }
     */
    asFraction() {
        return {
            current: Math.round((this._value / 100) * this._maxValue),
            max: this._maxValue
        };
    }

    /**
     * Get the value as a number
     * @returns {number} Rounded value
     */
    asNumber() {
        return Math.round(this._value);
    }

    /**
     * Clone the component
     * @param {HTMLElement} container - New container
     * @returns {ProgressRing} New instance
     */
    clone(container) {
        return new ProgressRing({
            container: container || null,
            value: this._value,
            size: this._size,
            strokeWidth: this._strokeWidth,
            color: this._color,
            backgroundColor: this._backgroundColor,
            label: this._label,
            format: this._format,
            maxValue: this._maxValue,
            animate: this._animate,
            animationDuration: this._animationDuration,
            tooltip: this._tooltip
        });
    }

    /**
     * Destroy the component
     */
    destroy() {
        // Cancel animation
        if (this._animationId) {
            cancelAnimationFrame(this._animationId);
            this._animationId = null;
        }
        
        // Disconnect resize observer
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        
        // Remove from DOM
        if (this._element && this._element.parentNode) {
            this._element.parentNode.removeChild(this._element);
        }
        
        // Clear references
        this._element = null;
        this._svg = null;
        this._circle = null;
        this._backgroundCircle = null;
        this._centerElement = null;
        this._valueElement = null;
        this._labelElement = null;
        this._container = null;
    }

    /**
     * Create a progress ring instance with default settings
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Options
     * @returns {ProgressRing} New instance
     */
    static create(container, options = {}) {
        return new ProgressRing({
            container,
            size: options.size || 120,
            strokeWidth: options.strokeWidth || 6,
            color: options.color || 'var(--color-primary)',
            backgroundColor: options.backgroundColor || 'var(--bg-surface-alt)',
            label: options.label || '',
            format: options.format || 'percentage',
            maxValue: options.maxValue || 100,
            animate: options.animate !== undefined ? options.animate : true,
            animationDuration: options.animationDuration || 800,
            tooltip: options.tooltip || '',
            ...options
        });
    }

    /**
     * Create a small progress ring (for compact displays)
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Options
     * @returns {ProgressRing} New instance
     */
    static createSmall(container, options = {}) {
        return new ProgressRing({
            container,
            size: 60,
            strokeWidth: 4,
            color: options.color || 'var(--color-primary)',
            backgroundColor: options.backgroundColor || 'var(--bg-surface-alt)',
            label: options.label || '',
            format: 'percentage',
            animate: options.animate !== undefined ? options.animate : true,
            animationDuration: 600,
            ...options
        });
    }

    /**
     * Create a large progress ring (for dashboard emphasis)
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Options
     * @returns {ProgressRing} New instance
     */
    static createLarge(container, options = {}) {
        return new ProgressRing({
            container,
            size: 180,
            strokeWidth: 8,
            color: options.color || 'var(--color-primary)',
            backgroundColor: options.backgroundColor || 'var(--bg-surface-alt)',
            label: options.label || '',
            format: 'percentage',
            animate: options.animate !== undefined ? options.animate : true,
            animationDuration: 1000,
            ...options
        });
    }
}

/**
 * Create and export the component
 */
export default ProgressRing;
