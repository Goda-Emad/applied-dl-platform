/**
 * ============================================================
 * js/components/timer.js — Countdown Timer Component
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Timer Component
 * 
 * A reusable countdown timer for exam sessions.
 * Supports start, pause, resume, stop, reset, and automatic completion.
 * Emits events for timer state changes.
 */

import state from '../core/state.js';
import eventBus from '../core/event-bus.js';

class Timer {
    /**
     * Create a new Timer instance
     * @param {Object} options - Configuration options
     * @param {number} options.duration - Total duration in seconds
     * @param {number} options.warningThreshold - Seconds remaining for warning state (default: 60)
     * @param {number} options.criticalThreshold - Seconds remaining for critical state (default: 30)
     * @param {number} options.interval - Update interval in milliseconds (default: 1000)
     * @param {boolean} options.autoStart - Start automatically (default: false)
     * @param {Function} options.onTick - Callback on each tick
     * @param {Function} options.onComplete - Callback when timer completes
     * @param {Function} options.onWarning - Callback when warning threshold reached
     * @param {Function} options.onCritical - Callback when critical threshold reached
     */
    constructor(options = {}) {
        // Configuration
        this._duration = options.duration || 0;
        this._warningThreshold = options.warningThreshold || 60;
        this._criticalThreshold = options.criticalThreshold || 30;
        this._interval = options.interval || 1000;
        this._autoStart = options.autoStart || false;
        
        // Callbacks
        this._onTick = options.onTick || null;
        this._onComplete = options.onComplete || null;
        this._onWarning = options.onWarning || null;
        this._onCritical = options.onCritical || null;
        
        // State
        this._remaining = this._duration;
        this._elapsed = 0;
        this._isRunning = false;
        this._isPaused = false;
        this._isComplete = false;
        this._intervalId = null;
        this._startTime = null;
        this._pausedAt = null;
        this._warningTriggered = false;
        this._criticalTriggered = false;
        
        // DOM element for display (optional)
        this._element = null;
        
        // Bind methods
        this._tick = this._tick.bind(this);
        this._handleVisibilityChange = this._handleVisibilityChange.bind(this);
        
        // Auto-start if enabled
        if (this._autoStart && this._duration > 0) {
            this.start();
        }
    }

    /**
     * Start the timer
     * @param {number} duration - Optional duration to override current
     * @returns {Timer} This instance for chaining
     */
    start(duration = null) {
        // If duration is provided, reset first
        if (duration !== null && duration > 0) {
            this._duration = duration;
            this._remaining = duration;
            this._elapsed = 0;
            this._isComplete = false;
            this._warningTriggered = false;
            this._criticalTriggered = false;
        }
        
        // Check if timer can start
        if (this._isRunning) {
            console.warn('Timer is already running');
            return this;
        }
        
        if (this._remaining <= 0) {
            console.warn('Timer duration must be greater than 0');
            return this;
        }
        
        // Start the timer
        this._isRunning = true;
        this._isPaused = false;
        this._startTime = Date.now() - (this._elapsed * 1000);
        
        // Clear any existing interval
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        
        // Start interval
        this._intervalId = setInterval(this._tick, this._interval);
        
        // Emit event
        eventBus.emit('timer.started', {
            duration: this._duration,
            remaining: this._remaining
        });
        
        // Update state
        state.set('exam.timer.started', true);
        state.set('exam.timer.timeRemaining', this._remaining);
        
        // Log for debugging
        console.log(`Timer started: ${this._formatTime(this._remaining)}`);
        
        return this;
    }

    /**
     * Pause the timer
     * @returns {Timer} This instance for chaining
     */
    pause() {
        if (!this._isRunning || this._isPaused || this._isComplete) {
            return this;
        }
        
        // Pause the timer
        this._isPaused = true;
        this._pausedAt = Date.now();
        
        // Clear interval
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        
        // Emit event
        eventBus.emit('timer.paused', {
            remaining: this._remaining,
            elapsed: this._elapsed
        });
        
        // Update state
        state.set('exam.timer.started', true);
        state.set('exam.timer.timeRemaining', this._remaining);
        
        console.log(`Timer paused: ${this._formatTime(this._remaining)} remaining`);
        
        return this;
    }

