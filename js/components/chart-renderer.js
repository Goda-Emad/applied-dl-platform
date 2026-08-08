/**
 * ============================================================
 * js/components/chart-renderer.js — Chart Renderer Component
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Chart Renderer
 * 
 * A lightweight chart rendering system using SVG and Canvas.
 * Supports bar charts, line charts, doughnut charts, and progress charts.
 * No external dependencies required.
 */

import state from '../core/state.js';
import eventBus from '../core/event-bus.js';

class ChartRenderer {
    /**
     * Create a new ChartRenderer instance
     * @param {Object} options - Configuration options
     * @param {HTMLElement} options.container - Container element
     * @param {string} options.type - Chart type: 'bar' | 'horizontal-bar' | 'line' | 'doughnut' | 'progress'
     * @param {Array} options.data - Chart data array
     * @param {Object} options.labels - Labels for data
     * @param {string} options.title - Chart title
     * @param {Object} options.colors - Color configuration
     * @param {number} options.height - Chart height in pixels
     * @param {number} options.width - Chart width in pixels
     * @param {boolean} options.animate - Enable animation
     * @param {number} options.animationDuration - Animation duration in ms
     * @param {string} options.emptyMessage - Message when no data
     * @param {Object} options.tooltips - Tooltip configuration
     */
    constructor(options = {}) {
        // Configuration
        this._container = options.container || null;
        this._type = options.type || 'bar';
        this._data = options.data || [];
        this._labels = options.labels || {};
        this._title = options.title || '';
        this._colors = options.colors || this._getDefaultColors();
        this._height = options.height || 300;
        this._width = options.width || 600;
        this._animate = options.animate !== undefined ? options.animate : true;
        this._animationDuration = options.animationDuration || 600;
        this._emptyMessage = options.emptyMessage || 'No data available';
        this._tooltips = options.tooltips || { enabled: true };
        
        // State
        this._element = null;
        this._isRendered = false;
        this._animationId = null;
        this._isAnimating = false;
        this._currentData = [];
        this._tooltipElement = null;
        
        // Bind methods
        this._handleResize = this._handleResize.bind(this);
        this._handleMouseMove = this._handleMouseMove.bind(this);
        this._handleMouseLeave = this._handleMouseLeave.bind(this);
        
        // Initialize
        if (this._container) {
            this.render();
        }
    }

    /**
     * Get default color palette
     * @returns {Object} Color configuration
     */
    _getDefaultColors() {
        return {
            primary: '#6366f1',
            secondary: '#8b5cf6',
            success: '#22c55e',
            danger: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6',
            background: 'var(--bg-surface-alt)',
            text: 'var(--text-primary)',
            muted: 'var(--text-muted)',
            grid: 'var(--border-color)',
            palette: [
                '#6366f1',
                '#8b5cf6',
                '#22c55e',
                '#f59e0b',
                '#ef4444',
                '#3b82f6',
                '#14b8a6',
                '#f472b6',
                '#8b5cf6',
                '#f59e0b'
            ]
        };
    }

