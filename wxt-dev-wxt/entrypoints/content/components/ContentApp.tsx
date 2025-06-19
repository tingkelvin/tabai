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

const ContentApp: React.FC<ContentAppProps> = ({
  title = "",
}) => {
  console.log("contentscript loaded")
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>("");

  const widgetRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const renderCount = useRef(0);
  const isDragging = useRef(false);
  const dragState = useRef<DragState>({ startX: 0, startY: 0, elementX: 0, elementY: 0 });
  const currentPosition = useRef<Position>({ x: 0, y: 0 });

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
      console.log('Sending:', chatInput);
      setChatInput('');
    }
  };

  renderCount.current++;
  console.log(`ContentApp render #${renderCount.current}`);

  const dragHandlers: DragHandlers = createDragHandlers(
    widgetRef,
    currentPosition,
    isDragging,
    dragState,
    { width: WIDGET_CONFIG.ICON_SIZE, height: WIDGET_CONFIG.ICON_SIZE }
  );

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  useEffect(() => {
    const { iconPosition } = calculateInitialPositions();
    currentPosition.current = { x: iconPosition.x, y: iconPosition.y };

    if (widgetRef.current) {
      widgetRef.current.style.transform = `translate(${iconPosition.x}px, ${iconPosition.y}px)`;
    }

    return () => {
      dragHandlers.cleanup();
    };
  }, [isMinimized]);

  return (
    <>
      {isMinimized ? (
        <div
          ref={widgetRef}
          className={`terminal-widget minimized ${isDragging.current ? 'dragging' : ''}`}
          onMouseDown={dragHandlers.handleMouseDown}
        >
          <TerminalIcon isTyping={true} />
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
            handleMinimize={handleMinimize}
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