import { useState, useCallback, useRef, useEffect } from 'react';
import { PageState, PageConfig } from '../types/page';
import { removeHighlights, getClickableElementsFromDomTree, locateElement } from '../services/DomTreeService';
import { highlightElement } from '../utils/domUtils';

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

            // Update page state
            const newPageState: PageState = {
                url: getCurrentUrl(),
                title: getCurrentTitle(),
                domSnapshot: { root, selectorMap },
                timestamp: Date.now(),
                screenshot: null
            };

            setPageState(newPageState);

        } catch (error) {
            console.error('Error updating page state:', error);
        } finally {
            isUpdatingRef.current = false;
            setIsScanning(false);
        }
    }, []);

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

                    console.log(`[usePage] DOM changes detected (${significantMutations.length} mutations, ${mutationCount} total) - resetting stability timer`);

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