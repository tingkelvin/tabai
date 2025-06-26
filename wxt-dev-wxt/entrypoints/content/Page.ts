import { removeHighlights, getClickableElementsFromDomTree } from './services/DomTreeService';

import { ClickableElementProcessor } from './services/DomService';
import { DomSnapshot, ElementDomNode } from './types/dom/DomNode';
import { PageConfig, PageState, DEFAULT_PAGE_CONFIG, ViewportInfo } from './types/page';

/**
 * Cached clickable elements hashes for the last state
 */
export class CachedStateClickableElementsHashes {
    url: string;
    hashes: Set<string>;

    constructor(url: string, hashes: Set<string>) {
        console.log('CachedStateClickableElementsHashes constructor:', { url, hashesSize: hashes.size });
        this.url = url;
        this.hashes = hashes;
    }
}

export default class Page {
    private _config: PageConfig;
    private _currentState: PageState;
    private _isValidWebPage: boolean = false;
    private _cachedState: PageState | null = null;
    private _mutationObserver: MutationObserver | null = null;
    private _isPageStable: boolean = true;
    private _cachedStateClickableElementsHashes: CachedStateClickableElementsHashes | null = null;

    constructor(config: Partial<PageConfig> = {}) {
        console.log('Page constructor started with config:', config);
        this._config = { ...DEFAULT_PAGE_CONFIG, ...config };
        console.log('Page _config set:', this._config);

        this._currentState = {
            url: window.location.href,
            title: document.title,
            screenshot: null,
            domSnapshot: null,
            viewport: this._getViewportInfo(),
            capturedAt: Date.now(),
            isValid: this._isValidWebPage, // Use the actual validation result
        };
        console.log('Page initial _currentState:', this._currentState);

        this._isValidWebPage = this._validateCurrentPage();
        console.log('Page _isValidWebPage:', this._isValidWebPage);

        this._initializePageTracking();
        console.log('Page constructor completed');
    }

    // Get current page state
    get state(): PageState {
        console.log('Getting page state:', this._currentState);
        return this._currentState;
    }

    get isValidPage(): boolean {
        console.log('Getting isValidPage:', this._isValidWebPage);
        return this._isValidWebPage;
    }

    get cachedState(): PageState | null {
        console.log('Getting cachedState:', this._cachedState);
        return this._cachedState;
    }

    // Capture current page state with optional screenshot
    async captureState(options: {
        includeScreenshot?: boolean;
        showHighlights?: boolean;
        focusElement?: number;
    } = {}): Promise<PageState> {
        console.log('captureState called with options:', options);

        if (!this._isValidWebPage) {
            console.log('captureState: Invalid webpage, returning current state');
            return this._currentState;
        }

        try {
            console.log('captureState: Starting page state capture');

            // Wait for page stability
            console.log('captureState: Waiting for page stability');
            await this._waitForPageStability();
            console.log('captureState: Page stability achieved');

            // Extract DOM structure
            console.log('captureState: Extracting DOM snapshot');
            const domSnapshot = await this._extractDOMSnapshot(
                options.showHighlights ?? this._config.displayHighlights,
                options.focusElement ?? -1,
            );
            console.log('captureState: DOM snapshot extracted:', domSnapshot ? 'success' : 'null');

            // Capture screenshot if requested
            console.log('captureState: Capturing screenshot, includeScreenshot:', options.includeScreenshot);
            const screenshot = options.includeScreenshot ?
                await this._captureScreenshot() : null;
            console.log('captureState: Screenshot captured:', screenshot ? 'success' : 'null');

            // Get viewport information
            console.log('captureState: Getting viewport info');
            const viewport = this._getViewportInfo();
            console.log('captureState: Viewport info:', viewport);

            // Update current state
            this._currentState = {
                url: window.location.href,
                title: document.title,
                screenshot,
                domSnapshot,
                viewport,
                capturedAt: Date.now(),
                isValid: this._isValidWebPage,
            };
            console.log('captureState: Current state updated:', this._currentState);

            // Cache the state
            this._cachedState = { ...this._currentState };
            console.log('captureState: State cached');

            return this._currentState;

        } catch (error) {
            console.error('Failed to capture page state:', error);
            return this._currentState;
        }
    }