    /**
     * Render the chart
     * @param {HTMLElement} container - Optional container override
     * @returns {HTMLElement} The rendered element
     */
    render(container = null) {
        if (container) {
            this._container = container;
        }
        
        if (!this._container) {
            console.warn('ChartRenderer: No container provided');
            return null;
        }
        
        // Clear container
        this._container.innerHTML = '';
        
        // Create chart container
        this._element = document.createElement('div');
        this._element.className = `chart-renderer chart-${this._type}`;
        this._element.style.width = '100%';
        this._element.style.height = `${this._height}px`;
        this._element.style.position = 'relative';
        
        // Check data
        if (!this._data || this._data.length === 0) {
            this._renderEmptyState();
            this._container.appendChild(this._element);
            return this._element;
        }
        
        // Render based on type
        switch (this._type) {
            case 'bar':
                this._renderBarChart();
                break;
            case 'horizontal-bar':
                this._renderHorizontalBarChart();
                break;
            case 'line':
                this._renderLineChart();
                break;
            case 'doughnut':
                this._renderDoughnutChart();
                break;
            case 'progress':
                this._renderProgressChart();
                break;
            default:
                this._renderBarChart();
        }
        
        // Add title if provided
        if (this._title) {
            this._addTitle();
        }
        
        // Setup tooltips
        if (this._tooltips.enabled) {
            this._setupTooltips();
        }
        
        this._container.appendChild(this._element);
        this._isRendered = true;
        
        // Setup resize observer
        if (window.ResizeObserver) {
            this._resizeObserver = new ResizeObserver(this._handleResize);
            this._resizeObserver.observe(this._container);
        }
        
        // Emit event
        eventBus.emit('chart.rendered', {
            type: this._type,
            dataLength: this._data.length,
            element: this._element
        });
        
        return this._element;
    }

    /**
     * Render empty state
     */
    _renderEmptyState() {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'chart-empty-state';
        emptyDiv.style.display = 'flex';
        emptyDiv.style.flexDirection = 'column';
        emptyDiv.style.alignItems = 'center';
        emptyDiv.style.justifyContent = 'center';
        emptyDiv.style.height = '100%';
        emptyDiv.style.color = 'var(--text-muted)';
        emptyDiv.style.fontSize = '14px';
        emptyDiv.style.textAlign = 'center';
        emptyDiv.style.padding = '20px';
        
        const icon = document.createElement('span');
        icon.textContent = '📊';
        icon.style.fontSize = '32px';
        icon.style.marginBottom = '12px';
        icon.style.opacity = '0.5';
        emptyDiv.appendChild(icon);
        
        const message = document.createElement('p');
        message.textContent = this._emptyMessage;
        emptyDiv.appendChild(message);
        
        this._element.appendChild(emptyDiv);
    }

    /**
     * Add title to the chart
     */
    _addTitle() {
        const titleElement = document.createElement('div');
        titleElement.className = 'chart-title';
        titleElement.textContent = this._title;
        titleElement.style.fontSize = '16px';
        titleElement.style.fontWeight = '600';
        titleElement.style.color = 'var(--text-primary)';
        titleElement.style.marginBottom = '12px';
        titleElement.style.textAlign = 'center';
        this._element.prepend(titleElement);
    }

    // ── Bar Chart ──────────────────────────────────────────────

    /**
     * Render a bar chart
     */
    _renderBarChart() {
        const svg = this._createSVG();
        const padding = { top: 20, right: 20, bottom: 40, left: 50 };
        const chartWidth = this._width - padding.left - padding.right;
        const chartHeight = this._height - padding.top - padding.bottom;
        
        // Calculate max value
        const maxValue = Math.max(...this._data, 1);
        
        // Create group with padding
        const group = this._createSVGGroup(svg, padding.left, padding.top);
        
        // Draw grid lines
        this._drawGridLines(group, chartWidth, chartHeight, maxValue);
        
        // Draw bars
        const barWidth = chartWidth / this._data.length * 0.7;
        const gap = (chartWidth / this._data.length) * 0.3;
        
        this._data.forEach((value, index) => {
            const x = (index * (barWidth + gap)) + (gap / 2);
            const barHeight = (value / maxValue) * chartHeight;
            const y = chartHeight - barHeight;
            
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', barWidth);
            rect.setAttribute('height', barHeight);
            rect.setAttribute('fill', this._getColor(index));
            rect.setAttribute('rx', '3');
            
            // Animation
            if (this._animate) {
                rect.setAttribute('height', '0');
                rect.setAttribute('y', chartHeight);
                setTimeout(() => {
                    rect.setAttribute('height', barHeight);
                    rect.setAttribute('y', y);
                }, index * 50);
            }
            
            // Data attributes for tooltips
            rect.dataset.value = value;
            rect.dataset.index = index;
            rect.classList.add('chart-bar');
            
            group.appendChild(rect);
            
            // Add label
            const label = this._createSVGText(
                x + barWidth / 2,
                chartHeight + 20,
                this._getLabel(index),
                'middle',
                '12px',
                'var(--text-muted)'
            );
            group.appendChild(label);
            
            // Add value on top of bar
            if (value > 0) {
                const valueText = this._createSVGText(
                    x + barWidth / 2,
                    y - 6,
                    String(Math.round(value)),
                    'middle',
                    '11px',
                    'var(--text-secondary)'
                );
                group.appendChild(valueText);
            }
        });
        
        this._element.appendChild(svg);
    }

