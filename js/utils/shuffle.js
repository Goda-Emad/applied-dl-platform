/**
 * ============================================================
 * js/utils/shuffle.js — Randomization Utility
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Shuffle Utility
 * 
 * Provides safe randomization functions for arrays, questions,
 * and answer options. Preserves original data integrity.
 */

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @param {boolean} inPlace - If true, modifies the original array
 * @returns {Array} Shuffled array (new array if inPlace is false)
 */
export function shuffle(array, inPlace = false) {
    if (!array || !Array.isArray(array)) {
        return [];
    }

    // If empty or single element, return copy
    if (array.length <= 1) {
        return inPlace ? array : [...array];
    }

    // Create copy if not in-place
    const result = inPlace ? array : [...array];

    // Fisher-Yates shuffle
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

/**
 * Shuffle an array and return a new array (safe, non-mutating)
 * @param {Array} array - Array to shuffle
 * @returns {Array} New shuffled array
 */
export function shuffleCopy(array) {
    return shuffle(array, false);
}

/**
 * Shuffle an array in place (mutates the original)
 * @param {Array} array - Array to shuffle
 * @returns {Array} The shuffled array (same reference)
 */
export function shuffleInPlace(array) {
    return shuffle(array, true);
}

/**
 * Select a random item from an array
 * @param {Array} array - Array to select from
 * @returns {*} Random item or null if array is empty
 */
export function randomItem(array) {
    if (!array || !Array.isArray(array) || array.length === 0) {
        return null;
    }
    const index = Math.floor(Math.random() * array.length);
    return array[index];
}

/**
 * Select multiple random items from an array
 * @param {Array} array - Array to select from
 * @param {number} count - Number of items to select
 * @param {boolean} allowDuplicates - Allow duplicate selections (default: false)
 * @returns {Array} Array of selected items
 */
export function randomItems(array, count = 1, allowDuplicates = false) {
    if (!array || !Array.isArray(array) || array.length === 0) {
        return [];
    }

    if (count <= 0) {
        return [];
    }

    // If asking for more items than available and no duplicates allowed
    if (!allowDuplicates && count > array.length) {
        // Return all items shuffled
        return shuffleCopy(array);
    }

    if (allowDuplicates) {
        // Select with replacement
        const result = [];
        for (let i = 0; i < count; i++) {
            const item = randomItem(array);
            if (item !== null) {
                result.push(item);
            }
        }
        return result;
    } else {
        // Select without replacement
        const shuffled = shuffleCopy(array);
        return shuffled.slice(0, count);
    }
}

/**
 * Select a random question from an array of questions
 * @param {Array} questions - Array of question objects
 * @param {string} idField - Field name for question ID (default: 'id')
 * @returns {Object|null} Random question or null
 */
export function randomQuestion(questions, idField = 'id') {
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return null;
    }
    return randomItem(questions);
}

/**
 * Select multiple random questions from an array
 * @param {Array} questions - Array of question objects
 * @param {number} count - Number of questions to select
 * @param {string} idField - Field name for question ID (default: 'id')
 * @param {boolean} allowDuplicates - Allow duplicate selections (default: false)
 * @returns {Array} Array of selected questions
 */
export function randomQuestions(questions, count = 1, idField = 'id', allowDuplicates = false) {
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return [];
    }

    if (count <= 0) {
        return [];
    }

    if (allowDuplicates) {
        return randomItems(questions, count, true);
    }

    // Without duplicates, but handle the case where count > available
    if (count > questions.length) {
        count = questions.length;
    }

    // Use a Set to track selected IDs
    const selected = [];
    const available = [...questions];
    const idSet = new Set();

    // Shuffle once and take first 'count' items
    // This is more efficient than repeated random selection
    const shuffled = shuffleCopy(available);
    
    for (let i = 0; i < shuffled.length && selected.length < count; i++) {
        const question = shuffled[i];
        const id = question[idField] || i;
        
        // Ensure no duplicate IDs (even if objects are different)
        if (!idSet.has(id)) {
            idSet.add(id);
            selected.push(question);
        }
    }

    return selected;
}

