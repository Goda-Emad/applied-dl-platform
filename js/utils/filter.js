/**
 * ============================================================
 * js/utils/filter.js — Filter Utility
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Filter Utility
 * 
 * Provides reusable filtering functions for question collections.
 * Supports multiple filter types with AND logic.
 */

/**
 * Default filter configuration
 */
export const DEFAULT_FILTERS = {
    lecture: 'all',
    topic: 'all',
    difficulty: 'all',
    source: 'all',
    status: 'all',
    type: 'all'
};

/**
 * Filter questions by multiple criteria
 * @param {Array} questions - Array of question objects
 * @param {Object} filters - Filter criteria
 * @param {Object} context - Additional context for filtering (e.g., answers, favorites)
 * @returns {Array} Filtered questions
 */
export function filterQuestions(questions, filters = {}, context = {}) {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    if (!filters || Object.keys(filters).length === 0) {
        return [...questions];
    }

    let result = [...questions];

    // Apply each filter
    for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === '') {
            continue;
        }

        switch (key) {
            case 'lecture':
                result = filterByLecture(result, value);
                break;
            case 'topic':
                result = filterByTopic(result, value);
                break;
            case 'difficulty':
                result = filterByDifficulty(result, value);
                break;
            case 'source':
                result = filterBySource(result, value);
                break;
            case 'status':
                result = filterByStatus(result, value, context);
                break;
            case 'type':
                result = filterByType(result, value);
                break;
            case 'search':
                result = filterBySearch(result, value);
                break;
            case 'favorites':
                result = filterByFavorites(result, value, context);
                break;
            case 'flagged':
                result = filterByFlagged(result, value, context);
                break;
            case 'attempted':
                result = filterByAttempted(result, value, context);
                break;
            default:
                // Custom filter
                if (typeof value === 'function') {
                    result = result.filter(value);
                }
                break;
        }
    }

    return result;
}

/**
 * Filter questions by lecture
 * @param {Array} questions - Array of question objects
 * @param {string} lecture - Lecture ID or name
 * @param {string} field - Field name for lecture (default: 'lecture')
 * @returns {Array} Filtered questions
 */
export function filterByLecture(questions, lecture, field = 'lecture') {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    if (!lecture || lecture === 'all' || lecture === '') {
        return [...questions];
    }

    const lectureLower = lecture.toLowerCase();
    return questions.filter(q => {
        const qLecture = (q[field] || '').toLowerCase();
        return qLecture === lectureLower || qLecture.includes(lectureLower);
    });
}

/**
 * Filter questions by topic
 * @param {Array} questions - Array of question objects
 * @param {string} topic - Topic name
 * @param {string} field - Field name for topic (default: 'topic')
 * @returns {Array} Filtered questions
 */
export function filterByTopic(questions, topic, field = 'topic') {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    if (!topic || topic === 'all' || topic === '') {
        return [...questions];
    }

    const topicLower = topic.toLowerCase();
    return questions.filter(q => {
        const qTopic = (q[field] || '').toLowerCase();
        return qTopic === topicLower || qTopic.includes(topicLower);
    });
}

/**
 * Filter questions by difficulty
 * @param {Array} questions - Array of question objects
 * @param {string} difficulty - Difficulty level
 * @param {string} field - Field name for difficulty (default: 'difficulty')
 * @returns {Array} Filtered questions
 */
export function filterByDifficulty(questions, difficulty, field = 'difficulty') {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    if (!difficulty || difficulty === 'all' || difficulty === '') {
        return [...questions];
    }

    const difficultyLower = difficulty.toLowerCase();
    return questions.filter(q => {
        const qDifficulty = (q[field] || 'medium').toLowerCase();
        return qDifficulty === difficultyLower;
    });
}

/**
 * Filter questions by source
 * @param {Array} questions - Array of question objects
 * @param {string} source - Source name
 * @param {string} field - Field name for source (default: 'source')
 * @returns {Array} Filtered questions
 */
export function filterBySource(questions, source, field = 'source') {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    if (!source || source === 'all' || source === '') {
        return [...questions];
    }

    const sourceLower = source.toLowerCase();
    return questions.filter(q => {
        const qSource = (q[field] || '').toLowerCase();
        return qSource === sourceLower || qSource.includes(sourceLower);
    });
}

/**
 * Filter questions by status (correct/wrong/skipped)
 * @param {Array} questions - Array of question objects
 * @param {string} status - Status: 'all', 'correct', 'wrong', 'skipped', 'unattempted'
 * @param {Object} context - Context containing answers data
 * @param {Object} context.answers - Object mapping question IDs/indices to selected answers
 * @param {string} context.idField - Field name for question ID (default: 'id')
 * @returns {Array} Filtered questions
 */
export function filterByStatus(questions, status, context = {}) {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    if (!status || status === 'all') {
        return [...questions];
    }

    const { answers = {}, idField = 'id' } = context;

    return questions.filter((question, index) => {
        const id = question[idField] || index;
        const userAnswer = answers[id] !== undefined ? answers[id] : answers[index];

        switch (status) {
            case 'correct':
                return userAnswer !== undefined && userAnswer !== null && userAnswer === question.answer;
            case 'wrong':
                return userAnswer !== undefined && userAnswer !== null && userAnswer !== question.answer;
            case 'skipped':
                return userAnswer === undefined || userAnswer === null;
            case 'unattempted':
                return userAnswer === undefined || userAnswer === null;
            case 'answered':
                return userAnswer !== undefined && userAnswer !== null;
            default:
                return true;
        }
    });
}

