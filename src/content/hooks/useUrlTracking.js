// useUrlTracking.jsx
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
    console.log("useUrlTracking initialized");
    
    // Store original methods
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    // Override history methods
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      updateUrlState();
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      updateUrlState();
    };

    // Event handlers
    const handleNavigation = () => updateUrlState();
    const handleYouTubeNavigation = () => setTimeout(updateUrlState, 100);

    // Add listeners
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);
    document.addEventListener('yt-navigate-finish', handleYouTubeNavigation);
    document.addEventListener('yt-page-data-updated', handleYouTubeNavigation);

    return () => {
      // Cleanup
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
      document.removeEventListener('yt-navigate-finish', handleYouTubeNavigation);
      document.removeEventListener('yt-page-data-updated', handleYouTubeNavigation);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [updateUrlState]);

  return currentUrl;
};