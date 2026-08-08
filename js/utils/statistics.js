/**
 * ============================================================
 * js/utils/statistics.js — Statistics & Performance Utilities
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Statistics Utility
 * 
 * Central calculation engine for all statistics and performance metrics.
 * Handles lecture statistics, topic analysis, difficulty analysis,
 * and study question statistics.
 */

/**
 * Calculate basic statistics for a set of questions
 * @param {Array} questions - Array of question objects
 * @param {Object} answers - Object mapping question indices to selected answers
 * @returns {Object} Basic statistics
 */
export function calculateBasicStats(questions, answers = {}) {
    if (!questions || !Array.isArray(questions)) {
        return getEmptyStats();
    }

    const total = questions.length;
    let answered = 0;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    questions.forEach((question, index) => {
        const userAnswer = answers[index];
        if (userAnswer === undefined || userAnswer === null) {
            skipped++;
        } else {
            answered++;
            if (userAnswer === question.answer) {
                correct++;
            } else {
                wrong++;
            }
        }
    });

    const attempted = correct + wrong;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const completion = total > 0 ? Math.round((answered / total) * 100) : 0;

    return {
        total,
        answered,
        correct,
        wrong,
        skipped,
        attempted,
        accuracy,
        completion,
        score: correct // Simple score: 1 point per correct answer
    };
}

/**
 * Get empty statistics object
 * @returns {Object} Empty stats
 */
export function getEmptyStats() {
    return {
        total: 0,
        answered: 0,
        correct: 0,
        wrong: 0,
        skipped: 0,
        attempted: 0,
        accuracy: 0,
        completion: 0,
        score: 0
    };
}

/**
 * Calculate statistics for multiple lectures
 * @param {Array} lectures - Array of lecture objects
 * @param {Object} questionData - Object mapping lectureId to question array
 * @param {Object} answerData - Object mapping lectureId to answer object
 * @returns {Object} Lecture statistics
 */
export function calculateLectureStats(lectures, questionData, answerData) {
    if (!lectures || !Array.isArray(lectures)) {
        return {
            lectures: [],
            overall: getEmptyStats(),
            completed: 0,
            inProgress: 0,
            notStarted: 0
        };
    }

    const results = [];
    let totalStats = getEmptyStats();
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;

    lectures.forEach(lecture => {
        const questions = questionData[lecture.id] || [];
        const answers = answerData[lecture.id] || {};
        const stats = calculateBasicStats(questions, answers);

        const lectureStats = {
            lectureId: lecture.id,
            title: lecture.title || lecture.id,
            ...stats,
            isCompleted: stats.completion === 100 && stats.total > 0,
            isInProgress: stats.completion > 0 && stats.completion < 100,
            isNotStarted: stats.completion === 0
        };

        results.push(lectureStats);

        // Aggregate overall stats
        totalStats.total += stats.total;
        totalStats.answered += stats.answered;
        totalStats.correct += stats.correct;
        totalStats.wrong += stats.wrong;
        totalStats.skipped += stats.skipped;
        totalStats.attempted += stats.attempted;

        // Count status
        if (lectureStats.isCompleted) completed++;
        else if (lectureStats.isInProgress) inProgress++;
        else if (lectureStats.isNotStarted && stats.total > 0) notStarted++;
    });

    // Calculate overall accuracy and completion
    totalStats.accuracy = totalStats.attempted > 0 
        ? Math.round((totalStats.correct / totalStats.attempted) * 100) 
        : 0;
    totalStats.completion = totalStats.total > 0 
        ? Math.round((totalStats.answered / totalStats.total) * 100) 
        : 0;
    totalStats.score = totalStats.correct;

    return {
        lectures: results,
        overall: totalStats,
        completed,
        inProgress,
        notStarted,
        totalLectures: lectures.length
    };
}

/**
 * Calculate topic performance
 * @param {Array} questions - Array of question objects
 * @param {Object} answers - Object mapping question indices to selected answers
 * @param {string} topicField - Field name for topic (default: 'topic')
 * @returns {Object} Topic performance data
 */
