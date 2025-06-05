// ContentApp.jsx - Fixed with onUrlChange support
import React, { useState, useEffect, useRef, useCallback } from 'react';
import TerminalIcon from './TerminalIcon';
import { useUrlTracking } from './hooks/useUrlTracking';
import { usePosition } from './hooks/usePosition';
import { useDragAndResize } from './hooks/useDragAndResize';
import { useChat } from './hooks/useChat';
import { calculateInitialPositions } from './utils/helpers';
import { WIDGET_CONFIG, RESIZE_TYPES, MESSAGE_TYPES } from './utils/constants';

const ContentApp = ({ 
  useCustomChat,
  customActions = [], // Array of custom action objects
  onUrlChange // ADDED: URL change callback prop
}) => {
  const [isMinimized, setIsMinimized] = useState(true);

  // URL tracking - single source of truth
  const currentUrl = useUrlTracking();
  const previousUrl = useRef(currentUrl);

  // Calculate initial positions
  const { widgetPosition: initialWidgetPos, iconPosition: initialIconPos } = calculateInitialPositions();
  
  // Position management
  const [widgetPosition, updateWidgetPosition, constrainWidgetPosition] = usePosition(initialWidgetPos);
  const [iconPosition, updateIconPosition, constrainIconPosition] = usePosition(initialIconPos);

  // Size state for the widget
  const [widgetSize, setWidgetSize] = useState({
    width: WIDGET_CONFIG.DEFAULT_WIDTH,
    height: WIDGET_CONFIG.DEFAULT_HEIGHT
  });

  // Use custom chat hook if provided, otherwise use default
  const chatHook = useCustomChat ? useCustomChat() : useChat();
  const { 
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
    setIsTyping
  } = chatHook;

  // Handle URL changes
  useEffect(() => {
    // Only process if URL actually changed
    if (currentUrl !== previousUrl.current) {
      previousUrl.current = currentUrl;
    }
    
    if (onUrlChange) {
      onUrlChange(currentUrl);
    }
    
  }, [currentUrl, addMessage, onUrlChange]); // Include all dependencies

  // Drag and resize functionality
  const { dragging, hasDragged, startDrag, startResize } = useDragAndResize(
    widgetSize, 
    widgetPosition, 
    iconPosition, 
    isMinimized,
    setWidgetSize, 
    updateWidgetPosition, 
    updateIconPosition
  );

  // Refs
  const chatInputRef = useRef(null);
  const chatMessagesRef = useRef(null);

  // Auto-scroll chat messages
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages, isTyping]);

  const handleClose = useCallback(() => {
    const container = document.getElementById('react-extension-root');
    if (container) container.remove();
  }, []);

  const handleMinimize = useCallback(() => {
    if (!isMinimized) {
      const iconTop = widgetPosition.top;
      const iconLeft = widgetPosition.left + widgetSize.width - WIDGET_CONFIG.ICON_SIZE;
      updateIconPosition({ top: iconTop, left: iconLeft });
    }
    setIsMinimized(true);
  }, [isMinimized, widgetPosition, widgetSize, updateIconPosition]);

  const handleExpand = useCallback(() => {
    if (hasDragged) return;
    
    if (isMinimized) {
      const widgetTop = iconPosition.top;
      const widgetLeft = iconPosition.left - widgetSize.width + WIDGET_CONFIG.ICON_SIZE;
      
      const constrainedPosition = constrainWidgetPosition(
        { top: widgetTop, left: widgetLeft },
        { elementWidth: widgetSize.width, elementHeight: widgetSize.height }
      );
      
      updateWidgetPosition(constrainedPosition);
    }
    setIsMinimized(false);
    
    setTimeout(() => {
      if (chatInputRef.current) {
        chatInputRef.current.focus();
      }
    }, 100);
  }, [hasDragged, isMinimized, iconPosition, widgetSize, constrainWidgetPosition, updateWidgetPosition]);

  // Filter and render visible custom actions
  const visibleActions = customActions.filter(action => 
    typeof action.isVisible === 'function' ? action.isVisible() : action.isVisible !== false
  );

  if (isMinimized) {
    return (
      <div
        className={`extension-widget minimized ${dragging ? 'dragging' : ''}`}
        style={{
          top: iconPosition.top,
          left: iconPosition.left,
        }}
        onMouseDown={(e) => startDrag(e, true)}
      >
        <TerminalIcon onClick={handleExpand} />
      </div>
    );
  }

  return (
    <div
      className="extension-widget expanded"
      style={{
        top: widgetPosition.top,
        left: widgetPosition.left,
        width: widgetSize.width,
        height: widgetSize.height,
      }}
    >
      <div
        className={`extension-header ${dragging ? 'dragging' : ''}`}
        onMouseDown={startDrag}
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
            ))}
            
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

          {/* Chat input container with custom actions */}
          <div className="chat-input-container">
            {/* Render custom action buttons */}
            {visibleActions.length > 0 && (
              <div className="custom-actions-container">
                {visibleActions.map((action, index) => (
                  <button
                    key={action.id || index}
                    className={`custom-action-btn ${action.className || ''}`}
                    onClick={action.onClick}
                    title={action.title}
                    disabled={action.disabled}
                    style={action.style}
                  >
                    {action.icon && <span className="action-icon">{action.icon}</span>}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
            
            <textarea
              ref={chatInputRef}
              className="chat-input"
              value={chatInput}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              rows="1"
              autoComplete="off"
              spellCheck="false"
            />
          </div>
        </div>
      </div>

      {/* Resize Handles - 4 Corners */}
      {Object.values(RESIZE_TYPES).map(type => (
        <div 
          key={type}
          className={`resize-handle ${type}`} 
          onMouseDown={(e) => startResize(e, type)}
          title="Resize"
        />
      ))}
    </div>
  );
};

export default ContentApp;