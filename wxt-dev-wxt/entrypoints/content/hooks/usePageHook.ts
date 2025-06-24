import { useState, useCallback, useRef, useEffect } from 'react';
import { buildDomTree } from '../utils/buildDomTree';
import { PageState, PageConfig } from '../types/page';
import { BuildDomTreeResult, DOMElementNode } from '../types/dom';
import { constructDomTree } from '../utils/domUtils';
import { clickElementNode, getDropdownOptions, getScrollInfo, navigateTo, scrollDown, scrollToText } from '../utils/pageUtil';

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

    const updatePageState = useCallback(() => {
        // Update page state without highlighting
        setIsScanning(true);
        try {
            const result: BuildDomTreeResult = buildDomTree({
                showHighlightElements: true,
                debugMode: true
            });
            const [elementTree, selectorMap]: [DOMElementNode, Map<number, DOMElementNode>] = constructDomTree(result);

            // Update page state with the scan results
            if (result && result.rootId) {
                console.log("update")
                const [pixelsAbove, pixelsBelow] = getScrollInfo();
                setPageState({
                    url: getCurrentUrl(),
                    title: getCurrentTitle(),
                    screenshot: null,
                    pixelsAbove: pixelsAbove,
                    pixelsBelow: pixelsBelow,
                    elementTree: elementTree,    // Root DOM element tree
                    selectorMap: selectorMap     // Map of highlight indices to elements
                });
            }


            // Track the highlight container
            const container = document.getElementById('playwright-highlight-container');
            if (container) {
                highlightContainerRef.current = container;
            }

        } catch (error) {
            console.error('Error scanning DOM:', error);
        } finally {
            setIsScanning(false);
        }
    }, []);

    // Cleanup on unmount
    const hasClicked = useRef(false);

    useEffect(() => {
        if (pageState?.selectorMap?.has(0) && !hasClicked.current) {
            console.log("clicked")
            hasClicked.current = true;
            const element = pageState.selectorMap.get(0)!;
            clickElementNode(element);
        }
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