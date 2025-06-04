// YouTubeContentApp.jsx - Fixed version
import React, { useEffect, useRef } from 'react';
import ContentApp from './ContentApp';
import { useYoutubeControl } from './hooks/useYoutubeControl';
import { useChat } from './hooks/useChat'; // ADDED: Missing import

const YouTubeContentApp = () => {
  const { pauseVideo, resumeVideo, isVideoPaused } = useYoutubeControl();
  const typingTimeoutRef = useRef(null);
  const wasPlayingBeforeTyping = useRef(false);

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
        if (wasPlayingBeforeTyping.current && isVideoPaused){
            wasPlayingBeforeTyping.current = false;
            resumeVideo();
        }
      }
      // Call original handler
      chatHook.handleInputChange(e);
    };

    const sendMessage = async () => {
      // Resume video when message is sent
      if (wasPlayingBeforeTyping.current) {
        resumeVideo();
        wasPlayingBeforeTyping.current = false;
      }
      
      // Clear timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Call original send message
      await chatHook.sendMessage();
    };

    return {
      ...chatHook,
      handleInputChange,
      sendMessage
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

  return <ContentApp useCustomChat={useYouTubeChat} />;
};

export default YouTubeContentApp;