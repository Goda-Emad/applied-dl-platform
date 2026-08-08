/**
 * ============================================================
 * js/utils/search.js — Search Utility
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Search Utility
 * 
 * Provides search functionality for questions across lecture banks
 * and study questions. Supports case-insensitive partial matching
 * with configurable search fields.
 */

/**
 * Default search fields
 */
export const DEFAULT_SEARCH_FIELDS = [
    'question',
    'topic',
    'source',
    'lecture',
    'id',
    'options'
];

/**
 * Search a collection of questions
 * @param {Array} questions - Array of question objects
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @param {Array} options.fields - Fields to search in (default: DEFAULT_SEARCH_FIELDS)
 * @param {boolean} options.caseSensitive - Case sensitive search (default: false)
 * @param {boolean} options.exactMatch - Exact match only (default: false)
 * @param {boolean} options.includeMetadata - Include metadata in results (default: true)
 * @param {Function} options.customMatcher - Custom match function
 * @returns {Array} Search results
 */
export function searchQuestions(questions, query, options = {}) {
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return [];
    }

    if (!query || query.trim() === '') {
        return questions.map(q => ({
            question: q,
            matches: [],
            score: 0
        }));
    }

    const {
        fields = DEFAULT_SEARCH_FIELDS,
        caseSensitive = false,
        exactMatch = false,
        includeMetadata = true,
        customMatcher = null
    } = options;

    const searchTerm = caseSensitive ? query.trim() : query.trim().toLowerCase();
    if (!searchTerm) {
        return questions.map(q => ({
            question: q,
            matches: [],
            score: 0
        }));
    }

    const results = [];

    for (const question of questions) {
        const matchResult = customMatcher 
            ? customMatcher(question, searchTerm, options)
            : _matchQuestion(question, searchTerm, fields, caseSensitive, exactMatch);

        if (matchResult.matched) {
            results.push({
                question,
                matches: matchResult.matches,
                score: matchResult.score,
                matchedFields: matchResult.matchedFields || []
            });
        }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    return results;
}

/**
 * Search lecture questions
 * @param {Object} lectureData - Object with lectureId as keys and question arrays as values
 * @param {string} query - Search query
 * @param {Object} options - Search options (same as searchQuestions)
 * @returns {Object} Results grouped by lecture
 */
export function searchLectureQuestions(lectureData, query, options = {}) {
    if (!lectureData || typeof lectureData !== 'object') {
        return {};
    }

    const results = {};
    
    for (const [lectureId, questions] of Object.entries(lectureData)) {
        if (!Array.isArray(questions) || questions.length === 0) {
            results[lectureId] = [];
            continue;
        }

        const searchResults = searchQuestions(questions, query, {
            ...options,
            includeMetadata: true
        });

        results[lectureId] = searchResults.map(r => ({
            ...r,
            lectureId
        }));
    }

    return results;
}

/**
 * Search study questions
 * @param {Array} questions - Array of study question objects
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Array} Search results
 */
export function searchStudyQuestions(questions, query, options = {}) {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    const results = searchQuestions(questions, query, {
        ...options,
        fields: options.fields || ['question', 'topic', 'source', 'id']
    });

    return results.map(r => ({
        ...r,
        source: 'study'
    }));
}

/**
 * Global search across multiple collections
 * @param {Object} collections - Object with collection names as keys
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Object} Results grouped by collection
 */
export function globalSearch(collections, query, options = {}) {
    if (!collections || typeof collections !== 'object') {
        return {};
    }

    const results = {};
    
    for (const [collectionName, data] of Object.entries(collections)) {
        if (!data || (Array.isArray(data) && data.length === 0)) {
            results[collectionName] = [];
            continue;
        }

        if (Array.isArray(data)) {
            // Direct array of questions
            results[collectionName] = searchQuestions(data, query, options);
        } else if (typeof data === 'object') {
            // Object with lectureId keys
            const searchResults = searchLectureQuestions(data, query, options);
            results[collectionName] = searchResults;
        } else {
            results[collectionName] = [];
        }
    }

    return results;
}

