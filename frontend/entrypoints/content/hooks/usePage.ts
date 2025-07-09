import { useState, useCallback, useRef, useEffect } from 'react';
import { PageState, PageConfig } from '../types/page';
import { removeHighlights, getClickableElementsFromDomTree, locateElement } from '../services/DomTreeService';
import { highlightElement } from '../utils/domUtils';
import { onMessage } from '@/entrypoints/background/types/messages';
import { getClickableElements, getClickableElementsHashes, hashDomElement } from '../services/DomService';

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
    updatePageState: () => void;
    waitForPageStable: (options?: { timeout?: number; stabilityDelay?: number }) => Promise<boolean>;
    getPageStateString: () => Promise<string>;
}

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
    const cachedStateClickableElementsHashes = useRef<Set<string>>(null);


    const updatePageState = useCallback(async () => {
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

            const updatedStateClickableElements = getClickableElements(root);

            let pageHasChanged = false;

            if (cachedStateClickableElementsHashes.current) {
                for (const domElement of updatedStateClickableElements) {
                    const hash = await hashDomElement(domElement);
                    domElement.isNew = !cachedStateClickableElementsHashes.current.has(hash);
                    if (domElement.isNew) {
                        pageHasChanged = true
                    }
                }
            } else {
                setPageState(newPageState);
            }
            cachedStateClickableElementsHashes.current = await getClickableElementsHashes(root)

            // Only update state if there are actual changes
            if (pageHasChanged) {
                console.log('[usePage] Page state changes detected, updating state');
                console.log(pageState?.domSnapshot?.selectorMap)
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
        const { timeout = 1000, stabilityDelay = 1000 } = options || {};

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
            await updatePageState();
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
    }, [updatePageState]);

    // Option 2: Create a separate function that gets fresh state
    const getPageStateString = useCallback(async (): Promise<string> => {
        try {
            // Force update first
            await updatePageState();

            // Get fresh DOM tree data directly (don't rely on React state)
            const { root } = await getClickableElementsFromDomTree();
            const result = root.clickableElementsToString();

            return result;
        } catch (error) {
            console.error('Error getting page state string:', error);
            return "";
        }
    }, [updatePageState]);

    return {
        // State
        pageState,
        isScanning,
        isWaitingForStability,

        // Actions
        updatePageState,
        waitForPageStable,

        // Getters
        getCurrentUrl,
        getCurrentTitle,
        getElementAtCoordinate,
        getPageStateString
    };
};