import React, { useState, useRef } from 'react'

// Components import
import TerminalIcon from './TerminalIcon'
import TerminalHeader from './TerminalHeader'
import ChatHistory from './ChatHistory'
import ChatInput from './ChatInput'
import ResizeHandle from './ResizeHandle' // You'll need to create this component

// Types import
import type { ContentAppProps } from '../types'
import type { ChatMessage } from '../types/chat'
import { WIDGET_CONFIG, RESIZE_TYPES } from '../utils/constant'
import { useDragAndResize } from '../hooks/useDragAndResize'
import { useChat } from '../hooks/useChat'

const ContentApp: React.FC<ContentAppProps> = ({ customChatHook, title = '' }) => {

  // Chat
  const chatMessagesRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const chatHook = customChatHook ? customChatHook() : useChat()
  const {
    chatInput,
    chatMessages,
    isTyping,
    handleInputChange,
    handleKeyPress,
  } = chatHook

  const [widgetSize, setWidgetSize] = useState({
    width: WIDGET_CONFIG.DEFAULT_WIDTH,
    height: WIDGET_CONFIG.DEFAULT_HEIGHT,
  })
  // Chat

  // Drag and resize
  const widgetRef = useRef<HTMLDivElement>(null)

  const {
    handleMouseDown,
    handleToggle,
    startResize,
    isMinimized,
    isDragging,
    isResizing,
    currentSize,
  } = useDragAndResize(widgetRef, {
    widgetSize,
    onSizeChange: setWidgetSize,
  })
  // Drag and resize

  return (
    <>
      {isMinimized ? (
        <div
          ref={widgetRef}
          className='terminal-widget minimized'
          onMouseDown={handleMouseDown}
        >
          <TerminalIcon isTyping={isTyping} onClick={handleToggle} />
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
                isTyping={isTyping}
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