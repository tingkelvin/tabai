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
    const lastUpdateRef = useRef<number>(0);

    // Debounced update function with proper debouncing
    const scheduleUpdate = useCallback(() => {
        console.log("scheduling update...");

        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }

        // Increase debounce time and add minimum interval between updates
        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateRef.current;
        const minInterval = 1000; // Minimum 1 second between updates

        if (timeSinceLastUpdate < minInterval) {
            // If we updated recently, wait longer
            updateTimeoutRef.current = setTimeout(() => {
                updateState();
            }, minInterval - timeSinceLastUpdate + 500);
        } else {
            // Normal debounce
            updateTimeoutRef.current = setTimeout(() => {
                updateState();
            }, 500); // Increased from 300ms
        }
    }, []);

    const updateState = useCallback(async () => {
        if (isUpdatingRef.current) {
            return;
        }

        isUpdatingRef.current = true;
        setIsScanning(true);
        removeHighlights();
        lastUpdateRef.current = Date.now();

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

            console.log(root.clickableElementsToString())
            console.log(selectorMap)

            setPageState(newPageState);

        } catch (error) {
            console.error('Error updating page state:', error);
        } finally {
            isUpdatingRef.current = false;
            setIsScanning(false);

            // Restart observing after update with delay
            setTimeout(() => {
                setupDomMonitoring();
            }, 100);
        }
    }, []);

    // Helper function to check if a node is likely to be clickable or affect clickability
    const isRelevantNode = useCallback((node: Node): boolean => {
        if (node.nodeType !== Node.ELEMENT_NODE) return false;

        const element = node as Element;
        const tagName = element.tagName.toLowerCase();

        // Common clickable elements
        const clickableTags = new Set([
            'a', 'button', 'input', 'select', 'textarea', 'label',
            'option', 'summary', 'details', '[role="button"]'
        ]);

        if (clickableTags.has(tagName)) return true;

        // Elements with click handlers or certain attributes
        if (element.hasAttribute('onclick') ||
            element.hasAttribute('role') ||
            element.hasAttribute('tabindex') ||
            element.classList.contains('btn') ||
            element.classList.contains('button') ||
            element.classList.contains('clickable') ||
            element.classList.contains('link')) {
            return true;
        }

        return false;
    }, []);

    // Helper to check if mutation affects clickable elements
    const isMutationRelevant = useCallback((mutation: MutationRecord): boolean => {
        if (mutation.type === 'childList') {
            // Check if any added/removed nodes are clickable or contain clickable elements
            const allNodes = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)];

            for (const node of allNodes) {
                if (isRelevantNode(node)) return true;

                // Check if the node contains clickable elements
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const element = node as Element;
                    const clickableDescendants = element.querySelectorAll(
                        'a, button, input, select, textarea, [onclick], [role="button"], .btn, .button, .clickable'
                    );
                    if (clickableDescendants.length > 0) return true;
                }
            }
            return false;
        }

        if (mutation.type === 'attributes') {
            const target = mutation.target as Element;

            // Only care about attribute changes on potentially clickable elements
            if (!isRelevantNode(target)) {
                // Also check if it's a parent of clickable elements
                const hasClickableChildren = target.querySelectorAll(
                    'a, button, input, select, textarea, [onclick], [role="button"]'
                ).length > 0;
                if (!hasClickableChildren) return false;
            }

            // Only care about attributes that actually affect clickability
            const criticalAttributes = new Set([
                'href', 'onclick', 'disabled', 'hidden', 'style', 'class', 'role', 'tabindex'
            ]);

            const attrName = mutation.attributeName?.toLowerCase();
            if (!attrName || !criticalAttributes.has(attrName)) return false;

            // For style changes, be more specific
            if (attrName === 'style') {
                const element = mutation.target as HTMLElement;
                const style = element.style;
                // Only care about visibility-related style changes
                return style.display === 'none' ||
                    style.visibility === 'hidden' ||
                    style.pointerEvents === 'none' ||
                    style.opacity === '0';
            }

            return true;
        }

        return false;
    }, [isRelevantNode]);

    // Setup DOM monitoring with better filtering
    const setupDomMonitoring = useCallback(() => {
        if (mutationObserverRef.current) {
            mutationObserverRef.current.disconnect();
        }

        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;

            for (const mutation of mutations) {
                if (isMutationRelevant(mutation)) {
                    shouldUpdate = true;
                    break;
                }
            }

            if (shouldUpdate) {
                console.log("Relevant DOM change detected, scheduling update");
                scheduleUpdate();
            }
        });

        // More targeted observation - only watch for specific changes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href', 'onclick', 'disabled', 'hidden', 'style', 'class', 'role', 'tabindex']
        });

        mutationObserverRef.current = observer;
    }, [scheduleUpdate, isMutationRelevant]);

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
            // Increased delay to ensure DOM changes are complete
            setTimeout(() => {
                startMutationObserver();
            }, 100);
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

    // Handle URL changes (for SPAs) with debouncing
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