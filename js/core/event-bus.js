/**
 * ============================================================
 * js/core/event-bus.js — Event Communication System
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Event Bus
 * 
 * A lightweight publish-subscribe system for inter-module communication.
 * Enables decoupled components to communicate through events.
 * Supports wildcard listeners and priority ordering.
 */

class EventBus {
    constructor() {
        // Map of event name -> Set of listeners
        this._listeners = new Map();
        
        // Map of wildcard listeners
        this._wildcardListeners = new Set();
        
        // Map for once-only listeners
        this._onceListeners = new Map();
        
        // Maximum listeners per event (to prevent memory leaks)
        this.MAX_LISTENERS = 100;
        
        // Flag to prevent reentrant event dispatching
        this._dispatching = false;
        
        // Event history for debugging
        this._history = [];
        this.MAX_HISTORY = 50;
        this._debugMode = false;
    }

    /**
     * Register a listener for an event
     * @param {string} event - Event name (supports wildcards like 'page.*')
     * @param {Function} callback - Callback function
     * @param {Object} options - Additional options
     * @param {number} options.priority - Higher priority = executed first (default: 0)
     * @param {Object} options.context - 'this' context for the callback
     * @returns {Function} Unsubscribe function
     */
    on(event, callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new Error('Event callback must be a function');
        }

        // Check for wildcard event
        if (event.includes('*')) {
            return this._addWildcardListener(event, callback, options);
        }

        // Create listener entry
        const listener = {
            callback,
            priority: options.priority || 0,
            context: options.context || null,
            id: this._generateListenerId()
        };

