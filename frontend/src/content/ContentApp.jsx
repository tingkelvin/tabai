// ContentApp.jsx - With Message Notifications
import React, { useState, useEffect, useRef, useCallback } from 'react';
import TerminalIcon from './TerminalIcon';
import { calculateInitialPositions } from './utils/helpers';
import { WIDGET_CONFIG } from './utils/constants';
import { getFileIcon, PlusIcon } from './components/Icons';

// Import components
import WidgetHeader from './components/WidgetHeader';
import ChatMessages from './components/ChatMessages';
import ChatInput from './components/ChatInput';
import ResizeHandles from './components/ResizeHandles';
import MessageNotifications from './components/MessageNotifications';

// Hooks
import { useUrlTracking } from './hooks/useUrlTracking';
import { usePosition } from './hooks/usePosition';
import { useDragAndResize } from './hooks/useDragAndResize';
import { useChat } from './hooks/useChat';
import { useFileManagement } from './hooks/useFileManagement';
import { SearchCodeIcon } from 'lucide-react';

const ContentApp = ({
  customChatHook,
  customActions = [],
  title = ""
}) => {
  const [isMinimized, setIsMinimized] = useState(true);
  const fileInputRef = useRef(null);
  const cleanupRef = useRef(null);

  // URL tracking
  const currentUrl = useUrlTracking();
  const previousUrl = useRef(currentUrl);

  // Calculate initial positions
  const { widgetPosition: initialWidgetPos, iconPosition: initialIconPos } = calculateInitialPositions();

  // Position management
  const [widgetPosition, updateWidgetPosition, constrainWidgetPosition] = usePosition(initialWidgetPos);
  const [iconPosition, updateIconPosition, constrainIconPosition] = usePosition(initialIconPos);

  // Size state for the widget
  const [widgetSize, setWidgetSize] = useState({
    width: WIDGET_CONFIG.DEFAULT_WIDTH,
    height: WIDGET_CONFIG.DEFAULT_HEIGHT
  });

  // Chat functionality
  const chatHook = customChatHook || useChat();
  const {
    chatInput,
    chatMessages,
    isTyping,
    handleInputChange,
    handleKeyPress,
    sendMessage,
    addMessage,
    addMessages,
    clearMessages,
    removeMessage,
    updateMessage,
    setIsTyping,
    addUserMessage,
    addAssistantMessage
  } = chatHook;

  // File management
  const {
    uploadedFiles,
    formatFileName,
    handleFileUpload,
    loadSessionFiles,
    displayFileContent,
    getAllContentAsString,
    removeFile,
    cleanup: fileCleanup
  } = useFileManagement(addUserMessage);

  // Component lifecycle
  useEffect(() => {
    console.log('🚀 Mounting component');
    cleanupRef.current = fileCleanup;
    loadSessionFiles();
  }, [fileCleanup]);

  useEffect(() => {
    console.log('🚀 Unmounting component');
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  // Handle URL changes
  useEffect(() => {
    console.log('🚀 URL changed');
    if (currentUrl !== previousUrl.current) {
      previousUrl.current = currentUrl;
    }
  }, [currentUrl]);

  // Drag and resize functionality
  const { dragging, hasDragged, startDrag, startResize } = useDragAndResize(
    widgetSize,
    widgetPosition,
    iconPosition,
    isMinimized,
    setWidgetSize,
    updateWidgetPosition,
    updateIconPosition
  );

  // Refs
  const chatInputRef = useRef(null);
  const chatMessagesRef = useRef(null);

  // Auto-scroll chat messages
  useEffect(() => {
    console.log('🚀 Auto-scrolling chat messages');
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages, isTyping]);

  const handleClose = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
    }

    const container = document.getElementById('react-extension-root');
    if (container) container.remove();
  }, []);

  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const handleExpand = useCallback(() => {
    if (hasDragged) return;

    if (isMinimized) {
      const widgetTop = iconPosition.top;
      const widgetLeft = iconPosition.left - widgetSize.width + WIDGET_CONFIG.ICON_SIZE;

      const constrainedPosition = constrainWidgetPosition(
        { top: widgetTop, left: widgetLeft },
        { elementWidth: widgetSize.width, elementHeight: widgetSize.height }
      );

      updateWidgetPosition(constrainedPosition);
    }
    setIsMinimized(false);

    setTimeout(() => {
      if (chatInputRef.current) {
        chatInputRef.current.focus();
      }
    }, 100);
  }, [hasDragged, isMinimized, iconPosition, widgetSize, constrainWidgetPosition, updateWidgetPosition]);

  // Handle notification clicks
  const handleNotificationClick = useCallback((notification) => {
    // Expand widget when notification is clicked
    handleExpand();
  }, [handleExpand]);

  // File upload handler
  const handleOptimizedFileUpload = async (event) => {
    try {
      await handleFileUpload(event);
    } catch (error) {
      console.error('File upload failed:', error);
      addUserMessage(`❌ Upload failed: ${error.message}`);
    }
  };

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
          addUserMessage(`❌ Failed to remove file: ${error.message}`);
        }
      },
      className: 'file-action'
    }))
  ];

  useEffect(() => {
    setTimeout(async () => {
      const reply = await chrome.runtime.sendMessage({
        type: 'GET_CHAT_SETTINGS'
      });

      if (!reply.hasGreeting) {
        setIsTyping(true);

        // Add a delay to simulate typing
        setTimeout(() => {
          setIsTyping(false);
          addAssistantMessage('Hello! I am Taber, How can I help you today?');
        }, 1000);

        await chrome.runtime.sendMessage({
          type: 'SAVE_CHAT_SETTINGS',
          data: { settings: { hasGreeting: true } }
        });
      }
    }, 1000);
  }, []);
  // Filter custom actions
  const actionButtons = customActions.filter(action =>
    typeof action.isVisible === 'function' ? action.isVisible() : action.isVisible !== false
  );

  return (
    <>
      {/* Message Notifications - Always rendered to handle state */}
      <MessageNotifications
        iconPosition={iconPosition}
        chatMessages={chatMessages}
        isMinimized={isMinimized}
        isTyping={isTyping}
        onNotificationClick={handleNotificationClick}
      />

      {/* Main Widget */}
      {isMinimized ? (
        <div
          className={`extension-widget minimized ${dragging ? 'dragging' : ''}`}
          style={{
            top: iconPosition.top,
            left: iconPosition.left,
          }}
          onMouseDown={(e) => startDrag(e, true)}
        >
          <TerminalIcon onClick={handleExpand} />
        </div>
      ) : (
        <div
          className="extension-widget expanded"
          style={{
            top: widgetPosition.top,
            left: widgetPosition.left,
            width: widgetSize.width,
            height: widgetSize.height,
          }}
        >
          <WidgetHeader
            dragging={dragging}
            startDrag={startDrag}
            handleMinimize={handleMinimize}
            handleClose={handleClose}
            title={title}
            currentUrl={currentUrl}
          />

          <div className="extension-content">
            <div className="chat-section">
              <ChatMessages
                chatMessages={chatMessages}
                isTyping={isTyping}
                chatMessagesRef={chatMessagesRef}
              />

              <ChatInput
                fileActions={fileActions}
                actionButtons={actionButtons}
                chatInputRef={chatInputRef}
                chatInput={chatInput}
                handleInputChange={handleInputChange}
                handleKeyPress={handleKeyPress}
              />
            </div>
          </div>

          <ResizeHandles startResize={startResize} />

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleOptimizedFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      )}
    </>
  );
};

export default ContentApp;