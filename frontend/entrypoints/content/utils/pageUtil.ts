import { DOMElementNode } from "../types/dom";
import { PageConfig } from "../types/page";

// utils/pageUtil.ts
export const getScrollInfo = (): [number, number] => {
    const scroll_y = window.scrollY;
    const viewport_height = window.innerHeight;
    const total_height = document.documentElement.scrollHeight;

    const pixels_above = scroll_y;
    const pixels_below = total_height - (scroll_y + viewport_height);

    return [pixels_above, pixels_below];
}

export function isUrlAllowed(url: string, allowList: string[], denyList: string[]): boolean {
    // Normalize and validate input
    const trimmedUrl = url.trim();
    if (trimmedUrl.length === 0) {
        return false;
    }

    const lowerCaseUrl = trimmedUrl.toLowerCase();

    // ALWAYS block dangerous/forbidden URLs, even if firewall is disabled
    const DANGEROUS_PREFIXES = [
        'https://chromewebstore.google.com', // scripts are not allowed to be injected into chrome web store
        'chrome-extension://',
        'chrome://',
        'javascript:',
        'data:',
        'file:',
        'vbscript:',
        'ws:',
        'wss:',
    ];

    if (DANGEROUS_PREFIXES.some(prefix => lowerCaseUrl.startsWith(prefix))) {
        return false;
    }

    // If firewall is disabled, allow all other URLs
    if (allowList.length === 0 && denyList.length === 0) {
        return true;
    }

    // Special case: Allow 'about:blank' explicitly
    if (trimmedUrl === 'about:blank') {
        return true;
    }

    try {
        const parsedUrl = new URL(trimmedUrl);

        // 1. Remove protocol prefix for further comparisons
        const urlWithoutProtocol = lowerCaseUrl.replace(/^https?:\/\//, '');

        // 2. First check full URL against deny list
        for (const deniedEntry of denyList) {
            if (urlWithoutProtocol === deniedEntry) {
                return false;
            }
        }

        // 3. Check full URL against allow list
        for (const allowedEntry of allowList) {
            if (urlWithoutProtocol === allowedEntry) {
                return true;
            }
        }

        // 4. Extract domain for domain-based checks
        let domain = parsedUrl.hostname.toLowerCase();

        // Remove port number if present
        const portIndex = domain.indexOf(':');
        if (portIndex > -1) {
            domain = domain.substring(0, portIndex);
        }

        // 5. Check domain against deny list
        for (const deniedEntry of denyList) {
            if (domain === deniedEntry || domain.endsWith(`.${deniedEntry}`)) {
                return false;
            }
        }

        // 6. Check domain against allow list
        for (const allowedEntry of allowList) {
            if (domain === allowedEntry || domain.endsWith(`.${allowedEntry}`)) {
                return true;
            }
        }

        // Default policy
        return allowList.length === 0;
    } catch (error) {
        // Invalid URL format - deny by default
        return false;
    }
}


// Option 1: Direct navigation (immediate navigation, page reloads)
async navigateTo(url: string): Promise < void> {
    console.log('navigateTo: Navigating to', url);

    if(!this._isUrlAllowed(url)) {
    throw new Error(`URL: ${url} is not allowed`);
}

// This will immediately navigate and unload the current page
window.location.href = url;
    // Code after this line will NOT execute!
}


// Page actions
export async function refreshPage(timeout = 10000): Promise<void> {
    try {
        const refreshPromise = new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => reject(new Error('Refresh timeout')), timeout);
            const handleLoad = () => {
                clearTimeout(timeoutId);
                window.removeEventListener('load', handleLoad);
                resolve();
            };
            window.addEventListener('load', handleLoad);
            window.location.reload();
        });

        await refreshPromise;
        console.log('Page refresh complete');
    } catch (error) {
        if (error instanceof Error && error.message.includes('timeout')) {
            console.warn('Refresh timeout, but page might still be usable:', error);
            return;
        }
        console.error('Page refresh failed:', error);
        throw error;
    }
}

export async function goBack(timeout = 10000): Promise<void> {
    if (!window.history.length || window.history.length <= 1) {
        throw new Error('No history to go back to');
    }

    try {
        const backPromise = new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => reject(new Error('Back navigation timeout')), timeout);
            const handlePopState = () => {
                clearTimeout(timeoutId);
                window.removeEventListener('popstate', handlePopState);
                resolve();
            };
            window.addEventListener('popstate', handlePopState);
            window.history.back();
        });

        await backPromise;
        console.log('Navigation back completed');
    } catch (error) {
        if (error instanceof Error && error.message.includes('timeout')) {
            console.warn('Back navigation timeout, but page might still be usable:', error);
            return;
        }
        console.error('Could not navigate back:', error);
        throw error;
    }
}

export async function goForward(timeout = 10000): Promise<void> {
    try {
        const forwardPromise = new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => reject(new Error('Forward navigation timeout')), timeout);
            const handlePopState = () => {
                clearTimeout(timeoutId);
                window.removeEventListener('popstate', handlePopState);
                resolve();
            };
            window.addEventListener('popstate', handlePopState);
            window.history.forward();
        });

        await forwardPromise;
        console.log('Navigation forward completed');
    } catch (error) {
        if (error instanceof Error && error.message.includes('timeout')) {
            console.warn('Forward navigation timeout, but page might still be usable:', error);
            return;
        }
        console.error('Could not navigate forward:', error);
        throw error;
    }
}

// Scroll actions
export function scrollDown(amount?: number): void {
    if (amount) {
        window.scrollBy(0, amount);
    } else {
        window.scrollBy(0, window.innerHeight);
    }
}

