/**
 * ============================================================
 * js/core/router.js — Application Routing System
 * Applied Deep Learning Platform
 * ============================================================
 */

/**
 * Router
 * 
 * Handles all application navigation and page routing.
 * Supports dynamic page loading, browser history, and route guards.
 */

class Router {
    constructor() {
        // Route registry
        this._routes = new Map();
        
        // Current route state
        this._currentRoute = null;
        this._currentParams = {};
        this._currentQuery = {};
        
        // History management
        this._history = [];
        this._maxHistory = 50;
        this._useHash = false;
        this._basePath = '';
        
        // Navigation guards
        this._guards = [];
        
        // Middleware
        this._middleware = [];
        
        // Route loading state
        this._isLoading = false;
        this._loadingTimeout = null;
        
        // DOM element to render pages into
        this._appContainer = null;
        
        // Page cache
        this._pageCache = new Map();
        this._cachePages = true;
        this._maxCacheSize = 10;
        
        // Initialize
        this._init();
    }

    /**
     * Initialize the router
     */
    _init() {
        // Handle browser navigation events
        window.addEventListener('popstate', (event) => {
            const state = event.state;
            if (state && state.route) {
                this._navigate(state.route, state.params, state.query, true);
            } else {
                this._handleInitialRoute();
            }
        });

        // Handle hash-based navigation
        window.addEventListener('hashchange', () => {
            if (this._useHash) {
                const route = this._getRouteFromHash();
                if (route) {
                    this.navigate(route);
                }
            }
        });

        // Handle initial page load
        document.addEventListener('DOMContentLoaded', () => {
            this._handleInitialRoute();
        });

        // Handle page unload
        window.addEventListener('beforeunload', () => {
            this._pageCache.clear();
        });
    }

    /**
     * Set the application container element
     * @param {HTMLElement} element - DOM element to render into
     */
    setContainer(element) {
        this._appContainer = element;
    }

    /**
     * Set base path for routes
     * @param {string} path - Base path (e.g., '/app')
     */
    setBasePath(path) {
        this._basePath = path;
    }

    /**
     * Enable or disable hash-based routing
     * @param {boolean} useHash - Use hash-based routing
     */
    useHashRouting(useHash = true) {
        this._useHash = useHash;
        if (useHash && window.location.hash) {
            const route = this._getRouteFromHash();
            if (route) {
                this.navigate(route);
            }
        }
    }

    /**
     * Register a route
     * @param {string} path - Route path (e.g., '/dashboard', '/lectures/:id')
     * @param {Object} config - Route configuration
     * @param {Function} config.component - Component render function
     * @param {Function} config.loader - Dynamic loader function
     * @param {Array} config.middleware - Middleware functions
     * @param {Object} config.meta - Route metadata
     * @param {string} config.title - Page title
     * @param {Function} config.guard - Guard function
     * @param {boolean} config.cache - Cache the page
     * @param {string} config.redirect - Redirect to this route
     * @returns {Router} This instance for chaining
     */
    route(path, config) {
        if (typeof config === 'function') {
            config = { component: config };
        }

        if (!config.redirect && !config.component && !config.loader) {
            throw new Error(`Route "${path}" must have a component, loader, or redirect`);
        }

        // Parse route parameters
        const paramNames = [];
        const routeRegex = this._createRouteRegex(path, paramNames);

        this._routes.set(path, {
            path,
            paramNames,
            regex: routeRegex,
            ...config
        });

        return this;
    }