export function calculateTopicPerformance(questions, answers = {}, topicField = 'topic') {
    if (!questions || !Array.isArray(questions)) {
        return {
            topics: {},
            strong: [],
            weak: [],
            overall: getEmptyStats()
        };
    }

    const topicData = {};
    const overallStats = getEmptyStats();

    questions.forEach((question, index) => {
        const topic = question[topicField] || 'General';
        if (!topicData[topic]) {
            topicData[topic] = {
                total: 0,
                correct: 0,
                wrong: 0,
                skipped: 0,
                attempted: 0,
                questions: []
            };
        }

        const userAnswer = answers[index];
        topicData[topic].total++;
        overallStats.total++;

        if (userAnswer === undefined || userAnswer === null) {
            topicData[topic].skipped++;
            overallStats.skipped++;
        } else {
            topicData[topic].attempted++;
            overallStats.attempted++;
            if (userAnswer === question.answer) {
                topicData[topic].correct++;
                overallStats.correct++;
            } else {
                topicData[topic].wrong++;
                overallStats.wrong++;
            }
        }
    });

    // Calculate scores for each topic
    const topics = {};
    const strong = [];
    const weak = [];

    for (const [topic, data] of Object.entries(topicData)) {
        const accuracy = data.attempted > 0 
            ? Math.round((data.correct / data.attempted) * 100) 
            : 0;
        const completion = data.total > 0 
            ? Math.round(((data.correct + data.wrong) / data.total) * 100) 
            : 0;

        topics[topic] = {
            ...data,
            accuracy,
            completion,
            score: data.correct
        };

        // Categorize as strong or weak
        if (data.attempted > 0) {
            if (accuracy >= 70) {
                strong.push({ topic, ...topics[topic] });
            } else {
                weak.push({ topic, ...topics[topic] });
            }
        }
    }

    // Sort strong by accuracy descending, weak by accuracy ascending
    strong.sort((a, b) => b.accuracy - a.accuracy);
    weak.sort((a, b) => a.accuracy - b.accuracy);

    // Calculate overall stats
    overallStats.accuracy = overallStats.attempted > 0 
        ? Math.round((overallStats.correct / overallStats.attempted) * 100) 
        : 0;
    overallStats.completion = overallStats.total > 0 
        ? Math.round((overallStats.answered / overallStats.total) * 100) 
        : 0;

    return {
        topics,
        strong,
        weak,
        overall: overallStats
    };
}

/**
 * Calculate difficulty performance
 * @param {Array} questions - Array of question objects
 * @param {Object} answers - Object mapping question indices to selected answers
 * @param {string} difficultyField - Field name for difficulty (default: 'difficulty')
 * @returns {Object} Difficulty performance data
 */
