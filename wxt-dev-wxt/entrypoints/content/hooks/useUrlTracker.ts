// useUrlTracking.ts - Fixed with polling fallback
import { useState, useEffect, useCallback, useRef } from 'react';

// Type definitions
interface HistoryState {
    [key: string]: any;
}

type HistoryMethod = (
    data: HistoryState | null,
    unused: string,
    url?: string | URL | null
) => void;

interface ExtendedHistory extends History {
    pushState: HistoryMethod;
    replaceState: HistoryMethod;
}

// Custom event types for YouTube navigation
interface YouTubeNavigationEvent extends Event {
    type: 'yt-navigate-finish' | 'yt-page-data-updated';
}

declare global {
    interface DocumentEventMap {
        'yt-navigate-finish': YouTubeNavigationEvent;
        'yt-page-data-updated': YouTubeNavigationEvent;
    }
}

export const useUrlTracker = (): string => {
    const [currentUrl, setCurrentUrl] = useState<string>(() => window.location.href); // Initialize immediately
    const lastUrl = useRef<string>(window.location.href); // Initialize ref too

    const updateUrlState = useCallback((): void => {
        const newUrl: string = window.location.href;
        if (newUrl !== lastUrl.current) {
            console.log("URL changed from:", lastUrl.current, "to:", newUrl);
            lastUrl.current = newUrl;
            setCurrentUrl(newUrl);
        }
    }, []);

    useEffect(() => {
        console.log('🚀 useUrlTracking mounted');
        console.log("useUrlTracking initialized for:", window.location.hostname);

        // Store original methods with proper typing
        const extendedHistory = history as ExtendedHistory;
        const originalPushState: HistoryMethod = extendedHistory.pushState.bind(history);
        const originalReplaceState: HistoryMethod = extendedHistory.replaceState.bind(history);

        // Override history methods
        extendedHistory.pushState = function (
            data: HistoryState | null,
            unused: string,
            url?: string | URL | null
        ): void {
            originalPushState(data, unused, url);
            setTimeout(updateUrlState, 10); // Small delay for DOM updates
        };

        extendedHistory.replaceState = function (
            data: HistoryState | null,
            unused: string,
            url?: string | URL | null
        ): void {
            originalReplaceState(data, unused, url);
            setTimeout(updateUrlState, 10);
        };

        // Event handlers with proper typing
        const handleNavigation = (): void => updateUrlState();

        const handleYouTubeNavigation = (): void => {
            setTimeout(updateUrlState, 100);
        };

        const handleLinkedInNavigation = (): void => {
            setTimeout(updateUrlState, 100);
        };

        // Add listeners
        window.addEventListener('popstate', handleNavigation);
        window.addEventListener('hashchange', handleNavigation);

        // POLLING FALLBACK - This will catch changes that events miss
        const pollInterval: NodeJS.Timeout = setInterval((): void => {
            const currentHref: string = window.location.href;
            if (currentHref !== lastUrl.current) {
                console.log("URL change detected via polling:", currentHref);
                updateUrlState();
            }
        }, 1000); // Check every 1000ms

        // Focus event - catches changes when returning to tab
        const handleFocus = (): void => {
            setTimeout(updateUrlState, 50);
        };

        window.addEventListener('focus', handleFocus);

        return (): void => {
            // Cleanup
            window.removeEventListener('popstate', handleNavigation);
            window.removeEventListener('hashchange', handleNavigation);
            window.removeEventListener('focus', handleFocus);

            clearInterval(pollInterval); // Clear the polling interval

            // Restore original methods
            extendedHistory.pushState = originalPushState;
            extendedHistory.replaceState = originalReplaceState;
        };
    }, [updateUrlState]);

    return currentUrl;
};