/**
 * ============================================================
 * js/core/router.js — Application Routing System
 * Applied Deep Learning Platform
 * ============================================================
 */

class Router {
    constructor() {
        this._routes        = new Map();
        this._currentRoute  = null;
        this._currentParams = {};
        this._currentQuery  = {};
        this._history       = [];
        this._maxHistory    = 50;
        this._useHash       = false;
        this._basePath      = '';
        this._guards        = [];
        this._middleware    = [];
        this._isLoading     = false;
        this._loadingTimeout = null;
        this._appContainer  = null;
        this._pageCache     = new Map();
        this._cachePages    = true;
        this._maxCacheSize  = 10;
        this._currentPage   = null; // ✅ FIX: track current page for destroy()

        this._init();
    }

    _init() {
        window.addEventListener('popstate', (event) => {
            const state = event.state;
            if (state && state.route) {
                this._navigate(state.route, state.params, state.query, true);
            } else {
                this._handleInitialRoute();
            }
        });

        window.addEventListener('hashchange', () => {
            if (this._useHash) {
                const route = this._getRouteFromHash();
                if (route) this.navigate(route);
            }
        });

        document.addEventListener('DOMContentLoaded', () => {
            this._handleInitialRoute();
        });

        window.addEventListener('beforeunload', () => {
            this._pageCache.clear();
        });
    }

    setContainer(element) { this._appContainer = element; }
    setBasePath(path)      { this._basePath = path; }

    useHashRouting(useHash = true) {
        this._useHash = useHash;
        if (useHash && window.location.hash) {
            const route = this._getRouteFromHash();
            if (route) this.navigate(route);
        }
    }

    route(path, config) {
        if (typeof config === 'function') config = { component: config };
        if (!config.redirect && !config.component && !config.loader) {
            throw new Error(`Route "${path}" must have a component, loader, or redirect`);
        }
        const paramNames = [];
        const routeRegex = this._createRouteRegex(path, paramNames);
        this._routes.set(path, { path, paramNames, regex: routeRegex, ...config });
        return this;
    }

