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
    showHighlightElements = true,
    focusElement = -1,
    viewportExpansion = 0,
    debugMode = false,
): Promise<DomSnapshot> {
    // If URL is provided and it's about:blank, return a minimal DOM tree
    const result: DomTreeResult = buildDomTree();
    if (!result.rootId) throw new Error('Failed to build DOM tree');

    const [root, selectorMap]: [ElementDomNode, Map<number, ElementDomNode>] = constructDomTree(result);
    return { root, selectorMap };
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