/**
 * Match a single question against search term
 * @param {Object} question - Question object
 * @param {string} searchTerm - Search term (already normalized)
 * @param {Array} fields - Fields to search
 * @param {boolean} caseSensitive - Case sensitive
 * @param {boolean} exactMatch - Exact match
 * @returns {Object} Match result
 * @private
 */
function _matchQuestion(question, searchTerm, fields, caseSensitive, exactMatch) {
    const matches = [];
    const matchedFields = [];
    let score = 0;
    let matched = false;

    for (const field of fields) {
        const value = _getFieldValue(question, field);
        if (!value) continue;

        const stringValue = String(value);
        const normalizedValue = caseSensitive ? stringValue : stringValue.toLowerCase();

        let matchFound = false;
        let matchPositions = [];

        if (exactMatch) {
            if (normalizedValue === searchTerm) {
                matchFound = true;
                matchPositions = [0];
                score += 100;
            }
        } else {
            // Check for partial match
            const index = normalizedValue.indexOf(searchTerm);
            if (index !== -1) {
                matchFound = true;
                matchPositions = [index];
                // Score based on how early the match occurs
                const positionScore = 100 - (index / normalizedValue.length) * 50;
                const lengthScore = Math.min(searchTerm.length / 10, 20);
                score += Math.round(positionScore + lengthScore);
            }
        }

        if (matchFound) {
            matched = true;
            matchedFields.push(field);
            matches.push({
                field,
                value: stringValue,
                positions: matchPositions,
                snippet: _getSnippet(stringValue, searchTerm, caseSensitive)
            });
        }
    }

    // Bonus for multiple field matches
    if (matched) {
        score += matchedFields.length * 10;
    }

    return {
        matched,
        matches,
        matchedFields,
        score: Math.min(score, 999)
    };
}

/**
 * Get field value from question object with dot notation support
 * @param {Object} question - Question object
 * @param {string} field - Field name (supports dot notation)
 * @returns {*} Field value
 * @private
 */
function _getFieldValue(question, field) {
    if (!question || typeof question !== 'object') {
        return null;
    }

    // Handle dot notation (e.g., 'metadata.source')
    const parts = field.split('.');
    let value = question;

    for (const part of parts) {
        if (value === null || value === undefined || typeof value !== 'object') {
            return null;
        }
        value = value[part];
    }

    // Handle arrays (e.g., options)
    if (Array.isArray(value)) {
        return value.join(' ');
    }

    return value;
}

/**
 * Get a snippet of text around the match
 * @param {string} text - Full text
 * @param {string} searchTerm - Search term
 * @param {boolean} caseSensitive - Case sensitive
 * @param {number} contextLength - Number of characters before/after
 * @returns {string} Snippet
 * @private
 */
function _getSnippet(text, searchTerm, caseSensitive, contextLength = 30) {
    if (!text) return '';
    
    const normalizedText = caseSensitive ? text : text.toLowerCase();
    const normalizedTerm = caseSensitive ? searchTerm : searchTerm.toLowerCase();
    const index = normalizedText.indexOf(normalizedTerm);

    if (index === -1) {
        return text.substring(0, 100) + (text.length > 100 ? '...' : '');
    }

    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + searchTerm.length + contextLength);

    let snippet = text.substring(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';

    return snippet;
}

/**
 * Highlight search matches in text
 * @param {string} text - Text to highlight
 * @param {string} query - Search query
 * @param {Object} options - Highlight options
 * @param {string} options.openTag - Opening tag (default: '<mark>')
 * @param {string} options.closeTag - Closing tag (default: '</mark>')
 * @param {boolean} options.caseSensitive - Case sensitive (default: false)
 * @returns {string} Highlighted text
 */
export function highlightMatches(text, query, options = {}) {
    if (!text || !query || query.trim() === '') {
        return text || '';
    }

    const {
        openTag = '<mark>',
        closeTag = '</mark>',
        caseSensitive = false
    } = options;

    const searchTerm = query.trim();
    const regex = new RegExp(
        caseSensitive ? searchTerm : searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        caseSensitive ? 'g' : 'gi'
    );

    return text.replace(regex, (match) => `${openTag}${match}${closeTag}`);
}

/**
 * Highlight matches in search results
 * @param {Array} results - Search results
 * @param {Object} options - Highlight options
 * @returns {Array} Results with highlighted fields
 */
