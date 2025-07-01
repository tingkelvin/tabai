import { useState, useCallback, useRef, useEffect } from 'react';
import { PageState, PageConfig } from '../types/page';
import { removeHighlights, getClickableElementsFromDomTree, locateElement } from '../services/DomTreeService';
import { highlightElement } from '../utils/domUtils';

interface UsePageReturn {
    // State
    pageState: PageState | null;
    isScanning: boolean;

    // Getters
    getCurrentUrl: () => string;
    getCurrentTitle: () => string;
    getElementAtCoordinate: (x: number, y: number) => Promise<void>;

    // Mutation observer controls
    stopMutationObserver: () => void;
    startMutationObserver: () => void;
    withMutationPaused: <T>(callback: () => T | Promise<T>) => Promise<T>;
}

export const usePage = (config?: PageConfig): UsePageReturn => {
    const [pageState, setPageState] = useState<PageState | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    // Refs for tracking page stability and debouncing
    const mutationObserverRef = useRef<MutationObserver | null>(null);
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasInitialScanRef = useRef<boolean>(false);
    const isUpdatingRef = useRef<boolean>(false);

    // Debounced update function
    const scheduleUpdate = useCallback(() => {
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }

        updateTimeoutRef.current = setTimeout(() => {
            updateState();
        }, 300);
    }, []);

    const updateState = useCallback(async () => {
        if (isUpdatingRef.current) {
            return;
        }

        isUpdatingRef.current = true;
        setIsScanning(true);
        removeHighlights();

        // Stop observing during update
        if (mutationObserverRef.current) {
            mutationObserverRef.current.disconnect();
        }

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
            // for (const [highlightIndex, node] of selectorMap.entries()) {
            //     const ele: Element | null = await locateElement(node);
            //     if (ele) highlightElement(ele, highlightIndex);
            // }
            // console.log(selectorMap)
            // console.log(root.clickableElementsToString())

        } catch (error) {
            console.error('Error updating page state:', error);
        } finally {
            isUpdatingRef.current = false;
            setIsScanning(false);

            // Restart observing after update
            setupDomMonitoring();
        }
    }, []);

    // Setup DOM monitoring
    const setupDomMonitoring = useCallback(() => {
        if (mutationObserverRef.current) {
            mutationObserverRef.current.disconnect();
        }

        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;

            for (const mutation of mutations) {
                // Check for relevant changes
                if (mutation.type === 'childList') {
                    // New nodes added or removed
                    if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
                        // Check if any added/removed nodes are elements (not just text nodes)
                        const hasElementChanges = Array.from(mutation.addedNodes).some(node => node.nodeType === Node.ELEMENT_NODE) ||
                            Array.from(mutation.removedNodes).some(node => node.nodeType === Node.ELEMENT_NODE);

                        if (hasElementChanges) {
                            shouldUpdate = true;
                            break;
                        }
                    }
                } else if (mutation.type === 'attributes') {
                    // Attribute changes that might affect clickability
                    const relevantAttributes = ['class', 'id', 'style', 'href', 'onclick', 'disabled', 'hidden'];
                    if (relevantAttributes.includes(mutation.attributeName || '')) {
                        shouldUpdate = true;
                        break;
                    }
                }
            }

            if (shouldUpdate) {
                scheduleUpdate();
            }
        });

        // Configure observer to watch for relevant changes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'id', 'style', 'href', 'onclick', 'disabled', 'hidden']
        });

        mutationObserverRef.current = observer;
    }, [scheduleUpdate]);

    // Mutation observer control methods
    const stopMutationObserver = useCallback(() => {
        if (mutationObserverRef.current) {
            mutationObserverRef.current.disconnect();
        }
    }, []);

    const startMutationObserver = useCallback(() => {
        setupDomMonitoring();
    }, [setupDomMonitoring]);

    // Utility method to run code with mutation observer paused
    const withMutationPaused = useCallback(async <T>(callback: () => T | Promise<T>): Promise<T> => {
        stopMutationObserver();
        try {
            const result = await callback();
            return result;
        } finally {
            // Small delay to ensure DOM changes are complete before restarting
            setTimeout(() => {
                startMutationObserver();
            }, 50);
        }
    }, [stopMutationObserver, startMutationObserver]);

    const getCurrentUrl = useCallback((): string => {
        return window.location.href;
    }, []);

    const getCurrentTitle = useCallback((): string => {
        return document.title;
    }, []);

    const getElementAtCoordinate = useCallback(async (x: number, y: number) => {
        if (!pageState?.domSnapshot?.selectorMap) return;

        for (const [highlightIndex, node] of pageState.domSnapshot.selectorMap.entries()) {
            const element = await locateElement(node);
            if (element) {
                const rect = element.getBoundingClientRect();
                if (x >= rect.left && x <= rect.right &&
                    y >= rect.top && y <= rect.bottom) {
                    highlightElement(highlightIndex, element)
                }
            }
        }
    }, [pageState]);

    // Perform initial scan and setup monitoring
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (hasInitialScanRef.current) {
                return;
            }

            hasInitialScanRef.current = true;
            await updateState();
            setupDomMonitoring();
        }, 500);

        return () => {
            clearTimeout(timer);
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
            if (mutationObserverRef.current) {
                mutationObserverRef.current.disconnect();
            }
        };
    }, [updateState, setupDomMonitoring]);

    // Handle URL changes (for SPAs)
    useEffect(() => {
        const handlePopState = () => {
            scheduleUpdate();
        };

        window.addEventListener('popstate', handlePopState);

        // Also monitor pushState/replaceState for SPA navigation
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function (...args) {
            originalPushState.apply(history, args);
            scheduleUpdate();
        };

        history.replaceState = function (...args) {
            originalReplaceState.apply(history, args);
            scheduleUpdate();
        };

        return () => {
            window.removeEventListener('popstate', handlePopState);
            history.pushState = originalPushState;
            history.replaceState = originalReplaceState;
        };
    }, [scheduleUpdate]);

    return {
        // State
        pageState,
        isScanning,

        // Getters
        getCurrentUrl,
        getCurrentTitle,
        getElementAtCoordinate,

        // Mutation observer controls
        stopMutationObserver,
        startMutationObserver,
        withMutationPaused
    };
};