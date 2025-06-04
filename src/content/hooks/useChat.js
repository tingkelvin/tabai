// hooks/useChat.js - Simplified version
import { useState, useCallback } from 'react';
import { MESSAGE_TYPES } from '../utils/constants';

export const useChat = () => {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

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

    try {
      // Send directly to background script
      const reply = await chrome.runtime.sendMessage({
        type: 'CHAT_MESSAGE',
        data: { message: userMessage.content }
      });
      
      const response = {
        id: Date.now() + 1,
        type: MESSAGE_TYPES.ASSISTANT,
        content: reply.content || "I'm having trouble processing your request.",
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, response]);
    } catch (error) {
      const errorResponse = {
        id: Date.now() + 1,
        type: MESSAGE_TYPES.ASSISTANT,
        content: "Sorry, I'm experiencing technical difficulties. Please try again later.",
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  }, [chatInput]);

  const handleInputChange = useCallback((e) => {
    setChatInput(e.target.value);
    
    const textarea = e.target;
    textarea.style.height = 'auto';
    
    const scrollHeight = textarea.scrollHeight;
    const minHeight = 44;
    const maxHeight = 400;
    
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
      
      setTimeout(() => {
        if (e.target) {
          e.target.style.height = '44px';
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