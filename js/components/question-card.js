/**
 * ============================================================
 * js/components/question-card.js — Question Card Component
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Question Card Component
 * 
 * A reusable component for rendering and managing exam questions.
 * Handles display, interaction, and state management for questions.
 */

import state from '../core/state.js';
import storage from '../core/storage.js';
import eventBus from '../core/event-bus.js';

class QuestionCard {
    /**
     * Create a new QuestionCard instance
     * @param {Object} options - Configuration options
     * @param {Object} options.question - Question data object
     * @param {number} options.index - Question index (0-based)
     * @param {number} options.total - Total number of questions
     * @param {string} options.mode - 'exam', 'practice', or 'review'
     * @param {Function} options.onSelect - Callback when answer is selected
     * @param {Function} options.onFlag - Callback when question is flagged
     * @param {Function} options.onNavigate - Callback for navigation
     * @param {string} options.lectureId - Current lecture ID
     */
    constructor(options = {}) {
        // Question data
        this._question = options.question || null;
        this._index = options.index || 0;
        this._total = options.total || 1;
        this._mode = options.mode || 'exam'; // exam | practice | review
        this._lectureId = options.lectureId || null;
        
        // Callbacks
        this._onSelect = options.onSelect || null;
        this._onFlag = options.onFlag || null;
        this._onNavigate = options.onNavigate || null;
        
        // State
        this._selectedOption = null;
        this._isFlagged = false;
        this._isAnswered = false;
        this._isCorrect = false;
        this._showExplanation = false;
        this._isLocked = false;
        
        // DOM elements
        this._element = null;
        this._options = [];
        
        // Bind methods
        this._handleOptionClick = this._handleOptionClick.bind(this);
        this._handleFlagClick = this._handleFlagClick.bind(this);
        this._handleNavigation = this._handleNavigation.bind(this);
        
        // Initialize
        this._loadState();
    }

    /**
     * Load saved state for this question
     */
    _loadState() {
        // Check if question has been answered
        const examAnswers = state.get('exam.answers') || {};
        const answerIndex = examAnswers[this._index];
        
        if (answerIndex !== undefined && answerIndex !== null) {
            this._selectedOption = answerIndex;
            this._isAnswered = true;
            
            // Check if correct (only if we have answer data)
            if (this._question && this._question.answer !== undefined) {
                this._isCorrect = this._selectedOption === this._question.answer;
            }
        }
        
        // Check if flagged
        const flagged = state.get('exam.flagged') || {};
        this._isFlagged = flagged[this._index] || false;
        
        // Check if locked (exam submitted)
        if (this._mode === 'review') {
            this._isLocked = true;
            this._showExplanation = true;
        }
    }

    /**
     * Render the question card
     * @param {HTMLElement} container - Container element to render into
     * @returns {HTMLElement} The rendered element
     */
    render(container) {
        // Create container element
        this._element = document.createElement('div');
        this._element.className = 'question-container';
        this._element.setAttribute('role', 'article');
        this._element.setAttribute('aria-label', `Question ${this._index + 1}`);

        // Build question HTML
        this._element.innerHTML = this._getHTML();
        
        // Cache option elements
        this._options = this._element.querySelectorAll('.option-item');
        
        // Attach event listeners
        this._attachEvents();
        
        // Update UI state
        this._updateUI();
        
        // Render to container
        if (container) {
            container.appendChild(this._element);
        }
        
        return this._element;
    }

