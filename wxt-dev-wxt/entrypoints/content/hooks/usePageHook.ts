import { useState, useCallback, useRef, useEffect } from 'react';
import { PageState, PageConfig } from '../types/page';
import { removeHighlights, getClickableElementsFromDomTree, locateElement } from '../services/DomTreeService';

import { DomTreeResult } from '../types/dom/DomTree';
import { DomSnapshot, ElementDomNode } from '../types/dom/DomNode';
import { highlightElement } from '../utils/domUtils';

interface UsePageHookReturn {
    // State
    pageState: PageState | null;
    isHighlighting: boolean;
    isScanning: boolean;

    // Actions
    scanAndHighlight: () => void;
    clearHighlights: () => void;
    toggleHighlight: () => void;

    // Getters
    getCurrentUrl: () => string;
    getCurrentTitle: () => string;
    getElementAtCoordinate: (x: number, y: number) => Promise<void>
}

export const usePageHook = (config?: PageConfig): UsePageHookReturn => {
    const [pageState, setPageState] = useState<PageState | null>(null);
    const [isHighlighting, setIsHighlighting] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    // Refs for tracking page stability and debouncing
    const mutationObserverRef = useRef<MutationObserver | null>(null);
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasInitialScanRef = useRef<boolean>(false);
    const isUpdatingRef = useRef<boolean>(false);

    // Initialize page tracking
    const initializePageTracking = useCallback((): void => {
        console.log('initializePageTracking started');

        mutationObserverRef.current = new MutationObserver((mutations) => {
            // Filter out highlight-related mutations
            const significantMutations = mutations.filter(mutation => {
                const target = mutation.target as Element;

                // Skip mutations on highlight elements
                if (target.closest('[data-highlight-index]') ||
                    target.hasAttribute('data-highlight-index')) {
                    return false;
                }

                // For childList mutations, check if added/removed nodes are highlights
                if (mutation.type === 'childList') {
                    const addedHighlights = Array.from(mutation.addedNodes).some(node =>
                        node instanceof Element &&
                        (node.hasAttribute('data-highlight-index') || node.querySelector('[data-highlight-index]'))
                    );
                    const removedHighlights = Array.from(mutation.removedNodes).some(node =>
                        node instanceof Element &&
                        (node.hasAttribute('data-highlight-index') || node.querySelector('[data-highlight-index]'))
                    );

                    if (addedHighlights || removedHighlights) {
                        return false;
                    }
                }

                // For attribute changes, ignore highlight-related attributes
                if (mutation.type === 'attributes') {
                    const attr = mutation.attributeName;
                    if (attr === 'data-highlight-index' ||
                        (attr === 'style' && target.hasAttribute('data-highlight-index'))) {
                        return false;
                    }
                    // Skip other style/class changes that are likely animations
                    return attr !== 'style' && attr !== 'class';
                }

                return true;
            });

            if (significantMutations.length > 0) {
                console.log('MutationObserver: Significant DOM changes detected, scheduling update');
                scheduleStateUpdate();
            }
        });

        // Start observing when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startMutationObserver);
        } else {
            startMutationObserver();
        }
    }, []);

    const startMutationObserver = useCallback((): void => {
        console.log('startMutationObserver called');
        const target = document.body || document.documentElement;

        if (target && mutationObserverRef.current) {
            mutationObserverRef.current.observe(target, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'id', 'style', 'hidden', 'disabled']
            });
            console.log('startMutationObserver: Observer started successfully');
        }
    }, []);

    // Debounced state update scheduler
    const scheduleStateUpdate = useCallback(() => {
        if (isUpdatingRef.current) {
            console.log('Update already in progress, skipping');
            return;
        }

        // Clear existing timeout
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }

        // Schedule new update
        updateTimeoutRef.current = setTimeout(() => {
            updateState();
        }, 500); // 500ms debounce
    }, []);

    const updateState = useCallback(async () => {
        if (isUpdatingRef.current) {
            console.log('Update already in progress, skipping');
            return;
        }

        console.log('Updating page state...');
        isUpdatingRef.current = true;
        setIsScanning(true);

        try {
            // Get clickable elements from DOM tree
            const { root, selectorMap } = await getClickableElementsFromDomTree();

            // Update page state
            const newPageState: PageState = {
                url: getCurrentUrl(),
                title: getCurrentTitle(),
                domSnapshot: { root, selectorMap },
                timestamp: Date.now(),
                screenshot: null
            };

            setPageState(newPageState);

            // Apply highlights if currently highlighting
            if (isHighlighting) {
                for (const [highlightIndex, node] of selectorMap.entries()) {
                    const ele: Element | null = await locateElement(node);
                    if (ele) highlightElement(ele, highlightIndex);
                }
            }

            console.log('Page state updated successfully');
        } catch (error) {
            console.error('Error updating page state:', error);
        } finally {
            isUpdatingRef.current = false;
            setIsScanning(false);
        }
    }, [isHighlighting]);

    // Perform initial scan
    const performInitialScan = useCallback(async () => {
        if (hasInitialScanRef.current) {
            console.log('Initial scan already performed, skipping');
            return;
        }

        console.log('Starting initial scan...');
        hasInitialScanRef.current = true;
        await updateState();
    }, [updateState]);

    // Hook actions
    const scanAndHighlight = useCallback(async () => {
        console.log('Scanning and highlighting page elements');

        if (!pageState) {
            await updateState();
        }

        if (pageState?.domSnapshot.selectorMap) {
            for (const [highlightIndex, node] of pageState.domSnapshot.selectorMap.entries()) {
                const ele: Element | null = await locateElement(node);
                if (ele) highlightElement(ele, highlightIndex);
            }
        }

        setIsHighlighting(true);
    }, [pageState, updateState]);

    const clearHighlights = useCallback(() => {
        setIsHighlighting(false);
        removeHighlights();
        console.log('Clearing highlights');
    }, []);

    const toggleHighlight = useCallback(() => {
        if (isHighlighting) {
            clearHighlights();
        } else {
            scanAndHighlight();
        }
    }, [isHighlighting, clearHighlights, scanAndHighlight]);

    const getCurrentUrl = useCallback((): string => {
        return window.location.href;
    }, []);

    const getCurrentTitle = useCallback((): string => {
        return document.title;
    }, []);

    // Initialize page tracking on mount
    useEffect(() => {
        initializePageTracking();

        // Cleanup on unmount
        return () => {
            if (mutationObserverRef.current) {
                mutationObserverRef.current.disconnect();
                mutationObserverRef.current = null;
            }
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
        };
    }, [initializePageTracking]);

    const getElementAtCoordinate = useCallback(async (x: number, y: number) => {
        if (!pageState?.domSnapshot?.selectorMap) return;

        for (const [highlightIndex, node] of pageState.domSnapshot.selectorMap.entries()) {
            const element = await locateElement(node);
            if (element) {
                const rect = element.getBoundingClientRect();
                if (x >= rect.left && x <= rect.right &&
                    y >= rect.top && y <= rect.bottom) {
                    highlightElement(element, highlightIndex)
                }
            }
        }
    }, [pageState]);

    // Perform initial scan when page tracking is set up
    useEffect(() => {
        const timer = setTimeout(() => {
            performInitialScan();
        }, 500);

        return () => clearTimeout(timer);
    }, [performInitialScan]);

    return {
        // State
        pageState,
        isHighlighting,
        isScanning,

        // Actions
        scanAndHighlight,
        clearHighlights,
        toggleHighlight,

        // Getters
        getCurrentUrl,
        getCurrentTitle,
        getElementAtCoordinate
    };
};