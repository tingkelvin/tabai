// hooks/useYouTubeChat.js - Extract the YouTube chat logic into its own hook
import { useRef, useState } from 'react';
import { useChat } from './useChat';
import { useYoutubeControl } from './useYoutubeControl';
import { getTranscriptRangeBinary } from '../utils/transcriptHelpers';

export const useYouTubeChat = (transcript = []) => {
  const baseChatHook = useChat();
  const { pauseVideo, resumeVideo, isVideoPaused, getCurrentTime } = useYoutubeControl();
  const wasPlayingBeforeTyping = useRef(false);
  const [showResumeButton, setShowResumeButton] = useState(false);

  const handleInputChange = (e) => {
    const isTyping = e.target.value.length > 0;
    
    if (isTyping) {
      // User started typing
      if (!isVideoPaused() && !wasPlayingBeforeTyping.current) {
        wasPlayingBeforeTyping.current = true;
        pauseVideo();
      }
    } else {
      if (isVideoPaused() && wasPlayingBeforeTyping.current) {
        wasPlayingBeforeTyping.current = false;
        resumeVideo();
      }
    }
    
    // Call original handler
    baseChatHook.handleInputChange(e);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      const userMessage = e.target.value.trim();
      if (!userMessage) return;

      const currentTime = getCurrentTime()
      
      // Include transcript context with the message
      const currentTranscript = getTranscriptRangeBinary(Math.max(0, currentTime-60), currentTime, transcript).join(' ');
      const enhancedMessage = `${userMessage}\n\n[Video Context: ${currentTranscript}]`;
      
      baseChatHook.sendMessage(enhancedMessage);
      
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
    
    baseChatHook.handleKeyPress(e);
  };

  const handleResumeVideo = () => {
    if (wasPlayingBeforeTyping.current) {
      resumeVideo();
      wasPlayingBeforeTyping.current = false;
      setShowResumeButton(false);
    }
  };

  return {
    ...baseChatHook,
    handleInputChange,
    handleKeyPress,
    handleResumeVideo,
    showResumeButton,
    setShowResumeButton
  };
};