    /**
     * Get HTML for the question card
     * @returns {string} HTML string
     */
    _getHTML() {
        if (!this._question) {
            return this._getEmptyStateHTML();
        }

        const { id, lecture, topic, difficulty, question, options, explanation } = this._question;
        const questionNumber = this._index + 1;
        const totalQuestions = this._total;

        // Build difficulty badge
        const difficultyBadge = this._getDifficultyBadge(difficulty);

        // Build options HTML
        const optionsHTML = options.map((option, index) => {
            const letter = String.fromCharCode(65 + index); // A, B, C, D
            return this._getOptionHTML(index, letter, option);
        }).join('');

        // Build explanation HTML (if in review mode or showing)
        const explanationHTML = this._getExplanationHTML(explanation);

        // Build navigation HTML
        const navigationHTML = this._getNavigationHTML();

        return `
            <div class="question-header">
                <div class="question-header-left">
                    <span class="question-number">${questionNumber}</span>
                    ${lecture ? `<span class="question-topic-badge">${lecture}</span>` : ''}
                    ${topic ? `<span class="question-topic-badge">${topic}</span>` : ''}
                    ${difficultyBadge}
                </div>
                <div class="question-header-actions">
                    <button class="btn-flag ${this._isFlagged ? 'active' : ''}" 
                            data-flag="${id}" 
                            aria-label="${this._isFlagged ? 'Remove bookmark' : 'Bookmark question'}"
                            title="${this._isFlagged ? 'Remove bookmark' : 'Bookmark question'}">
                        ${this._isFlagged ? '⭐' : '☆'}
                    </button>
                </div>
            </div>
            <div class="question-text">${question}</div>
            <div class="question-options">
                ${optionsHTML}
            </div>
            ${explanationHTML}
            <div class="question-navigation">
                <div class="question-nav-info">
                    <span class="current">${questionNumber}</span>
                    <span class="separator">of</span>
                    <span class="total">${totalQuestions}</span>
                    ${this._isAnswered ? `<span class="answer-status">✓ Answered</span>` : ''}
                </div>
                ${navigationHTML}
            </div>
        `;
    }

    /**
     * Get option HTML
     * @param {number} index - Option index
     * @param {string} letter - Option letter (A, B, C, D)
     * @param {string} text - Option text
     * @returns {string} Option HTML
     */
    _getOptionHTML(index, letter, text) {
        let className = 'option-item';
        let additionalAttrs = '';
        
        // Check if this option is selected
        if (this._selectedOption === index) {
            className += ' selected';
        }
        
        // In review mode, show correct/wrong states
        if (this._mode === 'review' || this._isLocked) {
            const isCorrect = index === this._question.answer;
            const isSelected = this._selectedOption === index;
            
            if (isCorrect) {
                className += ' correct';
            } else if (isSelected && !isCorrect) {
                className += ' wrong';
            }
            
            additionalAttrs = ' disabled';
        } else if (this._isLocked) {
            additionalAttrs = ' disabled';
        }
        
        return `
            <div class="${className}" data-option="${index}" ${additionalAttrs}>
                <span class="option-label">${letter}</span>
                <span class="option-text">${text}</span>
            </div>
        `;
    }

    /**
     * Get difficulty badge HTML
     * @param {string} difficulty - Difficulty level
     * @returns {string} Difficulty badge HTML
     */
    _getDifficultyBadge(difficulty) {
        if (!difficulty) return '';
        
        const level = difficulty.toLowerCase();
        let className = 'question-difficulty-badge';
        let label = difficulty;
        
        switch (level) {
            case 'easy':
                className += ' easy';
                label = '🟢 Easy';
                break;
            case 'medium':
                className += ' medium';
                label = '🟡 Medium';
                break;
            case 'hard':
                className += ' hard';
                label = '🔴 Hard';
                break;
            case 'expert':
                className += ' expert';
                label = '🟣 Expert';
                break;
            default:
                className += ' medium';
        }
        
        return `<span class="${className}">${label}</span>`;
    }

    /**
     * Get explanation HTML
     * @param {string} explanation - Explanation text
     * @returns {string} Explanation HTML
     */
    _getExplanationHTML(explanation) {
        if (!this._showExplanation || !explanation) return '';
        
        return `
            <div class="question-explanation">
                <div class="question-explanation-header">
                    <span>💡</span>
                    <span>Explanation</span>
                </div>
                <div class="question-explanation-text">${explanation}</div>
            </div>
        `;
    }

