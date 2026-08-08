/**
 * ============================================================
 * js/pages/exam.js — Exam Mode Controller
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Exam Mode Controller
 * 
 * Complete exam engine handling initialization, navigation,
 * answering, flagging, timing, and submission.
 */

import state from '../core/state.js';
import storage from '../core/storage.js';
import eventBus from '../core/event-bus.js';
import router from '../core/router.js';
import Timer from '../components/timer.js';
import QuestionCard from '../components/question-card.js';
import Modal from '../components/modal.js';
import Toast from '../components/toast.js';

class ExamMode {
    constructor() {
        // DOM elements
        this._elements = {
            container: null,
            questionArea: null,
            progressBar: null,
            navGrid: null,
            controls: null,
            timerDisplay: null,
            statsDisplay: null
        };
        
        // Exam data
        this._exam = {
            id: null,
            lectureId: null,
            questions: [],
            config: {
                totalQuestions: 0,
                difficulty: 'all',
                shuffle: true
            },
            answers: {},
            flagged: {},
            currentIndex: 0,
            startedAt: null,
            submitted: false,
            duration: 0
        };
        
        // Components
        this._timer = null;
        this._questionCard = null;
        this._confirmModal = null;
        this._resultModal = null;
        
        // State
        this._initialized = false;
        this._isExamActive = false;
        this._isSubmitting = false;
        
        // Bind methods
        this._handleNavigate = this._handleNavigate.bind(this);
        this._handleSelect = this._handleSelect.bind(this);
        this._handleFlag = this._handleFlag.bind(this);
        this._handleNavClick = this._handleNavClick.bind(this);
        this._handleSubmit = this._handleSubmit.bind(this);
        this._handleTimerComplete = this._handleTimerComplete.bind(this);
        this._handleTimerTick = this._handleTimerTick.bind(this);
        this._handleKeydown = this._handleKeydown.bind(this);
        this._handleStateChange = this._handleStateChange.bind(this);
        this._handleStorageUpdate = this._handleStorageUpdate.bind(this);
        
        // Initialize
        this._init();
    }

    /**
     * Initialize the exam mode
     */
    async _init() {
        if (this._initialized) return;
        
        // Get container
        this._elements.container = document.querySelector('#exam-container');
        if (!this._elements.container) {
            console.warn('Exam container not found');
            return;
        }
        
        // Cache DOM elements
        this._cacheElements();
        
        // Get lecture ID from router
        const route = router.getCurrentRoute();
        const lectureId = route.params?.id || null;
        
        if (!lectureId) {
            this._showError('No lecture specified for exam');
            return;
        }
        
        // Check for existing exam session
        const savedExam = state.get('exam');
        if (savedExam && savedExam.active && savedExam.lectureId === lectureId) {
            await this._restoreExam(savedExam);
        } else {
            // Load questions and start new exam
            await this._loadQuestions(lectureId);
        }
        
        // Setup event listeners
        this._setupEventListeners();
        
        this._initialized = true;
        console.log(`Exam mode initialized for lecture: ${lectureId}`);
    }

    /**
     * Cache DOM elements
     */
    _cacheElements() {
        this._elements.questionArea = this._elements.container.querySelector('.exam-question-area');
        this._elements.progressBar = this._elements.container.querySelector('.exam-progress-bar');
        this._elements.navGrid = this._elements.container.querySelector('.exam-nav-grid');
        this._elements.controls = this._elements.container.querySelector('.exam-controls');
        this._elements.timerDisplay = this._elements.container.querySelector('.exam-timer');
        this._elements.statsDisplay = this._elements.container.querySelector('.exam-stats');
    }

