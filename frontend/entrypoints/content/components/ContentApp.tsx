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
import { AgentResponse, PROMPT_TEMPLATES, PromptBuilder, PromptConfig } from '../utils/prompMessages'

const ContentApp: React.FC<ContentAppProps> = ({ customChatHook, title = '' }) => {
  // Mode states
  const [useSearch, setUseSearch] = useState(false)
  const [useAgent, setUseAgent] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null)

  // Agent state management
  const taskRef = useRef<string>("")
  const fileContentRef = useRef<string>("")
  const lastPageStateTimestamp = useRef<number | null>(null);
  const isInitialMount = useRef(true);
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
    getFileContent
  } = useFile()

  // Chat refs
  const chatMessagesRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  // Chat hook - simple and pure
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
  const { processAgentResponse } = useAgentChat(chatHook, {
    pageState,
    onActionExecuted: (action) => {
      console.log('Agent action executed:', action);
      if (!isMinimized) {
        setIsMinimized(true)
      }
    }
  });

  // Update file content when files change
  useEffect(() => {
    const updateFileContent = async () => {
      try {
        fileContentRef.current = await getFileContent();
      } catch (error) {
        console.error('Failed to get file content:', error);
        fileContentRef.current = "";
      }
    };
    updateFileContent();
  }, [uploadedFiles, getFileContent]);

  // Clear task when agent mode is disabled
  useEffect(() => {
    if (!useAgent) {
      taskRef.current = "";
      console.log('🤖 Agent mode disabled, cleared task');
    }
  }, [useAgent]);

  // Complex orchestrated send message
  const handleSendMessage = useCallback(async (input: string) => {
    console.log('🎬 Starting orchestrated message flow');
    isSendingManually.current = true;

    try {
      // 1. Validation for agent mode
      if (useAgent) {
        const validation = PromptBuilder.validateTask(input);
        if (!validation.valid) {
          addAssistantMessage(validation.error || PROMPT_TEMPLATES.INVALID_TASK);
          return;
        }
        taskRef.current = input;

        // Auto-minimize for agent mode
        console.log('🤖 Agent mode: Auto-minimizing widget');
        if (!isMinimized) {
          setIsMinimized(true);
        }
      }

      // 3. Build the prompt message
      const promptConfig: PromptConfig = {
        useAgent,
        useSearch,
        task: useAgent ? taskRef.current : undefined,
        userMessage: !useAgent ? input : undefined,
        fileContent: fileContentRef.current,
        pageState: useAgent ? pageState : null
      };
      const message = PromptBuilder.buildMessage(promptConfig);

      // 4. Send message
      setIsThinking(true);
      const reply = await sendMessage(message, { useSearch });

      // 5. Process response
      if (useAgent) {
        // Parse agent response
        const agentResponse: AgentResponse | null = PromptBuilder.parseAgentResponse(reply);
        if (!agentResponse) {
          addAssistantMessage(PROMPT_TEMPLATES.PARSING_ERROR);
        } else {
          console.log('🤖 Processing agent response:', agentResponse);
          withMutationPaused(() => {
            processAgentResponse(agentResponse);
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
      setIsThinking(false);
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
    setIsThinking,
    withMutationPaused,
    processAgentResponse,
  ]);

  // Auto-continuation for agent mode
  // const handleAutoContinuation = useCallback(async () => {
  //   if (!useAgent || !taskRef.current || !pageState) return;

  //   console.log('🔄 Auto-continuation triggered');
  //   setIsThinking(true);

  //   try {
  //     // Build continuation message
  //     const continuationMessage = PromptBuilder.buildContinuationMessage(
  //       taskRef.current,
  //       fileContentRef.current,
  //       pageState
  //     );

  //     console.log('🔄 Sending continuation:', continuationMessage.substring(0, 100) + '...');

  //     // Send continuation
  //     const reply = await sendMessage(continuationMessage, { useSearch });

  //     // Parse and process agent response
  //     const agentResponse: AgentResponse | null = PromptBuilder.parseAgentResponse(reply);
  //     if (agentResponse) {
  //       console.log('🤖 Auto-continuation response:', agentResponse);
  //       withMutationPaused(() => {
  //         processAgentResponse(agentResponse);
  //       });
  //     } else {
  //       console.error('❌ Failed to parse auto-continuation response');
  //       addAssistantMessage(PROMPT_TEMPLATES.PARSING_ERROR);
  //     }

  //   } catch (error) {
  //     console.error('❌ Auto-continuation error:', error);
  //     addAssistantMessage(PROMPT_TEMPLATES.ERROR_GENERIC);
  //   } finally {
  //     setIsThinking(false);
  //   }
  // }, [useAgent, useSearch, pageState, sendMessage, setIsThinking, withMutationPaused, processAgentResponse, addAssistantMessage]);

  // Auto-continuation when pageState updates in agent mode
  // useEffect(() => {
  //   // Skip on initial mount
  //   if (isInitialMount.current) {
  //     isInitialMount.current = false;
  //     if (pageState?.timestamp) {
  //       lastPageStateTimestamp.current = pageState.timestamp;
  //     }
  //     return;
  //   }

  //   // Only proceed if agent mode is enabled and we have a current task
  //   if (!useAgent || !taskRef.current || !pageState?.timestamp || isSendingManually.current) {
  //     return;
  //   }

  //   // Check if this is a new page state update
  //   if (lastPageStateTimestamp.current !== pageState.timestamp) {
  //     console.log('🤖 PageState updated, triggering auto-continuation');
  //     lastPageStateTimestamp.current = pageState.timestamp;
  //     handleAutoContinuation();
  //   }
  // }, [pageState?.timestamp, useAgent, handleAutoContinuation]);

  // Custom key press handler
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      const input = chatInput.trim();
      baseHandleKeyPress(e)

      // Additional validation for agent mode
      if (useAgent) {
        const validation = PromptBuilder.validateTask(input);
        if (!validation.valid) {
          addAssistantMessage(validation.error || PROMPT_TEMPLATES.INVALID_TASK);
          return;
        }
      }

      // Use orchestrated send message
      handleSendMessage(input);

      // Reset textarea height
      setTimeout(() => {
        const target = e.target as HTMLTextAreaElement;
        if (target) {
          target.style.height = '44px';
          target.style.overflowY = 'hidden';
        }
      }, 0);
    }
  }, [chatInput, useAgent, addAssistantMessage, handleSendMessage]);

  // Toggle handlers
  const toggleWebSearch = useCallback(() => {
    setUseSearch(!useSearch);
    console.log('Web search toggled:', !useSearch);
  }, [useSearch]);

  const toggleAgent = useCallback(() => {
    setUseAgent(!useAgent);
    console.log('Agent toggled:', !useAgent);
  }, [useAgent]);

  // File upload handler
  const handleOptimizedFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await handleFileUpload(file);
      event.target.value = ''; // Clear input
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