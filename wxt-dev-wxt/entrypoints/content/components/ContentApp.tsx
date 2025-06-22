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
// BFS Hooks
import { useBFSControls, useAutoClearBFS } from '../hooks/useBFSCollector'

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

  // BFS functionality
  const { collectedData, isCollecting, buttons, clearBorders } = useBFSControls(widgetRef);

  // Auto-clear borders when minimized
  useAutoClearBFS(isMinimized, clearBorders);

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

              {/* BFS Status Display */}
              {collectedData && (
                <div style={{
                  padding: '8px',
                  margin: '4px 0',
                  background: 'rgba(0, 255, 0, 0.1)',
                  border: '1px solid rgba(0, 255, 0, 0.3)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}>
                  <div>🎯 Found: {collectedData.targetElements?.length || 0} elements</div>
                  <div>📊 Total nodes: {collectedData.stats?.totalNodes || 0}</div>
                  <div>📏 Max depth: {collectedData.stats?.maxDepth || 0}</div>
                </div>
              )}

              <ChatInput
                fileActions={[]}
                buttons={buttons}
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