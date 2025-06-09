// hooks/useChat.js - Simplified version
import { useState, useCallback, useRef } from 'react';
import { MESSAGE_TYPES } from '../utils/constants';

export const useChat = () => {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const getFileContentsFunctionRef = useRef(null);

  const sendMessage = useCallback(async (context = '', message = '', options = {}) => {
    const { 
      returnReply = false, 
      addToChat = true,
      addResponseToChat = true,
      useFileContents = true,
      useContext = true
    } = options;

    const chatInputTrimmed = chatInput.trim();

    // Fix: Allow context-only messages (for ask function)
    if (!chatInputTrimmed && !message && !context) return;
  
    // Only add user message to chat if addToChat is true AND we have chatInput
    if (chatInputTrimmed && addToChat){
      const userMessage = {
        id: Date.now(),
        type: MESSAGE_TYPES.USER,
        content: chatInputTrimmed,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, userMessage]);
      setChatInput('');
    }
    
    // Always show typing when sending a message (even if addToChat is false)
    setIsTyping(true);
  
    try {
      const buildPrompt = async () => {
        const parts = [];
      
        // Add context
        if (useContext && context) {
          parts.push(`<context>\n${context}\n</context>`);
        }
      
        // Add file contents
        if (useFileContents) {
          const getContentFunction = getFileContentsFunctionRef.current;
          if (getContentFunction && typeof getContentFunction === 'function') {
            const fileContents = await getContentFunction();
            if (fileContents) {
              parts.push(`<files>\n${fileContents}\n</files>`);
            }
          }
        }
      
        // Add current chat input (from the input field)
        if (chatInputTrimmed) {
          parts.push(`<user_input>\n${chatInputTrimmed}\n</user_input>`);
        }
      
        // Add message parameter (for programmatic messages)
        if (message) {
          parts.push(`<user_message>\n${message.trim()}\n</user_message>`);
        }
      
        return parts.join('\n\n');
      };

      const prompt = await buildPrompt();
      
      console.log('🚀 Sending to backend:', prompt.substring(0, 100) + '...');
      
      // Send directly to background script
      const reply = await chrome.runtime.sendMessage({
        type: 'CHAT_MESSAGE',
        data: { message: prompt }
      });
      
      const responseContent = reply.content || "I do not find any response, sorry.";
      
      // ALWAYS add the AI response to chat (even when addToChat is false)
      // addToChat: false only affects the user message, not the AI response
      const response = {
        id: Date.now() + 1,
        type: MESSAGE_TYPES.ASSISTANT,
        content: responseContent.trim(),
        timestamp: new Date()
      };

      if (addResponseToChat)
        setChatMessages(prev => [...prev, response]);
      
      // Return reply if requested
      if (returnReply) {
        return responseContent;
      }
      
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
      
      if (returnReply) {
        return errorContent;
      }
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

  // Method to directly add messages to the chat
  const addUserMessage = useCallback((message) => {
    const newMessage = {
      id: Date.now(),
      type: MESSAGE_TYPES.USER,
      content: message,
      timestamp: new Date(),
      ...message // Allow overriding any properties
    };

    setChatMessages(prev => [...prev, newMessage]);
  }, []);

    // Method to directly add messages to the chat
    const addAssistantMessage = useCallback((message) => {
      const newMessage = {
        id: Date.now(),
        type: MESSAGE_TYPES.ASSISTANT,
        content: message,
        timestamp: new Date(),
        ...message // Allow overriding any properties
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

  const setGetFileContentsFunction = (fn) => {
    getFileContentsFunctionRef.current = fn;
  };
  

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