    /**
     * Resume the timer
     * @returns {Timer} This instance for chaining
     */
    resume() {
        if (!this._isPaused || this._isComplete) {
            return this;
        }
        
        if (this._remaining <= 0) {
            this.complete();
            return this;
        }
        
        // Resume the timer
        this._isPaused = false;
        this._startTime = Date.now() - (this._elapsed * 1000);
        this._pausedAt = null;
        
        // Restart interval
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        this._intervalId = setInterval(this._tick, this._interval);
        
        // Emit event
        eventBus.emit('timer.resumed', {
            remaining: this._remaining,
            elapsed: this._elapsed
        });
        
        // Update state
        state.set('exam.timer.started', true);
        state.set('exam.timer.timeRemaining', this._remaining);
        
        console.log(`Timer resumed: ${this._formatTime(this._remaining)} remaining`);
        
        return this;
    }

    /**
     * Stop the timer (stop and reset to initial state)
     * @returns {Timer} This instance for chaining
     */
    stop() {
        if (!this._isRunning && !this._isPaused) {
            return this;
        }
        
        // Clear interval
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        
        // Reset state
        this._isRunning = false;
        this._isPaused = false;
        this._isComplete = false;
        this._startTime = null;
        this._pausedAt = null;
        this._warningTriggered = false;
        this._criticalTriggered = false;
        
        // Emit event
        eventBus.emit('timer.stopped', {
            remaining: this._remaining,
            elapsed: this._elapsed
        });
        
        // Update state
        state.set('exam.timer.started', false);
        
        console.log(`Timer stopped: ${this._formatTime(this._remaining)} remaining`);
        
        return this;
    }

    /**
     * Reset the timer to initial duration
     * @param {number} duration - Optional new duration
     * @returns {Timer} This instance for chaining
     */
    reset(duration = null) {
        // Clear interval
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        
        // Reset state
        if (duration !== null && duration > 0) {
            this._duration = duration;
        }
        this._remaining = this._duration;
        this._elapsed = 0;
        this._isRunning = false;
        this._isPaused = false;
        this._isComplete = false;
        this._startTime = null;
        this._pausedAt = null;
        this._warningTriggered = false;
        this._criticalTriggered = false;
        
        // Emit event
        eventBus.emit('timer.reset', {
            duration: this._duration,
            remaining: this._remaining
        });
        
        // Update state
        state.set('exam.timer.started', false);
        state.set('exam.timer.timeRemaining', this._remaining);
        
        // Update display if rendered
        if (this._element) {
            this._updateDisplay();
            this._updateDisplayState();
        }
        
        console.log(`Timer reset: ${this._formatTime(this._remaining)}`);
        
        return this;
    }

    /**
     * Complete the timer (force completion)
     * @returns {Timer} This instance for chaining
     */
    complete() {
        if (this._isComplete) {
            return this;
        }
        
        // Clear interval
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        
        // Set state
        this._remaining = 0;
        this._elapsed = this._duration;
        this._isRunning = false;
        this._isPaused = false;
        this._isComplete = true;
        
        // Update display
        if (this._element) {
            this._updateDisplay();
            this._updateDisplayState();
        }
        
        // Emit event
        eventBus.emit('timer.complete', {
            elapsed: this._elapsed,
            duration: this._duration
        });
        
        // Update state
        state.set('exam.timer.started', false);
        state.set('exam.timer.timeRemaining', 0);
        
        // Callback
        if (this._onComplete) {
            this._onComplete();
        }
        
        console.log('Timer completed!');
        
        return this;
    }

