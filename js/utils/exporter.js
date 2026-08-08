/**
 * ============================================================
 * js/utils/exporter.js — Data Export Utility
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Exporter Utility
 * 
 * Provides browser-based data export functionality for
 * JSON, CSV, and printable HTML reports.
 */

/**
 * Export data as JSON
 * @param {*} data - Data to export
 * @param {Object} options - Export options
 * @param {string} options.filename - Filename (without extension)
 * @param {boolean} options.pretty - Pretty print JSON (default: true)
 * @param {number} options.indent - Indent spaces (default: 2)
 * @param {string} options.fallback - Fallback for empty data
 * @returns {boolean} Success status
 */
export function exportJSON(data, options = {}) {
    const {
        filename = `export_${getTimestamp()}`,
        pretty = true,
        indent = 2,
        fallback = 'No data to export'
    } = options;

    if (!data || (Array.isArray(data) && data.length === 0) || (typeof data === 'object' && Object.keys(data).length === 0)) {
        return downloadFile(fallback, `${filename}.json`, 'application/json');
    }

    try {
        const json = pretty ? JSON.stringify(data, null, indent) : JSON.stringify(data);
        return downloadFile(json, `${filename}.json`, 'application/json');
    } catch (error) {
        console.error('Error exporting JSON:', error);
        return false;
    }
}

/**
 * Export data as CSV
 * @param {Array} data - Array of objects to export
 * @param {Object} options - Export options
 * @param {string} options.filename - Filename (without extension)
 * @param {Array} options.fields - Fields to include (default: all)
 * @param {Object} options.fieldMapping - Map field names to headers
 * @param {string} options.delimiter - CSV delimiter (default: ',')
 * @param {boolean} options.includeHeader - Include header row (default: true)
 * @param {string} options.fallback - Fallback for empty data
 * @returns {boolean} Success status
 */
export function exportCSV(data, options = {}) {
    const {
        filename = `export_${getTimestamp()}`,
        fields = null,
        fieldMapping = {},
        delimiter = ',',
        includeHeader = true,
        fallback = 'No data to export'
    } = options;

    if (!data || !Array.isArray(data) || data.length === 0) {
        return downloadFile(fallback, `${filename}.csv`, 'text/csv');
    }

    try {
        // Determine fields to export
        let exportFields = fields;
        if (!exportFields) {
            // Get all fields from first item
            exportFields = Object.keys(data[0]);
        }

        // Build CSV
        const rows = [];

        // Header row
        if (includeHeader) {
            const headerRow = exportFields.map(field => 
                escapeCSV(fieldMapping[field] || field)
            );
            rows.push(headerRow.join(delimiter));
        }

        // Data rows
        for (const item of data) {
            const row = exportFields.map(field => {
                let value = item[field];
                // Handle nested objects
                if (typeof value === 'object' && value !== null) {
                    value = JSON.stringify(value);
                }
                return escapeCSV(String(value ?? ''));
            });
            rows.push(row.join(delimiter));
        }

        const csv = rows.join('\n');
        return downloadFile(csv, `${filename}.csv`, 'text/csv');
    } catch (error) {
        console.error('Error exporting CSV:', error);
        return false;
    }
}

/**
 * Export exam results
 * @param {Object} results - Exam results object
 * @param {Object} options - Export options
 * @param {string} options.format - Export format: 'json' | 'csv' | 'html'
 * @param {string} options.filename - Custom filename
 * @returns {boolean} Success status
 */
export function exportExamResults(results, options = {}) {
    const {
        format = 'json',
        filename = `exam_results_${getTimestamp()}`
    } = options;

    if (!results || typeof results !== 'object') {
        return false;
    }

    switch (format) {
        case 'json':
            return exportJSON(results, { filename });
        case 'csv':
            return exportExamResultsCSV(results, { filename });
        case 'html':
            return exportExamResultsHTML(results, { filename });
        default:
            console.warn(`Unsupported format: ${format}`);
            return false;
    }
}

