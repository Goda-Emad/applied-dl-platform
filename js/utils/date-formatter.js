/**
 * ============================================================
 * js/utils/date-formatter.js — Date & Time Formatting Utility
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Date Formatter Utility
 * 
 * Provides consistent date, time, and duration formatting
 * throughout the application. Handles invalid input gracefully.
 */

/**
 * Format a date to a readable string
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Formatting options
 * @param {string} options.format - Format: 'full', 'date', 'time', 'datetime', 'short', 'long'
 * @param {boolean} options.includeTime - Include time in output
 * @param {string} options.locale - Locale (default: 'en-US')
 * @param {string} options.fallback - Fallback string for invalid dates
 * @returns {string} Formatted date
 */
export function formatDate(date, options = {}) {
    const {
        format = 'full',
        includeTime = false,
        locale = 'en-US',
        fallback = 'Invalid date'
    } = options;

    const parsed = parseDate(date);
    if (!parsed) {
        return fallback;
    }

    try {
        switch (format) {
            case 'date':
                return parsed.toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            case 'short':
                return parsed.toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            case 'time':
                return parsed.toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            case 'datetime':
                return parsed.toLocaleString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            case 'full':
            default:
                if (includeTime) {
                    return parsed.toLocaleString(locale, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                }
                return parsed.toLocaleString(locale, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
        }
    } catch (error) {
        console.warn('Error formatting date:', error);
        return fallback;
    }
}

/**
 * Get relative time string (e.g., "5 minutes ago")
 * @param {Date|string|number} date - Date to compare
 * @param {Object} options - Options
 * @param {string} options.fallback - Fallback string
 * @param {number} options.now - Reference time (for testing)
 * @returns {string} Relative time string
 */
export function getRelativeTime(date, options = {}) {
    const {
        fallback = 'Unknown time',
        now = Date.now()
    } = options;

    const parsed = parseDate(date);
    if (!parsed) {
        return fallback;
    }

    const diffMs = now - parsed.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    // Future dates
    if (diffMs < 0) {
        const futureMs = Math.abs(diffMs);
        const futureSec = Math.floor(futureMs / 1000);
        const futureMin = Math.floor(futureSec / 60);
        const futureHour = Math.floor(futureMin / 60);
        const futureDay = Math.floor(futureHour / 24);

        if (futureSec < 60) return 'in a few seconds';
        if (futureMin < 60) return `in ${futureMin} minute${futureMin > 1 ? 's' : ''}`;
        if (futureHour < 24) return `in ${futureHour} hour${futureHour > 1 ? 's' : ''}`;
        if (futureDay < 7) return `in ${futureDay} day${futureDay > 1 ? 's' : ''}`;
        return formatDate(parsed, { format: 'short' });
    }

    // Past dates
    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec} second${diffSec > 1 ? 's' : ''} ago`;
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) {
        if (diffDay === 1) return 'Yesterday';
        return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    }
    if (diffWeek < 4) return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`;
    if (diffMonth < 12) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
    return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
}

/**
 * Format duration in seconds to readable string
 * @param {number} seconds - Duration in seconds
 * @param {Object} options - Formatting options
 * @param {string} options.format - Format: 'auto', 'mm:ss', 'hh:mm:ss', 'human', 'short'
 * @param {boolean} options.includeSeconds - Include seconds in human format
 * @returns {string} Formatted duration
 */
export function formatDuration(seconds, options = {}) {
    const {
        format = 'auto',
        includeSeconds = true
    } = options;

    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
        return '0:00';
    }

    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    switch (format) {
        case 'mm:ss':
            return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        
        case 'hh:mm:ss':
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        
        case 'human':
            return formatDurationHuman(totalSeconds, includeSeconds);
        
        case 'short':
            if (hours > 0) {
                return `${hours}h ${minutes}m`;
            }
            if (minutes > 0) {
                return `${minutes}m ${secs}s`;
            }
            return `${secs}s`;
        
        case 'auto':
        default:
            if (hours > 0) {
                return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }
            return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
}

/**
 * Format duration in human-readable form
 * @param {number} totalSeconds - Total seconds
 * @param {boolean} includeSeconds - Include seconds
 * @returns {string} Human-readable duration
 */
function formatDurationHuman(totalSeconds, includeSeconds = true) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (hours > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0) {
        parts.push(`${minutes}m`);
    }
    if (includeSeconds && seconds > 0) {
        parts.push(`${seconds}s`);
    }

    if (parts.length === 0) {
        return '0s';
    }

    return parts.join(' ');
}

/**
 * Format exam time (countdown style)
 * @param {number} seconds - Time in seconds
 * @param {Object} options - Options
 * @param {boolean} options.showHours - Show hours
 * @param {string} options.separator - Separator character (default: ':')
 * @param {string} options.fallback - Fallback string
 * @returns {string} Formatted time
 */
export function formatExamTime(seconds, options = {}) {
    const {
        showHours = false,
        separator = ':',
        fallback = '00:00'
    } = options;

    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
        return fallback;
    }

    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (showHours || hours > 0) {
        return `${String(hours).padStart(2, '0')}${separator}${String(minutes).padStart(2, '0')}${separator}${String(secs).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}${separator}${String(secs).padStart(2, '0')}`;
}

/**
 * Format a timestamp to ISO string
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Options
 * @param {boolean} options.includeTimezone - Include timezone offset
 * @param {string} options.fallback - Fallback string
 * @returns {string} ISO string
 */
