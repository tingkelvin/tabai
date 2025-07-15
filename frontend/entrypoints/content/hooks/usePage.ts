import { useState, useCallback, useRef, useEffect } from 'react';
import { PageState, defaultPageState } from '../types/page';
import { removeHighlights, getClickableElementsFromDomTree, locateElement } from '../services/DomTreeService';
import { highlightElement } from '../utils/domUtils';
import { onMessage } from '@/entrypoints/background/types/messages';
import { getClickableElements, getClickableElementsHashes, hashDomElement } from '../services/DomService';

interface UsePageReturn {
    isWaitingForStability: boolean;

    // Getters
    getCurrentUrl: () => string;
    getCurrentTitle: () => string;
    getElementAtCoordinate: (x: number, y: number) => Promise<void>;

    // Actions
    updateAndGetPageState: () => Promise<{ pageState: PageState, isNew: boolean }>;
    waitForPageStable: (options?: { timeout?: number; stabilityDelay?: number }) => Promise<boolean>;
}

interface UsePageConfig {
    onPageChanged?: (pageState: PageState) => Promise<void>;
}

export const usePage = (config?: UsePageConfig): UsePageReturn => {
    const pageStateRef = useRef<PageState>(defaultPageState);
    const [isWaitingForStability, setIsWaitingForStability] = useState(false);

    // Refs for tracking page stability and debouncing
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasInitialScanRef = useRef<boolean>(false);
    const isUpdatingRef = useRef<boolean>(false);
    const lastUpdateRef = useRef<number>(0);
    const mutationObserverRef = useRef<MutationObserver | null>(null);
    const stabilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const cachePageStateAsString = useRef<string>("");

    const updateAndGetPageState = useCallback(async (): Promise<{ pageState: PageState, isNew: boolean }> => {
        isUpdatingRef.current = true;
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

            const updatedStateAsString = root.clickableElementsToString();

            let pageHasChanged = false;

            // Check if this is the first run (no cached state)
            if (!cachePageStateAsString.current) {
                pageHasChanged = true;
                console.log('[usePage] First page state capture - marking as new');
            } else if (updatedStateAsString !== cachePageStateAsString.current) {
                pageHasChanged = true;
                console.log('[usePage] Page state changes detected');
            }

            console.log('Previous state:', cachePageStateAsString.current);
            console.log('Current state:', updatedStateAsString);

            // Update the cached state
            cachePageStateAsString.current = updatedStateAsString;

            // Only update state if there are actual changes
            if (pageHasChanged) {
                console.log('[usePage] Updating page state');

                pageStateRef.current = newPageState;

                // Call the onPageChanged callback if provided
                if (config?.onPageChanged) {
                    await config.onPageChanged(newPageState);
                }

                return { pageState: newPageState, isNew: true };
            } else {
                console.log('[usePage] No changes detected, skipping state update');
                return { pageState: pageStateRef.current, isNew: false };
            }

        } catch (error) {
            console.error('Error updating page state:', error);
            return { pageState: pageStateRef.current, isNew: false };
        } finally {
            isUpdatingRef.current = false;
        }
    }, [config?.onPageChanged]);

    const getCurrentUrl = useCallback((): string => {
        return window.location.href;
    }, []);

    const getCurrentTitle = useCallback((): string => {
        return document.title;
    }, []);

    const getElementAtCoordinate = useCallback(async (x: number, y: number) => {
        if (!pageStateRef.current?.domSnapshot?.selectorMap) return;

        for (const [highlightIndex, node] of pageStateRef.current.domSnapshot.selectorMap.entries()) {
            const element = await locateElement(node);
            if (element) {
                const rect = element.getBoundingClientRect();
                if (x >= rect.left && x <= rect.right &&
                    y >= rect.top && y <= rect.bottom) {
                    highlightElement(highlightIndex, element)
                }
            }
        }
    }, [pageStateRef]);

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

    return {

        isWaitingForStability,

        // updateAndGetPageState
        updateAndGetPageState,
        waitForPageStable,

        // Getters
        getCurrentUrl,
        getCurrentTitle,
        getElementAtCoordinate,
    };
};