export function scrollUp(amount?: number): void {
    if (amount) {
        window.scrollBy(0, -amount);
    } else {
        window.scrollBy(0, -window.innerHeight);
    }
}

export function scrollToText(text: string): boolean {
    const textLower = text.toLowerCase();

    // Find elements containing the text
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
    );

    let node;
    while (node = walker.nextNode()) {
        const textContent = node.textContent?.toLowerCase();
        if (textContent?.includes(textLower)) {
            const element = node.parentElement;
            if (element && isVisible(element)) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return true;
            }
        }
    }

    // Fallback: Try XPath-like search
    const xpath = `//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${textLower}')]`;
    const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);

    if (result.singleNodeValue) {
        const element = result.singleNodeValue as Element;
        if (isVisible(element)) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return true;
        }
    }

    return false;
}

function isVisible(element: Element): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
}

// not tested
export async function scrollIntoViewIfNeeded(element: Element, timeout = 1000): Promise<void> {
    const startTime = Date.now();

    while (true) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);

        // Check if element has size and is visible
        if (rect.width === 0 || rect.height === 0 ||
            style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') {
            throw new Error('Element is not visible');
        }

        // Check if element is in viewport
        const isInViewport = rect.top >= 0 && rect.left >= 0 &&
            rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;

        if (isInViewport) break;

        // Scroll into view if not visible
        element.scrollIntoView({
            behavior: 'auto',
            block: 'center',
            inline: 'center',
        });

        // Check timeout
        if (Date.now() - startTime > timeout) {
            throw new Error('Timed out while trying to scroll element into view');
        }

        // Small delay before next check
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

// not tested
export function getDropdownOptions(
    index: number,
    selectorMap: Map<number, DOMElementNode>
): Array<{ index: number; text: string; value: string }> {
    const element = selectorMap?.get(index);

    if (!element) {
        throw new Error('Element not found');
    }

    const domElement = locateElement(element);

    if (!(domElement instanceof HTMLSelectElement)) {
        throw new Error('Element is not a select element');
    }

    const options = Array.from(domElement.options).map(option => ({
        index: option.index,
        text: option.text,
        value: option.value,
    }));

    if (!options.length) {
        throw new Error('No options found in dropdown');
    }

    return options;
}

function buildCssSelector(element: DOMElementNode): string {
    let selector = element.tagName || 'div';

    if (element.attributes.id) {
        selector += `#${element.attributes.id}`;
    }

    if (element.attributes.class) {
        const classes = element.attributes.class.split(' ').filter(cls => cls.trim());
        selector += classes.map(cls => `.${cls}`).join('');
    }

    // Add other unique attributes for better specificity
    if (element.attributes['data-testid']) {
        selector += `[data-testid="${element.attributes['data-testid']}"]`;
    }

    return selector;
}

export function locateElement(element: DOMElementNode): Element | null {
    // Get parent iframes
    const parents: DOMElementNode[] = [];
    let current = element;
    while (current.parent) {
        parents.push(current.parent);
        current = current.parent;
    }

    // Start with main document, traverse into iframes if needed
    let currentDocument: Document = document;
    const iframes = parents.reverse().filter(item => item.tagName === 'iframe');

    for (const parent of iframes) {
        const cssSelector = buildCssSelector(parent);
        const frameElement = currentDocument.querySelector(cssSelector) as HTMLIFrameElement;

        if (!frameElement?.contentDocument) {
            console.warn(`Could not find iframe with selector: ${cssSelector}`);
            return null;
        }

        currentDocument = frameElement.contentDocument;
    }

    // Try CSS selector first
    const cssSelector = buildCssSelector(element);
    let domElement = currentDocument.querySelector(cssSelector);

    // Fallback to XPath if CSS fails
    if (!domElement && element.xpath) {
        const xpath = element.xpath.startsWith('/') ? element.xpath : `/${element.xpath}`;
        const result = currentDocument.evaluate(xpath, currentDocument, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        domElement = result.singleNodeValue as Element;
    }

    // Scroll into view if found and visible
    if (domElement) {
        const style = window.getComputedStyle(domElement);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
            scrollIntoViewIfNeeded(domElement);
        }
    }

    return domElement;
}

export async function clickElementNode(elementNode: DOMElementNode): Promise<void> {
    const domElement = locateElement(elementNode);

    if (!domElement) {
        throw new Error(`Element not found: ${elementNode.tagName}`);
    }

    // Scroll into view
    await scrollIntoViewIfNeeded(domElement);

    try {
        // First attempt: Direct click
        domElement.click();

        // Wait for potential navigation/changes
        await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
        // Second attempt: Create and dispatch click event
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        domElement.dispatchEvent(clickEvent);
    }
}

export function isFileUploader(elementNode: DOMElementNode, maxDepth = 3, currentDepth = 0): boolean {
    if (currentDepth > maxDepth) {
        return false;
    }

    // Check current element
    if (elementNode.tagName === 'input') {
        // Check for file input attributes
        const attributes = elementNode.attributes;
        // biome-ignore lint/complexity/useLiteralKeys: <explanation>
        if (attributes['type']?.toLowerCase() === 'file' || !!attributes['accept']) {
            return true;
        }
    }

    // Recursively check children
    if (elementNode.children && currentDepth < maxDepth) {
        for (const child of elementNode.children) {
            if ('tagName' in child) {
                // DOMElementNode type guard
                if (isFileUploader(child as DOMElementNode, maxDepth, currentDepth + 1)) {
                    return true;
                }
            }
        }
    }

    return false;
}