export function calculateDifficultyPerformance(questions, answers = {}, difficultyField = 'difficulty') {
    if (!questions || !Array.isArray(questions)) {
        return {
            difficulties: {},
            overall: getEmptyStats()
        };
    }

    const difficultyData = {};
    const overallStats = getEmptyStats();

    questions.forEach((question, index) => {
        const difficulty = (question[difficultyField] || 'medium').toLowerCase();
        if (!difficultyData[difficulty]) {
            difficultyData[difficulty] = {
                total: 0,
                correct: 0,
                wrong: 0,
                skipped: 0,
                attempted: 0
            };
        }

        const userAnswer = answers[index];
        difficultyData[difficulty].total++;
        overallStats.total++;

        if (userAnswer === undefined || userAnswer === null) {
            difficultyData[difficulty].skipped++;
            overallStats.skipped++;
        } else {
            difficultyData[difficulty].attempted++;
            overallStats.attempted++;
            if (userAnswer === question.answer) {
                difficultyData[difficulty].correct++;
                overallStats.correct++;
            } else {
                difficultyData[difficulty].wrong++;
                overallStats.wrong++;
            }
        }
    });

    // Calculate scores for each difficulty
    const difficulties = {};
    const orderedDifficulties = ['easy', 'medium', 'hard', 'expert'];

    for (const [difficulty, data] of Object.entries(difficultyData)) {
        const accuracy = data.attempted > 0 
            ? Math.round((data.correct / data.attempted) * 100) 
            : 0;
        const completion = data.total > 0 
            ? Math.round(((data.correct + data.wrong) / data.total) * 100) 
            : 0;

        difficulties[difficulty] = {
            ...data,
            accuracy,
            completion,
            score: data.correct
        };
    }

    // Ensure all difficulties are present
    orderedDifficulties.forEach(diff => {
        if (!difficulties[diff]) {
            difficulties[diff] = {
                total: 0,
                correct: 0,
                wrong: 0,
                skipped: 0,
                attempted: 0,
                accuracy: 0,
                completion: 0,
                score: 0
            };
        }
    });

    // Calculate overall stats
    overallStats.accuracy = overallStats.attempted > 0 
        ? Math.round((overallStats.correct / overallStats.attempted) * 100) 
        : 0;
    overallStats.completion = overallStats.total > 0 
        ? Math.round((overallStats.answered / overallStats.total) * 100) 
        : 0;

    return {
        difficulties,
        overall: overallStats
    };
}

/**
 * Calculate exam results
 * @param {Array} questions - Array of question objects
 * @param {Object} answers - Object mapping question indices to selected answers
 * @param {number} duration - Exam duration in seconds
 * @returns {Object} Exam results
 */
export function calculateExamResults(questions, answers = {}, duration = 0) {
    const stats = calculateBasicStats(questions, answers);
    const topicPerformance = calculateTopicPerformance(questions, answers);
    const difficultyPerformance = calculateDifficultyPerformance(questions, answers);

    const percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    const averageTime = stats.answered > 0 ? Math.round(duration / stats.answered) : 0;

    return {
        ...stats,
        percentage,
        duration,
        averageTime,
        grade: getGrade(percentage),
        topics: topicPerformance,
        difficulties: difficultyPerformance
    };
}

/**
 * Get grade based on percentage
 * @param {number} percentage - Score percentage
 * @returns {string} Grade
 */
export function getGrade(percentage) {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 75) return 'Good';
    if (percentage >= 60) return 'Average';
    if (percentage >= 40) return 'Below Average';
    return 'Needs Improvement';
}

/**
 * Get grade class for styling
 * @param {number} percentage - Score percentage
 * @returns {string} CSS class
 */
export function getGradeClass(percentage) {
    if (percentage >= 90) return 'excellent';
    if (percentage >= 75) return 'good';
    if (percentage >= 60) return 'average';
    return 'poor';
}

/**
 * Calculate overall course progress
 * @param {Array} lectureProgress - Array of lecture progress objects
 * @param {Array} studyQuestionStats - Study question statistics
 * @returns {Object} Overall progress
 */
export function calculateOverallProgress(lectureProgress = [], studyQuestionStats = null) {
    let totalLectures = lectureProgress.length;
    let completedLectures = 0;
    let inProgressLectures = 0;
    let notStartedLectures = 0;
    let totalQuestions = 0;
    let answeredQuestions = 0;
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let skippedQuestions = 0;

    lectureProgress.forEach(lecture => {
        totalQuestions += lecture.total || 0;
        answeredQuestions += lecture.answered || 0;
        correctAnswers += lecture.correct || 0;
        wrongAnswers += lecture.wrong || 0;
        skippedQuestions += lecture.skipped || 0;

        if (lecture.isCompleted) completedLectures++;
        else if (lecture.isInProgress) inProgressLectures++;
        else if (lecture.isNotStarted) notStartedLectures++;
    });

    const attempted = correctAnswers + wrongAnswers;
    const accuracy = attempted > 0 ? Math.round((correctAnswers / attempted) * 100) : 0;
    const completion = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

    const result = {
        lectures: {
            total: totalLectures,
            completed: completedLectures,
            inProgress: inProgressLectures,
            notStarted: notStartedLectures,
            completion: totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0
        },
        questions: {
            total: totalQuestions,
            answered: answeredQuestions,
            correct: correctAnswers,
            wrong: wrongAnswers,
            skipped: skippedQuestions,
            attempted,
            accuracy,
            completion
        }
    };

    // Add study questions if provided
    if (studyQuestionStats) {
        result.studyQuestions = {
            total: studyQuestionStats.total || 0,
            attempted: studyQuestionStats.attempted || 0,
            correct: studyQuestionStats.correct || 0,
            wrong: studyQuestionStats.wrong || 0,
            accuracy: studyQuestionStats.accuracy || 0,
            completion: studyQuestionStats.total > 0 
                ? Math.round((studyQuestionStats.attempted / studyQuestionStats.total) * 100) 
                : 0
        };
    }

    return result;
}