/**
 * Export exam results as CSV
 * @param {Object} results - Exam results object
 * @param {Object} options - Options
 * @returns {boolean} Success status
 */
function exportExamResultsCSV(results, options = {}) {
    const { filename = `exam_results_${getTimestamp()}` } = options;

    // Flatten results for CSV
    const data = [];
    
    // Overall results
    data.push({
        type: 'Overall',
        metric: 'Total Questions',
        value: results.total || 0
    });
    data.push({
        type: 'Overall',
        metric: 'Correct',
        value: results.correct || 0
    });
    data.push({
        type: 'Overall',
        metric: 'Wrong',
        value: results.wrong || 0
    });
    data.push({
        type: 'Overall',
        metric: 'Skipped',
        value: results.skipped || 0
    });
    data.push({
        type: 'Overall',
        metric: 'Score',
        value: results.score || 0
    });
    data.push({
        type: 'Overall',
        metric: 'Percentage',
        value: results.percentage || 0
    });
    data.push({
        type: 'Overall',
        metric: 'Grade',
        value: results.grade || 'N/A'
    });
    data.push({
        type: 'Overall',
        metric: 'Duration',
        value: results.duration || 0
    });

    // Topic performance
    if (results.topics && results.topics.topics) {
        for (const [topic, stats] of Object.entries(results.topics.topics)) {
            data.push({
                type: 'Topic',
                metric: topic,
                value: `${stats.correct}/${stats.attempted} (${stats.accuracy || 0}%)`
            });
        }
    }

    // Difficulty performance
    if (results.difficulties && results.difficulties.difficulties) {
        for (const [difficulty, stats] of Object.entries(results.difficulties.difficulties)) {
            data.push({
                type: 'Difficulty',
                metric: difficulty,
                value: `${stats.correct}/${stats.attempted} (${stats.accuracy || 0}%)`
            });
        }
    }

    return exportCSV(data, {
        filename,
        fields: ['type', 'metric', 'value'],
        fieldMapping: {
            type: 'Category',
            metric: 'Metric',
            value: 'Value'
        }
    });
}

/**
 * Export exam results as HTML report
 * @param {Object} results - Exam results object
 * @param {Object} options - Options
 * @returns {boolean} Success status
 */
function exportExamResultsHTML(results, options = {}) {
    const { filename = `exam_report_${getTimestamp()}` } = options;

    const html = generateExamReportHTML(results);
    return downloadFile(html, `${filename}.html`, 'text/html');
}

/**
 * Generate HTML report for exam results
 * @param {Object} results - Exam results object
 * @returns {string} HTML string
 */
