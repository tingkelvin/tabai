// ContentApp.jsx - Fixed version
import React, { useState, useEffect, useRef, useCallback } from 'react';
import TerminalIcon from './TerminalIcon';
import { calculateInitialPositions } from './utils/helpers';
import { WIDGET_CONFIG } from './utils/constants';
import { getFileIcon, PlusIcon } from './components/Icons';

// Import new components
import WidgetHeader from './components/WidgetHeader';
import ChatMessages from './components/ChatMessages';
import ChatInput from './components/ChatInput';
import ResizeHandles from './components/ResizeHandles';

// Hooks
import { useUrlTracking } from './hooks/useUrlTracking';
import { usePosition } from './hooks/usePosition';
import { useDragAndResize } from './hooks/useDragAndResize';
import { useChat } from './hooks/useChat';
import { useFileManagement } from './hooks/useFileManagement';

const ContentApp = ({
  customChatHook,
  customActions = [], // Array of custom action objects
  title = ""
}) => {
  const [isMinimized, setIsMinimized] = useState(true);
  const fileInputRef = useRef(null);
  const cleanupRef = useRef(null);

  // URL tracking - single source of truth
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

  // Use custom chat hook if provided, otherwise use default
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
    addAssistantMessage,
    setGetFileContentsFunction
  } = chatHook;

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

  // Store cleanup function for unmounting
  useEffect(() => {
    console.log('🚀 Mounting component');
    cleanupRef.current = fileCleanup;
  }, [fileCleanup]);

  // Component cleanup on unmount
  useEffect(() => {
    console.log('🚀 Unmounting component');
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  // Load session files and set getFileContentsFunction - SIMPLE!
  useEffect(() => {
    console.log('🚀 Loading session files on mount');
    loadSessionFiles();
  }, []); // Empty dependency array - runs only once

  useEffect(() => {
    console.log('🚀 Updating file contents function');
    setGetFileContentsFunction(getAllContentAsString);
  }, [getAllContentAsString, setGetFileContentsFunction]);

  // Handle URL changes
  useEffect(() => {
    console.log('🚀 URL changed');
    // Only process if URL actually changed
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

  // Optimized file upload handler with better error handling
  const handleOptimizedFileUpload = async (event) => {
    try {
      await handleFileUpload(event);
    } catch (error) {
      console.error('File upload failed:', error);
      addUserMessage(`❌ Upload failed: ${error.message}`);
    }
  };

  const fileActions = [
    // Default upload action
    {
      id: 'upload-file',
      label: '',
      icon: <PlusIcon />,
      onClick: () => fileInputRef.current?.click(),
      className: 'upload-file-action'
    },
    // File action buttons with dynamic icons based on file type
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

  // Filter and render visible custom actions
  const actionButtons = customActions.filter(action =>
    typeof action.isVisible === 'function' ? action.isVisible() : action.isVisible !== false
  );

  if (isMinimized) {
    return (
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
    );
  }

  return (
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
  );
};

export default ContentApp;