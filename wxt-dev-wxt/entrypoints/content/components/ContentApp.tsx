import React, { useState, useRef } from 'react'

// Components import
import TerminalIcon from './TerminalIcon'
import TerminalHeader from './TerminalHeader'
import ChatHistory from './ChatHistory'
import ChatInput from './ChatInput'
import ResizeHandle from './ResizeHandle'
import Notifications from './Notifications'
// Types import
import type { ContentAppProps } from '../types/components'
import { WIDGET_CONFIG, RESIZE_TYPES } from '../utils/constant'
import { useDragAndResize } from '../hooks/useDragAndResize'
import { useChat } from '../hooks/useChat'
import useClickableDetection from '../hooks/useClickableDetection'
import { useDOMNavigation } from '../hooks/useDOMNavigation'

const ContentApp: React.FC<ContentAppProps> = ({ customChatHook, title = '' }) => {
  // Chat
  const chatMessagesRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const chatHook = customChatHook ? customChatHook() : useChat()
  const {
    chatInput,
    chatMessages,
    isThinking,
    handleInputChange,
    handleKeyPress,
  } = chatHook
  // Chat

  // Drag and resize
  const widgetRef = useRef<HTMLDivElement>(null)
  const [widgetSize, setWidgetSize] = useState({
    width: WIDGET_CONFIG.DEFAULT_WIDTH,
    height: WIDGET_CONFIG.DEFAULT_HEIGHT,
  })

  const {
    handleMouseDown,
    handleToggle,
    startResize,
    isMinimized,
    isDragging,
    isResizing,
    currentSize,
    iconPosition
  } = useDragAndResize(widgetRef, {
    widgetSize,
    onSizeChange: setWidgetSize,
  })
  // Drag and resize

  // Clickable Detection Hook
  const {
    isHighlighting,
    totalCount,
    byType,
    highlightClickables,
    removeHighlights,
    toggleHighlight,
    detectClickables,
    refreshDetection,
    getClickableDetails,
    getClickablesByType
  } = useClickableDetection({
    autoDetect: true,              // Auto-start detection
    highlightColor: '#00ff00',     // Green highlights
    showLabels: true,              // Show numbered labels
    watchForDynamicContent: true,  // Monitor for new elements
    includeDisabled: false,        // Include disabled elements
    minClickableSize: 10,          // Minimum size in pixels
    highlightFirstOnly: true,      // Only highlight first N elements
    highlightCount: 1000             // Highlight first 50 clickable elements
  })


  // const visitedContainers = new Set();

  // const containerNavigation = useDOMNavigation({
  //   filter: (element) => {
  //     const containerTags = ['DIV', 'SECTION', 'ARTICLE', 'ASIDE', 'NAV', 'HEADER', 'FOOTER', 'MAIN'];

  //     if (!containerTags.includes(element.tagName)) return false;
  //     if (visitedContainers.has(element)) return false;

  //     const clickableSelectors = 'button, a, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"]), [onclick]';
  //     return element.querySelector(clickableSelectors) !== null;
  //   }
  // });

  // const { navigate } = containerNavigation;

  // const getRandomColor = () => {
  //   return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  // };

  // useEffect(() => {
  //   navigate((container, index) => {
  //     visitedContainers.add(container);

  //     const randomColor = getRandomColor();
  //     container.style.border = `2px solid ${randomColor}`;
  //     container.style.position = 'relative';

  //     const label = document.createElement('div');
  //     label.textContent = `Container ${index}`;
  //     label.style.cssText = `position: absolute; top: -20px; left: 0; background: ${randomColor}; color: white; padding: 2px 6px; font-size: 12px; z-index: 1000;`;
  //     container.appendChild(label);
  //   });
  // }, []);
  return (
    <>
      <Notifications
        iconPosition={iconPosition}
        chatMessages={chatMessages}
        isMinimized={isMinimized}
        isThinking={isThinking}
        onNotificationClick={handleToggle}
      />
      {isMinimized ? (
        <div
          ref={widgetRef}
          className='terminal-widget minimized'
          onMouseDown={handleMouseDown}
        >
          <TerminalIcon isThinking={isThinking} onClick={handleToggle} />
        </div>

      ) : (
        <div
          ref={widgetRef}
          className={`terminal-widget expanded ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
          style={{
            width: `${currentSize.width}px`,
            height: `${currentSize.height}px`,
          }}
        >
          <TerminalHeader
            dragging={isDragging}
            startDrag={handleMouseDown}
            handleMinimize={handleToggle}
            title={title}
          />
          <div className='terminal-content'>
            <div className='chat-section'>
              <ChatHistory
                chatMessagesRef={chatMessagesRef}
                chatMessages={chatMessages}
                isThinking={isThinking}
              />
              <ChatInput
                fileActions={[]}
                buttons={[]}
                chatInputRef={chatInputRef}
                chatInput={chatInput}
                handleInputChange={handleInputChange}
                handleKeyPress={handleKeyPress}
              />
            </div>
          </div>

          {/* Resize handles */}
          <ResizeHandle
            type={RESIZE_TYPES.SOUTHEAST}
            onMouseDown={startResize}
            className="resize-handle resize-se"
          />
          <ResizeHandle
            type={RESIZE_TYPES.SOUTHWEST}
            onMouseDown={startResize}
            className="resize-handle resize-sw"
          />
          <ResizeHandle
            type={RESIZE_TYPES.NORTHEAST}
            onMouseDown={startResize}
            className="resize-handle resize-ne"
          />
          <ResizeHandle
            type={RESIZE_TYPES.NORTHWEST}
            onMouseDown={startResize}
            className="resize-handle resize-nw"
          />
        </div>
      )}
    </>
  )
}

export default ContentApp