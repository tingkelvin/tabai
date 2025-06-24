import { DOMState } from "./dom"

export interface PageState extends DOMState {
    url: string
    title: string
    screenshot: string | null
    pixelsAbove: number
    pixelsBelow: number
}

// BrowserContextConfig
export interface PageConfig {
    /**
     * Viewport expansion in pixels. This amount will increase the number of elements
     * which are included in the state what the LLM will see.
     * If set to -1, all elements will be included (this leads to high token usage).
     * If set to 0, only the elements which are visible in the viewport will be included.
     * @default 0
     */
    viewportExpansion: number

    /**
     * List of allowed domains that can be accessed. If None, all domains are allowed.
     * @default null
     */
    allowedUrls: string[]

    /**
     * List of denied domains that can be accessed. If None, all domains are allowed.
     * @default null
     */
    deniedUrls: string[]

    /**
     * Include dynamic attributes in the CSS selector. If you want to reuse the css_selectors, it might be better to set this to False.
     * @default true
     */
    includeDynamicAttributes: boolean

    /**
     * Home page url
     * @default 'https://www.google.com'
     */
    homePageUrl: string

    /**
     * Display highlights on interactive elements
     * @default true
     */
    displayHighlights: boolean
}