        // Add to listeners map
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }

        const listeners = this._listeners.get(event);
        
        // Check for max listeners
        if (listeners.size >= this.MAX_LISTENERS) {
            console.warn(`Maximum listeners (${this.MAX_LISTENERS}) reached for event "${event}"`);
        }

        listeners.add(listener);

        // Return unsubscribe function
        return () => {
            this.off(event, callback);
        };
    }

    /**
     * Register a one-time listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @param {Object} options - Same options as on()
     * @returns {Function} Unsubscribe function
     */
    once(event, callback, options = {}) {
        const onceWrapper = (...args) => {
            this.off(event, onceWrapper);
            callback.apply(options.context || null, args);
        };

        // Store the wrapper for cleanup
        if (!this._onceListeners.has(event)) {
            this._onceListeners.set(event, new Set());
        }
        this._onceListeners.get(event).add(onceWrapper);

        return this.on(event, onceWrapper, options);
    }

    /**
     * Remove a listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     * @returns {boolean} True if listener was removed
     */
    off(event, callback) {
        // Check wildcard listeners first
        let removed = false;
        for (const wildcard of this._wildcardListeners) {
            if (wildcard.callback === callback && this._matchesWildcard(event, wildcard.pattern)) {
                this._wildcardListeners.delete(wildcard);
                removed = true;
            }
        }

        // Remove from regular listeners
        if (this._listeners.has(event)) {
            const listeners = this._listeners.get(event);
            for (const listener of listeners) {
                if (listener.callback === callback) {
                    listeners.delete(listener);
                    removed = true;
                    break;
                }
            }
            // Clean up empty listener sets
            if (listeners.size === 0) {
                this._listeners.delete(event);
            }
        }

        // Remove from once listeners
        if (this._onceListeners.has(event)) {
            const onceListeners = this._onceListeners.get(event);
            for (const onceCallback of onceListeners) {
                if (onceCallback === callback) {
                    onceListeners.delete(onceCallback);
                    removed = true;
                    break;
                }
            }
            if (onceListeners.size === 0) {
                this._onceListeners.delete(event);
            }
        }

        return removed;
    }

    /**
     * Remove all listeners for an event
     * @param {string} event - Event name (optional)
     */
    offAll(event = null) {
        if (event) {
            // Remove specific event
            this._listeners.delete(event);
            this._onceListeners.delete(event);
        } else {
            // Remove all listeners
            this._listeners.clear();
            this._wildcardListeners.clear();
            this._onceListeners.clear();
            this._history = [];
        }
    }

    /**
     * Trigger an event
     * @param {string} event - Event name
     * @param {...*} data - Data to pass to listeners
     * @returns {Promise} Promise that resolves when all listeners complete
     */
    emit(event, ...data) {
        if (this._dispatching) {
            console.warn('Reentrant event dispatch detected for event:', event);
        }

        this._dispatching = true;

        try {
            // Log event history (if debugging)
            if (this._debugMode) {
                this._logEvent(event, data);
            }

            // Get all listeners for this event
            const listeners = this._getListenersForEvent(event);
            
            // Sort by priority (higher priority first)
            const sortedListeners = [...listeners].sort((a, b) => b.priority - a.priority);

            // Execute all listeners
            const results = [];
            for (const listener of sortedListeners) {
                try {
                    const result = listener.callback.apply(listener.context, data);
                    results.push(result);
                } catch (error) {
                    console.error(`Error in event listener for "${event}":`, error);
                    results.push(null);
                }
            }

            this._dispatching = false;
            return Promise.resolve(results);
        } catch (error) {
            this._dispatching = false;
            console.error(`Error dispatching event "${event}":`, error);
            throw error;
        }
    }

    /**
     * Trigger an event and wait for all listeners to complete
     * @param {string} event - Event name
     * @param {...*} data - Data to pass to listeners
     * @returns {Promise} Promise that resolves when all async listeners complete
     */
    async emitAsync(event, ...data) {
        if (this._dispatching) {
            console.warn('Reentrant event dispatch detected for event:', event);
        }

        this._dispatching = true;

        try {
            if (this._debugMode) {
                this._logEvent(event, data);
            }

            const listeners = this._getListenersForEvent(event);
            const sortedListeners = [...listeners].sort((a, b) => b.priority - a.priority);

            const results = [];
            for (const listener of sortedListeners) {
                try {
                    const result = await listener.callback.apply(listener.context, data);
                    results.push(result);
                } catch (error) {
                    console.error(`Error in async event listener for "${event}":`, error);
                    results.push(null);
                }
            }

            this._dispatching = false;
            return results;
        } catch (error) {
            this._dispatching = false;
            console.error(`Error dispatching async event "${event}":`, error);
            throw error;
        }
    }

    /**
     * Get all listeners for an event (including wildcard matches)
     * @param {string} event - Event name
     * @returns {Set} Set of listeners
     */
    _getListenersForEvent(event) {
        const listeners = new Set();

        // Add direct listeners
        if (this._listeners.has(event)) {
            for (const listener of this._listeners.get(event)) {
                listeners.add(listener);
            }
        }

        // Add wildcard listeners that match
        for (const wildcard of this._wildcardListeners) {
            if (this._matchesWildcard(event, wildcard.pattern)) {
                const listener = {
                    callback: wildcard.callback,
                    priority: wildcard.priority || 0,
                    context: wildcard.context || null
                };
                listeners.add(listener);
            }
        }

        // Add once listeners
        if (this._onceListeners.has(event)) {
            for (const onceCallback of this._onceListeners.get(event)) {
                // Find the original listener wrapper
                for (const listener of listeners) {
                    if (listener.callback === onceCallback) {
                        listeners.add(listener);
                        break;
                    }
                }
            }
        }

        return listeners;
    }

    /**
     * Add a wildcard listener
     * @param {string} pattern - Wildcard pattern (e.g., 'page.*')
     * @param {Function} callback - Callback function
     * @param {Object} options - Options object
     * @returns {Function} Unsubscribe function
     */
    _addWildcardListener(pattern, callback, options) {
        const wildcard = {
            pattern,
            callback,
            priority: options.priority || 0,
            context: options.context || null,
            id: this._generateListenerId()
        };

        this._wildcardListeners.add(wildcard);

        return () => {
            this._wildcardListeners.delete(wildcard);
        };
    }

    /**
     * Check if an event matches a wildcard pattern
     * @param {string} event - Event name
     * @param {string} pattern - Wildcard pattern
     * @returns {boolean} True if matches
     */
    _matchesWildcard(event, pattern) {
        // Exact match
        if (pattern === '*') return true;
        
        // Pattern like 'page.*'
        if (pattern.endsWith('.*')) {
            const prefix = pattern.slice(0, -2);
            return event.startsWith(prefix);
        }
        
        // Pattern like '*.complete'
        if (pattern.startsWith('*.')) {
            const suffix = pattern.slice(1);
            return event.endsWith(suffix);
        }
        
        // Pattern like 'page.*.exam'
        if (pattern.includes('*')) {
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            return regex.test(event);
        }
        
        return false;
    }

    /**
     * Generate a unique listener ID
     * @returns {string} Unique ID
     */
    _generateListenerId() {
        return 'listener_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Log event history for debugging
     * @param {string} event - Event name
     * @param {Array} data - Event data
     */
    _logEvent(event, data) {
        this._history.push({
            event,
            data,
            timestamp: Date.now(),
            listeners: this._listeners.get(event)?.size || 0
        });

        if (this._history.length > this.MAX_HISTORY) {
            this._history.shift();
        }
    }

    /**
     * Enable or disable debug mode
     * @param {boolean} enabled - Enable debug mode
     */
    setDebugMode(enabled) {
        this._debugMode = enabled;
        if (!enabled) {
            this._history = [];
        }
    }

    /**
     * Get event history (for debugging)
     * @returns {Array} Event history
     */
    getHistory() {
        return [...this._history];
    }

    /**
     * Get count of listeners for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    listenerCount(event) {
        let count = 0;
        if (this._listeners.has(event)) {
            count += this._listeners.get(event).size;
        }
        if (this._onceListeners.has(event)) {
            count += this._onceListeners.get(event).size;
        }
        for (const wildcard of this._wildcardListeners) {
            if (this._matchesWildcard(event, wildcard.pattern)) {
                count++;
            }
        }
        return count;
    }

    /**
     * Get all registered event names
     * @returns {Array} Array of event names
     */
    getEvents() {
        const events = new Set();
        for (const event of this._listeners.keys()) {
            events.add(event);
        }
        for (const wildcard of this._wildcardListeners) {
            events.add(wildcard.pattern);
        }
        return Array.from(events);
    }

    /**
     * Check if an event has listeners
     * @param {string} event - Event name
     * @returns {boolean} True if has listeners
     */
    hasListeners(event) {
        return this.listenerCount(event) > 0;
    }

    /**
     * Create a scoped event bus (with prefixed events)
     * @param {string} prefix - Event prefix
     * @returns {Object} Scoped event bus
     */
    scope(prefix) {
        return {
            on: (event, callback, options) => {
                return this.on(`${prefix}.${event}`, callback, options);
            },
            once: (event, callback, options) => {
                return this.once(`${prefix}.${event}`, callback, options);
            },
            off: (event, callback) => {
                return this.off(`${prefix}.${event}`, callback);
            },
            emit: (event, ...data) => {
                return this.emit(`${prefix}.${event}`, ...data);
            },
            emitAsync: (event, ...data) => {
                return this.emitAsync(`${prefix}.${event}`, ...data);
            },
            getPrefix: () => prefix
        };
    }

    /**
     * Clear all event listeners and history
     */
    clear() {
        this._listeners.clear();
        this._wildcardListeners.clear();
        this._onceListeners.clear();
        this._history = [];
        this._dispatching = false;
    }

    /**
     * Get statistics about the event bus
     * @returns {Object} Statistics
     */
    getStats() {
        let totalListeners = 0;
        for (const listeners of this._listeners.values()) {
            totalListeners += listeners.size;
        }
        for (const listeners of this._onceListeners.values()) {
            totalListeners += listeners.size;
        }
        totalListeners += this._wildcardListeners.size;

        return {
            totalEvents: this._listeners.size,
            totalWildcards: this._wildcardListeners.size,
            totalOnceListeners: this._onceListeners.size,
            totalListeners,
            eventNames: this.getEvents(),
            historySize: this._history.length,
            isDispatching: this._dispatching
        };
    }
}

/**
 * Create and export a singleton instance
 */
const eventBus = new EventBus();

// Freeze the event bus object
const eventBus = new EventBus();

// Export the event bus
export default eventBus;
