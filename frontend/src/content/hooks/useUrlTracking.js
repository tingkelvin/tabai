// useUrlTracking.jsx - Fixed with polling fallback
import { useState, useEffect, useCallback, useRef } from 'react';

export const useUrlTracking = () => {
  const [currentUrl, setCurrentUrl] = useState(() => window.location.href); // Initialize immediately
  const lastUrl = useRef(window.location.href); // Initialize ref too
  
  const updateUrlState = useCallback(() => {
    const newUrl = window.location.href;
    
    if (newUrl !== lastUrl.current) {
      console.log("URL changed from:", lastUrl.current, "to:", newUrl);
      lastUrl.current = newUrl;
      setCurrentUrl(newUrl);
    }
  }, []);

  useEffect(() => {
    console.log("useUrlTracking initialized for:", window.location.hostname);
    
    // Store original methods
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    // Override history methods
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(updateUrlState, 10); // Small delay for DOM updates
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(updateUrlState, 10);
    };

    // Event handlers
    const handleNavigation = () => updateUrlState();
    const handleYouTubeNavigation = () => setTimeout(updateUrlState, 100);
    const handleLinkedInNavigation = () => setTimeout(updateUrlState, 100);

    // Add listeners
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);
    document.addEventListener('yt-navigate-finish', handleYouTubeNavigation);
    document.addEventListener('yt-page-data-updated', handleYouTubeNavigation);

    // POLLING FALLBACK - This will catch changes that events miss
    const pollInterval = setInterval(() => {
      const currentHref = window.location.href;
      if (currentHref !== lastUrl.current) {
        console.log("URL change detected via polling:", currentHref);
        updateUrlState();
      }
    }, 1000); // Check every 500ms

    // Focus event - catches changes when returning to tab
    const handleFocus = () => {
      setTimeout(updateUrlState, 50);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      // Cleanup
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('yt-navigate-finish', handleYouTubeNavigation);
      document.removeEventListener('yt-page-data-updated', handleYouTubeNavigation);
      
      clearInterval(pollInterval); // Clear the polling interval
      
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [updateUrlState]);

  return currentUrl;
};