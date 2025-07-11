import { DomSnapshot } from "./dom/DomNode"



// Fixed and improved interfaces
export interface PageConfig {
    /**
     * Viewport expansion in pixels. This amount will increase the number of elements
     * which are included in the state what the LLM will see.
     * If set to -1, all elements will be included (this leads to high token usage).
     * If set to 0, only the elements which are visible in the viewport will be included.
     * @default 0
     */
    viewportExpansion: number;

    /**
     * List of allowed URL patterns that can be accessed. If empty, all URLs are allowed.
     * Supports wildcards: ['https://*.example.com/*', 'https://trusted-site.com/*']
     * @default []
     */
    allowedUrls: string[];

    /**
     * List of denied URL patterns that cannot be accessed. Takes precedence over allowedUrls.
     * Supports wildcards: ['https://*.malicious.com/*', 'https://blocked-site.com/*']
     * @default []
     */
    deniedUrls: string[];

    /**
     * Include dynamic attributes (data-*, aria-*) in CSS selectors.
     * Set to false for more stable selectors that work across page refreshes.
     * @default true
     */
    includeDynamicAttributes: boolean;

    /**
     * Default home page URL to navigate to when needed
     * @default 'https://www.google.com'
     */
    homePageUrl: string;

    /**
     * Display visual highlights on interactive elements for debugging
     * @default true
     */
    displayHighlights: boolean;

    /**
     * Timeout in milliseconds for page operations
     * @default 10000
     */
    timeout: number;
}

export interface ViewportInfo {
    /**
     * Current scroll position from top
     */
    scrollTop: number;

    /**
     * Current scroll position from left
     */
    scrollLeft: number;

    /**
     * Pixels above current viewport
     */
    pixelsAbove: number;

    /**
     * Pixels below current viewport
     */
    pixelsBelow: number;

    /**
     * Total scrollable height
     */
    scrollableHeight: number;

    /**
     * Total scrollable width
     */
    scrollableWidth: number;

    /**
     * Viewport dimensions
     */
    viewportWidth: number;
    viewportHeight: number;
}

export interface PageState {
    /**
     * Current page URL
     */
    url: string;

    /**
     * Current page title
     */
    title: string;

    /**
     * Base64 encoded screenshot (if captured)
     */
    screenshot: string | null;

    /**
     * DOM structure snapshot
     */
    domSnapshot: DomSnapshot | null;

    /**
     * Timestamp when state was captured
     */
    timestamp: number;
}

export const defaultPageState: PageState = {
    url: '',
    title: '',
    screenshot: null,
    domSnapshot: null,
    timestamp: 0
};