/**
 * Get performance summary
 * @param {Array} questions - Array of question objects
 * @param {Object} answers - Object mapping question indices to selected answers
 * @returns {Object} Performance summary
 */
export function getPerformanceSummary(questions, answers = {}) {
    const stats = calculateBasicStats(questions, answers);
    const topicPerf = calculateTopicPerformance(questions, answers);
    const difficultyPerf = calculateDifficultyPerformance(questions, answers);

    return {
        overall: stats,
        topics: {
            strong: topicPerf.strong.slice(0, 5),
            weak: topicPerf.weak.slice(0, 5)
        },
        difficulties: difficultyPerf.difficulties,
        summary: {
            accuracy: stats.accuracy,
            completion: stats.completion,
            score: stats.score,
            total: stats.total,
            answered: stats.answered
        }
    };
}

/**
 * Calculate study question statistics (separate from lecture stats)
 * @param {Array} questions - Array of study question objects
 * @param {Object} results - Object mapping question IDs to selected answers
 * @returns {Object} Study question statistics
 */
export function calculateStudyStats(questions = [], results = {}) {
    if (!questions || !Array.isArray(questions)) {
        return getEmptyStats();
    }

    let total = questions.length;
    let correct = 0;
    let wrong = 0;
    let attempted = 0;

    questions.forEach(question => {
        const questionId = String(question.id || questions.indexOf(question));
        const userAnswer = results[questionId];
        if (userAnswer !== undefined && userAnswer !== null) {
            attempted++;
            if (userAnswer === question.answer) {
                correct++;
            } else {
                wrong++;
            }
        }
    });

    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const completion = total > 0 ? Math.round((attempted / total) * 100) : 0;

    return {
        total,
        attempted,
        correct,
        wrong,
        skipped: total - attempted,
        accuracy,
        completion,
        score: correct
    };
}

/**
 * Calculate topic performance for study questions
 * @param {Array} questions - Array of study question objects
 * @param {Object} results - Object mapping question IDs to selected answers
 * @param {string} topicField - Field name for topic
 * @returns {Object} Topic performance
 */