export function formatISO(date, options = {}) {
    const {
        includeTimezone = false,
        fallback = 'Invalid date'
    } = options;

    const parsed = parseDate(date);
    if (!parsed) {
        return fallback;
    }

    try {
        if (includeTimezone) {
            return parsed.toISOString();
        }
        return parsed.toISOString().replace('Z', '').slice(0, 19);
    } catch (error) {
        return fallback;
    }
}

/**
 * Format a date for display in Study Questions
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Options
 * @returns {string} Formatted date
 */
export function formatStudyDate(date, options = {}) {
    return formatDate(date, {
        format: 'short',
        ...options
    });
}

/**
 * Format a date for Recent Activity
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Options
 * @returns {string} Formatted date
 */
export function formatActivityDate(date, options = {}) {
    return getRelativeTime(date, options);
}

/**
 * Format a date for exam completion
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Options
 * @returns {string} Formatted date
 */
export function formatExamDate(date, options = {}) {
    return formatDate(date, {
        format: 'datetime',
        ...options
    });
}

/**
 * Parse a date from various formats
 * @param {Date|string|number} date - Date to parse
 * @returns {Date|null} Parsed date or null if invalid
 */
export function parseDate(date) {
    if (!date) {
        return null;
    }

    // Already a Date object
    if (date instanceof Date) {
        return isNaN(date.getTime()) ? null : date;
    }

    // Timestamp (number)
    if (typeof date === 'number') {
        const parsed = new Date(date);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    // String
    if (typeof date === 'string') {
        // Try parsing as ISO string
        let parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }

        // Try parsing as number string
        const num = Number(date);
        if (!isNaN(num)) {
            parsed = new Date(num);
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
        }

        // Try parsing as relative date string
        const relative = parseRelativeDate(date);
        if (relative) {
            return relative;
        }

        return null;
    }

    return null;
}

/**
 * Parse relative date strings (e.g., "today", "yesterday")
 * @param {string} str - Relative date string
 * @returns {Date|null} Parsed date or null
 */
function parseRelativeDate(str) {
    const lower = str.toLowerCase().trim();
    const now = new Date();

    switch (lower) {
        case 'today':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate());
        case 'yesterday': {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday;
        }
        case 'tomorrow': {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow;
        }
        default:
            return null;
    }
}

/**
 * Check if a date is valid
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if valid
 */
export function isValidDate(date) {
    return parseDate(date) !== null;
}

/**
 * Get the start of day for a date
 * @param {Date|string|number} date - Date
 * @returns {Date|null} Start of day or null
 */
export function startOfDay(date) {
    const parsed = parseDate(date);
    if (!parsed) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

/**
 * Get the end of day for a date
 * @param {Date|string|number} date - Date
 * @returns {Date|null} End of day or null
 */
export function endOfDay(date) {
    const parsed = parseDate(date);
    if (!parsed) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59, 999);
}

/**
 * Get the start of week for a date (Monday)
 * @param {Date|string|number} date - Date
 * @returns {Date|null} Start of week or null
 */
export function startOfWeek(date) {
    const parsed = parseDate(date);
    if (!parsed) return null;
    const day = parsed.getDay();
    const diff = parsed.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(parsed.getFullYear(), parsed.getMonth(), diff);
}

/**
 * Get the end of week for a date (Sunday)
 * @param {Date|string|number} date - Date
 * @returns {Date|null} End of week or null
 */
export function endOfWeek(date) {
    const start = startOfWeek(date);
    if (!start) return null;
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
}

/**
 * Get the start of month for a date
 * @param {Date|string|number} date - Date
 * @returns {Date|null} Start of month or null
 */
export function startOfMonth(date) {
    const parsed = parseDate(date);
    if (!parsed) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
}

/**
 * Get the end of month for a date
 * @param {Date|string|number} date - Date
 * @returns {Date|null} End of month or null
 */
export function endOfMonth(date) {
    const parsed = parseDate(date);
    if (!parsed) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0);
}

/**
 * Check if two dates are on the same day
 * @param {Date|string|number} date1 - First date
 * @param {Date|string|number} date2 - Second date
 * @returns {boolean} True if same day
 */
export function isSameDay(date1, date2) {
    const d1 = parseDate(date1);
    const d2 = parseDate(date2);
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

/**
 * Check if a date is today
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if today
 */
export function isToday(date) {
    return isSameDay(date, new Date());
}

/**
 * Get days between two dates
 * @param {Date|string|number} date1 - First date
 * @param {Date|string|number} date2 - Second date
 * @returns {number} Number of days
 */
export function daysBetween(date1, date2) {
    const d1 = parseDate(date1);
    const d2 = parseDate(date2);
    if (!d1 || !d2) return 0;
    const diff = Math.abs(d2.getTime() - d1.getTime());
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get the timezone offset as a string
 * @param {Date|string|number} date - Date
 * @returns {string} Timezone offset
 */
export function getTimezoneOffset(date) {
    const parsed = parseDate(date);
    if (!parsed) return '+00:00';
    
    const offset = parsed.getTimezoneOffset();
    const sign = offset > 0 ? '-' : '+';
    const hours = String(Math.abs(Math.floor(offset / 60))).padStart(2, '0');
    const minutes = String(Math.abs(offset % 60)).padStart(2, '0');
    return `${sign}${hours}:${minutes}`;
}

/**
 * Export all utilities
 */
export default {
    formatDate,
    getRelativeTime,
    formatDuration,
    formatExamTime,
    formatISO,
    formatStudyDate,
    formatActivityDate,
    formatExamDate,
    parseDate,
    isValidDate,
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    isSameDay,
    isToday,
    daysBetween,
    getTimezoneOffset
};
