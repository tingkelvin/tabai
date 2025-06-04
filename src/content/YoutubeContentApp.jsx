// YouTubeContentApp.jsx - Fixed version
import React, { useEffect, useRef, useState } from 'react';
import ContentApp from './ContentApp';
import { useYoutubeControl } from './hooks/useYoutubeControl';
import { useChat } from './hooks/useChat';

const YouTubeContentApp = () => {
  const { pauseVideo, resumeVideo, isVideoPaused } = useYoutubeControl();
  const typingTimeoutRef = useRef(null);
  const wasPlayingBeforeTyping = useRef(false);
  const [showResumeButton, setShowResumeButton] = useState(false); // ADDED: Missing state

  // Handle resume video action
  const handleResumeVideo = () => {
    if (wasPlayingBeforeTyping.current) {
      resumeVideo();
      wasPlayingBeforeTyping.current = false;
      setShowResumeButton(false);
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
        // Set up video controls before sending message
        setShowResumeButton(true);
        
        // Pause video when message is sent
        if (!isVideoPaused()) {
          pauseVideo();
          wasPlayingBeforeTyping.current = true;
        }
      }
      
      // Call original handler which will prevent default and send message
      chatHook.handleKeyPress(e);
    };

    return {
      ...chatHook,
      handleInputChange,
      handleKeyPress
    };
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ContentApp 
      useCustomChat={useYouTubeChat} 
      customActions={youtubeActions}
    />
  );
};

export default YouTubeContentApp;