    /**
     * Tick the timer (called by interval)
     * @private
     */
    _tick() {
        if (this._isPaused || this._isComplete) {
            return;
        }
        
        // Calculate remaining time
        const now = Date.now();
        if (this._startTime === null) {
            this._startTime = now;
        }
        
        this._elapsed = (now - this._startTime) / 1000;
        this._remaining = Math.max(0, this._duration - this._elapsed);
        
        // Check for completion
        if (this._remaining <= 0) {
            this._remaining = 0;
            this.complete();
            return;
        }
        
        // Check thresholds
        this._checkThresholds();
        
        // Update display
        if (this._element) {
            this._updateDisplay();
            this._updateDisplayState();
        }
        
        // Update state
        state.set('exam.timer.timeRemaining', this._remaining);
        
        // Callback
        if (this._onTick) {
            this._onTick(this._remaining, this._elapsed);
        }
        
        // Emit tick event
        eventBus.emit('timer.tick', {
            remaining: this._remaining,
            elapsed: this._elapsed,
            percentage: this.getPercentage()
        });
    }

    /**
     * Check warning and critical thresholds
     * @private
     */
    _checkThresholds() {
        // Warning threshold
        if (this._remaining <= this._warningThreshold && !this._warningTriggered) {
            this._warningTriggered = true;
            if (this._onWarning) {
                this._onWarning(this._remaining);
            }
            eventBus.emit('timer.warning', {
                remaining: this._remaining,
                threshold: this._warningThreshold
            });
        }
        
        // Critical threshold
        if (this._remaining <= this._criticalThreshold && !this._criticalTriggered) {
            this._criticalTriggered = true;
            if (this._onCritical) {
                this._onCritical(this._remaining);
            }
            eventBus.emit('timer.critical', {
                remaining: this._remaining,
                threshold: this._criticalThreshold
            });
        }
    }

    /**
     * Handle visibility change (pause timer when tab is hidden)
     * @private
     */
    _handleVisibilityChange() {
        if (document.hidden) {
            if (this._isRunning && !this._isPaused) {
                // Auto-pause when tab is hidden
                this.pause();
                this._autoPaused = true;
            }
        } else {
            if (this._autoPaused && this._isPaused) {
                // Auto-resume when tab becomes visible
                this.resume();
                this._autoPaused = false;
            }
        }
    }

    /**
     * Update the timer display
     * @private
     */
    _updateDisplay() {
        if (!this._element) return;
        
        const formatted = this.getFormattedTime();
        this._element.textContent = formatted;
        
        // Update data attributes for styling
        this._element.dataset.remaining = this._remaining;
        this._element.dataset.elapsed = this._elapsed;
        this._element.dataset.percentage = this.getPercentage();
    }

    /**
     * Update display state (warning/critical classes)
     * @private
     */
    _updateDisplayState() {
        if (!this._element) return;
        
        // Remove existing state classes
        this._element.classList.remove('warning', 'critical', 'complete');
        
        if (this._isComplete) {
            this._element.classList.add('complete');
        } else if (this._remaining <= this._criticalThreshold && this._remaining > 0) {
            this._element.classList.add('critical');
        } else if (this._remaining <= this._warningThreshold && this._remaining > 0) {
            this._element.classList.add('warning');
        }
    }

    // ── Formatting Methods ─────────────────────────────────────

    /**
     * Get formatted time as MM:SS
     * @returns {string} Formatted time
     */
    getFormattedTime() {
        return this._formatTime(this._remaining);
    }

    /**
     * Get formatted time with hours (HH:MM:SS)
     * @returns {string} Formatted time
     */
    getFormattedTimeWithHours() {
        return this._formatTimeWithHours(this._remaining);
    }

