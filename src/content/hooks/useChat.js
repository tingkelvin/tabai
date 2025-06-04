// hooks/useChat.js - Updated for longer input
import { useState, useCallback } from 'react';
import { MESSAGE_TYPES } from '../utils/constants';

export const useChat = () => {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  const generateAIResponse = useCallback((userMessage) => {
    // This could be replaced with actual AI API call
    return "That's a great question! I'd be happy to help explain the process or provide step-by-step guidance. Could you be more specific about what you'd like to know? Interesting question! I can provide information and explanations. What specifically would you like to know more about?";
  }, []);

  const sendMessage = useCallback(async () => {
    if (!chatInput.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: MESSAGE_TYPES.USER,
      content: chatInput.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        type: MESSAGE_TYPES.ASSISTANT,
        content: generateAIResponse(userMessage.content),
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 800 + Math.random() * 1200);
  }, [chatInput, generateAIResponse]);

  const handleInputChange = useCallback((e) => {
    setChatInput(e.target.value);
    
    // Auto-resize logic for longer input
    const textarea = e.target;
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate the content height
    const scrollHeight = textarea.scrollHeight;
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
    const minHeight = 40; // Updated minimum height
    const maxHeight = 400; // Updated maximum height
    
    // Calculate number of lines
    const lines = Math.floor(scrollHeight / lineHeight);
    
    if (lines <= 1) {
      // Single line - keep minimum height
      textarea.style.height = `${minHeight}px`;
    } else {
      // Multiple lines - expand up to maxHeight
      const newHeight = Math.min(scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
    
    // Enable/disable scrolling based on content
    if (scrollHeight > maxHeight) {
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  }, []);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
      
      // Reset textarea height after sending
      setTimeout(() => {
        if (e.target) {
          e.target.style.height = '40px'; // Updated reset height
          e.target.style.overflowY = 'hidden';
        }
      }, 0);
    }
  }, [sendMessage]);

  return {
    chatInput,
    chatMessages,
    isTyping,
    handleInputChange,
    handleKeyPress,
    sendMessage
  };
};