/**
 * Filter questions by difficulty
 * @param {Array} questions - Array of question objects
 * @param {string} difficulty - Difficulty level to filter
 * @param {string} difficultyField - Field name for difficulty (default: 'difficulty')
 * @returns {Array} Filtered questions
 */
export function filterByDifficulty(questions, difficulty, difficultyField = 'difficulty') {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    if (!difficulty || difficulty === 'all') {
        return [...questions];
    }

    return questions.filter(q => {
        const qDifficulty = (q[difficultyField] || 'medium').toLowerCase();
        return qDifficulty === difficulty.toLowerCase();
    });
}

/**
 * Filter questions by topic
 * @param {Array} questions - Array of question objects
 * @param {string} topic - Topic to filter
 * @param {string} topicField - Field name for topic (default: 'topic')
 * @returns {Array} Filtered questions
 */
export function filterByTopic(questions, topic, topicField = 'topic') {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    if (!topic || topic === 'all') {
        return [...questions];
    }

    return questions.filter(q => {
        const qTopic = q[topicField] || '';
        return qTopic === topic;
    });
}

/**
 * Filter questions by multiple criteria
 * @param {Array} questions - Array of question objects
 * @param {Object} filters - Filter criteria
 * @param {string} filters.difficulty - Difficulty level
 * @param {string} filters.topic - Topic
 * @param {string} filters.difficultyField - Difficulty field name
 * @param {string} filters.topicField - Topic field name
 * @returns {Array} Filtered questions
 */
export function filterQuestions(questions, filters = {}) {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    let result = [...questions];

    // Apply difficulty filter
    if (filters.difficulty && filters.difficulty !== 'all') {
        result = filterByDifficulty(
            result,
            filters.difficulty,
            filters.difficultyField || 'difficulty'
        );
    }

    // Apply topic filter
    if (filters.topic && filters.topic !== 'all') {
        result = filterByTopic(
            result,
            filters.topic,
            filters.topicField || 'topic'
        );
    }

    return result;
}

/**
 * Shuffle answer options within a question object
 * @param {Object} question - Question object
 * @param {string} optionsField - Field name for options (default: 'options')
 * @param {string} answerField - Field name for answer (default: 'answer')
 * @param {boolean} inPlace - If true, modifies the original question object
 * @returns {Object} Question with shuffled options (or same if inPlace)
 */
export function shuffleOptions(question, optionsField = 'options', answerField = 'answer', inPlace = false) {
    if (!question || typeof question !== 'object') {
        return null;
    }

    const options = question[optionsField];
    if (!options || !Array.isArray(options) || options.length === 0) {
        return question;
    }

    // Create copies
    const result = inPlace ? question : { ...question };
    const originalOptions = [...options];
    const originalAnswer = question[answerField];

    // Create array of indices
    const indices = originalOptions.map((_, idx) => idx);
    const shuffledIndices = shuffleCopy(indices);

    // Reorder options
    const newOptions = shuffledIndices.map(idx => originalOptions[idx]);

    // Update answer index
    const newAnswerIndex = shuffledIndices.indexOf(originalAnswer);

    // Apply changes
    result[optionsField] = newOptions;
    result[answerField] = newAnswerIndex;

    // Store original mapping if needed (for debugging/review)
    result._originalAnswerIndex = originalAnswer;
    result._shuffledMapping = shuffledIndices;

    return result;
}

/**
 * Shuffle options for multiple questions
 * @param {Array} questions - Array of question objects
 * @param {string} optionsField - Field name for options
 * @param {string} answerField - Field name for answer
 * @param {boolean} inPlace - If true, modifies original questions
 * @returns {Array} Questions with shuffled options
 */
export function shuffleAllOptions(questions, optionsField = 'options', answerField = 'answer', inPlace = false) {
    if (!questions || !Array.isArray(questions)) {
        return [];
    }

    const result = inPlace ? questions : questions.map(q => ({ ...q }));

    for (const question of result) {
        shuffleOptions(question, optionsField, answerField, true);
    }

    return result;
}

