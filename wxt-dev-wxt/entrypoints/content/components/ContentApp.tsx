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
import { useDOMTreeWalker } from '../hooks/useDomTreewalker'
import { HighlightOptions, useClickableHighlighter } from '../hooks/useClickableHighligter'

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


  // const {
  //   isHighlighting,
  //   totalCount,
  //   byType,
  //   highlightClickables,
  //   removeHighlights,
  //   toggleHighlight,
  //   detectClickables,
  //   refreshDetection,
  //   getClickableDetails,
  //   getClickablesByType

  // } = useClickableDetection();

  const { clickablePaths, isScanning, scanDOM } = useDOMTreeWalker()
  const { highlightClickables, clearHighlights, highlightTemporarily } = useClickableHighlighter()

  const scanAndHighlight = (options?: HighlightOptions) => {
    const elements = scanDOM()
    highlightClickables(elements, options)
    return elements
  }

  useEffect(() => {
    console.log("update")
    scanAndHighlight()
  }, [])

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