    /**
     * Load questions for the exam
     * @param {string} lectureId - Lecture ID
     */
    async _loadQuestions(lectureId) {
        try {
            // Load questions.json
            const response = await fetch(`/data/lectures/${lectureId}/questions.json`);
            if (!response.ok) {
                throw new Error('Failed to load questions');
            }
            const data = await response.json();
            const questions = data.questions || [];
            
            if (questions.length === 0) {
                this._showError('No questions available for this lecture');
                return;
            }
            
            // Get exam config from URL params or state
            const route = router.getCurrentRoute();
            const config = {
                totalQuestions: parseInt(route.query?.count) || 10,
                difficulty: route.query?.difficulty || 'all',
                shuffle: route.query?.shuffle !== 'false'
            };
            
            // Filter questions by difficulty
            let filteredQuestions = questions;
            if (config.difficulty !== 'all') {
                filteredQuestions = questions.filter(q => 
                    (q.difficulty || 'medium').toLowerCase() === config.difficulty.toLowerCase()
                );
            }
            
            // Select questions
            let selectedQuestions = [...filteredQuestions];
            
            // Shuffle if enabled
            if (config.shuffle) {
                selectedQuestions = this._shuffleArray(selectedQuestions);
            }
            
            // Limit to requested number
            const maxQuestions = Math.min(config.totalQuestions, selectedQuestions.length);
            if (maxQuestions < config.totalQuestions) {
                Toast.warning(`Only ${maxQuestions} questions available for this filter.`);
            }
            selectedQuestions = selectedQuestions.slice(0, maxQuestions);
            
            // Initialize exam
            this._exam.lectureId = lectureId;
            this._exam.questions = selectedQuestions;
            this._exam.config = {
                totalQuestions: selectedQuestions.length,
                difficulty: config.difficulty,
                shuffle: config.shuffle
            };
            this._exam.id = this._generateExamId();
            this._exam.startedAt = new Date().toISOString();
            this._exam.answers = {};
            this._exam.flagged = {};
            this._exam.currentIndex = 0;
            this._exam.submitted = false;
            
            // Update state
            state.set('exam.active', true);
            state.set('exam.lectureId', lectureId);
            state.set('exam.questions', selectedQuestions);
            state.set('exam.currentIndex', 0);
            state.set('exam.answers', {});
            state.set('exam.flagged', {});
            state.set('exam.startedAt', this._exam.startedAt);
            state.set('exam.submitted', false);
            
            // Render exam
            this._render();
            
            // Start timer
            this._startTimer();
            
            console.log(`Exam initialized with ${selectedQuestions.length} questions`);
            
        } catch (error) {
            console.error('Error loading questions:', error);
            Toast.error('Failed to load questions. Please try again.');
        }
    }

    /**
     * Restore an existing exam session
     * @param {Object} savedExam - Saved exam state
     */
    async _restoreExam(savedExam) {
        try {
            // Load questions to ensure we have the full data
            const response = await fetch(`/data/lectures/${savedExam.lectureId}/questions.json`);
            if (!response.ok) {
                throw new Error('Failed to load questions');
            }
            const data = await response.json();
            const questions = data.questions || [];
            
            // Restore exam data
            this._exam.lectureId = savedExam.lectureId;
            this._exam.questions = questions.filter(q => {
                // Filter to only questions that were in the original exam
                // We'll use the saved question IDs if available
                return true; // For now, just restore all questions
            });
            this._exam.id = savedExam.id || this._generateExamId();
            this._exam.startedAt = savedExam.startedAt || new Date().toISOString();
            this._exam.answers = savedExam.answers || {};
            this._exam.flagged = savedExam.flagged || {};
            this._exam.currentIndex = savedExam.currentIndex || 0;
            this._exam.submitted = savedExam.submitted || false;
            this._exam.config = savedExam.config || {
                totalQuestions: this._exam.questions.length,
                difficulty: 'all',
                shuffle: true
            };
            
            // Update state
            state.set('exam.active', true);
            state.set('exam.lectureId', this._exam.lectureId);
            state.set('exam.questions', this._exam.questions);
            state.set('exam.currentIndex', this._exam.currentIndex);
            state.set('exam.answers', this._exam.answers);
            state.set('exam.flagged', this._exam.flagged);
            state.set('exam.startedAt', this._exam.startedAt);
            state.set('exam.submitted', this._exam.submitted);
            
            // Render exam
            this._render();
            
            // Restore timer
            const elapsed = savedExam.duration || 0;
            const totalDuration = this._calculateTotalDuration();
            const remaining = Math.max(0, totalDuration - elapsed);
            this._startTimer(remaining);
            
            console.log(`Exam session restored with ${this._exam.questions.length} questions`);
            
        } catch (error) {
            console.error('Error restoring exam:', error);
            Toast.error('Failed to restore exam session. Starting new exam.');
            await this._loadQuestions(savedExam.lectureId);
        }
    }