/**
 * Create a deterministic seeded random number generator
 * @param {string|number} seed - Seed value
 * @returns {Function} Random number generator (0-1)
 */
export function createSeededRandom(seed) {
    // Convert seed to a number
    let seedNum = typeof seed === 'string' 
        ? seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) 
        : seed || 0;

    return function() {
        // Linear congruential generator
        seedNum = (seedNum * 9301 + 49297) % 233280;
        return seedNum / 233280;
    };
}

/**
 * Shuffle an array using a seeded random generator
 * @param {Array} array - Array to shuffle
 * @param {string|number} seed - Seed value
 * @param {boolean} inPlace - If true, modifies the original array
 * @returns {Array} Shuffled array
 */
export function shuffleSeeded(array, seed, inPlace = false) {
    if (!array || !Array.isArray(array) || array.length <= 1) {
        return inPlace ? array : [...array];
    }

    const random = createSeededRandom(seed);
    const result = inPlace ? array : [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

/**
 * Get a random subset of questions with specific distribution
 * @param {Array} questions - Array of question objects
 * @param {Object} distribution - Distribution configuration
 * @param {number} distribution.total - Total number of questions to select
 * @param {Object} distribution.byDifficulty - Difficulty distribution
 * @param {string} distribution.difficultyField - Difficulty field name
 * @returns {Array} Selected questions
 */
export function selectQuestionsWithDistribution(questions, distribution = {}) {
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return [];
    }

    const { total = 10, byDifficulty = {}, difficultyField = 'difficulty' } = distribution;
    
    // If no difficulty distribution, just select random questions
    if (Object.keys(byDifficulty).length === 0) {
        return randomQuestions(questions, total, 'id', false);
    }

    const selected = [];
    const remaining = [...questions];
    const idSet = new Set();

    // First, select questions by difficulty
    for (const [difficulty, count] of Object.entries(byDifficulty)) {
        const filtered = remaining.filter(q => {
            const qDifficulty = (q[difficultyField] || 'medium').toLowerCase();
            return qDifficulty === difficulty.toLowerCase() && !idSet.has(q.id || q._id);
        });

        const numToSelect = Math.min(count, filtered.length);
        const selectedFromDiff = randomItems(filtered, numToSelect, false);
        
        for (const item of selectedFromDiff) {
            const id = item.id || item._id || selected.length;
            idSet.add(id);
            selected.push(item);
            // Remove from remaining
            const idx = remaining.indexOf(item);
            if (idx > -1) {
                remaining.splice(idx, 1);
            }
        }
    }

    // Fill remaining slots with random questions
    const remainingCount = total - selected.length;
    if (remainingCount > 0 && remaining.length > 0) {
        const additional = randomItems(remaining, remainingCount, false);
        for (const item of additional) {
            const id = item.id || item._id || selected.length;
            if (!idSet.has(id)) {
                idSet.add(id);
                selected.push(item);
            }
        }
    }

    return selected;
}

/**
 * Get the number of unique items in an array
 * @param {Array} array - Array to check
 * @param {string} idField - Field name for ID
 * @returns {number} Number of unique items
 */
export function uniqueCount(array, idField = 'id') {
    if (!array || !Array.isArray(array)) {
        return 0;
    }

    const ids = new Set();
    for (const item of array) {
        const id = item[idField] || item._id || item;
        ids.add(id);
    }
    return ids.size;
}

/**
 * Check if an array has duplicate items
 * @param {Array} array - Array to check
 * @param {string} idField - Field name for ID
 * @returns {boolean} True if duplicates exist
 */
export function hasDuplicates(array, idField = 'id') {
    return uniqueCount(array, idField) < array.length;
}

/**
 * Export all utilities
 */
export default {
    shuffle,
    shuffleCopy,
    shuffleInPlace,
    randomItem,
    randomItems,
    randomQuestion,
    randomQuestions,
    filterByDifficulty,
    filterByTopic,
    filterQuestions,
    shuffleOptions,
    shuffleAllOptions,
    createSeededRandom,
    shuffleSeeded,
    selectQuestionsWithDistribution,
    uniqueCount,
    hasDuplicates
};
