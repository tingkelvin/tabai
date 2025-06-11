// hooks/useYoutubeControl.js
import { useCallback, useEffect, useState } from 'react';
import { parseTimeToSeconds } from '../utils/helpers';

export const useYoutubeControl = () => {
  const [videoElement, setVideoElement] = useState(null);
  const [wasPlaying, setWasPlaying] = useState(false);

  // Find YouTube video element
  useEffect(() => {
    console.log('🚀 useYoutubeControl mounted');
    const findVideoElement = () => {
      // Try different selectors for YouTube video
      const selectors = [
        'video',
        '.video-stream',
        '#movie_player video',
        '.html5-video-player video'
      ];

      for (const selector of selectors) {
        const video = document.querySelector(selector);
        if (video && video.duration) {
          setVideoElement(video);
          return;
        }
      }
    };

    // Try to find video immediately
    findVideoElement();

    // Set up observer for dynamically loaded videos
    const observer = new MutationObserver(() => {
      if (!videoElement) {
        findVideoElement();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, [videoElement]);

  const pauseVideo = useCallback(() => {
    if (videoElement && !videoElement.paused) {
      setWasPlaying(true);
      videoElement.pause();
    }
  }, [videoElement]);

  const resumeVideo = useCallback(() => {
    if (videoElement && videoElement.paused && wasPlaying) {
      videoElement.play();
      setWasPlaying(false);
    }
  }, [videoElement, wasPlaying]);

  const isVideoPaused = useCallback(() => {
    return videoElement ? videoElement.paused : true;
  }, [videoElement]);

  const isVideoPlaying = useCallback(() => {
    return videoElement ? !videoElement.paused : false;
  }, [videoElement]);

  const getCurrentTime = () => {
    return videoElement ? Math.floor(videoElement.currentTime) : 0;
  };

  return {
    pauseVideo,
    resumeVideo,
    isVideoPaused,
    isVideoPlaying,
    hasVideo: !!videoElement,
    getCurrentTime
  };
};