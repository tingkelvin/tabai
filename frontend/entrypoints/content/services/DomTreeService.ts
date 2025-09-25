import { buildDomTree } from '../scripts/buildDomTree';
import { DomTreeResult } from '../types/dom/DomTree';
import { DomSnapshot, ElementDomNode } from '../types/dom/DomNode';
import { constructDomTree } from '../utils/domUtils';

export interface ReadabilityResult {
    title: string;
    content: string;
    textContent: string;
    length: number;
    excerpt: string;
    byline: string;
    dir: string;
    siteName: string;
    lang: string;
    publishedTime: string;
}

/**
 * Get the clickable elements for the current page.
 * @param url - The URL of the page.
 * @param showHighlightElements - Whether to show the highlight elements.
 * @param focusElement - The element to focus on.
 * @param viewportExpansion - The viewport expansion to use.
 * @returns A DomSnapshot object containing the clickable elements for the current page.
 */
export async function getClickableElementsFromDomTree(
    showHighlightElements = false,
    focusElement = -1,
    viewportExpansion = 0,
    debugMode = false,
): Promise<DomSnapshot> {
    try {
        // Execute buildDomTree directly in the current context (content script)
        const result: DomTreeResult = buildDomTree({
            doHighlightElements: showHighlightElements,
            focusHighlightIndex: focusElement,
            viewportExpansion: viewportExpansion,
            debugMode: debugMode
        });
        
        if (!result || !result.rootId) {
            throw new Error('Failed to build DOM tree: No result returned or invalid structure');
        }

        const [root, selectorMap]: [ElementDomNode, Map<number, ElementDomNode>] = constructDomTree(result);
        return { root, selectorMap };
    } catch (error) {
        console.error('Error in getClickableElementsFromDomTree:', error);
        throw error;
    }
}

export async function removeHighlights(): Promise<void> {
    try {

        // Remove the highlight container and all its contents
        const container = document.getElementById('playwright-highlight-container');
        if (container) {
            container.remove();
        }

        // Remove highlight attributes from elements
        const highlightedElements = document.querySelectorAll('[browser-user-highlight-id^="playwright-highlight-"]');
        for (const el of Array.from(highlightedElements)) {
            el.removeAttribute('browser-user-highlight-id');
        }

    } catch (error) {
        console.error('Failed to remove highlights:', error);
    }
}

export async function locateElement(element: ElementDomNode): Promise<Element | null> {
    // Start with the target element and collect all parents
    const parents: ElementDomNode[] = [];
    let current = element;
    while (current.parent) {
        parents.push(current.parent);
        current = current.parent;
    }

    // Find current frame/window context
    let currentDocument: Document = document;
    let currentWindow: Window = window;

    // Process all iframe parents in sequence (in reverse order - top to bottom)
    const iframes = parents.reverse().filter(item => item.tagName === 'iframe');
    for (const parent of iframes) {
        const cssSelector = parent.enhancedCssSelectorForElement();
        const frameElement = currentDocument.querySelector(cssSelector) as HTMLIFrameElement;

        if (!frameElement) {
            console.log(`Could not find iframe with selector: ${cssSelector}`);
            return null;
        }

        try {
            const frameDocument = frameElement.contentDocument;
            const frameWindow = frameElement.contentWindow;

            if (!frameDocument || !frameWindow) {
                console.log(`Could not access frame content for selector: ${cssSelector}`);
                return null;
            }

            currentDocument = frameDocument;
            currentWindow = frameWindow;
            console.log('currentFrame changed', frameElement);
        } catch (error) {
            console.log(`Could not access iframe content: ${error}`);
            return null;
        }
    }

    const cssSelector = element.enhancedCssSelectorForElement();

    try {
        // Try CSS selector first
        let targetElement: Element | null = currentDocument.querySelector(cssSelector);

        // If CSS selector failed, try XPath
        if (!targetElement) {
            const xpath = element.xpath;
            if (xpath) {
                try {
                    console.log('Trying XPath selector:', xpath);
                    const fullXpath = xpath.startsWith('/') ? xpath : `/${xpath}`;
                    const xpathResult = currentDocument.evaluate(
                        fullXpath,
                        currentDocument,
                        null,
                        XPathResult.FIRST_ORDERED_NODE_TYPE,
                        null
                    );
                    targetElement = xpathResult.singleNodeValue as Element;
                } catch (xpathError) {
                    console.log('Failed to locate element using XPath:', xpathError);
                }
            }
        }

        // If element found, check visibility and scroll into view
        if (targetElement) {
            const style = currentWindow.getComputedStyle(targetElement);
            const isHidden = style.display === 'none' ||
                style.visibility === 'hidden' ||
                style.opacity === '0';

            if (!isHidden) {
                // scrollIntoViewIfNeeded(targetElement);
            }
            return targetElement;
        }

        console.log('Element not located');
    } catch (error) {
        console.log('Failed to locate element:', error);
    }

    return null;
}

export function scrollIntoViewIfNeeded(element: Element): void {
    const rect = element.getBoundingClientRect();
    const isInViewport = rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth;

    if (!isInViewport) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
        });
    }
}

