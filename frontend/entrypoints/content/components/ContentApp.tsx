import React, { useRef, useEffect, useCallback } from 'react'
import TerminalIcon from './TerminalIcon'
import TerminalHeader from './TerminalHeader'
import ChatHistory from './ChatHistory'
import ChatInput from './ChatInput'
import ResizeHandle from './ResizeHandle'
import Notifications from './Notifications'

import type { ActionButton, ContentAppProps } from '../types/components'
import { RESIZE_TYPES } from '../utils/constant'
import { useDragAndResize } from '../hooks/useDragAndResize'
import { useChat } from '../hooks/useChat'
import { usePage } from '../hooks/usePage'
import { useFile } from '../hooks/useFile'
import { useBackgroundState } from '../hooks/useBackgroundState'
import { getFileIcon, PlusIcon } from './Icons'
import { useAgentChat } from '../hooks/useAgent'
import { AgentResponse, PROMPT_TEMPLATES, PromptBuilder, PromptConfig } from '../utils/prompMessages'

const ContentApp: React.FC<ContentAppProps> = ({ customChatHook, title = '' }) => {
  // Background state management
  const { state, isLoading, updateState } = useBackgroundState()

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const widgetRef = useRef<HTMLDivElement>(null)
  const taskRef = useRef<string>("")
  const lastPageStateTimestamp = useRef<number | null>(null)
  const isInitialMount = useRef(true)
  const isSendingManually = useRef(false)

  // Hooks
  const { pageState, getElementAtCoordinate, withMutationPaused } = usePage()
  const { uploadedFiles, handleFileUpload, removeFile, formatFileName, fileContentAsString } = useFile()
  const chatMessagesRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  // Chat hook
  const chatHook = customChatHook ? customChatHook() : useChat()
  const {
    chatInput,
    chatMessages,
    isThinking,
    handleInputChange,
    addAssistantMessage,
    addUserMessage,
    sendMessage,
    setIsThinking,
    handleKeyPress: baseHandleKeyPress
  } = chatHook

  // UI hooks
  const {
    handleMouseDown,
    handleToggle,
    startResize,
    isDragging,
    isResizing,
    currentSize
  } = useDragAndResize(widgetRef, {
    widgetSize: state.widgetSize,
    onSizeChange: (size) => updateState({ widgetSize: size })
  })

  // Agent hook
  const { processAgentResponse } = useAgentChat(chatHook, { pageState })

  // Sync task ref with background state
  useEffect(() => {
    if (!isLoading) {
      taskRef.current = state.currentTask
    }
  }, [state.currentTask, isLoading])

  // Clear task when agent mode disabled
  useEffect(() => {
    if (!state.useAgent) {
      taskRef.current = ""
      updateState({ currentTask: "" })
    }
  }, [state.useAgent, updateState])

  // Handle minimize/maximize
  const handleMinimizeToggle = useCallback(() => {
    updateState({ isMinimized: !state.isMinimized })
    handleToggle()
  }, [state.isMinimized, updateState, handleToggle])

  // Send message handler
  const handleSendMessage = useCallback(async (input: string) => {
    console.log('🎬 Starting orchestrated message flow')
    isSendingManually.current = true

    try {
      if (state.useAgent) {
        const validation = PromptBuilder.validateTask(input)
        if (!validation.valid) {
          addAssistantMessage(validation.error || PROMPT_TEMPLATES.INVALID_TASK)
          return
        }
        taskRef.current = input
        updateState({ currentTask: input })

        if (!state.isMinimized) {
          updateState({ isMinimized: true })
        }
      }

      const promptConfig: PromptConfig = {
        useAgent: state.useAgent,
        useSearch: state.useSearch,
        task: state.useAgent ? taskRef.current : undefined,
        userMessage: !state.useAgent ? input : undefined,
        fileContent: fileContentAsString,
        pageState: state.useAgent ? pageState : null
      }
      const message = PromptBuilder.buildMessage(promptConfig)

      setIsThinking(true)
      const reply = await sendMessage(message, { useSearch: state.useSearch })

      if (state.useAgent) {
        const agentResponse: AgentResponse | null = PromptBuilder.parseAgentResponse(reply)
        if (!agentResponse) {
          addAssistantMessage(PROMPT_TEMPLATES.PARSING_ERROR)
        } else {
          console.log('🤖 Processing agent response:', agentResponse)
          withMutationPaused(() => {
            processAgentResponse(agentResponse)
          })
        }
      } else {
        addAssistantMessage(reply)
      }

    } catch (error) {
      console.error('❌ Orchestration error:', error)
      addAssistantMessage(PROMPT_TEMPLATES.ERROR_GENERIC)
    } finally {
      setIsThinking(false)
      isSendingManually.current = false
    }
  }, [
    state.useAgent,
    state.useSearch,
    state.isMinimized,
    updateState,
    pageState,
    fileContentAsString,
    addAssistantMessage,
    sendMessage,
    setIsThinking,
    withMutationPaused,
    processAgentResponse
  ])

  // Key press handler
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()

      const input = chatInput.trim()
      baseHandleKeyPress(e)

      if (state.useAgent) {
        const validation = PromptBuilder.validateTask(input)
        if (!validation.valid) {
          addAssistantMessage(validation.error || PROMPT_TEMPLATES.INVALID_TASK)
          return
        }
      }

      handleSendMessage(input)

      setTimeout(() => {
        const target = e.target as HTMLTextAreaElement
        if (target) {
          target.style.height = '44px'
          target.style.overflowY = 'hidden'
        }
      }, 0)
    }
  }, [chatInput, state.useAgent, addAssistantMessage, handleSendMessage])

  // Toggle handlers
  const toggleWebSearch = useCallback(() => {
    updateState({ useSearch: !state.useSearch })
  }, [state.useSearch, updateState])

  const toggleAgent = useCallback(() => {
    updateState({ useAgent: !state.useAgent })
  }, [state.useAgent, updateState])

  // File upload handler
  const handleOptimizedFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      await handleFileUpload(file)
      event.target.value = ''
    } catch (error) {
      console.error('File upload failed:', error)
    }
  }, [handleFileUpload])

  // File actions
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
          await removeFile(file)
        } catch (error) {
          console.error('File removal failed:', error)
        }
      },
      className: 'file-action'
    }))
  ]

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
    title: state.useSearch ? 'Disable web search' : 'Enable web search',
    className: state.useSearch ? 'active' : ''
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
    title: state.useAgent ? 'Disable agent mode' : 'Enable agent mode',
    className: state.useAgent ? 'active' : ''
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="content-app loading">
        <div className="terminal-widget minimized">
          <TerminalIcon isThinking={true} onClick={() => { }} />
        </div>
      </div>
    )
  }

  return (
    <div className="content-app">
      <Notifications
        iconPosition={state.iconPosition}
        chatMessages={chatMessages}
        isMinimized={state.isMinimized}
        isThinking={isThinking}
        onNotificationClick={handleMinimizeToggle}
      />
      {state.isMinimized ? (
        <div
          ref={widgetRef}
          className='terminal-widget minimized'
          onMouseDown={handleMouseDown}
        >
          <TerminalIcon isThinking={isThinking} onClick={handleMinimizeToggle} />
        </div>
      ) : (
        <div
          ref={widgetRef}
          className={`terminal-widget expanded ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
          style={{
            width: `${currentSize.width}px`,
            height: `${currentSize.height}px`
          }}
        >
          <TerminalHeader
            dragging={isDragging}
            startDrag={handleMouseDown}
            handleMinimize={handleMinimizeToggle}
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
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleOptimizedFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      )}
    </div>
  )
}

export default ContentApp