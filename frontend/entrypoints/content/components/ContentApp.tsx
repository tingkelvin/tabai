import React, { useState, useRef, useEffect, useCallback } from 'react'
// Components import
import TerminalIcon from './TerminalIcon'
import TerminalHeader from './TerminalHeader'
import ChatHistory from './ChatHistory'
import ChatInput from './ChatInput'
import ResizeHandle from './ResizeHandle'
import Notifications from './Notifications'

// Types import
import type { ActionButton, ContentAppProps } from '../types/components'
import { WIDGET_CONFIG, RESIZE_TYPES, MESSAGE_TYPES } from '../utils/constant'
import { useDragAndResize } from '../hooks/useDragAndResize'
import { useChat } from '../hooks/useChat'
import { usePage } from '../hooks/usePage'
import { useFile } from '../hooks/useFile'
import { getFileIcon, PlusIcon } from './Icons'
import { useAgentChat } from '../hooks/useAgent'
import { PROMPT_TEMPLATES } from '../utils/prompMessages'
import { useAppState } from '../hooks/useAppState'

const ContentApp: React.FC<ContentAppProps> = ({ customChatHook, title = '' }) => {
  // Mode states

  const fileInputRef = useRef<HTMLInputElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null)
  const { state, updateModeState, updatePageState, updateFileState } = useAppState();
  const { chatMessages, isThinking, useSearch, useAgent, task } = state;

  // Agent state management
  const isSendingManually = useRef(false);

  const [widgetSize, setWidgetSize] = useState({
    width: WIDGET_CONFIG.DEFAULT_WIDTH,
    height: WIDGET_CONFIG.DEFAULT_HEIGHT,
  })

  // Page hooks
  const {
    pageState,
    getElementAtCoordinate,
    withMutationPaused
  } = usePage()

  // File hooks
  const {
    uploadedFiles,
    handleFileUpload,
    removeFile,
    formatFileName,
    fileContentAsString
  } = useFile()

  // Chat refs
  const chatMessagesRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  // Chat hook now receives state and updaters
  const chatHook = customChatHook ? customChatHook() : useChat();

  const {
    chatInput,
    handleInputChange,
    addAssistantMessage,
    addUserMessage,
    sendMessage,
    handleKeyPress: baseHandleKeyPress
  } = chatHook

  // UI hooks
  const {
    handleMouseDown,
    handleToggle,
    startResize,
    isMinimized,
    setIsMinimized,
    isDragging,
    isResizing,
    currentSize,
    iconPosition
  } = useDragAndResize(widgetRef, {
    widgetSize,
    onSizeChange: setWidgetSize
  })

  // Agent hook
  const { processAgentReply } = useAgentChat(chatHook, {
    pageState,
  });
  // Complex orchestrated send message
  const handleSendMessage = useCallback(async (message: string) => {
    console.log('🎬 Starting orchestrated message flow');
    isSendingManually.current = true;

    addUserMessage(message)

    try {
      const reply = await sendMessage(message);
      // 5. Process response
      if (useAgent) {
        setIsMinimized(true)
        // Parse agent response
        if (!reply) {
          addAssistantMessage(PROMPT_TEMPLATES.PARSING_ERROR);
        } else {
          console.log('🤖 Processing agent response:', reply);
          withMutationPaused(() => {
            processAgentReply(reply);
          });
        }
      } else {
        // Regular chat mode
        addAssistantMessage(reply);
      }
    } catch (error) {
      console.error('❌ Orchestration error:', error);
      addAssistantMessage(PROMPT_TEMPLATES.ERROR_GENERIC);
    } finally {
      isSendingManually.current = false;
    }
  }, [
    chatInput,
    useAgent,
    useSearch,
    pageState,
    isMinimized,
    setIsMinimized,
    addUserMessage,
    addAssistantMessage,
    sendMessage,
    withMutationPaused,
    processAgentReply,
  ]);

  useEffect(() => {
    const handlePageStateChange = async () => {
      // if (pageState) {
      //   updatePageState({ pageState })
      //   if (useAgent && task) {
      //     const reply = await sendMessage(task);
      //     if (!reply) {
      //       addAssistantMessage(PROMPT_TEMPLATES.PARSING_ERROR);
      //     } else {
      //       console.log('🤖 Processing agent response:', reply);
      //       withMutationPaused(() => {
      //         processAgentReply(reply);
      //       });
      //     }
      //   }
      // }
    };

    handlePageStateChange();
  }, [pageState])

  // Custom key press handler
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      const input = chatInput.trim();
      baseHandleKeyPress(e)
      // Use orchestrated send message
      handleSendMessage(input);
    }
  }, [chatInput, useAgent, addAssistantMessage, handleSendMessage]);

  // Toggle handlers
  const toggleWebSearch = useCallback(() => {
    updateModeState({ useSearch: !useSearch });
    console.log('Web search toggled:', !useSearch);
  }, [useSearch]);

  const toggleAgent = useCallback(() => {
    updateModeState({ useAgent: !useAgent });
    console.log('Agent toggled:', !useAgent);
  }, [useAgent]);

  // File upload handler
  const handleOptimizedFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await handleFileUpload(file);
      event.target.value = ''; // Clear input
      updateFileState({ fileContentAsString })
    } catch (error) {
      console.error('File upload failed:', error);
    }
  }, [handleFileUpload]);

  // File actions for the input area
  const fileActions = [
    {
      id: 'upload-file',
      label: '',
      icon: <PlusIcon />,
      onClick: () => fileInputRef.current?.click(),
      className: 'upload-file-action'
    },
    ...uploadedFiles.map((file, index) => ({
      id: `file-${index}`,
      label: formatFileName(file.name),
      icon: getFileIcon(file.name),
      onClick: async () => {
        try {
          await removeFile(file);
        } catch (error) {
          console.error('File removal failed:', error);
        }
      },
      className: 'file-action'
    }))
  ];

  // Action buttons
  const webSearchButton: ActionButton = {
    id: 'web-search',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
        <path d="M11 6a5 5 0 0 1 5 5" />
      </svg>
    ),
    label: 'Web',
    onClick: toggleWebSearch,
    title: useSearch ? 'Disable web search' : 'Enable web search',
    className: useSearch ? 'active' : '',
  }

  const agentButton: ActionButton = {
    id: 'agent',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 8V4H8" />
        <rect width="16" height="12" x="4" y="8" rx="2" />
        <path d="M2 14h2" />
        <path d="M20 14h2" />
        <path d="M15 13v2" />
        <path d="M9 13v2" />
      </svg>
    ),
    label: 'Agent',
    onClick: toggleAgent,
    title: useAgent ? 'Disable agent mode' : 'Enable agent mode',
    className: useAgent ? 'active' : '',
  }

  return (
    <>
      <div className="content-app">
        <Notifications
          iconPosition={iconPosition}
          chatMessages={chatMessages}
          isMinimized={isMinimized}
          isThinking={state.isThinking}
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
                  fileActions={fileActions}
                  buttons={[webSearchButton, agentButton]}
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
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleOptimizedFileUpload}
              style={{ display: 'none' }}
            />
          </div>
        )}
      </div>
    </>
  )
}

export default ContentApp