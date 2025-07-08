import { useState, useCallback, useRef, useEffect } from 'react';
import { PageState, PageConfig } from '../types/page';
import { removeHighlights, getClickableElementsFromDomTree, locateElement } from '../services/DomTreeService';
import { highlightElement } from '../utils/domUtils';
import { onMessage } from '@/entrypoints/background/types/messages';

interface UsePageReturn {
    // State
    pageState: PageState | null;
    isScanning: boolean;
    isWaitingForStability: boolean;

    // Getters
    getCurrentUrl: () => string;
    getCurrentTitle: () => string;
    getElementAtCoordinate: (x: number, y: number) => Promise<void>;

    // Actions
    updateState: () => void;
    waitForPageStable: (options?: { timeout?: number; stabilityDelay?: number }) => Promise<boolean>;
}

// Helper function to deep compare page states
const hasPageStateChanged = (oldState: PageState | null, newState: PageState): boolean => {
    if (!oldState) return true;

    // Check basic properties
    if (oldState.url !== newState.url || oldState.title !== newState.title) {
        return true;
    }

    // Check DOM snapshot changes
    if (!oldState.domSnapshot || !newState.domSnapshot) {
        return oldState.domSnapshot !== newState.domSnapshot;
    }

    // Compare DOM tree structure (you might want to implement a more sophisticated comparison)
    const oldDomString = oldState.domSnapshot.root.clickableElementsToString();
    const newDomString = newState.domSnapshot.root.clickableElementsToString();

    return oldDomString !== newDomString;
};