    /**
     * Create a route regex for matching and parameter extraction
     * @param {string} path - Route path
     * @param {Array} paramNames - Array to collect parameter names
     * @returns {RegExp} Route regex
     */
    _createRouteRegex(path, paramNames) {
        // Replace route parameters with regex groups
        const regexString = path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, paramName) => {
            paramNames.push(paramName);
            return '([^/]+)';
        });

        // Handle wildcard routes
        const finalRegex = regexString.replace(/\*/g, '.*');
        return new RegExp(`^${finalRegex}$`);
    }

    /**
     * Navigate to a route
     * @param {string} path - Route path
     * @param {Object} params - Route parameters
     * @param {Object} query - Query parameters
     * @param {boolean} replace - Replace current history entry
     * @returns {Promise} Promise that resolves when navigation is complete
     */
    async navigate(path, params = {}, query = {}, replace = false) {
        // Normalize path
        path = this._normalizePath(path);

        // Find matching route
        const route = this._findRoute(path);
        if (!route) {
            console.warn(`Route "${path}" not found`);
            return this._handle404(path);
        }

        // Check for redirect
        if (route.config.redirect) {
            return this.navigate(route.config.redirect, params, query, replace);
        }

        // Run navigation guards
        const guardResult = await this._runGuards(route, path, params, query);
        if (!guardResult) {
            return;
        }

        // Extract route parameters
        const extractedParams = this._extractParams(route, path);
        const finalParams = { ...extractedParams, ...params };

        // Update browser history
        this._updateHistory(path, finalParams, query, replace);

        // Load the route
        await this._loadRoute(route, finalParams, query);

        // Update current route
        this._currentRoute = route;
        this._currentParams = finalParams;
        this._currentQuery = query;

        // Add to history
        this._addToHistory(path, finalParams, query);

        // Trigger navigation event
        this._emitNavigationEvent(path, finalParams, query);
    }

    /**
     * Navigate to a route (alias for navigate with replace)
     * @param {string} path - Route path
     * @param {Object} params - Route parameters
     * @param {Object} query - Query parameters
     * @returns {Promise} Promise that resolves when navigation is complete
     */
    replace(path, params = {}, query = {}) {
        return this.navigate(path, params, query, true);
    }

    /**
     * Go back in history
     * @returns {Promise} Promise that resolves when navigation is complete
     */
    async back() {
        if (this._history.length > 1) {
            window.history.back();
            return;
        }
        // Fallback to dashboard
        await this.navigate('/dashboard');
    }

    /**
     * Go forward in history
     */
    forward() {
        window.history.forward();
    }

    /**
     * Reload current route
     * @returns {Promise} Promise that resolves when reload is complete
     */
    async reload() {
        if (this._currentRoute) {
            await this._loadRoute(
                this._currentRoute,
                this._currentParams,
                this._currentQuery
            );
        }
    }

    /**
     * Find a matching route
     * @param {string} path - Route path
     * @returns {Object} Route object with config and parameters
     */
    _findRoute(path) {
        const normalizedPath = this._normalizePath(path);
        
        for (const [routePath, config] of this._routes) {
            const match = normalizedPath.match(config.regex);
            if (match) {
                return {
                    path: routePath,
                    config,
                    match: match
                };
            }
        }
        
        return null;
    }

    /**
     * Extract parameters from a matched route
     * @param {Object} route - Route object
     * @param {string} path - Actual path
     * @returns {Object} Extracted parameters
     */
    _extractParams(route, path) {
        const params = {};
        if (route.match && route.config.paramNames) {
            const match = path.match(route.config.regex);
            if (match) {
                for (let i = 0; i < route.config.paramNames.length; i++) {
                    params[route.config.paramNames[i]] = match[i + 1];
                }
            }
        }
        return params;
    }

    /**
     * Normalize a path
     * @param {string} path - Path to normalize
     * @returns {string} Normalized path
     */
    _normalizePath(path) {
        if (!path) return '/';
        
        // Remove base path
        if (this._basePath && path.startsWith(this._basePath)) {
            path = path.substring(this._basePath.length);
        }
        
        // Remove hash
        if (path.includes('#')) {
            path = path.split('#')[0];
        }
        
        // Remove query string
        if (path.includes('?')) {
            path = path.split('?')[0];
        }
        
        // Ensure leading slash
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        
        // Remove trailing slash (except for root)
        if (path !== '/' && path.endsWith('/')) {
            path = path.slice(0, -1);
        }
        
        return path;
    }

    /**
     * Get route from hash
     * @returns {string} Route path
     */
    _getRouteFromHash() {
        const hash = window.location.hash;
        if (!hash) return null;
        return this._normalizePath(hash.substring(1) || '/');
    }

    /**
     * Get current route information
     * @returns {Object} Current route info
     */
    getCurrentRoute() {
        return {
            path: this._currentRoute ? this._currentRoute.path : null,
            params: this._currentParams,
            query: this._currentQuery,
            fullPath: this._currentRoute ? this._getFullPath() : null
        };
    }

    /**
     * Get full path with parameters
     * @returns {string} Full path
     */
    _getFullPath() {
        if (!this._currentRoute) return '/';
        
        let path = this._currentRoute.path;
        for (const [key, value] of Object.entries(this._currentParams)) {
            path = path.replace(`:${key}`, value);
        }
        
        // Add query string
        const queryString = this._buildQueryString(this._currentQuery);
        if (queryString) {
            path += '?' + queryString;
        }
        
        return path;
    }

    /**
     * Build query string from object
     * @param {Object} query - Query object
     * @returns {string} Query string
     */
    _buildQueryString(query) {
        const parts = [];
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined && value !== null) {
                parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
            }
        }
        return parts.join('&');
    }

    /**
     * Update browser history
     * @param {string} path - Route path
     * @param {Object} params - Route parameters
     * @param {Object} query - Query parameters
     * @param {boolean} replace - Replace current history entry
     */
    _updateHistory(path, params, query, replace) {
        const url = this._buildUrl(path, params, query);
        const state = { route: path, params, query };

        if (replace) {
            window.history.replaceState(state, '', url);
        } else {
            window.history.pushState(state, '', url);
        }

        // Update hash if using hash routing
        if (this._useHash) {
            window.location.hash = path;
        }
    }

    /**
     * Build URL for a route
     * @param {string} path - Route path
     * @param {Object} params - Route parameters
     * @param {Object} query - Query parameters
     * @returns {string} Full URL
     */
    _buildUrl(path, params, query) {
        let url = this._basePath + path;
        
        // Replace parameters in path
        for (const [key, value] of Object.entries(params)) {
            url = url.replace(`:${key}`, encodeURIComponent(value));
        }
        
        // Add query string
        const queryString = this._buildQueryString(query);
        if (queryString) {
            url += '?' + queryString;
        }
        
        // Add hash if using hash routing
        if (this._useHash) {
            url = '#' + path;
            if (queryString) {
                url += '?' + queryString;
            }
        }
        
        return url;
    }

    /**
     * Handle initial route
     */
    _handleInitialRoute() {
        let route = '/dashboard';
        
        if (this._useHash) {
            const hashRoute = this._getRouteFromHash();
            if (hashRoute) {
                route = hashRoute;
            }
        } else {
            const path = window.location.pathname;
            const normalizedPath = this._normalizePath(path);
            if (normalizedPath && normalizedPath !== '/') {
                route = normalizedPath;
            }
        }
        
        // Extract query parameters
        const query = {};
        const searchParams = new URLSearchParams(window.location.search);
        for (const [key, value] of searchParams) {
            query[key] = value;
        }
        
        this.navigate(route, {}, query, true);
    }

    /**
     * Load a route
     * @param {Object} route - Route object
     * @param {Object} params - Route parameters
     * @param {Object} query - Query parameters
     */
    async _loadRoute(route, params, query) {
        // Show loading state
        this._showLoading();

        try {
            // Check cache
            const cacheKey = this._getCacheKey(route.path, params);
            if (this._pageCache.has(cacheKey) && this._cachePages) {
                this._renderPage(this._pageCache.get(cacheKey), route, params, query);
                this._hideLoading();
                return;
            }

            // Load component
            let component = null;
            if (route.config.loader) {
                const loaded = await route.config.loader();
                component = loaded.default || loaded;
            } else if (route.config.component) {
                component = route.config.component;
            }

            // Render component
            if (component) {
                this._renderPage(component, route, params, query);
                
                // Cache page
                if (this._cachePages && route.config.cache !== false) {
                    this._pageCache.set(cacheKey, component);
                    this._trimCache();
                }
            } else {
                console.error(`No component found for route "${route.path}"`);
                this._handle404(route.path);
            }
        } catch (error) {
            console.error(`Error loading route "${route.path}":`, error);
            this._showError(error);
        } finally {
            this._hideLoading();
        }
    }

    /**
     * Render a page component
     * @param {Function} component - Page component
     * @param {Object} route - Route object
     * @param {Object} params - Route parameters
     * @param {Object} query - Query parameters
     */
    _renderPage(component, route, params, query) {
        // Update document title
        if (route.config.title) {
            document.title = `${route.config.title} | Applied Deep Learning Platform`;
        }

        // Create page instance
        const page = typeof component === 'function' ? component(params, query) : component;

        // Render to container
        if (this._appContainer) {
            this._appContainer.innerHTML = '';
            if (typeof page === 'string') {
                this._appContainer.innerHTML = page;
            } else if (page instanceof HTMLElement) {
                this._appContainer.appendChild(page);
            } else if (page && typeof page.render === 'function') {
                // Component with render method
                const rendered = page.render(params, query);
                if (typeof rendered === 'string') {
                    this._appContainer.innerHTML = rendered;
                } else if (rendered instanceof HTMLElement) {
                    this._appContainer.appendChild(rendered);
                }
                // Call mounted lifecycle
                if (typeof page.mounted === 'function') {
                    page.mounted();
                }
            } else {
                console.warn('Invalid page component:', page);
            }
        } else {
            console.warn('App container not set for router');
        }

        // Run middleware
        this._runMiddleware(route, params, query);
    }

    /**
     * Get cache key for a route
     * @param {string} path - Route path
     * @param {Object} params - Route parameters
     * @returns {string} Cache key
     */
    _getCacheKey(path, params) {
        const paramString = Object.entries(params)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
        return path + (paramString ? '?' + paramString : '');
    }

    /**
     * Trim the page cache
     */
    _trimCache() {
        if (this._pageCache.size > this._maxCacheSize) {
            const keys = Array.from(this._pageCache.keys());
            // Remove oldest entries
            for (let i = 0; i < keys.length - this._maxCacheSize; i++) {
                this._pageCache.delete(keys[i]);
            }
        }
    }

    /**
     * Show loading state
     */
    _showLoading() {
        this._isLoading = true;
        if (this._appContainer) {
            this._appContainer.classList.add('loading');
        }
        // Clear any existing timeout
        if (this._loadingTimeout) {
            clearTimeout(this._loadingTimeout);
        }
        this._loadingTimeout = setTimeout(() => {
            // Show loading indicator if still loading
            if (this._isLoading && this._appContainer) {
                // Implementation will be handled by loading component
            }
        }, 500);
    }

    /**
     * Hide loading state
     */
    _hideLoading() {
        this._isLoading = false;
        if (this._appContainer) {
            this._appContainer.classList.remove('loading');
        }
        if (this._loadingTimeout) {
            clearTimeout(this._loadingTimeout);
            this._loadingTimeout = null;
        }
    }

    /**
     * Add navigation guard
     * @param {Function} guard - Guard function
     */
    addGuard(guard) {
        if (typeof guard === 'function') {
            this._guards.push(guard);
        }
    }

    /**
     * Run navigation guards
     * @param {Object} route - Route object
     * @param {string} path - Route path
     * @param {Object} params - Route parameters
     * @param {Object} query - Query parameters
     * @returns {Promise<boolean>} True if navigation should proceed
     */
    async _runGuards(route, path, params, query) {
        for (const guard of this._guards) {
            try {
                const result = await guard(route, path, params, query);
                if (result === false) {
                    return false;
                }
                if (typeof result === 'string') {
                    await this.navigate(result);
                    return false;
                }
            } catch (error) {
                console.error('Error in navigation guard:', error);
                return false;
            }
        }
        return true;
    }

    /**
     * Add middleware
     * @param {Function} middleware - Middleware function
     */
    use(middleware) {
        if (typeof middleware === 'function') {
            this._middleware.push(middleware);
        }
    }

    /**
     * Run middleware
     * @param {Object} route - Route object
     * @param {Object} params - Route parameters
     * @param {Object} query - Query parameters
     */
    _runMiddleware(route, params, query) {
        for (const middleware of this._middleware) {
            try {
                middleware(route, params, query);
            } catch (error) {
                console.error('Error in middleware:', error);
            }
        }
    }

    /**
     * Add to navigation history
     * @param {string} path - Route path
     * @param {Object} params - Route parameters
     * @param {Object} query - Query parameters
     */
    _addToHistory(path, params, query) {
        this._history.push({ path, params, query, timestamp: Date.now() });
        if (this._history.length > this._maxHistory) {
            this._history.shift();
        }
    }

    /**
     * Get navigation history
     * @returns {Array} History array
     */
    getHistory() {
        return [...this._history];
    }

    /**
     * Emit navigation event
     * @param {string} path - Route path
     * @param {Object} params - Route parameters
     * @param {Object} query - Query parameters
     */
    _emitNavigationEvent(path, params, query) {
        const event = new CustomEvent('routechange', {
            detail: { path, params, query }
        });
        window.dispatchEvent(event);
    }

    /**
     * Handle 404 - Page not found
     * @param {string} path - Requested path
     */
    async _handle404(path) {
        console.warn(`404 - Page not found: ${path}`);
        // Check if there's a 404 route registered
        const notFoundRoute = this._findRoute('/404');
        if (notFoundRoute) {
            await this._loadRoute(notFoundRoute, {}, {});
        } else {
            // Default 404 handling
            if (this._appContainer) {
                this._appContainer.innerHTML = `
                    <div class="page-404">
                        <h1>404 - Page Not Found</h1>
                        <p>The page you're looking for doesn't exist.</p>
                        <a href="/dashboard" class="btn btn-primary">Go to Dashboard</a>
                    </div>
                `;
            }
        }
    }

    /**
     * Show error state
     * @param {Error} error - Error object
     */
    _showError(error) {
        if (this._appContainer) {
            this._appContainer.innerHTML = `
                <div class="page-error">
                    <h1>Something went wrong</h1>
                    <p>${error.message || 'An unexpected error occurred'}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">
                        Reload Page
                    </button>
                </div>
            `;
        }
    }

    /**
     * Get route URL for a path
     * @param {string} path - Route path
     * @param {Object} params - Route parameters
     * @param {Object} query - Query parameters
     * @returns {string} Route URL
     */
    getRouteUrl(path, params = {}, query = {}) {
        return this._buildUrl(path, params, query);
    }

    /**
     * Check if a route is active
     * @param {string} path - Route path
     * @param {Object} params - Route parameters
     * @param {Object} query - Query parameters
     * @returns {boolean} True if active
     */
    isActive(path, params = {}, query = {}) {
        if (!this._currentRoute) return false;
        
        const currentPath = this._currentRoute.path;
        if (currentPath !== path) return false;
        
        // Check params
        for (const [key, value] of Object.entries(params)) {
            if (this._currentParams[key] !== value) {
                return false;
            }
        }
        
        // Check query
        for (const [key, value] of Object.entries(query)) {
            if (this._currentQuery[key] !== value) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Clear the page cache
     */
    clearCache() {
        this._pageCache.clear();
    }

    /**
     * Disable page caching
     */
    disableCache() {
        this._cachePages = false;
        this._pageCache.clear();
    }

    /**
     * Enable page caching
     */
    enableCache() {
        this._cachePages = true;
    }

    /**
     * Get all registered routes
     * @returns {Array} Array of route objects
     */
    getRoutes() {
        return Array.from(this._routes.entries()).map(([path, config]) => ({
            path,
            ...config
        }));
    }

    /**
     * Get route metadata
     * @param {string} path - Route path
     * @returns {Object} Route metadata
     */
    getRouteMeta(path) {
        const route = this._findRoute(path);
        return route ? route.config.meta || {} : {};
    }

    /**
     * Create a link to a route
     * @param {string} path - Route path
     * @param {Object} params - Route parameters
     * @param {Object} query - Query parameters
     * @param {Object} attrs - Additional HTML attributes
     * @returns {string} HTML link
     */
    createLink(path, params = {}, query = {}, attrs = {}) {
        const url = this.getRouteUrl(path, params, query);
        const attrsString = Object.entries(attrs)
            .map(([key, value]) => `${key}="${value}"`)
            .join(' ');
        return `<a href="${url}" data-route="true" ${attrsString}>`;
    }
}

/**
 * Create and export a singleton instance
 */
const router = new Router();

// Freeze the router object
Object.freeze(router);

// Export the router
export default router;