    /**
     * Get navigation HTML
     * @returns {string} Navigation HTML
     */
    _getNavigationHTML() {
        const isFirst = this._index === 0;
        const isLast = this._index === this._total - 1;
        
        return `
            <div class="question-nav-buttons">
                <button class="btn-nav" data-nav="prev" ${isFirst ? 'disabled' : ''}>
                    ← Previous
                </button>
                ${this._mode === 'exam' ? `
                    <button class="btn-nav btn-nav-primary" data-nav="next" ${isLast ? 'disabled' : ''}>
                        Next →
                    </button>
                ` : ''}
                ${this._mode === 'practice' ? `
                    <button class="btn-nav btn-nav-success" data-nav="check" ${this._isAnswered ? '' : 'disabled'}>
                        ${this._isAnswered ? '✓ Checked' : 'Check Answer'}
                    </button>
                ` : ''}
                ${this._mode === 'review' ? `
                    <button class="btn-nav" data-nav="back">
                        ← Back to Results
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Get empty state HTML
     * @returns {string} Empty state HTML
     */
    _getEmptyStateHTML() {
        return `
            <div class="question-empty">
                <span class="empty-icon">📝</span>
                <p class="empty-text">No question data available</p>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    _attachEvents() {
        // Option click events
        this._options.forEach(option => {
            option.addEventListener('click', this._handleOptionClick);
            option.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this._handleOptionClick(e);
                }
            });
        });

        // Flag button
        const flagBtn = this._element?.querySelector('.btn-flag');
        if (flagBtn) {
            flagBtn.addEventListener('click', this._handleFlagClick);
        }

        // Navigation buttons
        const navButtons = this._element?.querySelectorAll('.btn-nav');
        if (navButtons) {
            navButtons.forEach(btn => {
                btn.addEventListener('click', this._handleNavigation);
            });
        }
    }

    /**
     * Handle option click
     * @param {Event} e - Click event
     */
    _handleOptionClick(e) {
        const option = e.currentTarget;
        
        // Prevent interaction if locked
        if (this._isLocked || option.classList.contains('disabled')) {
            return;
        }

        const optionIndex = parseInt(option.dataset.option);
        
        // Check if already selected
        if (this._selectedOption === optionIndex && this._isAnswered) {
            return;
        }

        // Select the option
        this._selectOption(optionIndex);
    }

    /**
     * Select an option
     * @param {number} optionIndex - Option index to select
     */
    _selectOption(optionIndex) {
        // Update state
        this._selectedOption = optionIndex;
        this._isAnswered = true;
        
        // Check if correct (if we have answer data)
        if (this._question && this._question.answer !== undefined) {
            this._isCorrect = optionIndex === this._question.answer;
        }
        
        // Update UI
        this._updateUI();
        
        // Save to state
        const examAnswers = state.get('exam.answers') || {};
        examAnswers[this._index] = optionIndex;
        state.set('exam.answers', examAnswers);
        
        // Update storage
        storage.updateUserProgress({
            totalQuestionsAttempted: storage.loadUserProgress().totalQuestionsAttempted + 1,
            correctAnswers: this._isCorrect ? storage.loadUserProgress().correctAnswers + 1 : storage.loadUserProgress().correctAnswers,
            wrongAnswers: !this._isCorrect ? storage.loadUserProgress().wrongAnswers + 1 : storage.loadUserProgress().wrongAnswers
        });
        
        // Emit event
        eventBus.emit('question.answered', {
            index: this._index,
            selected: optionIndex,
            correct: this._isCorrect,
            questionId: this._question?.id
        });
        
        // Callback
        if (this._onSelect) {
            this._onSelect(this._index, optionIndex, this._isCorrect);
        }
        
        // In practice mode, show feedback immediately
        if (this._mode === 'practice') {
            this._showExplanation = true;
            this._isLocked = true;
            this._updateUI();
            
            // Enable check button
            const checkBtn = this._element?.querySelector('[data-nav="check"]');
            if (checkBtn) {
                checkBtn.disabled = false;
            }
        }
    }

    /**
     * Handle flag button click
     * @param {Event} e - Click event
     */
    _handleFlagClick(e) {
        e.stopPropagation();
        
        // Toggle flag state
        this._isFlagged = !this._isFlagged;
        
        // Update state
        const flagged = state.get('exam.flagged') || {};
        if (this._isFlagged) {
            flagged[this._index] = true;
        } else {
            delete flagged[this._index];
        }
        state.set('exam.flagged', flagged);
        
        // Update UI
        const flagBtn = e.currentTarget;
        flagBtn.classList.toggle('active');
        flagBtn.textContent = this._isFlagged ? '⭐' : '☆';
        flagBtn.setAttribute('aria-label', this._isFlagged ? 'Remove bookmark' : 'Bookmark question');
        flagBtn.title = this._isFlagged ? 'Remove bookmark' : 'Bookmark question';
        
        // Emit event
        eventBus.emit('question.flagged', {
            index: this._index,
            flagged: this._isFlagged,
            questionId: this._question?.id
        });
        
        // Callback
        if (this._onFlag) {
            this._onFlag(this._index, this._isFlagged);
        }
    }

    /**
     * Handle navigation buttons
     * @param {Event} e - Click event
     */
    _handleNavigation(e) {
        e.preventDefault();
        
        const btn = e.currentTarget;
        const action = btn.dataset.nav;
        
        if (this._onNavigate) {
            this._onNavigate(action, this._index);
        }
        
        // Emit event
        eventBus.emit('question.navigate', {
            action,
            index: this._index
        });
    }

    /**
     * Update UI based on current state
     */
    _updateUI() {
        if (!this._element) return;
        
        // Update options
        const options = this._element.querySelectorAll('.option-item');
        options.forEach((option, index) => {
            // Reset classes
            option.classList.remove('selected', 'correct', 'wrong');
            
            if (this._selectedOption === index) {
                option.classList.add('selected');
            }
            
            // In review mode, show correct/wrong
            if (this._mode === 'review' || this._isLocked) {
                const isCorrect = index === this._question?.answer;
                const isSelected = this._selectedOption === index;
                
                if (isCorrect) {
                    option.classList.add('correct');
                } else if (isSelected && !isCorrect) {
                    option.classList.add('wrong');
                }
                
                option.classList.add('disabled');
            }
        });
        
        // Update explanation
        const explanationContainer = this._element.querySelector('.question-explanation');
        if (this._showExplanation && this._question?.explanation) {
            if (!explanationContainer) {
                // Create explanation element if it doesn't exist
                const explanationHTML = this._getExplanationHTML(this._question.explanation);
                const optionsContainer = this._element.querySelector('.question-options');
                if (optionsContainer) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = explanationHTML;
                    optionsContainer.after(tempDiv.firstElementChild);
                }
            } else {
                explanationContainer.style.display = 'block';
            }
        } else if (explanationContainer) {
            explanationContainer.style.display = 'none';
        }
        
        // Update navigation info
        const answerStatus = this._element.querySelector('.answer-status');
        if (answerStatus) {
            if (this._isAnswered) {
                answerStatus.textContent = this._isCorrect ? '✓ Correct' : '✗ Incorrect';
                answerStatus.style.color = this._isCorrect ? 'var(--color-success)' : 'var(--color-danger)';
            } else {
                answerStatus.textContent = '⊘ Not Answered';
                answerStatus.style.color = 'var(--text-muted)';
            }
        }
        
        // Update check button in practice mode
        const checkBtn = this._element?.querySelector('[data-nav="check"]');
        if (checkBtn) {
            if (this._isAnswered) {
                checkBtn.disabled = true;
                checkBtn.textContent = this._isCorrect ? '✓ Correct!' : '✗ Incorrect';
                checkBtn.className = `btn-nav ${this._isCorrect ? 'btn-nav-success' : 'btn-nav-danger'}`;
            } else {
                checkBtn.disabled = true;
                checkBtn.textContent = 'Check Answer';
                checkBtn.className = 'btn-nav';
            }
        }
        
        // Update next button in exam mode
        const nextBtn = this._element?.querySelector('[data-nav="next"]');
        if (nextBtn) {
            const isLast = this._index === this._total - 1;
            if (isLast) {
                nextBtn.textContent = 'Submit Exam';
                nextBtn.className = 'btn-nav btn-nav-success';
            } else {
                nextBtn.textContent = 'Next →';
                nextBtn.className = 'btn-nav btn-nav-primary';
            }
        }
    }

    /**
     * Get current state of the question
     * @returns {Object} Question state
     */
    getState() {
        return {
            index: this._index,
            selectedOption: this._selectedOption,
            isAnswered: this._isAnswered,
            isCorrect: this._isCorrect,
            isFlagged: this._isFlagged,
            isLocked: this._isLocked,
            showExplanation: this._showExplanation
        };
    }

    /**
     * Set the selected option programmatically
     * @param {number} optionIndex - Option index
     */
    setSelectedOption(optionIndex) {
        if (optionIndex !== undefined && optionIndex !== null) {
            this._selectedOption = optionIndex;
            this._isAnswered = true;
            if (this._question && this._question.answer !== undefined) {
                this._isCorrect = optionIndex === this._question.answer;
            }
            this._updateUI();
        }
    }

    /**
     * Set flag state programmatically
     * @param {boolean} flagged - Flag state
     */
    setFlagged(flagged) {
        this._isFlagged = flagged;
        const flagBtn = this._element?.querySelector('.btn-flag');
        if (flagBtn) {
            flagBtn.classList.toggle('active', flagged);
            flagBtn.textContent = flagged ? '⭐' : '☆';
            flagBtn.setAttribute('aria-label', flagged ? 'Remove bookmark' : 'Bookmark question');
            flagBtn.title = flagged ? 'Remove bookmark' : 'Bookmark question';
        }
    }

    /**
     * Show explanation
     */
    showExplanation() {
        this._showExplanation = true;
        this._updateUI();
    }

    /**
     * Hide explanation
     */
    hideExplanation() {
        this._showExplanation = false;
        this._updateUI();
    }

    /**
     * Lock the question (disable interaction)
     */
    lock() {
        this._isLocked = true;
        this._updateUI();
    }

    /**
     * Unlock the question (enable interaction)
     */
    unlock() {
        this._isLocked = false;
        this._updateUI();
    }

    /**
     * Get the DOM element
     * @returns {HTMLElement} The rendered element
     */
    getElement() {
        return this._element;
    }

    /**
     * Destroy the component
     */
    destroy() {
        // Remove event listeners
        if (this._options) {
            this._options.forEach(option => {
                option.removeEventListener('click', this._handleOptionClick);
            });
        }
        
        const flagBtn = this._element?.querySelector('.btn-flag');
        if (flagBtn) {
            flagBtn.removeEventListener('click', this._handleFlagClick);
        }
        
        const navButtons = this._element?.querySelectorAll('.btn-nav');
        if (navButtons) {
            navButtons.forEach(btn => {
                btn.removeEventListener('click', this._handleNavigation);
            });
        }
        
        // Remove from DOM
        if (this._element && this._element.parentNode) {
            this._element.parentNode.removeChild(this._element);
        }
        
        this._element = null;
        this._options = [];
    }

    /**
     * Update the question data
     * @param {Object} question - New question data
     */
    updateQuestion(question) {
        this._question = question;
        this._selectedOption = null;
        this._isAnswered = false;
        this._isCorrect = false;
        this._showExplanation = false;
        this._loadState();
        
        if (this._element) {
            this._element.innerHTML = this._getHTML();
            this._options = this._element.querySelectorAll('.option-item');
            this._attachEvents();
            this._updateUI();
        }
    }

    /**
     * Update the mode
     * @param {string} mode - 'exam', 'practice', or 'review'
     */
    setMode(mode) {
        this._mode = mode;
        if (mode === 'review') {
            this._isLocked = true;
            this._showExplanation = true;
        } else if (mode === 'exam') {
            this._isLocked = false;
            this._showExplanation = false;
        } else {
            this._isLocked = false;
        }
        
        if (this._element) {
            this._element.innerHTML = this._getHTML();
            this._options = this._element.querySelectorAll('.option-item');
            this._attachEvents();
            this._updateUI();
        }
    }

    /**
     * Check if the question has been answered
     * @returns {boolean} True if answered
     */
    isAnswered() {
        return this._isAnswered;
    }

    /**
     * Check if the question is correct
     * @returns {boolean} True if correct
     */
    isCorrect() {
        return this._isCorrect;
    }

    /**
     * Get the selected option
     * @returns {number|null} Selected option index
     */
    getSelectedOption() {
        return this._selectedOption;
    }

    /**
     * Get the correct answer
     * @returns {number|null} Correct answer index
     */
    getCorrectAnswer() {
        return this._question?.answer !== undefined ? this._question.answer : null;
    }
}

/**
 * Create and export the component
 */
export default QuestionCard;