export const usePage = (config?: PageConfig): UsePageReturn => {
    const [pageState, setPageState] = useState<PageState | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isWaitingForStability, setIsWaitingForStability] = useState(false);

    // Refs for tracking page stability and debouncing
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasInitialScanRef = useRef<boolean>(false);
    const isUpdatingRef = useRef<boolean>(false);
    const lastUpdateRef = useRef<number>(0);
    const mutationObserverRef = useRef<MutationObserver | null>(null);
    const stabilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const updateState = useCallback(async () => {
        if (isUpdatingRef.current) {
            return;
        }

        isUpdatingRef.current = true;
        setIsScanning(true);
        removeHighlights();
        lastUpdateRef.current = Date.now();
        await waitForPageStable();

        try {
            // Get clickable elements from DOM tree
            const { root, selectorMap } = await getClickableElementsFromDomTree();

            // Create new page state
            const newPageState: PageState = {
                url: getCurrentUrl(),
                title: getCurrentTitle(),
                domSnapshot: { root, selectorMap },
                timestamp: Date.now(),
                screenshot: null
            };

            // Only update state if there are actual changes
            if (hasPageStateChanged(pageState, newPageState)) {
                console.log('[usePage] Page state changes detected, updating state');
                setPageState(newPageState);
            } else {
                console.log('[usePage] No changes detected, skipping state update');
            }

        } catch (error) {
            console.error('Error updating page state:', error);
        } finally {
            isUpdatingRef.current = false;
            setIsScanning(false);
        }
    }, [pageState]); // Add pageState as dependency since we're comparing against it

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

    const waitForPageStable = useCallback(async (options?: {
        timeout?: number;
        stabilityDelay?: number
    }): Promise<boolean> => {
        const { timeout = 10000, stabilityDelay = 1000 } = options || {};

        console.log(`[usePage] Starting page stability check - timeout: ${timeout}ms, stabilityDelay: ${stabilityDelay}ms`);

        return new Promise((resolve) => {
            setIsWaitingForStability(true);

            let isStable = false;
            let lastMutationTime = Date.now();
            let mutationCount = 0;

            // Clear any existing timeouts
            if (stabilityTimeoutRef.current) {
                clearTimeout(stabilityTimeoutRef.current);
            }

            // Disconnect existing observer
            if (mutationObserverRef.current) {
                mutationObserverRef.current.disconnect();
            }

            // Set up mutation observer to detect DOM changes
            mutationObserverRef.current = new MutationObserver((mutations) => {
                // Filter out insignificant mutations
                const significantMutations = mutations.filter(mutation => {
                    // Ignore attribute changes for certain attributes
                    if (mutation.type === 'attributes') {
                        const ignoredAttributes = ['class', 'style', 'data-highlighted'];
                        return !ignoredAttributes.includes(mutation.attributeName || '');
                    }

                    // Ignore text changes in script tags
                    if (mutation.type === 'childList' && mutation.target.nodeName === 'SCRIPT') {
                        return false;
                    }

                    return true;
                });

                if (significantMutations.length > 0) {
                    mutationCount += significantMutations.length;
                    lastMutationTime = Date.now();

                    // console.log(`[usePage] DOM changes detected (${significantMutations.length} mutations, ${mutationCount} total) - resetting stability timer`);

                    // Clear existing stability timeout
                    if (stabilityTimeoutRef.current) {
                        clearTimeout(stabilityTimeoutRef.current);
                    }

                    // Set new stability timeout
                    stabilityTimeoutRef.current = setTimeout(() => {
                        isStable = true;
                        console.log(`[usePage] Page stable after ${mutationCount} mutations - resolving as stable`);
                        cleanup();
                        resolve(true);
                    }, stabilityDelay);
                }
            });

            // Start observing DOM changes
            mutationObserverRef.current.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeOldValue: true,
                characterData: true,
                characterDataOldValue: true
            });

            console.log(`[usePage] MutationObserver started - watching for DOM changes`);

            // Set initial stability timeout
            stabilityTimeoutRef.current = setTimeout(() => {
                isStable = true;
                console.log(`[usePage] Page stable from start (no changes detected) - resolving as stable`);
                cleanup();
                resolve(true);
            }, stabilityDelay);

            // Set overall timeout
            const timeoutId = setTimeout(() => {
                if (!isStable) {
                    console.log(`[usePage] Page stability timeout reached after ${timeout}ms (${mutationCount} mutations detected) - resolving as unstable`);
                    cleanup();
                    resolve(false);
                }
            }, timeout);

            const cleanup = () => {
                console.log(`[usePage] Cleaning up page stability monitoring`);
                setIsWaitingForStability(false);
                clearTimeout(timeoutId);

                if (stabilityTimeoutRef.current) {
                    clearTimeout(stabilityTimeoutRef.current);
                    stabilityTimeoutRef.current = null;
                }

                if (mutationObserverRef.current) {
                    mutationObserverRef.current.disconnect();
                    mutationObserverRef.current = null;
                }
            };
        });
    }, []);

    // Perform initial scan and setup monitoring
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (hasInitialScanRef.current) {
                return;
            }
            hasInitialScanRef.current = true;
            await updateState();
        }, 500);

        return () => {
            clearTimeout(timer);
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
            if (stabilityTimeoutRef.current) {
                clearTimeout(stabilityTimeoutRef.current);
            }
            if (mutationObserverRef.current) {
                mutationObserverRef.current.disconnect();
            }
        };
    }, [updateState]);

    // Option 2: Create a separate function that gets fresh state
    const getPageStateString = useCallback(async (): Promise<string> => {
        try {
            // Force update first
            await updateState();

            // Get fresh DOM tree data directly (don't rely on React state)
            const { root } = await getClickableElementsFromDomTree();
            const result = root.clickableElementsToString();

            return result;
        } catch (error) {
            console.error('Error getting page state string:', error);
            return "";
        }
    }, [updateState]);

    useEffect(() => {
        onMessage('getPageStateAsString', getPageStateString);
    }, []);

    return {
        // State
        pageState,
        isScanning,
        isWaitingForStability,

        // Actions
        updateState,
        waitForPageStable,

        // Getters
        getCurrentUrl,
        getCurrentTitle,
        getElementAtCoordinate,
    };
};