// useUrlTracking.jsx
import { useState, useEffect, useCallback } from 'react';

export const useUrlTracking = () => {
    const [currentUrl, setCurrentUrl] = useState('');
  
    const updateUrlState = useCallback(() => {
      setCurrentUrl(window.location.hostname);
    }, []);
  
    useEffect(() => {
      updateUrlState();
  
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
  
      // Override history methods to track URL changes
      history.pushState = function(...args) {
        originalPushState.apply(history, args);
        setTimeout(updateUrlState, 50);
      };
  
      history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        setTimeout(updateUrlState, 50);
      };
  
      // Listen for navigation events
      window.addEventListener('popstate', updateUrlState);
      window.addEventListener('hashchange', updateUrlState);
  
      // Polling fallback for SPA navigation
      const urlCheckInterval = setInterval(() => {
        const currentHref = window.location.href;
        if (currentHref !== window.lastCheckedUrl) {
          window.lastCheckedUrl = currentHref;
          updateUrlState();
        }
      }, 1000);
  
      return () => {
        window.removeEventListener('popstate', updateUrlState);
        window.removeEventListener('hashchange', updateUrlState);
        clearInterval(urlCheckInterval);
        history.pushState = originalPushState;
        history.replaceState = originalReplaceState;
      };
    }, [updateUrlState]);
  
    return currentUrl;
  };