export function highlightResults(results, options = {}) {
    if (!results || !Array.isArray(results)) {
        return [];
    }

    return results.map(result => {
        const highlighted = { ...result };
        const query = result._query || '';

        if (result.question) {
            highlighted.highlighted = {};
            const fields = ['question', 'topic', 'source', 'lecture'];
            
            for (const field of fields) {
                if (result.question[field]) {
                    highlighted.highlighted[field] = highlightMatches(
                        result.question[field],
                        query,
                        options
                    );
                }
            }
        }

        return highlighted;
    });
}

/**
 * Get search statistics
 * @param {Array} results - Search results
 * @returns {Object} Search statistics
 */
export function getSearchStats(results) {
    if (!results || !Array.isArray(results)) {
        return {
            total: 0,
            matched: 0,
            averageScore: 0,
            topMatches: [],
            fieldFrequency: {}
        };
    }

    const matched = results.filter(r => r.matched !== false);
    const total = results.length;
    const scores = matched.map(r => r.score || 0);
    const avgScore = scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
        : 0;

    // Count field frequency
    const fieldFrequency = {};
    for (const result of matched) {
        if (result.matchedFields) {
            for (const field of result.matchedFields) {
                fieldFrequency[field] = (fieldFrequency[field] || 0) + 1;
            }
        }
    }

    // Get top matches (highest score)
    const topMatches = [...matched]
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 5);

    return {
        total,
        matched: matched.length,
        averageScore: avgScore,
        topMatches,
        fieldFrequency
    };
}

/**
 * Combine search results with filters
 * @param {Array} results - Search results
 * @param {Object} filters - Filter object
 * @param {Function} filterFn - Filter function (optional)
 * @returns {Array} Filtered results
 */
export function applyFilters(results, filters, filterFn = null) {
    if (!results || !Array.isArray(results)) {
        return [];
    }

    if (!filters || Object.keys(filters).length === 0) {
        return results;
    }

    if (filterFn && typeof filterFn === 'function') {
        return results.filter(r => filterFn(r, filters));
    }

    // Default filter implementation
    return results.filter(result => {
        const q = result.question || result;
        
        // Filter by difficulty
        if (filters.difficulty && filters.difficulty !== 'all') {
            const qDiff = (q.difficulty || 'medium').toLowerCase();
            if (qDiff !== filters.difficulty.toLowerCase()) {
                return false;
            }
        }

        // Filter by topic
        if (filters.topic && filters.topic !== 'all') {
            const qTopic = q.topic || '';
            if (qTopic !== filters.topic) {
                return false;
            }
        }

        // Filter by source
        if (filters.source && filters.source !== 'all') {
            const qSource = q.source || q.lecture || '';
            if (qSource !== filters.source) {
                return false;
            }
        }

        // Filter by status (correct/wrong)
        if (filters.status && filters.status !== 'all') {
            // Status filter requires additional context
            // This is a placeholder - actual implementation depends on how answers are stored
            return true;
        }

        return true;
    });
}

/**
 * Normalize search query
 * @param {string} query - Raw query
 * @param {Object} options - Normalization options
 * @param {boolean} options.removeStopWords - Remove stop words (default: false)
 * @param {boolean} options.stemWords - Stem words (default: false)
 * @returns {string} Normalized query
 */
export function normalizeQuery(query, options = {}) {
    if (!query) return '';

    let normalized = query.trim();

    if (options.removeStopWords) {
        const stopWords = ['a', 'an', 'the', 'of', 'for', 'on', 'at', 'to', 'in', 'with', 'without', 'and', 'or', 'but'];
        normalized = normalized.split(' ')
            .filter(word => !stopWords.includes(word.toLowerCase()))
            .join(' ');
    }

    if (options.stemWords) {
        // Simple stemming - just remove common suffixes
        normalized = normalized.replace(/(ing|ed|es|s)$/g, '');
    }

    return normalized;
}

/**
 * Export all utilities
 */
export default {
    searchQuestions,
    searchLectureQuestions,
    searchStudyQuestions,
    globalSearch,
    highlightMatches,
    highlightResults,
    getSearchStats,
    applyFilters,
    normalizeQuery,
    DEFAULT_SEARCH_FIELDS
};