/**
 * Filter questions by type
 * @param {Array} questions - Array of question objects
 * @param {string} type - Question type
 * @param {string} field - Field name for type (default: 'type')
 * @returns {Array} Filtered questions
 */
export function filterByType(questions, type, field = 'type') {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    if (!type || type === 'all' || type === '') {
        return [...questions];
    }

    const typeLower = type.toLowerCase();
    return questions.filter(q => {
        const qType = (q[field] || '').toLowerCase();
        return qType === typeLower || qType.includes(typeLower);
    });
}

/**
 * Filter questions by search query
 * @param {Array} questions - Array of question objects
 * @param {string} query - Search query
 * @param {Array} fields - Fields to search in
 * @returns {Array} Filtered questions
 */
export function filterBySearch(questions, query, fields = ['question', 'topic', 'source']) {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    if (!query || query === '') {
        return [...questions];
    }

    const queryLower = query.toLowerCase();
    return questions.filter(q => {
        for (const field of fields) {
            const value = q[field];
            if (value && String(value).toLowerCase().includes(queryLower)) {
                return true;
            }
        }
        return false;
    });
}

/**
 * Filter questions by favorites/bookmarks
 * @param {Array} questions - Array of question objects
 * @param {boolean} favoritesOnly - Only return favorites
 * @param {Object} context - Context containing favorites data
 * @param {Array} context.favorites - Array of favorite question IDs
 * @param {string} context.idField - Field name for question ID (default: 'id')
 * @returns {Array} Filtered questions
 */
export function filterByFavorites(questions, favoritesOnly, context = {}) {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    if (!favoritesOnly) {
        return [...questions];
    }

    const { favorites = [], idField = 'id' } = context;

    return questions.filter((question, index) => {
        const id = question[idField] || index;
        return favorites.includes(id) || favorites.includes(String(id));
    });
}

/**
 * Filter questions by flagged status
 * @param {Array} questions - Array of question objects
 * @param {boolean} flaggedOnly - Only return flagged questions
 * @param {Object} context - Context containing flagged data
 * @param {Object} context.flagged - Object mapping question IDs to flagged status
 * @param {string} context.idField - Field name for question ID (default: 'id')
 * @returns {Array} Filtered questions
 */
export function filterByFlagged(questions, flaggedOnly, context = {}) {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    if (!flaggedOnly) {
        return [...questions];
    }

    const { flagged = {}, idField = 'id' } = context;

    return questions.filter((question, index) => {
        const id = question[idField] || index;
        return flagged[id] === true || flagged[String(id)] === true;
    });
}

/**
 * Filter questions by attempted status
 * @param {Array} questions - Array of question objects
 * @param {boolean} attemptedOnly - Only return attempted questions
 * @param {Object} context - Context containing attempted data
 * @param {Set|Array} context.attempted - Set or array of attempted question IDs
 * @param {string} context.idField - Field name for question ID (default: 'id')
 * @returns {Array} Filtered questions
 */
export function filterByAttempted(questions, attemptedOnly, context = {}) {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    if (!attemptedOnly) {
        return [...questions];
    }

    const { attempted = [], idField = 'id' } = context;
    const attemptedSet = attempted instanceof Set ? attempted : new Set(attempted);

    return questions.filter((question, index) => {
        const id = question[idField] || index;
        return attemptedSet.has(id) || attemptedSet.has(String(id));
    });
}

/**
 * Filter questions by solved status
 * @param {Array} questions - Array of question objects
 * @param {boolean} solvedOnly - Only return solved questions
 * @param {Object} context - Context containing answers data
 * @param {Object} context.answers - Object mapping question IDs/indices to selected answers
 * @param {string} context.idField - Field name for question ID (default: 'id')
 * @returns {Array} Filtered questions
 */
export function filterBySolved(questions, solvedOnly, context = {}) {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    if (!solvedOnly) {
        return [...questions];
    }

    const { answers = {}, idField = 'id' } = context;

    return questions.filter((question, index) => {
        const id = question[idField] || index;
        const userAnswer = answers[id] !== undefined ? answers[id] : answers[index];
        return userAnswer !== undefined && userAnswer !== null;
    });
}

/**
 * Filter questions by correct status
 * @param {Array} questions - Array of question objects
 * @param {boolean} correctOnly - Only return correctly answered questions
 * @param {Object} context - Context containing answers data
 * @param {Object} context.answers - Object mapping question IDs/indices to selected answers
 * @param {string} context.idField - Field name for question ID (default: 'id')
 * @returns {Array} Filtered questions
 */
