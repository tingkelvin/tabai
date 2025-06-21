import React, { useState, useRef, useEffect } from 'react'
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
import { useUrlTracker } from '../hooks/useUrlTracker'
import useClickableDetection from '../hooks/useClickableDetection'

const ContentApp: React.FC<ContentAppProps> = ({ customChatHook, title = '' }) => {
  // URL tracking to re-detect on navigation
  const currentUrl = useUrlTracker()

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
    detectCustomClickables: true,  // Find JS-based clickables
    includeDisabled: false,        // Include disabled elements
    minClickableSize: 10,          // Minimum size in pixels
    highlightFirstOnly: true,      // Only highlight first N elements
    highlightCount: 1000             // Highlight first 50 clickable elements
  })

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

  // Re-detect when URL changes
  useEffect(() => {
    console.log('URL changed, re-detecting clickable elements:', currentUrl)
    const timer = setTimeout(() => {
      if (currentUrl) {
        refreshDetection()
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [currentUrl, refreshDetection])

  // Clickable detection control buttons
  const clickableDetectionButtons = [
    {
      icon: isHighlighting ? '🔴' : '🟢',
      label: isHighlighting ? 'Hide Top 50' : 'Show Top 50',
      onClick: toggleHighlight,
      className: isHighlighting ? 'btn-danger' : 'btn-success'
    },
    {
      icon: '🔄',
      label: 'Refresh Detection',
      onClick: refreshDetection,
      className: 'btn-info'
    },
    {
      icon: '📊',
      label: 'Scan Results',
      onClick: () => {
        const detection = detectClickables()
        console.log('Clickable Detection Results:', detection)
        console.log('By Type:', byType)
        console.log('Detailed Info:', getClickableDetails())
      },
      className: 'btn-secondary'
    }
  ]

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
          style={{ position: 'relative' }}
        >
          <TerminalIcon isThinking={isThinking} onClick={handleToggle} />

          {/* Clickable count badge when minimized */}
          {totalCount > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                background: isHighlighting ? '#00ff00' : '#666',
                color: isHighlighting ? 'black' : 'white',
                borderRadius: '50%',
                minWidth: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 'bold',
                padding: '0 4px',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
              title={`${totalCount} clickable elements detected`}
            >
              {totalCount}
            </div>
          )}

          {/* Status indicator */}
          <div
            style={{
              position: 'absolute',
              top: '2px',
              left: '2px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isHighlighting ? '#00ff00' : '#ff0000',
              boxShadow: '0 0 4px rgba(0,0,0,0.5)'
            }}
            title={isHighlighting ? 'Top 50 clickable detection active' : 'Top 50 clickable detection inactive'}
          />
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
            title={title || `Top 50 Clickable Detector ${isHighlighting ? '(Active)' : '(Inactive)'}`}
          />

          <div className='terminal-content'>
            {/* Clickable Detection Status Panel */}
            <div style={{
              padding: '10px',
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
              borderBottom: '1px solid #dee2e6',
              fontSize: '13px',
              fontFamily: 'monospace'
            }}>
              {/* Status Row */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: isHighlighting ? '#28a745' : '#dc3545',
                      boxShadow: isHighlighting ? '0 0 8px #28a745' : '0 0 8px #dc3545'
                    }}
                  />
                  <span style={{ fontWeight: 'bold' }}>
                    {isHighlighting ? 'TOP 50 CLICKABLES HIGHLIGHTED' : 'TOP 50 CLICKABLE DETECTION INACTIVE'}
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: '#6c757d' }}>
                  {new URL(currentUrl).hostname}
                </div>
              </div>

              {/* Stats Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '12px',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
                    {Object.keys(byType).length}
                  </div>
                  <div style={{ fontSize: '10px', color: '#666' }}>Types</div>
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#007bff' }}>
                    {totalCount}
                  </div>
                  <div style={{ fontSize: '10px', color: '#666' }}>Elements</div>
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff8800' }}>
                    {Object.values(byType).reduce((sum, count) => sum + count, 0)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#666' }}>Total</div>
                </div>
              </div>

              {/* Type breakdown */}
              {Object.keys(byType).length > 0 && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '10px',
                  color: '#666',
                  textAlign: 'center',
                  maxHeight: '40px',
                  overflow: 'auto'
                }}>
                  <strong>Types:</strong> {Object.entries(byType)
                    .map(([type, count]) => `${type}:${count}`)
                    .join(', ')}
                </div>
              )}

              {/* Control Buttons */}
              <div style={{
                display: 'flex',
                gap: '6px',
                marginTop: '10px',
                justifyContent: 'center'
              }}>
                {clickableDetectionButtons.map((button, index) => (
                  <button
                    key={index}
                    onClick={button.onClick}
                    style={{
                      padding: '4px 8px',
                      fontSize: '10px',
                      background: button.className?.includes('danger') ? '#dc3545' :
                        button.className?.includes('success') ? '#28a745' :
                          button.className?.includes('info') ? '#17a2b8' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.opacity = '0.8'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.opacity = '1'
                    }}
                    title={button.label}
                  >
                    <span>{button.icon}</span>
                    <span>{button.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className='chat-section'>
              <ChatHistory
                chatMessagesRef={chatMessagesRef}
                chatMessages={chatMessages}
                isThinking={isThinking}
              />
              <ChatInput
                fileActions={[]}
                buttons={clickableDetectionButtons}
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