    /**
     * Render the exam
     */
    _render() {
        if (!this._elements.container) return;
        
        // Render question
        this._renderQuestion();
        
        // Render progress bar
        this._renderProgressBar();
        
        // Render navigation grid
        this._renderNavGrid();
        
        // Render controls
        this._renderControls();
        
        // Render stats
        this._renderStats();
    }

    /**
     * Render current question
     */
    _renderQuestion() {
        const area = this._elements.questionArea;
        if (!area) return;
        
        const question = this._exam.questions[this._exam.currentIndex];
        if (!question) {
            area.innerHTML = '<div class="exam-empty">No question available</div>';
            return;
        }
        
        // Destroy existing question card
        if (this._questionCard) {
            this._questionCard.destroy();
            this._questionCard = null;
        }
        
        // Create new question card
        this._questionCard = new QuestionCard({
            question: question,
            index: this._exam.currentIndex,
            total: this._exam.questions.length,
            mode: 'exam',
            lectureId: this._exam.lectureId,
            onSelect: this._handleSelect,
            onFlag: this._handleFlag,
            onNavigate: this._handleNavigate
        });
        
        // Render
        area.innerHTML = '';
        this._questionCard.render(area);
        
        // Restore selected answer if exists
        const savedAnswer = this._exam.answers[this._exam.currentIndex];
        if (savedAnswer !== undefined) {
            this._questionCard.setSelectedOption(savedAnswer);
        }
        
        // Restore flagged state
        const isFlagged = this._exam.flagged[this._exam.currentIndex] || false;
        if (isFlagged) {
            this._questionCard.setFlagged(true);
        }
    }

    /**
     * Render progress bar
     */
    _renderProgressBar() {
        const bar = this._elements.progressBar;
        if (!bar) return;
        
        const total = this._exam.questions.length;
        const answered = Object.keys(this._exam.answers).length;
        const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;
        
        bar.innerHTML = `
            <div class="exam-progress-header">
                <span class="progress-text">Progress</span>
                <span class="progress-percentage">${answered}/${total} (${percentage}%)</span>
            </div>
            <div class="exam-progress-track">
                <div class="exam-progress-fill" style="width: ${percentage}%"></div>
            </div>
        `;
    }

    /**
     * Render navigation grid
     */
    _renderNavGrid() {
        const grid = this._elements.navGrid;
        if (!grid) return;
        
        const total = this._exam.questions.length;
        
        grid.innerHTML = this._exam.questions.map((_, index) => {
            const isAnswered = this._exam.answers[index] !== undefined;
            const isFlagged = this._exam.flagged[index] || false;
            const isCurrent = index === this._exam.currentIndex;
            
            let classes = 'exam-nav-btn';
            if (isCurrent) classes += ' current';
            if (isAnswered) classes += ' answered';
            if (isFlagged) classes += ' flagged';
            
            return `
                <button class="${classes}" data-index="${index}" aria-label="Question ${index + 1}">
                    ${index + 1}
                </button>
            `;
        }).join('');
        
        // Attach click events
        grid.querySelectorAll('.exam-nav-btn').forEach(btn => {
            btn.addEventListener('click', this._handleNavClick);
        });
    }

    /**
     * Render controls
     */
    _renderControls() {
        const controls = this._elements.controls;
        if (!controls) return;
        
        const isFirst = this._exam.currentIndex === 0;
        const isLast = this._exam.currentIndex === this._exam.questions.length - 1;
        const isFlagged = this._exam.flagged[this._exam.currentIndex] || false;
        
        controls.innerHTML = `
            <div class="exam-controls-left">
                <button class="btn-exam-nav" data-nav="prev" ${isFirst ? 'disabled' : ''}>
                    ← Previous
                </button>
                <button class="btn-exam-flag ${isFlagged ? 'active' : ''}" data-action="flag">
                    ${isFlagged ? '⭐' : '☆'} Flag
                </button>
            </div>
            <div class="exam-controls-right">
                <button class="btn-exam-nav ${isLast ? 'btn-exam-submit' : 'btn-exam-nav-primary'}" data-nav="${isLast ? 'submit' : 'next'}">
                    ${isLast ? '📋 Submit Exam' : 'Next →'}
                </button>
            </div>
        `;
        
        // Attach events
        controls.querySelectorAll('[data-nav]').forEach(btn => {
            btn.addEventListener('click', this._handleNavigate);
        });
        controls.querySelector('[data-action="flag"]')?.addEventListener('click', () => {
            const isCurrentlyFlagged = this._exam.flagged[this._exam.currentIndex] || false;
            this._handleFlag(this._exam.currentIndex, !isCurrentlyFlagged);
        });
    }

