import { useState, useCallback, useRef, useEffect } from 'react';
import { PageState, PageConfig } from '../types/page';
import { constructDomTree } from '../utils/domUtils';
import { clickElementNode, getDropdownOptions, getScrollInfo, navigateTo, scrollDown, scrollToText } from '../utils/pageUtil';
import { buildDomTree } from '../scripts/buildDomTree';

import { DomTreeResult } from '../types/dom/DomTree';
import { ElementDomNode } from '../types/dom/DomNode';

interface UsePageHookReturn {
    // State
    pageState: PageState | null;
    isHighlighting: boolean;
    isScanning: boolean;

    // Actions
    scanAndHighlight: () => void;
    clearHighlights: () => void;
    toggleHighlight: () => void;
    updatePageState: () => void;

    // Getters
    getCurrentUrl: () => string;
    getCurrentTitle: () => string;
}

export const usePageHook = (config?: PageConfig): UsePageHookReturn => {
    const [pageState, setPageState] = useState<PageState | null>(null);
    const [isHighlighting, setIsHighlighting] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    // Keep track of highlight container
    const highlightContainerRef = useRef<HTMLElement | null>(null);

    const getCurrentUrl = useCallback(() => {
        return window.location.href || '';
    }, []);

    const getCurrentTitle = useCallback(() => {
        return document.title || '';
    }, []);

    const clearHighlights = useCallback(() => {
        // Remove highlight container
        const container = document.getElementById('playwright-highlight-container');
        if (container) {
            container.remove();
            highlightContainerRef.current = null;
        }
    }, []);

    const scanAndHighlight = useCallback(() => {
        setIsScanning(true);
        updatePageState()

    }, []);

    const toggleHighlight = useCallback(() => {
        if (isHighlighting) {
            clearHighlights();
            setIsHighlighting(false);
        } else {
            scanAndHighlight();
            setIsHighlighting(true);
        }
    }, [isHighlighting, clearHighlights, scanAndHighlight]);

    const getPageState = useCallback((compareCache = false) => {
        // Update page state without highlighting
        setIsScanning(true);

        let currnetPageState: PageState = null;
        try {
            console.log(buildDomTree())
            const result: DomTreeResult = buildDomTree();

            if (!result.rootId) throw new Error('Failed to build DOM tree');

            const [elementTree, selectorMap]: [ElementDomNode, Map<number, ElementDomNode>] = constructDomTree(result);

            // Update page state with the scan results
            if (result && result.rootId) {
                console.log("update")
                const [pixelsAbove, pixelsBelow] = getScrollInfo();
                currnetPageState = {
                    url: getCurrentUrl(),
                    title: getCurrentTitle(),
                    screenshot: null,
                    pixelsAbove: pixelsAbove,
                    pixelsBelow: pixelsBelow,
                    elementTree: elementTree,    // Root DOM element tree
                    selectorMap: selectorMap     // Map of highlight indices to elements
                });
}

if (!currnetPageState) throw Error("fail to get current page state")

if (compareCache) {
    if (
        this._cachedStateClickableElementsHashes &&
        this._cachedStateClickableElementsHashes.url === updatedState.url
    ) {
        // Get clickable elements from the updated state
        const updatedStateClickableElements = ClickableElementProcessor.getClickableElements(updatedState.elementTree);

        // Mark elements as new if they weren't in the previous state
        for (const domElement of updatedStateClickableElements) {
            const hash = await ClickableElementProcessor.hashDomElement(domElement);
            domElement.isNew = !this._cachedStateClickableElementsHashes.hashes.has(hash);
        }
    }

    // In any case, we need to cache the new hashes
    const newHashes = await ClickableElementProcessor.getClickableElementsHashes(updatedState.elementTree);
    this._cachedStateClickableElementsHashes = new CachedStateClickableElementsHashes(updatedState.url, newHashes);
}


            // Track the highlight container
            // const container = document.getElementById('playwright-highlight-container');
            // if (container) {
            //     highlightContainerRef.current = container;
            // }

        } catch (error) {
    console.error('Error scanning DOM:', error);
} finally {
    setIsScanning(false);
}
    }, []);

useEffect(() => {
    console.log(pageState)
}, [pageState]);

// Cleanup on unmount
useEffect(() => {
    return () => {
        clearHighlights();
    };
}, [clearHighlights]);

return {
    // State
    pageState,
    isHighlighting,
    isScanning,

    // Actions
    scanAndHighlight,
    clearHighlights,
    toggleHighlight,
    updatePageState,

    // Getters
    getCurrentUrl,
    getCurrentTitle,
};
};