export function calculateStudyTopicPerformance(questions = [], results = {}, topicField = 'topic') {
    if (!questions || !Array.isArray(questions)) {
        return {
            topics: {},
            strong: [],
            weak: [],
            overall: getEmptyStats()
        };
    }

    const topicData = {};
    const overallStats = getEmptyStats();

    questions.forEach((question, index) => {
        const topic = question[topicField] || 'General';
        const questionId = String(question.id || index);
        const userAnswer = results[questionId];

        if (!topicData[topic]) {
            topicData[topic] = {
                total: 0,
                correct: 0,
                wrong: 0,
                attempted: 0
            };
        }

        topicData[topic].total++;
        overallStats.total++;

        if (userAnswer !== undefined && userAnswer !== null) {
            topicData[topic].attempted++;
            overallStats.attempted++;
            if (userAnswer === question.answer) {
                topicData[topic].correct++;
                overallStats.correct++;
            } else {
                topicData[topic].wrong++;
                overallStats.wrong++;
            }
        }
    });

    const topics = {};
    const strong = [];
    const weak = [];

    for (const [topic, data] of Object.entries(topicData)) {
        const accuracy = data.attempted > 0 
            ? Math.round((data.correct / data.attempted) * 100) 
            : 0;
        topics[topic] = { ...data, accuracy };

        if (data.attempted > 0) {
            if (accuracy >= 70) {
                strong.push({ topic, ...topics[topic] });
            } else {
                weak.push({ topic, ...topics[topic] });
            }
        }
    }

    strong.sort((a, b) => b.accuracy - a.accuracy);
    weak.sort((a, b) => a.accuracy - b.accuracy);

    overallStats.accuracy = overallStats.attempted > 0 
        ? Math.round((overallStats.correct / overallStats.attempted) * 100) 
        : 0;

    return {
        topics,
        strong,
        weak,
        overall: overallStats
    };
}

/**
 * Format duration in seconds to readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export function formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 60) {
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return `${hours}h ${remainingMins}m ${secs}s`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Get time ago string
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} Time ago string
 */
export function getTimeAgo(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!(d instanceof Date) || isNaN(d)) return 'Unknown';

    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 0) {
        if (diffDay === 1) return 'Yesterday';
        if (diffDay < 7) return `${diffDay}d ago`;
        if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
        if (diffDay < 365) return `${Math.floor(diffDay / 30)}mo ago`;
        return `${Math.floor(diffDay / 365)}y ago`;
    }
    if (diffHour > 0) {
        if (diffHour === 1) return '1h ago';
        return `${diffHour}h ago`;
    }
    if (diffMin > 0) {
        if (diffMin === 1) return '1m ago';
        return `${diffMin}m ago`;
    }
    if (diffSec > 0) {
        if (diffSec < 10) return 'Just now';
        return `${diffSec}s ago`;
    }
    return 'Just now';
}

/**
 * Safely get nested property
 * @param {Object} obj - Object to traverse
 * @param {string} path - Dot notation path
 * @param {*} defaultValue - Default value if path doesn't exist
 * @returns {*} Value or default
 */
export function safeGet(obj, path, defaultValue = null) {
    if (!obj || !path) return defaultValue;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === undefined || current === null || !(part in current)) {
            return defaultValue;
        }
        current = current[part];
    }
    return current;
}

/**
 * Calculate trend from data points
 * @param {Array} data - Array of numeric values
 * @returns {Object} Trend information
 */
export function calculateTrend(data) {
    if (!data || data.length < 2) {
        return { direction: 'flat', change: 0, percentage: 0 };
    }

    const first = data[0] || 0;
    const last = data[data.length - 1] || 0;
    const change = last - first;
    const percentage = first !== 0 ? (change / first) * 100 : 0;

    return {
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
        change,
        percentage: Math.round(percentage)
    };
}

/**
 * Get moving average of data
 * @param {Array} data - Array of numeric values
 * @param {number} window - Window size
 * @returns {Array} Moving average
 */
export function getMovingAverage(data, window = 3) {
    if (!data || data.length === 0) return [];
    if (data.length < window) return data;

    const result = [];
    for (let i = 0; i < data.length; i++) {
        if (i < window - 1) {
            result.push(data[i]);
        } else {
            const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
            result.push(Math.round(sum / window));
        }
    }
    return result;
}

/**
 * Export all utilities
 */
export default {
    calculateBasicStats,
    getEmptyStats,
    calculateLectureStats,
    calculateTopicPerformance,
    calculateDifficultyPerformance,
    calculateExamResults,
    getGrade,
    getGradeClass,
    calculateOverallProgress,
    getPerformanceSummary,
    calculateStudyStats,
    calculateStudyTopicPerformance,
    formatDuration,
    getTimeAgo,
    safeGet,
    calculateTrend,
    getMovingAverage
};
