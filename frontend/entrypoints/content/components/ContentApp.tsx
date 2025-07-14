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
import { AgentAction, PROMPT_TEMPLATES } from '../utils/prompMessages'
import { useAppState } from '../hooks/useAppState'
import { Position } from '../types/widget'

const ContentApp: React.FC<ContentAppProps> = ({ customChatHook, title = '' }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null)
  const isSendingMessage = useRef<boolean>(false);
  const { state, isInitialized, updateState } = useAppState();
  const { chatMessages, isThinking, useSearch, useAgent, task, actionsExecuted } = state;

  const [widgetSize, setWidgetSize] = useState({
    width: WIDGET_CONFIG.DEFAULT_WIDTH,
    height: WIDGET_CONFIG.DEFAULT_HEIGHT,
  })

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
    setIconPosition,
    isDragging,
    isResizing,
    currentSize,
    iconPosition
  } = useDragAndResize(widgetRef, {
    widgetSize,
    onSizeChange: setWidgetSize
  })

  // And update your agent hook to handle undefined pageState
  const { processAgentReply, setSelectorMap, isExecuting, cleanup } = useAgentChat(chatHook, {
    setIconPosition: (position: Position) => {
      setIconPosition(position)
    },
    onActionExecuted: async (action: AgentAction) => {
      // actionsExecuted.push(action)
      updateState({ actionsExecuted })
    },
    onFinish: async () => {
      console.log("on finish")

      const { pageState, isNew } = await updateAndGetPageState()
      const reply = await sendMessage(task);
      if (!reply) {
        addAssistantMessage(PROMPT_TEMPLATES.PARSING_ERROR);
      } else {
        console.log('🤖 Processing agent response:', reply);

        if (!pageState) {
          console.error("Empty page state")
          return
        }
        processAgentReply(reply);
      }

    }
  });

  const { getElementAtCoordinate, updateAndGetPageState } = usePage({
    onPageChanged: async (newPageState) => {
      if (!isInitialized) return; // Don't update if not initialized
      const pageStateAsString = newPageState.domSnapshot?.root.clickableElementsToString() || ""
      await updateState({ pageStateAsString })
      if (newPageState.domSnapshot?.selectorMap)
        setSelectorMap(newPageState.domSnapshot?.selectorMap)
      // Handle the page change here
    }
  });

  // Throttle function to limit how often updateAndGetPageState is called
  const throttle = useCallback((func: Function, limit: number) => {
    let inThrottle: boolean;
    return function (this: any, ...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }, []);

  // Refs to track throttling state
  const throttleRef = useRef<boolean>(false);
  const lastCallRef = useRef<number>(0);

  // Scroll tracking refs
  const scrollCountRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef<boolean>(false);
  const scrollStartTimeRef = useRef<number>(0);

  // Throttled version of updateAndGetPageState
  const throttledUpdatePageState = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;

    if (timeSinceLastCall < 1000) { // 1 second throttle
      console.log("Throttled - skipping update");
      return;
    }

    if (throttleRef.current) {
      console.log("Already processing - skipping update");
      return;
    }

    console.log("Triggering page state update");
    throttleRef.current = true;
    lastCallRef.current = now;

    try {
      cleanup();
      const { pageState, isNew } = await updateAndGetPageState();

      if (!task) {
        console.log("No task defined - skipping agent reply");
        return;
      }

      const reply = await sendMessage(task);
      if (!reply) {
        addAssistantMessage(PROMPT_TEMPLATES.PARSING_ERROR);
      } else {
        console.log('🤖 Processing agent response:', reply);

        if (!pageState) {
          console.error("Empty page state");
          return;
        }
        processAgentReply(reply);
      }
    } catch (error) {
      console.error('Error updating page state:', error);
    } finally {
      throttleRef.current = false;
    }
  }, [updateAndGetPageState, cleanup, task, sendMessage, addAssistantMessage, processAgentReply]);

  // Event listeners for scroll and click
  useEffect(() => {
    const handleScroll = () => {
      if (!isInitialized || !useAgent || !task) return;

      const now = Date.now();

      // If not currently scrolling, start tracking
      if (!isScrollingRef.current) {
        isScrollingRef.current = true;
        scrollStartTimeRef.current = now;
        scrollCountRef.current = 0;
        console.log("📜 Scroll session started");
      }

      // Increment scroll counter
      scrollCountRef.current++;

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Set timeout to detect when scrolling stops
      scrollTimeoutRef.current = setTimeout(() => {
        const scrollDuration = now - scrollStartTimeRef.current;
        const scrollCount = scrollCountRef.current;

        console.log(`📊 Scroll session ended:`, {
          duration: scrollDuration + 'ms',
          events: scrollCount,
          eventsPerSecond: (scrollCount / (scrollDuration / 1000)).toFixed(2)
        });

        // Trigger update based on scroll intensity
        const shouldTriggerUpdate =
          scrollDuration > 2000 || // Scrolled for more than 2 seconds
          scrollCount > 10;        // More than 10 scroll events

        if (shouldTriggerUpdate) {
          console.log("🚀 Triggering update due to significant scroll activity");
          throttledUpdatePageState();
        } else {
          console.log("⏭️ Skipping update - minimal scroll activity");
        }

        // Reset scroll tracking
        isScrollingRef.current = false;
        scrollCountRef.current = 0;
        scrollTimeoutRef.current = null;
      }, 100); // Wait 500ms after scroll stops
    };

    const handleClick = (event: MouseEvent) => {
      if (isInitialized && useAgent && task) {
        // Don't trigger on widget clicks to avoid interference
        const widgetElement = widgetRef.current;
        if (widgetElement && !widgetElement.contains(event.target as Node)) {
          console.log("🖱️ Click detected - triggering update");
          throttledUpdatePageState();
        }
      }
    };

    // Add event listeners
    document.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('click', handleClick, true); // Use capture phase

    // Cleanup function
    return () => {
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClick, true);

      // Clear any pending scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isInitialized, useAgent, task, throttledUpdatePageState]);

  // Complex orchestrated send message
  const handleSendMessage = useCallback(async (message: string) => {
    console.log('🎬 Starting orchestrated message flow');

    try {
      // 5. Process response
      if (useAgent) {
        setIsMinimized(true)

        if (isExecuting()) cleanup()
        await updateAndGetPageState()
        // await new Promise(resolve => setTimeout(resolve, 1000));

        isSendingMessage.current = true
        const reply = await sendMessage(message);
        isSendingMessage.current = false
        // Parse agent response
        if (!reply) {
          addAssistantMessage(PROMPT_TEMPLATES.PARSING_ERROR);
        } else {
          console.log('🤖 Processing agent response:', reply);
          processAgentReply(reply);
        }
      } else {
        await sendMessage(message);
      }
    } catch (error) {
      console.error('❌ Orchestration error:', error);
      addAssistantMessage(PROMPT_TEMPLATES.ERROR_GENERIC);
    }
  }, [
    chatInput,
    useAgent,
    useSearch,
    isMinimized,
    setIsMinimized,
    addUserMessage,
    addAssistantMessage,
    sendMessage,
    processAgentReply,
    updateAndGetPageState
  ]);

  useEffect(() => {
    const handlePageStateChange = async () => {
      console.log("handlePageState", task, useAgent)
      if (useAgent && task && !isSendingMessage.current) {
        const { pageState, isNew } = await updateAndGetPageState()
        const reply = await sendMessage(task);
        if (!reply) {
          addAssistantMessage(PROMPT_TEMPLATES.PARSING_ERROR);
        } else {
          console.log('🤖 Processing agent response:', reply);

          if (!pageState) {
            console.error("Empty page state")
            return
          }
          processAgentReply(reply);
        }
      }

    };
    if (isInitialized)
      handlePageStateChange();
  }, [isInitialized])

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
    updateState({ useSearch: !useSearch });
    console.log('Web search toggled:', !useSearch);
  }, [useSearch]);

  const toggleAgent = useCallback(() => {
    updateState({ useAgent: !useAgent });
    console.log('Agent toggled:', !useAgent);
  }, [useAgent]);

  // File upload handler
  const handleOptimizedFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await handleFileUpload(file);
      event.target.value = ''; // Clear input
      updateState({ fileContentAsString })
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