    /**
     * Render stats
     */
    _renderStats() {
        const stats = this._elements.statsDisplay;
        if (!stats) return;
        
        const total = this._exam.questions.length;
        const answered = Object.keys(this._exam.answers).length;
        const flagged = Object.keys(this._exam.flagged).length;
        
        stats.innerHTML = `
            <span>📝 ${answered}/${total} answered</span>
            <span>⭐ ${flagged} flagged</span>
        `;
    }

    /**
     * Start the timer
     * @param {number} remaining - Remaining time in seconds
     */
    _startTimer(remaining = null) {
        const duration = this._calculateTotalDuration();
        const initialRemaining = remaining !== null ? remaining : duration;
        
        // Destroy existing timer
        if (this._timer) {
            this._timer.destroy();
            this._timer = null;
        }
        
        // Create new timer
        this._timer = new Timer({
            duration: duration,
            warningThreshold: 60,
            criticalThreshold: 30,
            autoStart: false,
            onTick: this._handleTimerTick,
            onComplete: this._handleTimerComplete,
            onWarning: () => {
                Toast.warning('⚠️ 1 minute remaining!');
            },
            onCritical: () => {
                Toast.warning('⏰ 30 seconds remaining!');
            }
        });
        
        // Set remaining time
        if (initialRemaining < duration) {
            // Subtract elapsed time
            const elapsed = duration - initialRemaining;
            this._timer._elapsed = elapsed;
            this._timer._remaining = initialRemaining;
            this._timer._startTime = Date.now() - (elapsed * 1000);
        }
        
        // Start timer
        this._timer.start();
        
        // Update display
        this._updateTimerDisplay();
    }

    /**
     * Calculate total duration based on number of questions
     * @returns {number} Duration in seconds
     */
    _calculateTotalDuration() {
        // 60 seconds per question, minimum 5 minutes
        const perQuestion = 60;
        const total = this._exam.questions.length * perQuestion;
        return Math.max(total, 300);
    }

    /**
     * Update timer display
     */
    _updateTimerDisplay() {
        if (!this._elements.timerDisplay || !this._timer) return;
        
        const remaining = this._timer.getRemaining();
        const formatted = this._timer.getFormattedTime();
        this._elements.timerDisplay.textContent = `⏱️ ${formatted}`;
        
        // Update state class
        this._elements.timerDisplay.classList.remove('warning', 'danger');
        if (this._timer.isCritical()) {
            this._elements.timerDisplay.classList.add('danger');
        } else if (this._timer.isWarning()) {
            this._elements.timerDisplay.classList.add('warning');
        }
    }

    /**
     * Handle timer tick
     */
    _handleTimerTick() {
        this._updateTimerDisplay();
        
        // Save current elapsed time to state
        state.set('exam.duration', this._timer.getElapsed());
    }

    /**
     * Handle timer completion
     */
    _handleTimerComplete() {
        Toast.warning('⏰ Time is up! Submitting exam automatically.');
        this._submitExam(true);
    }

    /**
     * Handle question navigation
     * @param {string} direction - 'prev' or 'next'
     * @param {number} index - Current index
     */
    _handleNavigate(direction, index = null) {
        if (direction === 'prev') {
            if (this._exam.currentIndex > 0) {
                this._exam.currentIndex--;
                this._render();
            }
        } else if (direction === 'next') {
            if (this._exam.currentIndex < this._exam.questions.length - 1) {
                this._exam.currentIndex++;
                this._render();
            }
        } else if (direction === 'submit') {
            this._showSubmitConfirmation();
        } else if (direction === 'goto' && index !== null) {
            if (index >= 0 && index < this._exam.questions.length) {
                this._exam.currentIndex = index;
                this._render();
            }
        }
        
        // Update state
        state.set('exam.currentIndex', this._exam.currentIndex);
    }