    /**
     * Format seconds as MM:SS
     * @param {number} seconds - Seconds to format
     * @returns {string} Formatted time
     * @private
     */
    _formatTime(seconds) {
        if (seconds < 0) seconds = 0;
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    /**
     * Format seconds as HH:MM:SS
     * @param {number} seconds - Seconds to format
     * @returns {string} Formatted time
     * @private
     */
    _formatTimeWithHours(seconds) {
        if (seconds < 0) seconds = 0;
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        if (hours > 0) {
            return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return this._formatTime(seconds);
    }

    /**
     * Get time remaining in seconds
     * @returns {number} Remaining time in seconds
     */
    getRemaining() {
        return this._remaining;
    }

    /**
     * Get elapsed time in seconds
     * @returns {number} Elapsed time in seconds
     */
    getElapsed() {
        return this._elapsed;
    }

    /**
     * Get total duration in seconds
     * @returns {number} Total duration
     */
    getDuration() {
        return this._duration;
    }

    /**
     * Get percentage of time remaining
     * @returns {number} Percentage (0-100)
     */
    getPercentage() {
        if (this._duration <= 0) return 0;
        return (this._remaining / this._duration) * 100;
    }

    /**
     * Get percentage of time elapsed
     * @returns {number} Percentage (0-100)
     */
    getElapsedPercentage() {
        if (this._duration <= 0) return 0;
        return (this._elapsed / this._duration) * 100;
    }

    /**
     * Check if timer is running
     * @returns {boolean} True if running
     */
    isRunning() {
        return this._isRunning && !this._isPaused && !this._isComplete;
    }

    /**
     * Check if timer is paused
     * @returns {boolean} True if paused
     */
    isPaused() {
        return this._isPaused;
    }

    /**
     * Check if timer is complete
     * @returns {boolean} True if complete
     */
    isComplete() {
        return this._isComplete;
    }

    /**
     * Check if timer is in warning state
     * @returns {boolean} True if warning
     */
    isWarning() {
        return !this._isComplete && this._remaining <= this._warningThreshold;
    }

    /**
     * Check if timer is in critical state
     * @returns {boolean} True if critical
     */
    isCritical() {
        return !this._isComplete && this._remaining <= this._criticalThreshold;
    }

    // ── DOM Rendering ──────────────────────────────────────────

    /**
     * Render the timer to a DOM element
     * @param {HTMLElement} container - Container element
     * @param {string} format - Display format: 'mm:ss' or 'hh:mm:ss'
     * @returns {HTMLElement} The timer element
     */
    render(container, format = 'mm:ss') {
        // Create timer element
        this._element = document.createElement('span');
        this._element.className = 'timer-display';
        this._element.setAttribute('role', 'timer');
        this._element.setAttribute('aria-live', 'polite');
        
        // Set initial display
        this._updateDisplay();
        this._updateDisplayState();
        
        // Store format
        this._displayFormat = format;
        
        // Add to container
        if (container) {
            container.appendChild(this._element);
        }
        
        // Setup visibility change listener for auto-pause
        document.addEventListener('visibilitychange', this._handleVisibilityChange);
        
        return this._element;
    }

    /**
     * Update the displayed time format
     * @param {string} format - 'mm:ss' or 'hh:mm:ss'
     */
    setDisplayFormat(format) {
        this._displayFormat = format;
        if (this._element) {
            this._updateDisplay();
        }
    }

    /**
     * Override update display to use selected format
     * @private
     */
    _updateDisplay() {
        if (!this._element) return;
        
        let formatted;
        if (this._displayFormat === 'hh:mm:ss' || this._duration >= 3600) {
            formatted = this._formatTimeWithHours(this._remaining);
        } else {
            formatted = this._formatTime(this._remaining);
        }
        
        this._element.textContent = formatted;
        
        // Update data attributes for styling
        this._element.dataset.remaining = this._remaining;
        this._element.dataset.elapsed = this._elapsed;
        this._element.dataset.percentage = this.getPercentage();
    }

    // ── Cleanup ────────────────────────────────────────────────

    /**
     * Clean up the timer (clear interval, remove listeners)
     */
    destroy() {
        // Clear interval
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
        
        // Remove event listeners
        document.removeEventListener('visibilitychange', this._handleVisibilityChange);
        
        // Remove from DOM
        if (this._element && this._element.parentNode) {
            this._element.parentNode.removeChild(this._element);
        }
        
        // Reset state
        this._isRunning = false;
        this._isPaused = false;
        this._isComplete = false;
        this._startTime = null;
        this._pausedAt = null;
        this._element = null;
        
        console.log('Timer destroyed');
    }

    /**
     * Get timer statistics
     * @returns {Object} Timer statistics
     */
    getStats() {
        return {
            duration: this._duration,
            remaining: this._remaining,
            elapsed: this._elapsed,
            percentageRemaining: this.getPercentage(),
            percentageElapsed: this.getElapsedPercentage(),
            isRunning: this.isRunning(),
            isPaused: this.isPaused(),
            isComplete: this.isComplete(),
            isWarning: this.isWarning(),
            isCritical: this.isCritical()
        };
    }

    /**
     * Get a snapshot of the current state
     * @returns {Object} State snapshot
     */
    snapshot() {
        return {
            duration: this._duration,
            remaining: this._remaining,
            elapsed: this._elapsed,
            isRunning: this._isRunning,
            isPaused: this._isPaused,
            isComplete: this._isComplete,
            warningTriggered: this._warningTriggered,
            criticalTriggered: this._criticalTriggered
        };
    }

    /**
     * Restore state from a snapshot
     * @param {Object} snapshot - State snapshot
     * @param {boolean} start - Start the timer after restore
     * @returns {Timer} This instance for chaining
     */
    restore(snapshot, start = false) {
        if (!snapshot) return this;
        
        this._duration = snapshot.duration || this._duration;
        this._remaining = snapshot.remaining || this._duration;
        this._elapsed = snapshot.elapsed || 0;
        this._isRunning = snapshot.isRunning || false;
        this._isPaused = snapshot.isPaused || false;
        this._isComplete = snapshot.isComplete || false;
        this._warningTriggered = snapshot.warningTriggered || false;
        this._criticalTriggered = snapshot.criticalTriggered || false;
        
        if (this._element) {
            this._updateDisplay();
            this._updateDisplayState();
        }
        
        if (start && !this._isRunning && !this._isComplete) {
            this.start();
        }
        
        return this;
    }

    /**
     * Set duration
     * @param {number} duration - Duration in seconds
     * @param {boolean} reset - Reset the timer
     * @returns {Timer} This instance for chaining
     */
    setDuration(duration, reset = true) {
        if (duration > 0) {
            this._duration = duration;
            if (reset) {
                this.reset();
            }
        }
        return this;
    }

    /**
     * Add time to the timer
     * @param {number} seconds - Seconds to add
     * @returns {Timer} This instance for chaining
     */
    addTime(seconds) {
        if (seconds <= 0) return this;
        
        this._duration += seconds;
        this._remaining += seconds;
        
        // If timer is running, adjust start time
        if (this._isRunning && !this._isPaused && this._startTime) {
            this._startTime -= seconds * 1000;
        }
        
        if (this._element) {
            this._updateDisplay();
            this._updateDisplayState();
        }
        
        // Update state
        state.set('exam.timer.timeRemaining', this._remaining);
        
        eventBus.emit('timer.time.added', {
            seconds,
            remaining: this._remaining,
            duration: this._duration
        });
        
        return this;
    }

    /**
     * Subtract time from the timer
     * @param {number} seconds - Seconds to subtract
     * @returns {Timer} This instance for chaining
     */
    subtractTime(seconds) {
        if (seconds <= 0) return this;
        
        this._remaining = Math.max(0, this._remaining - seconds);
        this._duration = Math.max(0, this._duration - seconds);
        this._elapsed = this._duration - this._remaining;
        
        if (this._remaining <= 0) {
            this.complete();
        } else {
            // If timer is running, adjust start time
            if (this._isRunning && !this._isPaused && this._startTime) {
                this._startTime += seconds * 1000;
            }
            
            if (this._element) {
                this._updateDisplay();
                this._updateDisplayState();
            }
            
            // Update state
            state.set('exam.timer.timeRemaining', this._remaining);
            
            eventBus.emit('timer.time.subtracted', {
                seconds,
                remaining: this._remaining,
                duration: this._duration
            });
        }
        
        return this;
    }
}

/**
 * Create and export the component
 */
export default Timer;