    // ── Horizontal Bar Chart ──────────────────────────────────

    /**
     * Render a horizontal bar chart
     */
    _renderHorizontalBarChart() {
        const svg = this._createSVG();
        const padding = { top: 20, right: 40, bottom: 20, left: 120 };
        const chartWidth = this._width - padding.left - padding.right;
        const chartHeight = this._height - padding.top - padding.bottom;
        
        const maxValue = Math.max(...this._data, 1);
        const barHeight = Math.min(30, (chartHeight / this._data.length) * 0.7);
        const gap = Math.min(10, (chartHeight / this._data.length) * 0.3);
        
        const group = this._createSVGGroup(svg, padding.left, padding.top);
        
        this._data.forEach((value, index) => {
            const y = index * (barHeight + gap) + gap / 2;
            const barWidth = (value / maxValue) * chartWidth;
            
            // Bar
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', '0');
            rect.setAttribute('y', y);
            rect.setAttribute('width', this._animate ? '0' : barWidth);
            rect.setAttribute('height', barHeight);
            rect.setAttribute('fill', this._getColor(index));
            rect.setAttribute('rx', '3');
            rect.dataset.value = value;
            rect.dataset.index = index;
            rect.classList.add('chart-bar-horizontal');
            
            if (this._animate) {
                setTimeout(() => {
                    rect.setAttribute('width', barWidth);
                }, index * 50);
            }
            
            group.appendChild(rect);
            
            // Label
            const label = this._createSVGText(
                -10,
                y + barHeight / 2,
                this._getLabel(index),
                'end',
                '13px',
                'var(--text-secondary)'
            );
            group.appendChild(label);
            
            // Value
            if (value > 0) {
                const valueText = this._createSVGText(
                    barWidth + 6,
                    y + barHeight / 2,
                    String(Math.round(value)),
                    'start',
                    '12px',
                    'var(--text-muted)'
                );
                group.appendChild(valueText);
            }
        });
        
        this._element.appendChild(svg);
    }

    // ── Line Chart ─────────────────────────────────────────────