    /**
     * Handle nav grid click
     * @param {Event} e - Click event
     */
    _handleNavClick(e) {
        const index = parseInt(e.currentTarget.dataset.index);
        if (!isNaN(index)) {
            this._handleNavigate('goto', index);
        }
    }

    /**
     * Handle answer selection
     * @param {number} index - Question index
     * @param {number} selected - Selected option index
     * @param {boolean} correct - Whether correct
     */
    _handleSelect(index, selected, correct) {
        this._exam.answers[index] = selected;
        state.set(`exam.answers.${index}`, selected);
        
        // Update progress
        this._renderProgressBar();
        this._renderStats();
        this._renderNavGrid();
        
        // Emit event
        eventBus.emit('exam.answer.selected', {
            questionIndex: index,
            selected,
            correct
        });
    }

    /**
     * Handle flag toggle
     * @param {number} index - Question index
     * @param {boolean} flagged - Flagged state
     */
    _handleFlag(index, flagged) {
        if (flagged) {
            this._exam.flagged[index] = true;
        } else {
            delete this._exam.flagged[index];
        }
        state.set(`exam.flagged.${index}`, flagged);
        
        // Update UI
        this._renderNavGrid();
        this._renderControls();
        this._renderStats();
        
        // Emit event
        eventBus.emit('exam.flag.toggled', {
            questionIndex: index,
            flagged
        });
    }

    /**
     * Show submit confirmation modal
     */
    _showSubmitConfirmation() {
        const total = this._exam.questions.length;
        const answered = Object.keys(this._exam.answers).length;
        const unanswered = total - answered;
        const flagged = Object.keys(this._exam.flagged).length;
        const remaining = this._timer ? this._timer.getRemaining() : 0;
        const formattedTime = this._timer ? this._timer.getFormattedTime() : '00:00';
        
        const modal = new Modal({
            title: '📋 Submit Exam',
            content: `
                <div class="confirmation-content">
                    <div class="confirmation-icon">📝</div>
                    <p style="font-size: 16px; color: var(--text-primary); margin-bottom: 16px;">
                        Are you sure you want to submit your exam?
                    </p>
                    <div class="exam-summary" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; text-align: center;">
                        <div style="padding: 12px; background: var(--bg-surface-alt); border-radius: 8px;">
                            <div style="font-size: 20px; font-weight: bold; color: var(--text-primary);">${answered}</div>
                            <div style="font-size: 12px; color: var(--text-muted);">Answered</div>
                        </div>
                        <div style="padding: 12px; background: var(--bg-surface-alt); border-radius: 8px;">
                            <div style="font-size: 20px; font-weight: bold; color: var(--color-danger);">${unanswered}</div>
                            <div style="font-size: 12px; color: var(--text-muted);">Unanswered</div>
                        </div>
                        <div style="padding: 12px; background: var(--bg-surface-alt); border-radius: 8px;">
                            <div style="font-size: 20px; font-weight: bold; color: var(--color-warning);">${flagged}</div>
                            <div style="font-size: 12px; color: var(--text-muted);">Flagged</div>
                        </div>
                        <div style="padding: 12px; background: var(--bg-surface-alt); border-radius: 8px;">
                            <div style="font-size: 20px; font-weight: bold; color: var(--text-primary);">${formattedTime}</div>
                            <div style="font-size: 12px; color: var(--text-muted);">Remaining</div>
                        </div>
                    </div>
                    ${unanswered > 0 ? `<p style="font-size: 14px; color: var(--color-warning);">⚠️ You have ${unanswered} unanswered question(s).</p>` : ''}
                    ${flagged > 0 ? `<p style="font-size: 14px; color: var(--color-info);">⭐ You have ${flagged} flagged question(s).</p>` : ''}
                </div>
            `,
            buttons: [
                {
                    label: 'Cancel',
                    type: 'secondary',
                    action: 'cancel',
                    closeOnClick: true
                },
                {
                    label: 'Submit Exam',
                    type: 'primary',
                    action: 'confirm',
                    closeOnClick: true
                }
            ],
            size: 'md',
            closeOnOverlay: false,
            onConfirm: () => {
                this._submitExam(false);
            },
            onCancel: () => {
                Toast.info('Exam submission cancelled');
            }
        });
        
        modal.open();
        this._confirmModal = modal;
    }

