// ContentApp.tsx - Optimized with DOM-based dragging
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";

// Components import
import TerminalIcon from "./TerminalIcon";
import TerminalHeader from "./TerminalHeader";
import Chat from "./Chat";
import ChatInput from "./ChatInput";

// Utils
import { calculateInitialPositions } from "../utils/helper";
import { usePosition } from "../hooks/useHooks";

// Types import
import type { ContentAppProps, Position } from "../types";
import type { ChatMessage } from "../types/chat";
import { WIDGET_CONFIG } from "../utils/constant";
import { useDrag } from "../hooks/useDrag";

const ContentApp: React.FC<ContentAppProps> = ({ title = "" }) => {
  console.log("contentscript loaded");

  const [isMinimized, setIsMinimized] = useState<boolean>(true);
  const [chatInput, setChatInput] = useState<string>("");

  const widgetRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const renderCount = useRef(0);

  const { widgetPosition: initialWidgetPos, iconPosition: initialIconPos } =
    calculateInitialPositions();
  const [iconPosition, updateIconPosition] = usePosition(initialIconPos);
  const [widgetPosition, updateWidgetPosition, constrainWidgetPosition] =
    usePosition(initialWidgetPos);
  const [widgetSize, setWidgetSize] = useState({
    width: WIDGET_CONFIG.DEFAULT_WIDTH,
    height: WIDGET_CONFIG.DEFAULT_HEIGHT,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      console.log("Sending:", chatInput);
      setChatInput("");
    }
  };

  const handleDragEnd = useCallback(
    (position: Position) => {
      if (isMinimized) {
        updateIconPosition(position);
      } else {
        updateWidgetPosition(position);
      }
    },
    [isMinimized, updateIconPosition, updateWidgetPosition]
  );

  const dragConstraints = useMemo(() => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const elementWidth = isMinimized
      ? WIDGET_CONFIG.ICON_SIZE
      : widgetSize.width;
    const elementHeight = isMinimized
      ? WIDGET_CONFIG.ICON_SIZE
      : widgetSize.height;

    return {
      minX: 0,
      maxX: screenWidth - elementWidth,
      minY: 0,
      maxY: screenHeight - elementHeight,
    };
  }, [isMinimized, widgetSize]);

  const { handleMouseDown, hasDragged } = useDrag(
    widgetRef,
    handleDragEnd,
    dragConstraints
  );

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasDragged) return;

      if (isMinimized) {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const isOnRightSide = iconPosition.left > screenWidth / 2;
        const isOnBottomHalf = iconPosition.top > screenHeight / 2;

        let widgetLeft, widgetTop;

        if (isOnRightSide) {
          widgetLeft =
            iconPosition.left - widgetSize.width + WIDGET_CONFIG.ICON_SIZE;
        } else {
          widgetLeft = iconPosition.left;
        }

        if (isOnBottomHalf) {
          widgetTop =
            iconPosition.top - widgetSize.height + WIDGET_CONFIG.ICON_SIZE;
        } else {
          widgetTop = iconPosition.top;
        }

        const constrainedPosition = constrainWidgetPosition(
          { top: widgetTop, left: widgetLeft },
          { elementWidth: widgetSize.width, elementHeight: widgetSize.height }
        );

        updateWidgetPosition(constrainedPosition);
      }

      setIsMinimized(!isMinimized);
    },
    [
      isMinimized,
      iconPosition,
      widgetSize,
      constrainWidgetPosition,
      updateWidgetPosition,
      hasDragged,
    ]
  );

  // Initialize position on mount
  useEffect(() => {
    const currentPos = isMinimized ? iconPosition : widgetPosition;
    if (widgetRef.current) {
      widgetRef.current.style.transform = `translate(${currentPos.left}px, ${currentPos.top}px)`;
    }
  }, [isMinimized, iconPosition, widgetPosition]);

  renderCount.current++;
  console.log(`ContentApp render #${renderCount.current}`);

  return (
    <>
      {isMinimized ? (
        <div
          ref={widgetRef}
          className="terminal-widget minimized"
          onMouseDown={handleMouseDown}
        >
          <TerminalIcon isTyping={true} onClick={handleToggle} />
        </div>
      ) : (
        <div
          ref={widgetRef}
          className="terminal-widget expanded"
          onMouseDown={handleMouseDown}
        >
          <TerminalHeader
            dragging={false}
            startDrag={handleMouseDown}
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
                fileActions={[]}
                buttons={[]}
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