    /**
     * Render a line chart
     */
    _renderLineChart() {
        const svg = this._createSVG();
        const padding = { top: 20, right: 20, bottom: 40, left: 50 };
        const chartWidth = this._width - padding.left - padding.right;
        const chartHeight = this._height - padding.top - padding.bottom;
        
        const maxValue = Math.max(...this._data, 1);
        const minValue = Math.min(...this._data, 0);
        const range = maxValue - minValue || 1;
        
        const group = this._createSVGGroup(svg, padding.left, padding.top);
        
        // Draw grid lines
        this._drawGridLines(group, chartWidth, chartHeight, maxValue);
        
        // Calculate points
        const points = this._data.map((value, index) => {
            const x = (index / (this._data.length - 1 || 1)) * chartWidth;
            const y = chartHeight - ((value - minValue) / range) * chartHeight;
            return { x, y, value };
        });
        
        // Draw area (fill under line)
        if (this._data.length > 1) {
            const areaPath = this._createAreaPath(points, chartHeight);
            const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            area.setAttribute('d', areaPath);
            area.setAttribute('fill', this._colors.primary || '#6366f1');
            area.setAttribute('opacity', '0.1');
            group.appendChild(area);
        }
        
        // Draw line
        if (this._data.length > 1) {
            const linePath = this._createLinePath(points);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            line.setAttribute('d', linePath);
            line.setAttribute('fill', 'none');
            line.setAttribute('stroke', this._colors.primary || '#6366f1');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('stroke-linecap', 'round');
            line.setAttribute('stroke-linejoin', 'round');
            
            // Animation
            if (this._animate) {
                const length = line.getTotalLength ? 0 : 0;
                line.setAttribute('stroke-dasharray', '1000');
                line.setAttribute('stroke-dashoffset', '1000');
                setTimeout(() => {
                    line.setAttribute('stroke-dashoffset', '0');
                }, 100);
            }
            
            group.appendChild(line);
        }
        
        // Draw points
        points.forEach((point, index) => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', point.x);
            circle.setAttribute('cy', point.y);
            circle.setAttribute('r', '4');
            circle.setAttribute('fill', this._colors.primary || '#6366f1');
            circle.dataset.value = point.value;
            circle.dataset.index = index;
            circle.classList.add('chart-point');
            
            if (this._animate) {
                circle.setAttribute('r', '0');
                setTimeout(() => {
                    circle.setAttribute('r', '4');
                }, 300 + index * 20);
            }
            
            group.appendChild(circle);
            
            // X-axis labels
            const label = this._createSVGText(
                point.x,
                chartHeight + 20,
                this._getLabel(index),
                'middle',
                '11px',
                'var(--text-muted)'
            );
            group.appendChild(label);
        });
        