export function filterByCorrect(questions, correctOnly, context = {}) {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    if (!correctOnly) {
        return [...questions];
    }

    const { answers = {}, idField = 'id' } = context;

    return questions.filter((question, index) => {
        const id = question[idField] || index;
        const userAnswer = answers[id] !== undefined ? answers[id] : answers[index];
        return userAnswer !== undefined && userAnswer !== null && userAnswer === question.answer;
    });
}

/**
 * Filter questions by wrong status
 * @param {Array} questions - Array of question objects
 * @param {boolean} wrongOnly - Only return incorrectly answered questions
 * @param {Object} context - Context containing answers data
 * @param {Object} context.answers - Object mapping question IDs/indices to selected answers
 * @param {string} context.idField - Field name for question ID (default: 'id')
 * @returns {Array} Filtered questions
 */
export function filterByWrong(questions, wrongOnly, context = {}) {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    if (!wrongOnly) {
        return [...questions];
    }

    const { answers = {}, idField = 'id' } = context;

    return questions.filter((question, index) => {
        const id = question[idField] || index;
        const userAnswer = answers[id] !== undefined ? answers[id] : answers[index];
        return userAnswer !== undefined && userAnswer !== null && userAnswer !== question.answer;
    });
}

/**
 * Filter questions by skipped status
 * @param {Array} questions - Array of question objects
 * @param {boolean} skippedOnly - Only return skipped questions
 * @param {Object} context - Context containing answers data
 * @param {Object} context.answers - Object mapping question IDs/indices to selected answers
 * @param {string} context.idField - Field name for question ID (default: 'id')
 * @returns {Array} Filtered questions
 */
export function filterBySkipped(questions, skippedOnly, context = {}) {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    if (!skippedOnly) {
        return [...questions];
    }

    const { answers = {}, idField = 'id' } = context;

    return questions.filter((question, index) => {
        const id = question[idField] || index;
        const userAnswer = answers[id] !== undefined ? answers[id] : answers[index];
        return userAnswer === undefined || userAnswer === null;
    });
}

/**
 * Filter questions by difficulty range
 * @param {Array} questions - Array of question objects
 * @param {Object} range - Difficulty range
 * @param {number} range.min - Minimum difficulty (0-100)
 * @param {number} range.max - Maximum difficulty (0-100)
 * @param {string} field - Field name for difficulty (default: 'difficulty')
 * @returns {Array} Filtered questions
 */
export function filterByDifficultyRange(questions, range = {}, field = 'difficulty') {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    const { min = 0, max = 100 } = range;
    const difficultyMap = {
        easy: 25,
        medium: 50,
        hard: 75,
        expert: 90
    };

    return questions.filter(q => {
        const difficulty = q[field] || 'medium';
        const value = typeof difficulty === 'number' 
            ? difficulty 
            : (difficultyMap[difficulty.toLowerCase()] || 50);
        return value >= min && value <= max;
    });
}

/**
 * Get available filter values from a question collection
 * @param {Array} questions - Array of question objects
 * @param {string} field - Field name to get values from
 * @param {Object} options - Options
 * @param {boolean} options.sorted - Sort values alphabetically
 * @param {boolean} options.caseSensitive - Case sensitive sorting
 * @returns {Array} Available values
 */
export function getFilterValues(questions, field, options = {}) {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    const { sorted = true, caseSensitive = false } = options;
    
    const values = new Set();
    for (const q of questions) {
        const value = q[field];
        if (value !== undefined && value !== null && value !== '') {
            values.add(String(value));
        }
    }

    let result = Array.from(values);
    
    if (sorted) {
        result.sort((a, b) => {
            if (caseSensitive) {
                return a.localeCompare(b);
            }
            return a.toLowerCase().localeCompare(b.toLowerCase());
        });
    }

    return result;
}

/**
 * Get filter counts for a question collection
 * @param {Array} questions - Array of question objects
 * @param {string} field - Field name to count
 * @returns {Object} Object mapping values to counts
 */
export function getFilterCounts(questions, field) {
    if (!questions || !Array.isArray(questions)) {
        return {};
    }

    const counts = {};
    for (const q of questions) {
        const value = q[field] || 'unknown';
        counts[value] = (counts[value] || 0) + 1;
    }

    return counts;
}

/**
 * Build filter context from state and storage
 * @param {Object} state - Application state
 * @param {Object} storage - Storage manager
 * @param {Object} options - Additional options
 * @returns {Object} Filter context
 */
export function buildFilterContext(state, storage, options = {}) {
    const context = {
        answers: state?.get('exam.answers') || {},
        flagged: state?.get('exam.flagged') || {},
        favorites: storage?.loadFavorites() || [],
        attempted: storage?.loadAttemptedQuestions() || [],
        idField: options.idField || 'id'
    };

    return context;
}

/**
 * Export all utilities
 */
export default {
    filterQuestions,
    filterByLecture,
    filterByTopic,
    filterByDifficulty,
    filterBySource,
    filterByStatus,
    filterByType,
    filterBySearch,
    filterByFavorites,
    filterByFlagged,
    filterByAttempted,
    filterBySolved,
    filterByCorrect,
    filterByWrong,
    filterBySkipped,
    filterByDifficultyRange,
    getFilterValues,
    getFilterCounts,
    buildFilterContext,
    DEFAULT_FILTERS
};