    async removeHighlight(): Promise<void> {
        console.log('removeHighlight called');
        await removeHighlights();
        console.log('removeHighlight completed');
    }

    async _extractDOMSnapshot(showHighlights: boolean, focusElement: number): Promise<DomSnapshot | null> {
        console.log('_extractDOMSnapshot called:', { showHighlights, focusElement, isValidWebPage: this._isValidWebPage });

        if (!this._isValidWebPage) {
            console.log('_extractDOMSnapshot: Invalid webpage, returning null');
            return null;
        }

        console.log('_extractDOMSnapshot: Getting clickable elements from DOM tree');
        const result = getClickableElementsFromDomTree(
            this.state.url,
            showHighlights,
            focusElement,
            this._config.viewportExpansion,
        );
        console.log('_extractDOMSnapshot: Result:', result);
        return result;
    }

    /**
     * Initialize page tracking and mutation observer
     */
    private _initializePageTracking(): void {
        console.log('_initializePageTracking started');

        this._mutationObserver = new MutationObserver((mutations) => {
            console.log('MutationObserver triggered with mutations:', mutations.length);

            // Filter significant mutations
            const significantMutations = mutations.filter(mutation => {
                if (mutation.type === 'attributes') {
                    const target = mutation.target as Element;
                    const attr = mutation.attributeName;
                    // Skip style/class changes that are likely animations
                    return attr !== 'style' && attr !== 'class';
                }
                return mutation.type === 'childList';
            });

            console.log('MutationObserver significant mutations:', significantMutations.length);

            if (significantMutations.length > 0) {
                console.log('MutationObserver: Page marked as unstable');
                this._isPageStable = false;
                // Debounce stability detection
                setTimeout(() => {
                    console.log('MutationObserver: Page marked as stable after timeout');
                    this._isPageStable = true;
                }, 500);
            }
        });

        // Start observing when DOM is ready
        if (document.readyState === 'loading') {
            console.log('_initializePageTracking: DOM still loading, adding event listener');
            document.addEventListener('DOMContentLoaded', () => {
                console.log('_initializePageTracking: DOMContentLoaded event fired');
                this._startMutationObserver();
            });
        } else {
            console.log('_initializePageTracking: DOM already ready, starting observer');
            this._startMutationObserver();
        }
    }

