// Content Script Page Implementation
// This runs in the page context and communicates with background script

import { DOMElementNode, type DOMState } from './DomElement'
import { createLogger } from '@src/background/log'
import { ClickableElementProcessor } from './dom/clickable/service'
import { isUrlAllowed } from './util'
import {
    BrowserContextConfig,
    DEFAULT_BROWSER_CONTEXT_CONFIG,
    PageState,
    URLNotAllowedError,
} from './PageUtils'

const logger = createLogger('ContentScriptPage')

export function build_initial_state(url?: string, title?: string): PageState {
    return {
        elementTree: new DOMElementNode({
            tagName: 'root',
            isVisible: true,
            parent: null,
            xpath: '',
            attributes: {},
            children: [],
        }),
        selectorMap: new Map(),
        tabId: 0, // Not available in content script
        url: url || window.location.href,
        title: title || document.title,
        screenshot: null,
        pixelsAbove: 0,
        pixelsBelow: 0,
    }
}

export class CachedStateClickableElementsHashes {
    url: string
    hashes: Set<string>

    constructor(url: string, hashes: Set<string>) {
        this.url = url
        this.hashes = hashes
    }
}

export default class Page {
    private _config: BrowserContextConfig
    private _state: PageState
    private _cachedState: PageState | null = null
    private _cachedStateClickableElementsHashes: CachedStateClickableElementsHashes | null =
        null

    constructor(config: Partial<BrowserContextConfig> = {}) {
        this._config = { ...DEFAULT_BROWSER_CONTEXT_CONFIG, ...config }
        this._state = build_initial_state()
    }

    get validWebPage(): boolean {
        const url = window.location.href.toLowerCase()
        return (
            url.startsWith('http') &&
            !url.startsWith('https://chromewebstore.google.com')
        )
    }

    get attached(): boolean {
        return this.validWebPage
    }

    async removeHighlight(): Promise<void> {
        if (this._config.displayHighlights && this.validWebPage) {
            // Remove highlight elements from DOM
            const highlights = document.querySelectorAll(
                '[data-highlight-element]'
            )
            highlights.forEach((el) => el.remove())
        }
    }

