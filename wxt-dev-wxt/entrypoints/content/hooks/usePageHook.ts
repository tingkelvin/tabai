import { useState, useCallback, useRef, useEffect } from 'react';
import { PageState, PageConfig } from '../types/page';
import { removeHighlights, getClickableElementsFromDomTree } from '../services/DomTreeService';

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

    // Getters
    getCurrentUrl: () => string;
    getCurrentTitle: () => string;
}

export const usePageHook = (config?: PageConfig): UsePageHookReturn => {
    const [pageState, setPageState] = useState<PageState | null>(null);
    const [isHighlighting, setIsHighlighting] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    // Refs for tracking page stability
    const mutationObserverRef = useRef<MutationObserver | null>(null);
    const isPageStableRef = useRef<boolean>(false);
    const hasInitialScanRef = useRef<boolean>(false);

    // Helper function to check if an element should be ignored
    const isIgnoredElement = useCallback((element: Element | Node): boolean => {
        if (!element) return false;

        // Handle text nodes and other non-element nodes
        if (element.nodeType !== Node.ELEMENT_NODE) {
            // For text nodes, check their parent element
            return element.parentElement ? isIgnoredElement(element.parentElement) : false;
        }

        const el = element as Element;

        // Check if the element itself is an ignored container
        if (el.id === 'playwright-highlight-container') {
            return true;
        }

        // Check for content-app class (including partial matches)
        if (el.className && typeof el.className === 'string' && el.className.includes('content-app')) {
            return true;
        }

        // Check if the element is inside an ignored container
        const playwrightContainer = el.closest('#playwright-highlight-container');
        const contentAppContainer = el.closest('.content-app');

        return !!(playwrightContainer || contentAppContainer);
    }, []);

    // Initialize page tracking
    const initializePageTracking = useCallback((): void => {
        console.log('initializePageTracking started');

        mutationObserverRef.current = new MutationObserver((mutations) => {
            console.log('MutationObserver triggered with mutations:', mutations.length);

            // Filter significant mutations
            const significantMutations = mutations.filter(mutation => {
                const target = mutation.target;

                // Ignore mutations in specific containers
                if (isIgnoredElement(target)) {
                    console.log('Ignoring mutation on ignored element:', target);
                    return false;
                }

                // For childList mutations, also check if added/removed nodes should be ignored
                if (mutation.type === 'childList') {
                    // Check if any added nodes should be ignored
                    const hasIgnoredAddedNodes = Array.from(mutation.addedNodes).some(node => {
                        return isIgnoredElement(node);
                    });

                    // Check if any removed nodes should be ignored
                    const hasIgnoredRemovedNodes = Array.from(mutation.removedNodes).some(node => {
                        return isIgnoredElement(node);
                    });

                    // Skip if all changes are in ignored elements
                    if (hasIgnoredAddedNodes || hasIgnoredRemovedNodes) {
                        console.log('Ignoring childList mutation with ignored nodes');
                        return false;
                    }

                    return true;
                }

                if (mutation.type === 'attributes') {
                    const attr = mutation.attributeName;
                    // Skip style/class changes that are likely animations or drag operations
                    if (attr === 'style' || attr === 'class') {
                        console.log('Ignoring style/class change on:', target);
                        return false;
                    }
                    return true;
                }

                // For characterData changes, check if the parent is ignored
                if (mutation.type === 'characterData') {
                    return !isIgnoredElement(target);
                }

                return true;
            });

            console.log('MutationObserver significant mutations:', significantMutations.length);

            if (significantMutations.length > 0) {
                console.log('MutationObserver: Page marked as unstable');
                isPageStableRef.current = false;
                // Debounce stability detection
                setTimeout(() => {
                    console.log('MutationObserver: Page marked as stable after timeout');
                    isPageStableRef.current = true;
                }, 500);
            }
        });

        // Start observing when DOM is ready
        if (document.readyState === 'loading') {
            console.log('initializePageTracking: DOM still loading, adding event listener');
            document.addEventListener('DOMContentLoaded', () => {
                console.log('initializePageTracking: DOMContentLoaded event fired');
                startMutationObserver();
            });
        } else {
            console.log('initializePageTracking: DOM already ready, starting observer');
            startMutationObserver();
        }
    }, []);

    const startMutationObserver = useCallback((): void => {
        console.log('startMutationObserver called');
        const target = document.body || document.documentElement;
        console.log('startMutationObserver target:', target?.tagName);

        if (target && mutationObserverRef.current) {
            mutationObserverRef.current.observe(target, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'id', 'style', 'hidden', 'disabled']
            });
            console.log('startMutationObserver: Observer started successfully');

            // Mark as initially stable after a short delay to allow for initial DOM mutations
            setTimeout(() => {
                if (!hasInitialScanRef.current) {
                    console.log('startMutationObserver: Marking page as initially stable');
                    isPageStableRef.current = true;
                }
            }, 1000); // Wait 1 second for initial page load to settle
        } else {
            console.log('startMutationObserver: Failed to start observer', {
                hasTarget: !!target,
                hasObserver: !!mutationObserverRef.current
            });
        }
    }, []);

    /**
     * Wait for page to stabilize
     */
    const waitForPageStability = useCallback(async (timeout: number = 5000): Promise<void> => {
        console.log('waitForPageStability called with timeout:', timeout);
        const startTime = Date.now();

        while (!isPageStableRef.current && (Date.now() - startTime) < timeout) {
            console.log('waitForPageStability: Waiting for stability, elapsed:', Date.now() - startTime);
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const elapsed = Date.now() - startTime;
        console.log('waitForPageStability completed:', {
            isStable: isPageStableRef.current,
            elapsed
        });
    }, []);

    // Perform initial scan
    const performInitialScan = useCallback(async () => {
        if (hasInitialScanRef.current) {
            console.log('Initial scan already performed, skipping');
            return;
        }

        console.log('Starting initial scan...');
        setIsScanning(true);

        try {
            // Wait for page to stabilize before scanning
            await waitForPageStability(10000); // Allow up to 10 seconds for initial page load

            console.log('Page is stable, performing initial scan');

            // Get clickable elements from DOM tree
            const clickableElements = getClickableElementsFromDomTree();

            // Update page state
            const newPageState: PageState = {
                url: getCurrentUrl(),
                title: getCurrentTitle(),
                // Add your DOM tree here if available
                // domTree: clickableElements,
                timestamp: Date.now()
            };

            setPageState(newPageState);
            hasInitialScanRef.current = true;

            console.log('Initial scan completed successfully');
        } catch (error) {
            console.error('Error during initial scan:', error);
        } finally {
            setIsScanning(false);
        }
    }, [waitForPageStability]);

    // Hook actions
    const scanAndHighlight = useCallback(async () => {
        setIsScanning(true);
        try {
            await waitForPageStability();
            console.log('Scanning and highlighting page elements');

            // Get clickable elements and highlight them
            const clickableElements = getClickableElementsFromDomTree();

            setIsHighlighting(true);
        } catch (error) {
            console.error('Error during scan and highlight:', error);
        } finally {
            setIsScanning(false);
        }
    }, [waitForPageStability]);

    const clearHighlights = useCallback(() => {
        setIsHighlighting(false);
        // Clear highlights from DOM using the service
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
        };
    }, [initializePageTracking]);

    // Perform initial scan when page tracking is set up
    useEffect(() => {
        // Small delay to ensure mutation observer is set up
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
    };
};