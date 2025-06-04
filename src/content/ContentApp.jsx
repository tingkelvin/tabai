import React, { useState, useEffect, useRef, useCallback } from 'react';
import TerminalIcon from './TerminalIcon';
// Import CSS: import './terminal-widget.css';

const ContentApp = () => {
  const [isMinimized, setIsMinimized] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('');

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  // Position state for the widget (when expanded)
  const [widgetPosition, setWidgetPosition] = useState({
    top: 20,
    left: window.innerWidth - 480 - 20
  });

  // Size state for the widget
  const [widgetSize, setWidgetSize] = useState({
    width: 480,
    height: 320
  });

  // Position state for the icon (when minimized)
  const [iconPosition, setIconPosition] = useState({
    top: 20,
    left: window.innerWidth - 32 - 20 // Icon width + margin
  });

  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [resizeType, setResizeType] = useState(''); // 'nw', 'ne', 'sw', 'se'
  const [rel, setRel] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false); // Track if actual dragging occurred

  const widgetRef = useRef(null);
  const iconRef = useRef(null);
  const chatInputRef = useRef(null);
  const chatMessagesRef = useRef(null);

  // URL State Management
  const updateUrlState = useCallback(() => {
    const hostname = window.location.hostname;
    setCurrentUrl(hostname);
  }, []);

  useEffect(() => {
    updateUrlState();

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(updateUrlState, 50);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(updateUrlState, 50);
    };

    window.addEventListener('popstate', updateUrlState);
    window.addEventListener('hashchange', updateUrlState);

    let lastCheckedUrl = window.location.href;
    const urlCheckInterval = setInterval(() => {
      const currentHref = window.location.href;
      if (currentHref !== lastCheckedUrl) {
        lastCheckedUrl = currentHref;
        updateUrlState();
      }
    }, 1000);

    return () => {
      window.removeEventListener('popstate', updateUrlState);
      window.removeEventListener('hashchange', updateUrlState);
      clearInterval(urlCheckInterval);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [updateUrlState]);

  // Auto-scroll chat messages
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages, isTyping]);

  // Chat functionality
  const generateAIResponse = (userMessage) => {
    return "That\'s a great how question! I\'d be happy to help explain the process or provide step-by-step guidance. Could you be more specific about what you\'d like to know? Interesting question! I can provide information and explanations. What specifically would you like to know more about? Interesting question! I can provide information and explanations. What specifically would you like to know more about?"
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
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
        type: 'assistant',
        content: generateAIResponse(userMessage.content),
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 800 + Math.random() * 1200);
  };

  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  };

  const handleChatInputChange = (e) => {
    setChatInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
  };

  const handleClose = () => {
    const container = document.getElementById('react-extension-root');
    if (container) container.remove();
  };

  const handleMinimize = () => {
    if (!isMinimized) {
      // Calculate icon position based on widget's top-right corner
      const iconTop = widgetPosition.top;
      const iconLeft = widgetPosition.left + widgetSize.width - 32; // Widget width - icon width
      setIconPosition({ top: iconTop, left: iconLeft });
    }
    setIsMinimized(true);
  };

  const handleExpand = () => {
    // Only expand if we haven't been dragging
    if (hasDragged) return;
    
    if (isMinimized) {
      // Calculate widget position based on icon position (icon should be at top-right)
      const widgetTop = iconPosition.top;
      const widgetLeft = iconPosition.left - widgetSize.width + 32; // Icon left - widget width + icon width
      
      // Ensure widget doesn't go off-screen
      const adjustedLeft = Math.max(0, Math.min(widgetLeft, window.innerWidth - widgetSize.width));
      const adjustedTop = Math.max(0, Math.min(widgetTop, window.innerHeight - widgetSize.height));
      
      setWidgetPosition({ top: adjustedTop, left: adjustedLeft });
    }
    setIsMinimized(false);
    
    // Focus the chat input when expanding
    setTimeout(() => {
      if (chatInputRef.current) {
        chatInputRef.current.focus();
      }
    }, 100);
  };

  // Draggable Logic for Widget Header
  const handleHeaderMouseDown = (e) => {
    if (isMinimized) return;
    if (e.button !== 0) return;

    const widget = e.currentTarget.closest('.extension-widget');
    if (!widget) return;

    const rect = widget.getBoundingClientRect();
    setDragging(true);
    setRel({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    e.preventDefault();
  };

  // Resize Logic
  const handleResizeMouseDown = (e, type) => {
    if (isMinimized) return;
    if (e.button !== 0) return;

    setResizing(true);
    setResizeType(type);
    setRel({ x: e.clientX, y: e.clientY });
    e.preventDefault();
    e.stopPropagation();
  };

  // Draggable Logic for Icon
  const handleIconMouseDown = (e) => {
    if (!isMinimized) return;
    if (e.button !== 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setDragging(true);
    setHasDragged(false); // Reset drag flag
    setRel({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    e.preventDefault();
    e.stopPropagation(); // Prevent expand from triggering
  };

  useEffect(() => {
    if (!dragging && !resizing) return;

    const handleMouseMove = (e) => {
      if (resizing) {
        // Handle resizing
        const deltaX = e.clientX - rel.x;
        const deltaY = e.clientY - rel.y;

        setWidgetSize(prevSize => {
          let newWidth = prevSize.width;
          let newHeight = prevSize.height;

          // Handle different corner resize types
          switch (resizeType) {
            case 'se': // Southeast - increase both
              newWidth = Math.max(300, prevSize.width + deltaX);
              newHeight = Math.max(200, prevSize.height + deltaY);
              break;
            case 'sw': // Southwest - decrease width, increase height
              newWidth = Math.max(300, prevSize.width - deltaX);
              newHeight = Math.max(200, prevSize.height + deltaY);
              break;
            case 'ne': // Northeast - increase width, decrease height
              newWidth = Math.max(300, prevSize.width + deltaX);
              newHeight = Math.max(200, prevSize.height - deltaY);
              break;
            case 'nw': // Northwest - decrease both
              newWidth = Math.max(300, prevSize.width - deltaX);
              newHeight = Math.max(200, prevSize.height - deltaY);
              break;
          }

          // Ensure widget doesn't exceed viewport
          newWidth = Math.min(newWidth, window.innerWidth - widgetPosition.left);
          newHeight = Math.min(newHeight, window.innerHeight - widgetPosition.top);

          return { width: newWidth, height: newHeight };
        });

        // For NW and SW, we also need to adjust position when resizing
        if (resizeType === 'nw' || resizeType === 'sw') {
          setWidgetPosition(prevPos => ({
            ...prevPos,
            left: Math.max(0, prevPos.left + deltaX)
          }));
        }
        if (resizeType === 'nw' || resizeType === 'ne') {
          setWidgetPosition(prevPos => ({
            ...prevPos,
            top: Math.max(0, prevPos.top + deltaY)
          }));
        }

        setRel({ x: e.clientX, y: e.clientY });
      } else if (dragging) {
        // Handle dragging
        let newLeft = e.clientX - rel.x;
        let newTop = e.clientY - rel.y;

        // Mark that we've actually dragged (moved the mouse while dragging)
        setHasDragged(true);

        if (isMinimized) {
          // Dragging the icon
          newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - 32));
          newTop = Math.max(0, Math.min(newTop, window.innerHeight - 32));
          setIconPosition({ top: newTop, left: newLeft });
        } else {
          // Dragging the widget
          newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - widgetSize.width));
          newTop = Math.max(0, Math.min(newTop, window.innerHeight - widgetSize.height));
          setWidgetPosition({ top: newTop, left: newLeft });
        }
      }
    };

    const handleMouseUp = () => {
      setDragging(false);
      setResizing(false);
      setResizeType('');
      // Reset the drag flag after a short delay to allow click events to process
      setTimeout(() => setHasDragged(false), 100);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [dragging, resizing, resizeType, rel, isMinimized, widgetPosition, widgetSize]);

  if (isMinimized) {
    return (
      <div
        ref={iconRef}
        className={`extension-widget minimized ${dragging ? 'dragging' : ''}`}
        style={{
          top: iconPosition.top,
          left: iconPosition.left,
        }}
        onMouseDown={handleIconMouseDown}
      >
        <TerminalIcon onClick={handleExpand} />
      </div>
    );
  }

  return (
    <div
      ref={widgetRef}
      className={`extension-widget expanded`}
      style={{
        top: widgetPosition.top,
        left: widgetPosition.left,
        width: widgetSize.width,
        height: widgetSize.height,
      }}
    >
      <div
        className={`extension-header ${dragging ? 'dragging' : ''}`}
        onMouseDown={handleHeaderMouseDown}
      >
        <div className="extension-controls">
          <button
            className="minimize-btn"
            onClick={handleMinimize}
            title="Minimize"
          />
          <button
            className="close-btn"
            onClick={handleClose}
            title="Close"
          />
        </div>
        <h3>AI Chat — {currentUrl}</h3>
      </div>

      <div className="extension-content">
        {/* Chat Section */}
        <div className="chat-section">
          <div className="chat-messages" ref={chatMessagesRef}>
            {chatMessages.map((message) => (
              <div key={message.id} className={`chat-message ${message.type}`}>
                <div className="message-content">
                  <div className="message-text">
                    {message.content.split('\n').map((line, index) => (
                      <div key={index}>
                        {line}
                        {index < message.content.split('\n').length - 1 && <br />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          }
            
          {/* Typing indicator */}
          {isTyping && (
            <div className="chat-message assistant typing">
              <div className="message-content">
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            </div>
          )}
          </div>

          <textarea
            ref={chatInputRef}
            className="chat-input"
            value={chatInput}
            onChange={handleChatInputChange}
            onKeyPress={handleChatKeyPress}
            placeholder="Ask me anything..."
            rows="1"
            autoComplete="off"
            spellCheck="false"
          />
        </div>
      </div>

      {/* Resize Handles - 4 Corners */}
      <div 
        className="resize-handle nw" 
        onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
        title="Resize"
      />
      <div 
        className="resize-handle ne" 
        onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
        title="Resize"
      />
      <div 
        className="resize-handle sw" 
        onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
        title="Resize"
      />
      <div 
        className="resize-handle se" 
        onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
        title="Resize"
      />
    </div>
  );
};

export default ContentApp;