    async getClickableElements(
        showHighlightElements: boolean,
        focusElement: number
    ): Promise<DOMState | null> {
        if (!this.validWebPage) {
            return null
        }

        // Send message to background script to get DOM state
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(
                {
                    type: 'GET_CLICKABLE_ELEMENTS',
                    data: {
                        url: window.location.href,
                        showHighlightElements,
                        focusElement,
                        viewportExpansion: this._config.viewportExpansion,
                    },
                },
                (response) => {
                    resolve(response?.data || null)
                }
            )
        })
    }

    async getScrollInfo(): Promise<[number, number]> {
        if (!this.validWebPage) {
            return [0, 0]
        }

        const pixelsAbove =
            window.pageYOffset || document.documentElement.scrollTop
        const pixelsBelow = Math.max(
            0,
            document.documentElement.scrollHeight -
                window.innerHeight -
                pixelsAbove
        )

        return [pixelsAbove, pixelsBelow]
    }

    async getContent(): Promise<string> {
        return document.documentElement.outerHTML
    }

    async getState(
        useVision = false,
        cacheClickableElementsHashes = false
    ): Promise<PageState> {
        if (!this.validWebPage) {
            return build_initial_state()
        }

        const updatedState = await this._updateState(useVision)

        if (cacheClickableElementsHashes) {
            if (
                this._cachedStateClickableElementsHashes &&
                this._cachedStateClickableElementsHashes.url ===
                    updatedState.url
            ) {
                const updatedStateClickableElements =
                    ClickableElementProcessor.getClickableElements(
                        updatedState.elementTree
                    )

                for (const domElement of updatedStateClickableElements) {
                    const hash = await ClickableElementProcessor.hashDomElement(
                        domElement
                    )
                    domElement.isNew =
                        !this._cachedStateClickableElementsHashes.hashes.has(
                            hash
                        )
                }
            }

            const newHashes =
                await ClickableElementProcessor.getClickableElementsHashes(
                    updatedState.elementTree
                )
            this._cachedStateClickableElementsHashes =
                new CachedStateClickableElementsHashes(
                    updatedState.url,
                    newHashes
                )
        }

        this._cachedState = updatedState
        return updatedState
    }

    async _updateState(
        useVision = true,
        focusElement = -1
    ): Promise<PageState> {
        try {
            await this.removeHighlight()

            const displayHighlights =
                this._config.displayHighlights || useVision
            const content = await this.getClickableElements(
                displayHighlights,
                focusElement
            )
            if (!content) {
                logger.warning('Failed to get clickable elements')
                return this._state
            }

            // const screenshot = useVision ? await this.takeScreenshot() : null
            const [pixelsAbove, pixelsBelow] = await this.getScrollInfo()

            this._state.elementTree = content.elementTree
            this._state.selectorMap = content.selectorMap
            this._state.url = window.location.href
            this._state.title = document.title
            // this._state.screenshot = screenshot
            this._state.pixelsAbove = pixelsAbove
            this._state.pixelsBelow = pixelsBelow

            return this._state
        } catch (error) {
            logger.error('Failed to update state:', error)
            return this._state
        }
    }

    // async takeScreenshot(fullPage = false): Promise<string | null> {
    //     // Request screenshot from background script
    //     return new Promise((resolve) => {
    //         sendMessage(
    //             {
    //                 type: 'TAKE_SCREENSHOT',
    //                 data: { fullPage },
    //             },
    //             (response) => {
    //                 resolve(response?.screenshot || null)
    //             }
    //         )
    //     })
    // }

    url(): string {
        return window.location.href
    }

    async title(): Promise<string> {
        return document.title
    }

    async navigateTo(url: string): Promise<void> {
        if (
            !isUrlAllowed(
                url,
                this._config.allowedUrls,
                this._config.deniedUrls
            )
        ) {
            throw new URLNotAllowedError(`URL: ${url} is not allowed`)
        }

        window.location.href = url
    }

    async refreshPage(): Promise<void> {
        window.location.reload()
    }

    async goBack(): Promise<void> {
        window.history.back()
    }

    async goForward(): Promise<void> {
        window.history.forward()
    }

    async scrollDown(amount?: number): Promise<void> {
        const scrollAmount = amount || window.innerHeight
        window.scrollBy(0, scrollAmount)
    }

    async scrollUp(amount?: number): Promise<void> {
        const scrollAmount = amount || window.innerHeight
        window.scrollBy(0, -scrollAmount)
    }

    async sendKeys(keys: string): Promise<void> {
        const keyParts = keys.split('+')
        const modifiers = keyParts.slice(0, -1)
        const mainKey = keyParts[keyParts.length - 1]

        // Create and dispatch keyboard event
        const event = new KeyboardEvent('keydown', {
            key: this._convertKey(mainKey),
            ctrlKey:
                modifiers.includes('Control') || modifiers.includes('Ctrl'),
            shiftKey: modifiers.includes('Shift'),
            altKey: modifiers.includes('Alt'),
            metaKey:
                modifiers.includes('Meta') || modifiers.includes('Command'),
            bubbles: true,
        })

        document.dispatchEvent(event)
    }

    private _convertKey(key: string): string {
        const keyMap: { [key: string]: string } = {
            enter: 'Enter',
            backspace: 'Backspace',
            delete: 'Delete',
            arrowleft: 'ArrowLeft',
            arrowright: 'ArrowRight',
            arrowup: 'ArrowUp',
            arrowdown: 'ArrowDown',
            escape: 'Escape',
            tab: 'Tab',
            space: ' ',
        }

        return keyMap[key.toLowerCase()] || key
    }

    async scrollToText(text: string): Promise<boolean> {
        const xpath = `//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${text.toLowerCase()}')]`
        const result = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        )

        if (result.singleNodeValue) {
            const element = result.singleNodeValue as Element
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            return true
        }

        return false
    }

    async getDropdownOptions(
        index: number
    ): Promise<Array<{ index: number; text: string; value: string }>> {
        const selectorMap = this.getSelectorMap()
        const element = selectorMap?.get(index)

        if (!element) {
            throw new Error('Element not found')
        }

        const domElement = this.locateElement(element)
        if (!domElement || !(domElement instanceof HTMLSelectElement)) {
            throw new Error('Element is not a select element')
        }

        return Array.from(domElement.options).map((option) => ({
            index: option.index,
            text: option.text,
            value: option.value,
        }))
    }

    async selectDropdownOption(index: number, text: string): Promise<string> {
        const selectorMap = this.getSelectorMap()
        const elementNode = selectorMap?.get(index)

        if (!elementNode) {
            throw new Error('Element not found')
        }

        if (elementNode.tagName?.toLowerCase() !== 'select') {
            const msg = `Cannot select option: Element with index ${index} is a ${elementNode.tagName}, not a SELECT`
            throw new Error(msg)
        }

        const element = this.locateElement(elementNode)
        if (!(element instanceof HTMLSelectElement)) {
            throw new Error(`Dropdown element with index ${index} not found`)
        }

        const options = Array.from(element.options)
        const option = options.find((opt) => opt.text.trim() === text)

        if (!option) {
            const availableOptions = options
                .map((o) => o.text.trim())
                .join('", "')
            throw new Error(
                `Option "${text}" not found. Available options: "${availableOptions}"`
            )
        }

        const previousValue = element.value
        element.value = option.value

        if (previousValue !== option.value) {
            element.dispatchEvent(new Event('change', { bubbles: true }))
            element.dispatchEvent(new Event('input', { bubbles: true }))
        }

        return `Selected option "${text}" with value "${option.value}"`
    }

    locateElement(element: DOMElementNode): Element | null {
        const cssSelector = element.enhancedCssSelectorForElement(
            this._config.includeDynamicAttributes
        )

        try {
            let domElement = document.querySelector(cssSelector)

            if (!domElement && element.xpath) {
                const xpath = element.xpath.startsWith('/')
                    ? element.xpath
                    : `/${element.xpath}`
                const result = document.evaluate(
                    xpath,
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                )
                domElement = result.singleNodeValue as Element
            }

            return domElement
        } catch (error) {
            logger.error('Failed to locate element:', error)
            return null
        }
    }

    async inputTextElementNode(
        useVision: boolean,
        elementNode: DOMElementNode,
        text: string
    ): Promise<void> {
        const element = this.locateElement(elementNode)
        if (!element) {
            throw new Error(`Element: ${elementNode} not found`)
        }

        // Scroll into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })

        if (
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement
        ) {
            // Focus and clear
            element.focus()
            element.value = ''

            // Set new value
            element.value = text

            // Dispatch events
            element.dispatchEvent(new Event('input', { bubbles: true }))
            element.dispatchEvent(new Event('change', { bubbles: true }))
        } else if (
            element instanceof HTMLElement &&
            element.isContentEditable
        ) {
            element.focus()
            element.textContent = text
            element.dispatchEvent(new Event('input', { bubbles: true }))
        }
    }

    async clickElementNode(
        useVision: boolean,
        elementNode: DOMElementNode
    ): Promise<void> {
        const element = this.locateElement(elementNode)
        if (!element) {
            throw new Error(`Element: ${elementNode} not found`)
        }

        // Scroll into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })

        // Wait a bit for scroll to complete
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Click the element
        if (element instanceof HTMLElement) {
            element.click()
        } else {
            // Fallback to dispatching click event
            element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        }

        // Check for navigation
        await this._checkAndHandleNavigation()
    }

    getSelectorMap(): Map<number, DOMElementNode> {
        return this._cachedState?.selectorMap || new Map()
    }

    async getElementByIndex(index: number): Promise<Element | null> {
        const selectorMap = this.getSelectorMap()
        const element = selectorMap.get(index)
        if (!element) return null
        return this.locateElement(element)
    }

    getDomElementByIndex(index: number): DOMElementNode | null {
        const selectorMap = this.getSelectorMap()
        return selectorMap.get(index) || null
    }

    isFileUploader(
        elementNode: DOMElementNode,
        maxDepth = 3,
        currentDepth = 0
    ): boolean {
        if (currentDepth > maxDepth) {
            return false
        }

        if (elementNode.tagName === 'input') {
            const attributes = elementNode.attributes
            if (
                attributes['type']?.toLowerCase() === 'file' ||
                !!attributes['accept']
            ) {
                return true
            }
        }

        if (elementNode.children && currentDepth < maxDepth) {
            for (const child of elementNode.children) {
                if ('tagName' in child) {
                    if (
                        this.isFileUploader(
                            child as DOMElementNode,
                            maxDepth,
                            currentDepth + 1
                        )
                    ) {
                        return true
                    }
                }
            }
        }

        return false
    }

    async waitForPageLoadState(timeout?: number): Promise<void> {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve()
                return
            }

            const timer = setTimeout(() => {
                document.removeEventListener('readystatechange', handler)
                resolve()
            }, timeout || 8000)

            const handler = () => {
                if (document.readyState === 'complete') {
                    clearTimeout(timer)
                    document.removeEventListener('readystatechange', handler)
                    resolve()
                }
            }

            document.addEventListener('readystatechange', handler)
        })
    }

    async waitForPageAndFramesLoad(timeoutOverwrite?: number): Promise<void> {
        await this.waitForPageLoadState(timeoutOverwrite)
        await this._checkAndHandleNavigation()

        // Additional wait time as configured
        const minWaitTime =
            timeoutOverwrite || this._config.minimumWaitPageLoadTime
        await new Promise((resolve) => setTimeout(resolve, minWaitTime * 1000))
    }

    private async _checkAndHandleNavigation(): Promise<void> {
        const currentUrl = window.location.href
        if (
            !isUrlAllowed(
                currentUrl,
                this._config.allowedUrls,
                this._config.deniedUrls
            )
        ) {
            const errorMessage = `URL: ${currentUrl} is not allowed`
            logger.error(errorMessage)

            // Navigate to safe URL
            const safeUrl = this._config.homePageUrl || 'about:blank'
            window.location.href = safeUrl

            throw new URLNotAllowedError(errorMessage)
        }
    }
}