        this._element.appendChild(svg);
    }

    // ── Doughnut Chart ─────────────────────────────────────────

    /**
     * Render a doughnut chart
     */
    _renderDoughnutChart() {
        const svg = this._createSVG();
        const size = Math.min(this._width, this._height);
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size * 0.35;
        const innerRadius = radius * 0.55;
        
        const total = this._data.reduce((sum, val) => sum + val, 0);
        if (total === 0) {
            this._renderEmptyState();
            return;
        }
        
        const group = this._createSVGGroup(svg, 0, 0);
        
        let startAngle = -Math.PI / 2;
        
        this._data.forEach((value, index) => {
            const sliceAngle = (value / total) * 2 * Math.PI;
            const endAngle = startAngle + sliceAngle;
            
            // Calculate path
            const x1 = centerX + radius * Math.cos(startAngle);
            const y1 = centerY + radius * Math.sin(startAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);
            
            const largeArc = sliceAngle > Math.PI ? 1 : 0;
            
            // Outer arc
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d = [
                `M ${centerX + innerRadius * Math.cos(startAngle)} ${centerY + innerRadius * Math.sin(startAngle)}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                `L ${centerX + innerRadius * Math.cos(endAngle)} ${centerY + innerRadius * Math.sin(endAngle)}`,
                `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${centerX + innerRadius * Math.cos(startAngle)} ${centerY + innerRadius * Math.sin(startAngle)}`,
                'Z'
            ].join(' ');
            
            path.setAttribute('d', d);
            path.setAttribute('fill', this._getColor(index));
            path.dataset.value = value;
            path.dataset.index = index;
            path.classList.add('chart-doughnut-slice');
            
            // Animation
            if (this._animate) {
                path.setAttribute('opacity', '0');
                setTimeout(() => {
                    path.setAttribute('opacity', '1');
                }, index * 100);
            }
            
            group.appendChild(path);
            
            startAngle = endAngle;
        });
        
        // Add center text
        const centerText = this._createSVGText(
            centerX,
            centerY - 4,
            `${Math.round((this._data[0] / total) * 100)}%`,
            'middle',
            '20px',
            'var(--text-primary)',
            'bold'
        );
        group.appendChild(centerText);
        
        const totalText = this._createSVGText(
            centerX,
            centerY + 18,
            'Total',
            'middle',
            '12px',
            'var(--text-muted)'
        );
        group.appendChild(totalText);
        
        // Add legend
        this._addDoughnutLegend(group, centerX, size);
        
        this._element.appendChild(svg);
    }

    /**
     * Add legend for doughnut chart
     */
    _addDoughnutLegend(group, centerX, size) {
        const legendY = size - 20;
        const legendStartX = centerX - (this._data.length * 30) / 2;
        
        this._data.forEach((value, index) => {
            const x = legendStartX + index * 30;
            
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            dot.setAttribute('x', x);
            dot.setAttribute('y', legendY);
            dot.setAttribute('width', '10');
            dot.setAttribute('height', '10');
            dot.setAttribute('rx', '2');
            dot.setAttribute('fill', this._getColor(index));
            group.appendChild(dot);
            
            const label = this._createSVGText(
                x + 14,
                legendY + 9,
                this._getLabel(index),
                'start',
                '10px',
                'var(--text-muted)'
            );
            group.appendChild(label);
        });
    }

    // ── Progress Chart ─────────────────────────────────────────

    /**
     * Render a progress chart
     */
    _renderProgressChart() {
        const svg = this._createSVG();
        const size = Math.min(this._width, this._height);
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size * 0.35;
        const strokeWidth = size * 0.06;
        
        const total = this._data.reduce((sum, val) => sum + val, 0);
        const maxValue = this._data.length > 0 ? Math.max(...this._data) : 1;
        const percentage = total > 0 ? Math.round((total / (maxValue * this._data.length)) * 100) : 0;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;
        
        // Background circle
        const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bgCircle.setAttribute('cx', centerX);
        bgCircle.setAttribute('cy', centerY);
        bgCircle.setAttribute('r', radius);
        bgCircle.setAttribute('fill', 'none');
        bgCircle.setAttribute('stroke', 'var(--bg-surface-alt)');
        bgCircle.setAttribute('stroke-width', strokeWidth);
        svg.appendChild(bgCircle);
        
        // Progress circle
        const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        progressCircle.setAttribute('cx', centerX);
        progressCircle.setAttribute('cy', centerY);
        progressCircle.setAttribute('r', radius);
        progressCircle.setAttribute('fill', 'none');
        progressCircle.setAttribute('stroke', this._colors.primary || '#6366f1');
        progressCircle.setAttribute('stroke-width', strokeWidth);
        progressCircle.setAttribute('stroke-linecap', 'round');
        progressCircle.setAttribute('stroke-dasharray', circumference);
        progressCircle.setAttribute('stroke-dashoffset', this._animate ? circumference : offset);
        svg.appendChild(progressCircle);
        
        if (this._animate) {
            setTimeout(() => {
                progressCircle.setAttribute('stroke-dashoffset', offset);
            }, 100);
        }
        
        // Center text
        const valueText = this._createSVGText(
            centerX,
            centerY - 4,
            `${percentage}%`,
            'middle',
            '24px',
            'var(--text-primary)',
            'bold'
        );
        svg.appendChild(valueText);
        
        const labelText = this._createSVGText(
            centerX,
            centerY + 20,
            'Overall Progress',
            'middle',
            '12px',
            'var(--text-muted)'
        );
        svg.appendChild(labelText);
        
        this._element.appendChild(svg);
    }

    // ── SVG Helper Methods ────────────────────────────────────

    /**
     * Create SVG element
     * @returns {SVGElement} SVG element
     */
    _createSVG() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${this._width} ${this._height}`);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.style.display = 'block';
        return svg;
    }

    /**
     * Create SVG group
     * @param {SVGElement} svg - Parent SVG
     * @param {number} x - X offset
     * @param {number} y - Y offset
     * @returns {SVGElement} Group element
     */
    _createSVGGroup(svg, x = 0, y = 0) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        if (x || y) {
            group.setAttribute('transform', `translate(${x}, ${y})`);
        }
        svg.appendChild(group);
        return group;
    }

    /**
     * Create SVG text
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} text - Text content
     * @param {string} anchor - Text anchor
     * @param {string} size - Font size
     * @param {string} color - Text color
     * @param {string} weight - Font weight
     * @returns {SVGElement} Text element
     */
    _createSVGText(x, y, text, anchor = 'middle', size = '12px', color = 'var(--text-primary)', weight = 'normal') {
        const element = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        element.setAttribute('x', x);
        element.setAttribute('y', y);
        element.setAttribute('text-anchor', anchor);
        element.style.fontSize = size;
        element.style.fill = color;
        element.style.fontWeight = weight;
        element.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        element.textContent = text || '';
        return element;
    }

    /**
     * Draw grid lines
     */
    _drawGridLines(group, width, height, maxValue) {
        const lines = 5;
        for (let i = 0; i <= lines; i++) {
            const y = (i / lines) * height;
            const value = maxValue - (i / lines) * maxValue;
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '0');
            line.setAttribute('y1', y);
            line.setAttribute('x2', width);
            line.setAttribute('y2', y);
            line.setAttribute('stroke', 'var(--border-color)');
            line.setAttribute('stroke-width', i === 0 ? '1' : '0.5');
            line.setAttribute('stroke-dasharray', i === 0 ? 'none' : '4,4');
            group.appendChild(line);
            
            if (i > 0) {
                const label = this._createSVGText(
                    -8,
                    y + 4,
                    String(Math.round(value)),
                    'end',
                    '10px',
                    'var(--text-muted)'
                );
                group.appendChild(label);
            }
        }
    }

    /**
     * Create area path for line chart
     */
    _createAreaPath(points, height) {
        if (points.length < 2) return '';
        let path = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            path += ` L ${points[i].x} ${points[i].y}`;
        }
        path += ` L ${points[points.length - 1].x} ${height}`;
        path += ` L ${points[0].x} ${height}`;
        path += ' Z';
        return path;
    }

    /**
     * Create line path for line chart
     */
    _createLinePath(points) {
        if (points.length < 2) return '';
        let path = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            path += ` L ${points[i].x} ${points[i].y}`;
        }
        return path;
    }

    /**
     * Get color for index
     */
    _getColor(index) {
        const palette = this._colors.palette || this._getDefaultColors().palette;
        return palette[index % palette.length];
    }

    /**
     * Get label for index
     */
    _getLabel(index) {
        if (Array.isArray(this._labels)) {
            return this._labels[index] || `Item ${index + 1}`;
        }
        if (typeof this._labels === 'object') {
            return this._labels[index] || `Item ${index + 1}`;
        }
        return `Item ${index + 1}`;
    }

    // ── Tooltips ──────────────────────────────────────────────

    /**
     * Setup tooltip functionality
     */
    _setupTooltips() {
        // Tooltip element
        this._tooltipElement = document.createElement('div');
        this._tooltipElement.className = 'chart-tooltip';
        this._tooltipElement.style.position = 'absolute';
        this._tooltipElement.style.pointerEvents = 'none';
        this._tooltipElement.style.background = 'var(--bg-surface)';
        this._tooltipElement.style.border = '1px solid var(--border-color)';
        this._tooltipElement.style.borderRadius = '6px';
        this._tooltipElement.style.padding = '8px 12px';
        this._tooltipElement.style.fontSize = '12px';
        this._tooltipElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        this._tooltipElement.style.display = 'none';
        this._tooltipElement.style.zIndex = '100';
        this._element.appendChild(this._tooltipElement);
        
        // Mouse events
        this._element.addEventListener('mousemove', this._handleMouseMove);
        this._element.addEventListener('mouseleave', this._handleMouseLeave);
    }

    /**
     * Handle mouse move for tooltips
     */
    _handleMouseMove(e) {
        const target = e.target.closest('.chart-bar, .chart-bar-horizontal, .chart-point, .chart-doughnut-slice');
        if (!target) {
            this._tooltipElement.style.display = 'none';
            return;
        }
        
        const value = target.dataset.value;
        const index = target.dataset.index;
        const label = this._getLabel(index);
        
        if (value !== undefined) {
            this._tooltipElement.textContent = `${label}: ${Math.round(Number(value))}`;
            this._tooltipElement.style.display = 'block';
            
            const rect = this._element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            let left = x + 10;
            let top = y - 10;
            
            // Prevent overflow
            if (left + this._tooltipElement.offsetWidth > this._element.offsetWidth) {
                left = x - this._tooltipElement.offsetWidth - 10;
            }
            if (top + this._tooltipElement.offsetHeight > this._element.offsetHeight) {
                top = y - this._tooltipElement.offsetHeight - 10;
            }
            
            this._tooltipElement.style.left = `${left}px`;
            this._tooltipElement.style.top = `${top}px`;
        }
    }

    /**
     * Handle mouse leave for tooltips
     */
    _handleMouseLeave() {
        if (this._tooltipElement) {
            this._tooltipElement.style.display = 'none';
        }
    }

    /**
     * Handle resize
     */
    _handleResize() {
        // Re-render on resize with slight delay
        clearTimeout(this._resizeTimeout);
        this._resizeTimeout = setTimeout(() => {
            this.render();
        }, 200);
    }

    // ── Public Methods ────────────────────────────────────────

    /**
     * Update chart data
     * @param {Array} data - New data array
     * @param {Object} labels - New labels (optional)
     * @returns {Promise} Promise that resolves when update is complete
     */
    update(data, labels = null) {
        this._data = data || [];
        if (labels) {
            this._labels = labels;
        }
        this.render();
        return Promise.resolve();
    }

    /**
     * Add data to chart
     * @param {number} value - Value to add
     * @param {string} label - Label for the new data point
     */
    addData(value, label) {
        this._data.push(value);
        if (label) {
            if (Array.isArray(this._labels)) {
                this._labels.push(label);
            }
        }
        this.render();
    }

    /**
     * Remove data at index
     * @param {number} index - Index to remove
     */
    removeData(index) {
        if (index >= 0 && index < this._data.length) {
            this._data.splice(index, 1);
            if (Array.isArray(this._labels) && index < this._labels.length) {
                this._labels.splice(index, 1);
            }
            this.render();
        }
    }

    /**
     * Get chart data
     * @returns {Array} Current data
     */
    getData() {
        return [...this._data];
    }

    /**
     * Get chart type
     * @returns {string} Chart type
     */
    getType() {
        return this._type;
    }

    /**
     * Set chart type
     * @param {string} type - New chart type
     */
    setType(type) {
        this._type = type;
        this.render();
    }

    /**
     * Set colors
     * @param {Object} colors - Color configuration
     */
    setColors(colors) {
        this._colors = { ...this._colors, ...colors };
        this.render();
    }

    /**
     * Export chart as SVG string
     * @returns {string} SVG string
     */
    exportSVG() {
        const svg = this._element?.querySelector('svg');
        if (!svg) return '';
        return new XMLSerializer().serializeToString(svg);
    }

    /**
     * Export chart as image data URL
     * @returns {Promise<string>} Data URL
     */
    async exportImage() {
        const svg = this._element?.querySelector('svg');
        if (!svg) return '';
        
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        canvas.width = this._width;
        canvas.height = this._height;
        const ctx = canvas.getContext('2d');
        
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
        });
    }

    /**
     * Destroy the chart
     */
    destroy() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        if (this._animationId) {
            cancelAnimationFrame(this._animationId);
            this._animationId = null;
        }
        if (this._element && this._element.parentNode) {
            this._element.parentNode.removeChild(this._element);
        }
        this._element = null;
        this._isRendered = false;
    }
}

/**
 * Create and export the component
 */
export default ChartRenderer;