    _createRouteRegex(path, paramNames) {
        const regexString = path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, paramName) => {
            paramNames.push(paramName);
            return '([^/]+)';
        });
        return new RegExp(`^${regexString.replace(/\*/g, '.*')}$`);
    }

    async navigate(path, params = {}, query = {}, replace = false) {
        path = this._normalizePath(path);
        const route = this._findRoute(path);
        if (!route) {
            console.warn(`Route "${path}" not found`);
            return this._handle404(path);
        }
        if (route.config.redirect) return this.navigate(route.config.redirect, params, query, replace);

        const guardResult = await this._runGuards(route, path, params, query);
        if (!guardResult) return;

        const extractedParams = this._extractParams(route, path);
        const finalParams     = { ...extractedParams, ...params };

        this._updateHistory(path, finalParams, query, replace);
        await this._loadRoute(route, finalParams, query);

        this._currentRoute  = route;
        this._currentParams = finalParams;
        this._currentQuery  = query;

        this._addToHistory(path, finalParams, query);
        this._emitNavigationEvent(path, finalParams, query);
    }

    replace(path, params = {}, query = {}) {
        return this.navigate(path, params, query, true);
    }

    async back() {
        if (this._history.length > 1) { window.history.back(); return; }
        await this.navigate('/dashboard');
    }

    forward() { window.history.forward(); }

    async reload() {
        if (this._currentRoute) {
            await this._loadRoute(this._currentRoute, this._currentParams, this._currentQuery);
        }
    }

    _findRoute(path) {
        const normalizedPath = this._normalizePath(path);
        for (const [routePath, config] of this._routes) {
            const match = normalizedPath.match(config.regex);
            if (match) return { path: routePath, config, match };
        }
        return null;
    }

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

    _normalizePath(path) {
        if (!path) return '/';
        if (this._basePath && path.startsWith(this._basePath)) path = path.substring(this._basePath.length);
        if (path.includes('#')) path = path.split('#')[0];
        if (path.includes('?')) path = path.split('?')[0];
        if (!path.startsWith('/')) path = '/' + path;
        if (path !== '/' && path.endsWith('/')) path = path.slice(0, -1);
        return path;
    }

    _getRouteFromHash() {
        const hash = window.location.hash;
        if (!hash) return null;
        return this._normalizePath(hash.substring(1) || '/');
    }

    getCurrentRoute() {
        return {
            path:     this._currentRoute ? this._currentRoute.path : null,
            params:   this._currentParams,
            query:    this._currentQuery,
            fullPath: this._currentRoute ? this._getFullPath() : null
        };
    }

    _getFullPath() {
        if (!this._currentRoute) return '/';
        let path = this._currentRoute.path;
        for (const [key, value] of Object.entries(this._currentParams)) {
            path = path.replace(`:${key}`, value);
        }
        const qs = this._buildQueryString(this._currentQuery);
        if (qs) path += '?' + qs;
        return path;
    }

    _buildQueryString(query) {
        return Object.entries(query)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
    }

    _updateHistory(path, params, query, replace) {
        const url   = this._buildUrl(path, params, query);
        const state = { route: path, params, query };
        if (replace) window.history.replaceState(state, '', url);
        else         window.history.pushState(state, '', url);
        if (this._useHash) window.location.hash = path;
    }

    _buildUrl(path, params, query) {
        if (this._useHash) {
            let url = '#' + path;
            const qs = this._buildQueryString(query);
            if (qs) url += '?' + qs;
            return url;
        }
        let url = this._basePath + path;
        for (const [key, value] of Object.entries(params)) {
            url = url.replace(`:${key}`, encodeURIComponent(value));
        }
        const qs = this._buildQueryString(query);
        if (qs) url += '?' + qs;
        return url;
    }

    _handleInitialRoute() {
        let route = '/dashboard';
        if (this._useHash) {
            const hashRoute = this._getRouteFromHash();
            if (hashRoute) route = hashRoute;
        } else {
            const normalizedPath = this._normalizePath(window.location.pathname);
            if (normalizedPath && normalizedPath !== '/') route = normalizedPath;
        }
        const query = {};
        const searchParams = new URLSearchParams(window.location.search);
        for (const [key, value] of searchParams) query[key] = value;
        this.navigate(route, {}, query, true);
    }

    async _loadRoute(route, params, query) {
        this._showLoading();
        try {
            const cacheKey = this._getCacheKey(route.path, params);
            if (this._pageCache.has(cacheKey) && this._cachePages) {
                this._renderPage(this._pageCache.get(cacheKey), route, params, query);
                this._hideLoading();
                return;
            }

            let component = null;
            if (route.config.loader) {
                const loaded = await route.config.loader();
                component = loaded.default || loaded;
            } else if (route.config.component) {
                component = route.config.component;
            }

            if (component) {
                this._renderPage(component, route, params, query);
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

    _renderPage(component, route, params, query) {
        if (route.config.title) {
            document.title = `${route.config.title} | Applied Deep Learning Platform`;
        }

        if (!this._appContainer) {
            console.warn('App container not set for router');
            return;
        }

        // ✅ FIX: destroy old page before rendering new one
        if (this._currentPage && typeof this._currentPage.destroy === 'function') {
            this._currentPage.destroy();
            this._currentPage = null;
        }

        const isClass = typeof component === 'function'
            && component.prototype
            && typeof component.prototype.render === 'function';

        const isPlainObjectWithRender = !isClass
            && component !== null
            && typeof component === 'object'
            && typeof component.render === 'function';

        const isFactoryFunction = typeof component === 'function' && !isClass;

        let page;
        if (isClass) {
            page = new component(params, query);
        } else if (isPlainObjectWithRender || isFactoryFunction) {
            page = isFactoryFunction ? component(params, query) : component;
        } else {
            console.warn('Invalid page component:', component);
            return;
        }

        this._appContainer.innerHTML = '';

        if (typeof page === 'string') {
            this._appContainer.innerHTML = page;

        } else if (page instanceof HTMLElement) {
            this._appContainer.appendChild(page);

        } else if (page && typeof page.render === 'function') {
            const rendered = page.render(params, query);

            if (typeof rendered === 'string') {
                if (rendered.trim() !== '') {
                    this._appContainer.innerHTML = rendered;
                }
            } else if (rendered instanceof HTMLElement) {
                this._appContainer.appendChild(rendered);
            }

            // ✅ FIX: save reference so we can destroy() on next navigation
            this._currentPage = page;

            if (typeof page.mounted === 'function') {
                Promise.resolve().then(() => page.mounted(params, query));
            }
        } else {
            console.warn('Invalid page component:', page);
            return;
        }

        this._runMiddleware(route, params, query);
    }

    _getCacheKey(path, params) {
        const paramString = Object.entries(params)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([k, v]) => `${k}=${v}`)
            .join('&');
        return path + (paramString ? '?' + paramString : '');
    }

    _trimCache() {
        if (this._pageCache.size > this._maxCacheSize) {
            const keys = Array.from(this._pageCache.keys());
            for (let i = 0; i < keys.length - this._maxCacheSize; i++) {
                this._pageCache.delete(keys[i]);
            }
        }
    }

    _showLoading() {
        this._isLoading = true;
        if (this._appContainer) this._appContainer.classList.add('loading');
        if (this._loadingTimeout) clearTimeout(this._loadingTimeout);
        this._loadingTimeout = setTimeout(() => {}, 500);
    }

    _hideLoading() {
        this._isLoading = false;
        if (this._appContainer) this._appContainer.classList.remove('loading');
        if (this._loadingTimeout) { clearTimeout(this._loadingTimeout); this._loadingTimeout = null; }
    }

    addGuard(guard) {
        if (typeof guard === 'function') this._guards.push(guard);
    }

    async _runGuards(route, path, params, query) {
        for (const guard of this._guards) {
            try {
                const result = await guard(route, path, params, query);
                if (result === false) return false;
                if (typeof result === 'string') { await this.navigate(result); return false; }
            } catch (error) {
                console.error('Error in navigation guard:', error);
                return false;
            }
        }
        return true;
    }

    use(middleware) {
        if (typeof middleware === 'function') this._middleware.push(middleware);
    }

    _runMiddleware(route, params, query) {
        for (const mw of this._middleware) {
            try { mw(route, params, query); } catch (e) { console.error('Error in middleware:', e); }
        }
    }

    _addToHistory(path, params, query) {
        this._history.push({ path, params, query, timestamp: Date.now() });
        if (this._history.length > this._maxHistory) this._history.shift();
    }

    getHistory() { return [...this._history]; }

    _emitNavigationEvent(path, params, query) {
        window.dispatchEvent(new CustomEvent('routechange', { detail: { path, params, query } }));
    }

    async _handle404(path) {
        console.warn(`404 - Page not found: ${path}`);
        const notFoundRoute = this._findRoute('/404');
        if (notFoundRoute) {
            await this._loadRoute(notFoundRoute, {}, {});
        } else if (this._appContainer) {
            this._appContainer.innerHTML = `
                <div class="page-404">
                    <h1>404 - Page Not Found</h1>
                    <p>The page you're looking for doesn't exist.</p>
                    <a href="/dashboard" class="btn btn-primary">Go to Dashboard</a>
                </div>`;
        }
    }

    _showError(error) {
        if (this._appContainer) {
            this._appContainer.innerHTML = `
                <div class="page-error">
                    <h1>Something went wrong</h1>
                    <p>${error.message || 'An unexpected error occurred'}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">Reload Page</button>
                </div>`;
        }
    }

    getRouteUrl(path, params = {}, query = {}) { return this._buildUrl(path, params, query); }

    isActive(path, params = {}, query = {}) {
        if (!this._currentRoute || this._currentRoute.path !== path) return false;
        for (const [k, v] of Object.entries(params)) { if (this._currentParams[k] !== v) return false; }
        for (const [k, v] of Object.entries(query))  { if (this._currentQuery[k]  !== v) return false; }
        return true;
    }

    clearCache()   { this._pageCache.clear(); }
    disableCache() { this._cachePages = false; this._pageCache.clear(); }
    enableCache()  { this._cachePages = true; }

    getRoutes() {
        return Array.from(this._routes.entries()).map(([path, config]) => ({ path, ...config }));
    }

    getRouteMeta(path) {
        const route = this._findRoute(path);
        return route ? route.config.meta || {} : {};
    }

    createLink(path, params = {}, query = {}, attrs = {}) {
        const url         = this.getRouteUrl(path, params, query);
        const attrsString = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
        return `<a href="${url}" data-route="true" ${attrsString}>`;
    }
}

const router = new Router();
export default router;
