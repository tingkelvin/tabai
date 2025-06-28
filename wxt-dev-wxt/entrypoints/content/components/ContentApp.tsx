import React, { useState, useRef } from 'react'
// Components import
import TerminalIcon from './TerminalIcon'
import TerminalHeader from './TerminalHeader'
import ChatHistory from './ChatHistory'
import ChatInput from './ChatInput'
import ResizeHandle from './ResizeHandle'
import Notifications from './Notifications'
// Types import
import type { ActionButton, ContentAppProps } from '../types/components'
import { WIDGET_CONFIG, RESIZE_TYPES } from '../utils/constant'
import { useDragAndResize } from '../hooks/useDragAndResize'
import { useChat } from '../hooks/useChat'
import { usePageHook } from '../hooks/usePageHook'
// import { usePageHook } from '../hooks/usePageHook'

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

  // Page
  const {
    clearHighlights,
    scanAndHighlight,
    getElementAtCoordinate
  } = usePageHook()

  useEffect(() => {
    getElementAtCoordinate(iconPosition.left, iconPosition.top)
  }, [iconPosition])

  // Page

  const [isHighlighting, setIsHighlighting] = useState(false)

  // const toggleHighlight = () => {
  //   if (isHighlighting) {
  //     clearHighlights()
  //     scanAndHighlight()
  //     setIsHighlighting(false)
  //   } else {
  //     scanAndHighlight()
  //     setIsHighlighting(true)
  //   }
  // }

  // const highlightToggleButton: ActionButton = {
  //   id: 'toggle-highlight',
  //   icon: (
  //     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  //       <path d="m9 11-6 6v3h3l6-6" />
  //       <path d="m22 12-4.5 4.5L15 14l4.5-4.5L22 12z" />
  //       <path d="M15 5l4 4" />
  //     </svg>
  //   ),
  //   label: isHighlighting ? 'Clear' : 'Highlight',
  //   onClick: toggleHighlight,
  //   title: isHighlighting ? 'Clear highlights' : 'Scan and highlight clickable elements',
  //   className: isHighlighting ? 'active' : '',
  // }

  return (
    <>
      <div className="content-app">
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
      </div>
    </>
  )
}

export default ContentApp