    /**
     * Start mutation observer
     */
    private _startMutationObserver(): void {
        console.log('_startMutationObserver called');
        const target = document.body || document.documentElement;
        console.log('_startMutationObserver target:', target?.tagName);

        if (target && this._mutationObserver) {
            this._mutationObserver.observe(target, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'id', 'style', 'hidden', 'disabled']
            });
            console.log('_startMutationObserver: Observer started successfully');
        } else {
            console.log('_startMutationObserver: Failed to start observer', { hasTarget: !!target, hasObserver: !!this._mutationObserver });
        }
    }

    /**
     * Wait for page to stabilize
     */
    private async _waitForPageStability(timeout: number = 5000): Promise<void> {
        console.log('_waitForPageStability called with timeout:', timeout);
        const startTime = Date.now();

        while (!this._isPageStable && (Date.now() - startTime) < timeout) {
            console.log('_waitForPageStability: Waiting for stability, elapsed:', Date.now() - startTime);
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const elapsed = Date.now() - startTime;
        console.log('_waitForPageStability completed:', { isStable: this._isPageStable, elapsed });
    }

    /**
     * Cleanup resources
     */
    dispose(): void {
        console.log('dispose called');
        if (this._mutationObserver) {
            console.log('dispose: Disconnecting mutation observer');
            this._mutationObserver.disconnect();
            this._mutationObserver = null;
        }
        console.log('dispose completed');
    }

    // Get scroll position information for the current page.
    async getScrollInfo(): Promise<[number, number]> {
        console.log('getScrollInfo called');
        const scrollY = window.scrollY;
        const viewportHeight = window.innerHeight;
        const totalHeight = document.documentElement.scrollHeight;

        const pixelsAbove = scrollY;
        const pixelsBelow = totalHeight - (scrollY + viewportHeight);

        const result: [number, number] = [pixelsAbove, Math.max(0, pixelsBelow)];
        console.log('getScrollInfo result:', { scrollY, viewportHeight, totalHeight, pixelsAbove, pixelsBelow, result });
        return result;
    }

    getCachedState(): PageState | null {
        console.log('getCachedState called, returning:', this._cachedState);
        return this._cachedState;
    }

    /**
     * Capture screenshot via background script
     */
    private async _captureScreenshot(): Promise<string | null> {
        console.log('_captureScreenshot called');
        return new Promise((resolve) => {
            console.log('_captureScreenshot: Sending message to background script');
            chrome.runtime.sendMessage({
                action: 'captureScreenshot',
                options: { format: 'jpeg', quality: 80 }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Screenshot capture failed:', chrome.runtime.lastError);
                    resolve(null);
                } else {
                    console.log('_captureScreenshot: Response received:', response ? 'success' : 'no response');
                    resolve(response?.screenshot || null);
                }
            });
        });
    }

    // new method
    /**
 * Get current viewport information including scroll position and dimensions
 * @returns ViewportInfo object with all viewport-related data
 */
    private _getViewportInfo(): ViewportInfo {
        console.log('_getViewportInfo called');

        // Get current scroll position (with fallbacks for older browsers)
        const scrollTop = window.scrollY || window.pageYOffset || 0;
        const scrollLeft = window.scrollX || window.pageXOffset || 0;

        // Get viewport dimensions (visible area)
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;

        // Get total document dimensions (entire scrollable area)
        const scrollableHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
        const scrollableWidth = document.documentElement.scrollWidth || document.body.scrollWidth || 0;

        const viewportInfo = {
            // Current scroll position
            scrollTop,           // How far scrolled from top (same as window.scrollY)
            scrollLeft,          // How far scrolled from left (same as window.scrollX)

            // Calculated pixel distances
            pixelsAbove: scrollTop,  // Pixels above current viewport
            pixelsBelow: Math.max(0, scrollableHeight - scrollTop - viewportHeight), // Pixels below viewport

            // Document dimensions
            scrollableHeight,    // Total height of document
            scrollableWidth,     // Total width of document

            // Viewport dimensions
            viewportWidth,       // Width of visible area
            viewportHeight,      // Height of visible area
        };

        console.log('_getViewportInfo result:', viewportInfo);
        return viewportInfo;
    }


    /**
     * Simple check if current webpage is valid for interaction
     * @returns true if page can be interacted with, false otherwise
     */
    private _validateCurrentPage(): boolean {
        console.log('_validateCurrentPage called');
        const url = window.location.href.toLowerCase();
        console.log('_validateCurrentPage: Current URL:', url);

        // Must be HTTP/HTTPS
        if (!url.startsWith('http')) {
            console.log('_validateCurrentPage: Invalid - not HTTP/HTTPS');
            return false;
        }

        // Block Chrome Web Store and browser internal pages
        if (url.includes('chromewebstore.google.com') ||
            url.startsWith('chrome://') ||
            url.startsWith('chrome-extension://') ||
            url.startsWith('about:')) {
            console.log('_validateCurrentPage: Invalid - blocked URL type');
            return false;
        }

        // Must have accessible document
        if (!document || !document.body) {
            console.log('_validateCurrentPage: Invalid - no document or body');
            return false;
        }

        console.log('_validateCurrentPage: Valid page');
        return true;
    }
}