function generateExamReportHTML(results) {
    const { total, correct, wrong, skipped, percentage, grade, duration } = results;
    const date = new Date().toLocaleString();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exam Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            color: #333;
            line-height: 1.6;
        }
        h1 { color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
            margin: 20px 0;
        }
        .stat {
            background: #f8f9fa;
            padding: 16px;
            border-radius: 8px;
            text-align: center;
        }
        .stat .value {
            font-size: 24px;
            font-weight: bold;
            color: #6366f1;
        }
        .stat .label {
            font-size: 14px;
            color: #6c757d;
        }
        .stat.correct .value { color: #22c55e; }
        .stat.wrong .value { color: #ef4444; }
        .stat.skipped .value { color: #f59e0b; }
        .stat.percentage .value { color: #3b82f6; }
        .grade {
            text-align: center;
            padding: 20px;
            margin: 20px 0;
            background: #f0f4ff;
            border-radius: 8px;
            font-size: 20px;
            font-weight: bold;
        }
        .grade .percentage { font-size: 48px; color: #6366f1; }
        .details { margin: 20px 0; }
        .details table {
            width: 100%;
            border-collapse: collapse;
        }
        .details th, .details td {
            padding: 10px;
            border: 1px solid #e5e7eb;
            text-align: left;
        }
        .details th {
            background: #f8f9fa;
            font-weight: 600;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
        }
        @media print {
            body { margin: 20px; }
            .stat { background: #f8f9fa !important; }
        }
    </style>
</head>
<body>
    <h1>📊 Exam Report</h1>
    <p>Generated: ${date}</p>
    
    <div class="summary">
        <div class="stat">
            <div class="value">${total}</div>
            <div class="label">Total Questions</div>
        </div>
        <div class="stat correct">
            <div class="value">${correct}</div>
            <div class="label">Correct</div>
        </div>
        <div class="stat wrong">
            <div class="value">${wrong}</div>
            <div class="label">Wrong</div>
        </div>
        <div class="stat skipped">
            <div class="value">${skipped}</div>
            <div class="label">Skipped</div>
        </div>
        <div class="stat percentage">
            <div class="value">${percentage}%</div>
            <div class="label">Percentage</div>
        </div>
    </div>
    
    <div class="grade">
        <div>Grade: ${grade}</div>
        <div class="percentage">${percentage}%</div>
    </div>
    
    <div class="details">
        <h2>Performance Details</h2>
        <table>
            <thead>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>Correct Answers</td><td>${correct}</td></tr>
                <tr><td>Wrong Answers</td><td>${wrong}</td></tr>
                <tr><td>Skipped Questions</td><td>${skipped}</td></tr>
                <tr><td>Score</td><td>${correct}/${total}</td></tr>
                <tr><td>Percentage</td><td>${percentage}%</td></tr>
                <tr><td>Grade</td><td>${grade}</td></tr>
                <tr><td>Time Taken</td><td>${formatDuration(duration || 0)}</td></tr>
            </tbody>
        </table>
    </div>
    
    <div class="footer">
        Applied Deep Learning Platform — Exam Report
    </div>
</body>
</html>`;
}

/**
 * Export user progress
 * @param {Object} progress - User progress data
 * @param {Object} options - Export options
 * @param {string} options.format - Export format: 'json' | 'csv'
 * @param {string} options.filename - Custom filename
 * @returns {boolean} Success status
 */
export function exportProgress(progress, options = {}) {
    const {
        format = 'json',
        filename = `progress_${getTimestamp()}`
    } = options;

    if (!progress || typeof progress !== 'object') {
        return false;
    }

    switch (format) {
        case 'json':
            return exportJSON(progress, { filename });
        case 'csv': {
            // Convert progress to flat structure for CSV
            const data = [];
            for (const [key, value] of Object.entries(progress)) {
                if (typeof value === 'object' && value !== null) {
                    for (const [subKey, subValue] of Object.entries(value)) {
                        data.push({
                            category: key,
                            metric: subKey,
                            value: String(subValue ?? '')
                        });
                    }
                } else {
                    data.push({
                        category: 'overall',
                        metric: key,
                        value: String(value ?? '')
                    });
                }
            }
            return exportCSV(data, {
                filename,
                fields: ['category', 'metric', 'value']
            });
        }
        default:
            console.warn(`Unsupported format: ${format}`);
            return false;
    }
}

/**
 * Export bookmarks/favorites
 * @param {Array} bookmarks - Array of bookmark objects
 * @param {Object} options - Export options
 * @param {string} options.format - Export format: 'json' | 'csv'
 * @param {string} options.filename - Custom filename
 * @param {Array} options.fields - Fields to include in CSV
 * @returns {boolean} Success status
 */
export function exportBookmarks(bookmarks, options = {}) {
    const {
        format = 'json',
        filename = `bookmarks_${getTimestamp()}`,
        fields = ['id', 'question', 'topic', 'difficulty', 'source', 'lecture']
    } = options;

    if (!bookmarks || !Array.isArray(bookmarks) || bookmarks.length === 0) {
        return false;
    }

    switch (format) {
        case 'json':
            return exportJSON(bookmarks, { filename });
        case 'csv':
            return exportCSV(bookmarks, {
                filename,
                fields,
                fieldMapping: {
                    id: 'ID',
                    question: 'Question',
                    topic: 'Topic',
                    difficulty: 'Difficulty',
                    source: 'Source',
                    lecture: 'Lecture'
                }
            });
        default:
            console.warn(`Unsupported format: ${format}`);
            return false;
    }
}

/**
 * Export question collection
 * @param {Array} questions - Array of question objects
 * @param {Object} options - Export options
 * @param {string} options.format - Export format: 'json' | 'csv'
 * @param {string} options.filename - Custom filename
 * @param {Array} options.fields - Fields to include in CSV
 * @returns {boolean} Success status
 */
export function exportQuestions(questions, options = {}) {
    const {
        format = 'json',
        filename = `questions_${getTimestamp()}`,
        fields = ['id', 'question', 'options', 'answer', 'topic', 'difficulty', 'source', 'explanation']
    } = options;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return false;
    }

    switch (format) {
        case 'json':
            return exportJSON(questions, { filename });
        case 'csv':
            return exportCSV(questions, {
                filename,
                fields,
                fieldMapping: {
                    id: 'ID',
                    question: 'Question',
                    options: 'Options',
                    answer: 'Answer',
                    topic: 'Topic',
                    difficulty: 'Difficulty',
                    source: 'Source',
                    explanation: 'Explanation'
                }
            });
        default:
            console.warn(`Unsupported format: ${format}`);
            return false;
    }
}

/**
 * Export statistics
 * @param {Object} stats - Statistics data
 * @param {Object} options - Export options
 * @param {string} options.format - Export format: 'json' | 'csv'
 * @param {string} options.filename - Custom filename
 * @returns {boolean} Success status
 */
export function exportStatistics(stats, options = {}) {
    const {
        format = 'json',
        filename = `statistics_${getTimestamp()}`
    } = options;

    if (!stats || typeof stats !== 'object') {
        return false;
    }

    return exportJSON(stats, { filename });
}

/**
 * Download a file using Blob
 * @param {string} content - File content
 * @param {string} filename - Full filename with extension
 * @param {string} mimeType - MIME type
 * @returns {boolean} Success status
 */
export function downloadFile(content, filename, mimeType) {
    try {
        const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return true;
    } catch (error) {
        console.error('Error downloading file:', error);
        return false;
    }
}

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 * @param {string} value - Value to escape
 * @returns {string} Escaped value
 */
export function escapeCSV(value) {
    if (value === undefined || value === null) {
        return '';
    }

    const str = String(value);
    
    // If contains comma, quote, or newline, wrap in quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    
    return str;
}

/**
 * Generate a timestamp for filenames
 * @returns {string} Timestamp string
 */
function getTimestamp() {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
}

/**
 * Format duration for HTML report
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
function formatDuration(seconds) {
    if (typeof seconds !== 'number' || seconds < 0) {
        return '0:00';
    }
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
 * Get export formats available
 * @returns {Array} Available formats
 */
export function getExportFormats() {
    return ['json', 'csv', 'html'];
}

/**
 * Get file extension for a format
 * @param {string} format - Format name
 * @returns {string} File extension
 */
export function getFileExtension(format) {
    const extensions = {
        json: '.json',
        csv: '.csv',
        html: '.html'
    };
    return extensions[format] || '.txt';
}

/**
 * Get MIME type for a format
 * @param {string} format - Format name
 * @returns {string} MIME type
 */
export function getMimeType(format) {
    const mimeTypes = {
        json: 'application/json',
        csv: 'text/csv',
        html: 'text/html'
    };
    return mimeTypes[format] || 'text/plain';
}

/**
 * Export all utilities
 */
export default {
    exportJSON,
    exportCSV,
    exportExamResults,
    exportProgress,
    exportBookmarks,
    exportQuestions,
    exportStatistics,
    downloadFile,
    escapeCSV,
    getExportFormats,
    getFileExtension,
    getMimeType
};
