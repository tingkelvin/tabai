// hooks/useYouTubeUrlTracking.js - Simplified YouTube URL tracking
import { useState, useEffect } from 'react';
import { useUrlTracking } from './useUrlTracking';

export const useYoutubeUrlTracking = () => {
  const currentUrl = useUrlTracking(); // Use base URL tracking
  const [videoId, setVideoId] = useState(null);
  const [videoTitle, setVideoTitle] = useState('');

  // Helper function to extract video ID from URL
  const extractVideoId = (url) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
        return urlObj.searchParams.get('v');
      }
    } catch (error) {
      console.error('Error extracting video ID:', error);
    }
    return null;
  };

  // Helper function to get video title from page
  const getVideoTitleFromPage = () => {
    const titleSelectors = [
      'h1.ytd-video-primary-info-renderer',
      '#title h1',
      'h1.style-scope.ytd-video-primary-info-renderer',
      '.ytd-video-primary-info-renderer h1'
    ];

    for (const selector of titleSelectors) {
      const titleElement = document.querySelector(selector);
      if (titleElement?.textContent?.trim()) {
        return titleElement.textContent.trim();
      }
    }
    return null;
  };

  // Function to generate formatted title for display
  const getFormattedTitle = () => {
    if (!videoId) {
      return 'AI Chat';
    }

    if (videoTitle) {
      const maxLength = 50;
      const truncatedTitle = videoTitle.length > maxLength 
        ? videoTitle.substring(0, maxLength) + '...' 
        : videoTitle;
      return `🎥 ${truncatedTitle}`;
    }

    return `📹 YouTube - ${videoId}`;
  };

  // Handle URL changes
  useEffect(() => {
    //console.log('URL changed to:', currentUrl);
    const newVideoId = extractVideoId(currentUrl);
    //console.log('Extracted video ID:', newVideoId);
    
    if (newVideoId) {
      // On YouTube video page - only update if videoId actually changed
      if (newVideoId !== videoId) {
        //console.log('Video ID changed from', videoId, 'to', newVideoId);
        setVideoId(newVideoId);
        
        // Reset title for new video
        setVideoTitle('');
        
        // Try to get title immediately
        const title = getVideoTitleFromPage();
        if (title) {
          //console.log('Found title immediately:', title);
          setVideoTitle(title);
        } else {
          //console.log('Title not found, will retry in 1 second');
          // If no title found, try again after a short delay for dynamic content
          setTimeout(() => {
            const delayedTitle = getVideoTitleFromPage();
            if (delayedTitle) {
              //console.log('Found title after delay:', delayedTitle);
              setVideoTitle(delayedTitle);
            } else {
              //console.log('Still no title found after delay');
            }
          }, 1000);
        }
      } else {
        //console.log('Same video ID, not updating');
      }
      
    } else {
      // Not on YouTube video page
      if (videoId !== null) {
        //console.log('Leaving YouTube, clearing video data');
        setVideoId(null);
        setVideoTitle('');
      }
    }
  }, [currentUrl, videoId]); // Added videoId to dependencies for comparison

  return {
    currentUrl,
    videoId,
    videoTitle,
    isYouTubePage: !!videoId,
    formattedTitle: getFormattedTitle()
  };
};