    /**
     * Submit the exam
     * @param {boolean} autoSubmit - Whether this is an auto-submit
     */
    async _submitExam(autoSubmit = false) {
        if (this._isSubmitting || this._exam.submitted) return;
        this._isSubmitting = true;
        
        try {
            // Stop timer
            if (this._timer) {
                this._timer.stop();
            }
            
            // Calculate results
            const results = this._calculateResults();
            
            // Save exam history
            const examResult = {
                lectureId: this._exam.lectureId,
                total: results.total,
                correct: results.correct,
                wrong: results.wrong,
                skipped: results.skipped,
                score: results.score,
                percentage: results.percentage,
                duration: this._timer ? this._timer.getElapsed() : 0,
                answers: this._exam.answers,
                timestamp: new Date().toISOString(),
                autoSubmitted: autoSubmit
            };
            
            storage.addExamResult(examResult);
            
            // Update progress
            const progress = storage.loadUserProgress();
            progress.totalQuestionsAttempted += results.total;
            progress.correctAnswers += results.correct;
            progress.wrongAnswers += results.wrong;
            progress.skippedQuestions += results.skipped;
            progress.accuracy = progress.correctAnswers / (progress.correctAnswers + progress.wrongAnswers) * 100;
            
            // Calculate streak
            if (results.percentage >= 70) {
                progress.streak = (progress.streak || 0) + 1;
                if (progress.streak > progress.bestStreak) {
                    progress.bestStreak = progress.streak;
                }
            } else {
                progress.streak = 0;
            }
            
            storage.saveUserProgress(progress);
            
            // Mark lecture as completed if score >= 70%
            if (results.percentage >= 70) {
                storage.addCompletedLecture(this._exam.lectureId);
            }
            
            // Update state
            this._exam.submitted = true;
            state.set('exam.submitted', true);
            state.set('exam.results', results);
            state.set('exam.active', false);
            
            // Emit event
            eventBus.emit('exam.completed', {
                lectureId: this._exam.lectureId,
                results,
                autoSubmitted: autoSubmit
            });
            
            // Show toast
            if (autoSubmit) {
                Toast.success(`Exam auto-submitted! Score: ${results.percentage}%`);
            } else {
                Toast.success(`Exam submitted! Score: ${results.percentage}%`);
            }
            
            // Navigate to results
            setTimeout(() => {
                router.navigate(`/results/${this._exam.lectureId}`);
            }, 1500);
            
        } catch (error) {
            console.error('Error submitting exam:', error);
            Toast.error('Failed to submit exam. Please try again.');
        } finally {
            this._isSubmitting = false;
        }
    }

    /**
     * Calculate exam results
     * @returns {Object} Results object
     */
    _calculateResults() {
        let correct = 0;
        let wrong = 0;
        let skipped = 0;
        
        this._exam.questions.forEach((question, index) => {
            const answer = this._exam.answers[index];
            if (answer === undefined) {
                skipped++;
            } else if (answer === question.answer) {
                correct++;
            } else {
                wrong++;
            }
        });
        
        const total = this._exam.questions.length;
        const score = correct * 1; // 1 point per correct answer
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
        
        return {
            total,
            correct,
            wrong,
            skipped,
            score,
            percentage,
            grade: this._getGrade(percentage)
        };
    }

    /**
     * Get grade based on percentage
     * @param {number} percentage - Score percentage
     * @returns {string} Grade
     */
    _getGrade(percentage) {
        if (percentage >= 90) return 'Excellent';
        if (percentage >= 75) return 'Good';
        if (percentage >= 60) return 'Average';
        if (percentage >= 40) return 'Below Average';
        return 'Needs Improvement';
    }

    /**
     * Handle keyboard events
     * @param {KeyboardEvent} e - Keyboard event
     */
    _handleKeydown(e) {
        if (!this._isExamActive || this._exam.submitted) return;
        
        // Number keys 1-4 for options
        if (e.key >= '1' && e.key <= '4') {
            const index = parseInt(e.key) - 1;
            const question = this._exam.questions[this._exam.currentIndex];
            if (question && index < question.options.length) {
                this._handleSelect(this._exam.currentIndex, index, index === question.answer);
            }
        }
        
        // Arrow keys for navigation
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this._handleNavigate('prev');
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            this._handleNavigate('next');
        }
        
