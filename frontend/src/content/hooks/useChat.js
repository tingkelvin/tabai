// hooks/useChat.js - Fixed version
import { useState, useCallback, useRef } from 'react';
import { MESSAGE_TYPES } from '../utils/constants';

export const useChat = () => {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const getFileContentsFunctionRef = useRef(null);

  const sendMessage = useCallback(async (message) => {
    // Fix: Allow context-only messages (for ask function)
    if (!message) return;

    // Always show typing when sending a message
    setIsTyping(true);

    try {
      console.log('🚀 Sending to backend:', message.substring(0, 100) + '...');

      // Send directly to background script
      const reply = await chrome.runtime.sendMessage({
        type: 'CHAT_MESSAGE',
        data: { message: message }
      });

      const responseContent = reply.content || "I do not find any response, sorry.";
      return responseContent;

    } catch (error) {
      console.error('❌ Error sending message:', error);
      const errorContent = "Sorry, I'm experiencing technical difficulties. Please try again later.";

      // Always add error response to chat
      const errorResponse = {
        id: Date.now() + 1,
        type: MESSAGE_TYPES.ASSISTANT,
        content: errorContent,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, errorResponse]);

      return errorContent;

    } finally {
      setIsTyping(false);
    }
  }, []); // Remove chatInput dependency to prevent recreation

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

      // Add user message to chat
      const userMessage = {
        id: Date.now(),
        type: MESSAGE_TYPES.USER,
        content: chatInput.trim(),
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, userMessage]);

      // Clear input and reset textarea height
      setChatInput('');

      setTimeout(() => {
        if (e.target) {
          e.target.style.height = '44px';
          e.target.style.overflowY = 'hidden';
        }
      }, 0);
    }
  }, [chatInput]); // Include chatInput as dependency

  // Method to directly add messages to the chat
  const addMessage = useCallback((message) => {
    const newMessage = {
      id: message.id || Date.now(),
      type: message.type || MESSAGE_TYPES.ASSISTANT,
      content: message.content,
      timestamp: message.timestamp || new Date(),
      ...message // Allow overriding any properties
    };

    setChatMessages(prev => [...prev, newMessage]);
  }, []);

  // Method to directly add user messages to the chat
  const addUserMessage = useCallback((content) => {
    const newMessage = {
      id: Date.now(),
      type: MESSAGE_TYPES.USER,
      content: content,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, newMessage]);
  }, []);

  // Method to directly add assistant messages to the chat
  const addAssistantMessage = useCallback((content) => {
    const newMessage = {
      id: Date.now(),
      type: MESSAGE_TYPES.ASSISTANT,
      content: content,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, newMessage]);
  }, []);

  // Method to add multiple messages at once
  const addMessages = useCallback((messages) => {
    const newMessages = messages.map((message, index) => ({
      id: message.id || Date.now() + index,
      type: message.type || MESSAGE_TYPES.ASSISTANT,
      content: message.content,
      timestamp: message.timestamp || new Date(),
      ...message
    }));

    setChatMessages(prev => [...prev, ...newMessages]);
  }, []);

  // Method to clear all messages
  const clearMessages = useCallback(() => {
    setChatMessages([]);
  }, []);

  // Method to remove a specific message by ID
  const removeMessage = useCallback((messageId) => {
    setChatMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  // Method to update a specific message
  const updateMessage = useCallback((messageId, updates) => {
    setChatMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  // Stable function to set file contents getter
  const setGetFileContentsFunction = useCallback((fn) => {
    getFileContentsFunctionRef.current = fn;
  }, []);

  return {
    chatInput,
    chatMessages,
    isTyping,
    handleInputChange,
    handleKeyPress,
    sendMessage,
    addMessage,
    addMessages,
    clearMessages,
    removeMessage,
    updateMessage,
    setIsTyping,
    addUserMessage,
    addAssistantMessage,
    setGetFileContentsFunction
  };
};