// YouTubeContentApp.jsx - Improved URL change handling
import React, { useEffect, useRef, useState } from 'react';
import ContentApp from './ContentApp';
import { useYoutubeControl } from './hooks/useYoutubeControl';
import { useChat } from './hooks/useChat';
import {parseTimeToSeconds, getTranscriptRangeBinary} from './utils/helpers';

const YouTubeContentApp = () => {
  const { pauseVideo, resumeVideo, isVideoPaused, getCurrentTime } = useYoutubeControl();
  const wasPlayingBeforeTyping = useRef(false);
  const [showResumeButton, setShowResumeButton] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);

  // Helper function to extract video ID from URL
  const extractVideoId = (url) => {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
      return urlObj.searchParams.get('v');
    }
    return null;
  };

  // Handle resume video action
  const handleResumeVideo = () => {
    if (wasPlayingBeforeTyping.current) {
      resumeVideo();
      wasPlayingBeforeTyping.current = false;
      setShowResumeButton(false);
    }
  };

  // Improved URL change handler
  const handleUrlChange = (newUrl) => {
    // console.log('URL changed to:', newUrl);
    
    const videoId = extractVideoId(newUrl);
    
    if (videoId) {
      // We're on a YouTube video page
      if (videoId !== currentVideoId) {
        // New video detected
        // console.log('New video detected:', videoId);
        setCurrentVideoId(videoId);
        
        // Clear previous transcript
        setTranscript([]);
        
        // Get transcript for new video with delay to ensure page is loaded
        setTimeout(() => {
          getYouTubeTranscript();
        }, 1500); // Increased delay for YouTube's dynamic loading
      }
    } else {
      // Not on a video page or not YouTube
      if (currentVideoId) {
        // console.log('Left video page');
        setCurrentVideoId(null);
        setTranscript([]);
      }
    }
  };

  const getYouTubeTranscript = async () => {
    if (isLoadingTranscript) {
      // console.log('Already loading transcript, skipping...');
      return;
    }

    setIsLoadingTranscript(true);
    // console.log("Getting transcript...");
    
    try {
      // Wait for page to fully load
      await waitForElement('[aria-label*="transcript" i], [aria-label*="Show transcript" i]', 5000);
      
      const transcriptButton = document.querySelector('[aria-label*="transcript" i], [aria-label*="Show transcript" i]');
    
      if (transcriptButton) {
        // Check if transcript panel is already open
        const isTranscriptOpen = document.querySelector('.ytd-transcript-renderer, ytd-transcript-renderer');
        
        if (!isTranscriptOpen) {
          transcriptButton.click();
          // console.log('Clicked transcript button');
          
          // Wait for transcript panel to load
          await waitForElement('ytd-transcript-segment-renderer, .ytd-transcript-segment-renderer', 3000);
        }
    
        const transcriptItems = document.querySelectorAll(
          'ytd-transcript-segment-renderer'
        );
    
        if (transcriptItems.length > 0) {
          const transcriptData = Array.from(transcriptItems).map(item => {
            const timeElement = item.querySelector('.segment-timestamp, [class*="timestamp"]');
            const textElement = item.querySelector('.segment-text, [class*="text"]');
            
            const timeText = timeElement ? timeElement.textContent.trim() : '0:00';
            const text = textElement ? textElement.textContent.trim() : '';
    
            return {
              time: timeText,
              text: text,
              timeInSeconds: parseTimeToSeconds(timeText) // Parse immediately
            };
          }).filter(item => item.text);
    
          // console.log(`Found ${transcriptData.length} transcript segments`);
          
          setTranscript(transcriptData); // Now contains pre-parsed timeInSeconds
          // console.log(transcriptData);
          
          // Close transcript panel after getting data
          await closeTranscriptPanel();
          return transcriptData;
        } else {
          throw new Error('No transcript segments found');
        }
      }
    } catch (error) {
      console.error('Failed to get transcript:', error);
      setTranscript([{ 
        time: '0:00', 
        text: `Transcript not available: ${error.message}` 
      }]);
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  // Helper function to wait for elements
  const waitForElement = (selector, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  };

  const closeTranscriptPanel = async () => {
    try {
      const closeButton = document.querySelector('[aria-label*="close transcript" i], [aria-label*="Close transcript" i]');
      if (closeButton) {
        closeButton.click();
        // console.log('Closed transcript panel');
      }
    } catch (error) {
      console.error('Error closing transcript panel:', error);
    }
  };

  // Define custom actions for YouTube
  const youtubeActions = [
    {
      id: 'resume-video',
      label: 'Resume',
      icon: '',
      onClick: handleResumeVideo,
      isVisible: () => showResumeButton,
      className: 'resume-video-action',
      title: 'Resume the paused YouTube video'
    }
  ];

  const getCurrentTranscript = () => {
    const currentTime = getCurrentTime()
    const queryTranscript = getTranscriptRangeBinary(Math.max(0, currentTime-60), currentTime, transcript).join(' ');
    return queryTranscript
  }

  // Enhanced chat hook that handles YouTube video pausing
  const useYouTubeChat = () => {
    const chatHook = useChat();
    const handleInputChange = (e) => {
      const isTyping = e.target.value.length > 0;
      
      if (isTyping) {
        // User started typing
        if (!isVideoPaused() && !wasPlayingBeforeTyping.current) {
          wasPlayingBeforeTyping.current = true;
          pauseVideo();
        }
      } else {
        if (isVideoPaused() && wasPlayingBeforeTyping.current){
            wasPlayingBeforeTyping.current = false;
            resumeVideo();
        }
      }
      // Call original handler
      chatHook.handleInputChange(e);
    };

    // Enhanced key press handler that includes video controls
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        
        const userMessage = e.target.value.trim();
        if (!userMessage) return;
        
        const currentTranscript = getCurrentTranscript();
        chatHook.sendMessage(currentTranscript);
        // Clear input properly
        setTimeout(() => {
          if (e.target) {
            e.target.style.height = '44px';
            e.target.style.overflowY = 'hidden';
          }
        }, 0);
        
        setShowResumeButton(true);
        if (!isVideoPaused()) {
          pauseVideo();
          wasPlayingBeforeTyping.current = true;
        }
        
        return;
      }
      
      chatHook.handleKeyPress(e);
    };
  
    return {
      ...chatHook,
      handleInputChange,
      handleKeyPress
    };
  };

  return (
    <ContentApp 
      useCustomChat={useYouTubeChat} 
      customActions={youtubeActions}
      onUrlChange={handleUrlChange}
    />
  );
};

export default YouTubeContentApp;