        // 'F' key for flag
        if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            const isFlagged = this._exam.flagged[this._exam.currentIndex] || false;
            this._handleFlag(this._exam.currentIndex, !isFlagged);
        }
    }

    /**
     * Shuffle an array (Fisher-Yates)
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array
     */
    _shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Generate a unique exam ID
     * @returns {string} Exam ID
     */
    _generateExamId() {
        return `exam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    _showError(message) {
        if (this._elements.container) {
            this._elements.container.innerHTML = `
                <div class="exam-error">
                    <span class="error-icon">❌</span>
                    <h2>Error</h2>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">Reload Page</button>
                </div>
            `;
        }
    }

    /**
     * Setup event listeners
     */
    _setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', this._handleKeydown);
        
        // State changes
        eventBus.on('state.updated', this._handleStateChange);
        eventBus.on('storage.updated', this._handleStorageUpdate);
        
        // Route changes
        eventBus.on('routechange', (detail) => {
            if (this._isExamActive && !this._exam.submitted) {
                // Confirm navigation away from exam
                const confirmLeave = confirm('You have an active exam. Are you sure you want to leave?');
                if (!confirmLeave) {
                    // Stay on exam page - we can't easily prevent navigation, but we can handle it
                }
            }
        });
        
        // Handle page unload
        window.addEventListener('beforeunload', (e) => {
            if (this._isExamActive && !this._exam.submitted) {
                e.preventDefault();
                e.returnValue = 'You have an active exam. Are you sure you want to leave?';
            }
        });
    }

    /**
     * Handle state changes
     */
    _handleStateChange() {
        // Check if exam state changed externally
        const examState = state.get('exam');
        if (examState && examState.active && examState.lectureId === this._exam.lectureId) {
            // Sync state
            this._exam.answers = examState.answers || {};
            this._exam.flagged = examState.flagged || {};
            this._exam.currentIndex = examState.currentIndex || 0;
            this._exam.submitted = examState.submitted || false;
            
            // Update UI if needed
            if (!this._exam.submitted) {
                this._render();
            }
        }
    }

    /**
     * Handle storage updates
     */
    _handleStorageUpdate() {
        // Refresh any storage-dependent data
    }

    /**
     * Get exam data
     * @returns {Object} Exam data
     */
    getData() {
        return {
            ...this._exam,
            timer: this._timer ? this._timer.getStats() : null
        };
    }

    /**
     * Get results if submitted
     * @returns {Object|null} Results object
     */
    getResults() {
        return this._exam.submitted ? this._calculateResults() : null;
    }

    /**
     * Get current question
     * @returns {Object|null} Current question
     */
    getCurrentQuestion() {
        return this._exam.questions[this._exam.currentIndex] || null;
    }

    /**
     * Get progress
     * @returns {Object} Progress object
     */
    getProgress() {
        const total = this._exam.questions.length;
        const answered = Object.keys(this._exam.answers).length;
        return {
            total,
            answered,
            remaining: total - answered,
            percentage: total > 0 ? Math.round((answered / total) * 100) : 0
        };
    }

    /**
     * Destroy the exam mode
     */
    destroy() {
        // Destroy timer
        if (this._timer) {
            this._timer.destroy();
            this._timer = null;
        }
        
        // Destroy question card
        if (this._questionCard) {
            this._questionCard.destroy();
            this._questionCard = null;
        }
        
        // Clear event listeners
        document.removeEventListener('keydown', this._handleKeydown);
        eventBus.off('state.updated', this._handleStateChange);
        eventBus.off('storage.updated', this._handleStorageUpdate);
        window.removeEventListener('beforeunload', this._handleBeforeUnload);
        
        // Clear state
        state.set('exam.active', false);
        
        this._initialized = false;
        this._isExamActive = false;
        console.log('Exam mode destroyed');
    }
}

/**
 * Create and export the exam mode instance
 */
const examMode = new ExamMode();

// Export the exam mode
export default examMode;

