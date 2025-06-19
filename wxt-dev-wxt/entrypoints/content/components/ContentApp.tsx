// ContentApp.tsx - Fixed with ChatInput
import React, { useState, useEffect, useRef } from "react";

// Components import
import TerminalIcon from "./TerminalIcon";
import TerminalHeader from "./TerminalHeader";
import Chat from "./Chat";
import ChatInput from "./ChatInput";

// Utils
import { calculateInitialPositions } from "../utils/helper";
import { createDragHandlers, DragState, DragHandlers } from "../utils/dragUtils";

// Types import
import type { ContentAppProps, Position } from '../types';
import type { ChatMessage } from '../types/chat';
import { WIDGET_CONFIG } from "../utils/constant";
import { usePosition } from "../hooks/useHooks";

const ContentApp: React.FC<ContentAppProps> = ({
  title = "",
}) => {
  console.log("contentscript loaded")
  const [isMinimized, setIsMinimized] = useState<boolean>(true);
  const [chatInput, setChatInput] = useState<string>("");

  const widgetRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const renderCount = useRef(0);
  const isDragging = useRef(false);
  const dragState = useRef<DragState>({ startX: 0, startY: 0, elementX: 0, elementY: 0 });
  const currentPosition = useRef<Position>({ top: 0, left: 0 });
  const hasDragged = useRef(false);

  const { widgetPosition: initialWidgetPos, iconPosition: initialIconPos } = calculateInitialPositions();
  const [iconPosition, updateIconPosition, constrainIconPosition] = usePosition(initialIconPos);
  const [widgetPosition, updateWidgetPosition, constrainWidgetPosition] = usePosition(initialWidgetPos);
  const [widgetSize, setWidgetSize] = useState({
    width: WIDGET_CONFIG.DEFAULT_WIDTH,
    height: WIDGET_CONFIG.DEFAULT_HEIGHT
  });

  const messages: ChatMessage[] = [
    {
      id: '1',
      type: 'user',
      content: 'Hello! Can you help me with JavaScript?',
      timestamp: Date.now() - 300000
    },
    {
      id: '2',
      type: 'assistant',
      content: 'Of course! I\'d be happy to help you with JavaScript. What specific topic would you like to learn about?',
      timestamp: Date.now() - 250000
    },
    {
      id: '3',
      type: 'user',
      content: 'How do I create a function?',
      timestamp: Date.now() - 200000
    },
    {
      id: '4',
      type: 'assistant',
      content: 'Here are the main ways to create functions in JavaScript:\n\n```javascript\n// Function declaration\nfunction myFunction() {\n  return "Hello";\n}\n\n// Arrow function\nconst myArrowFunction = () => {\n  return "Hello";\n};\n```',
      timestamp: Date.now() - 150000
    }
  ];

  // Dummy data for ChatInput
  const fileActions = [
    {
      id: 'file-1',
      icon: '📄',
      label: 'document.pdf',
      onClick: () => console.log('Remove file'),
      className: 'file-action'
    }
  ];

  const actionButtons = [
    {
      id: 'send',
      icon: '➤',
      onClick: () => console.log('Send message'),
      title: 'Send message'
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('Sendings:', chatInput);
      setChatInput('');
    }
  };

  renderCount.current++;
  console.log(`ContentApp render #${renderCount.current}`);


  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDragging.current || hasDragged.current) {
      hasDragged.current = false;
      return;
    }

    if (isMinimized) {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const isOnRightSide = iconPosition.left > screenWidth / 2;
      const isOnBottomHalf = iconPosition.top > screenHeight / 2;

      let widgetLeft, widgetTop;

      // Horizontal positioning
      if (isOnRightSide) {
        // Expand to left
        widgetLeft = iconPosition.left - widgetSize.width + WIDGET_CONFIG.ICON_SIZE;
      } else {
        // Expand to right
        widgetLeft = iconPosition.left;
      }

      // Vertical positioning
      if (isOnBottomHalf) {
        // Expand upward
        widgetTop = iconPosition.top - widgetSize.height + WIDGET_CONFIG.ICON_SIZE;
      } else {
        // Expand downward
        widgetTop = iconPosition.top;
      }

      const constrainedPosition = constrainWidgetPosition(
        { top: widgetTop, left: widgetLeft },
        { elementWidth: widgetSize.width, elementHeight: widgetSize.height }
      );

      updateWidgetPosition(constrainedPosition);
    }

    setIsMinimized(!isMinimized);
  }, [isMinimized, iconPosition, widgetSize, constrainWidgetPosition, updateWidgetPosition]);

  const dragHandlers: DragHandlers = createDragHandlers(
    widgetRef,
    isMinimized ? { current: iconPosition } : { current: widgetPosition },
    isDragging,
    dragState,
    isMinimized ?
      { width: WIDGET_CONFIG.ICON_SIZE, height: WIDGET_CONFIG.ICON_SIZE } :
      { width: widgetSize.width, height: widgetSize.height },
    hasDragged,
    isMinimized ? updateIconPosition : updateWidgetPosition
  );
  useEffect(() => {
    const currentPos = isMinimized ? iconPosition : widgetPosition;
    if (widgetRef.current) {
      widgetRef.current.style.transform = `translate(${currentPos.left}px, ${currentPos.top}px)`;
    }
  }, [isMinimized, iconPosition, widgetPosition]);

  return (
    <>
      {isMinimized ? (
        <div
          ref={widgetRef}
          className={`terminal-widget minimized ${isDragging.current ? 'dragging' : ''}`}
          onMouseDown={dragHandlers.handleMouseDown}
        >
          <TerminalIcon isTyping={true} onClick={handleToggle} />
        </div>
      ) : (
        <div
          ref={widgetRef}
          className={`terminal-widget expanded ${isDragging.current ? 'dragging' : ''}`}
          onMouseDown={dragHandlers.handleMouseDown}
        >
          <TerminalHeader
            dragging={isDragging.current}
            startDrag={dragHandlers.handleMouseDown}
            handleMinimize={handleToggle}
            title={title}
          />
          <div className="terminal-content">
            <div className="chat-section">
              <Chat
                chatMessagesRef={chatMessagesRef}
                chatMessages={messages}
                isTyping={false}
              />
              <ChatInput
                fileActions={fileActions}
                buttons={actionButtons}
                chatInputRef={chatInputRef}
                chatInput={chatInput}
                handleInputChange={handleInputChange}
                handleKeyPress={handleKeyPress}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContentApp;