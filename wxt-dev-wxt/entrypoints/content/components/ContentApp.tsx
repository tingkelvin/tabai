// ContentApp.tsx - Simplified with single position
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";

// Components import
import TerminalIcon from "./TerminalIcon";
import TerminalHeader from "./TerminalHeader";
import Chat from "./Chat";
import ChatInput from "./ChatInput";

// Utils
import { calculateInitialPositions } from "../utils/helper";

// Types import
import type { ContentAppProps, Position } from "../types";
import type { ChatMessage } from "../types/chat";
import { WIDGET_CONFIG } from "../utils/constant";
import { useDrag } from "../hooks/useDrag";

const ContentApp: React.FC<ContentAppProps> = ({ title = "" }) => {
  // console.log("contentscript loaded");

  const [isMinimized, setIsMinimized] = useState<boolean>(true);
  const [chatInput, setChatInput] = useState<string>("");
  const [position, setPosition] = useState<Position>(() => {
    const { iconPosition } = calculateInitialPositions();
    return iconPosition;
  });

  const widgetRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const renderCount = useRef(0);

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

  const { handleMouseDown, hasDragged } = useDrag(widgetRef, setPosition);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasDragged) return;

      if (isMinimized) {
        // Expanding: Calculate widget position based on icon location
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const isOnRightSide = position.left > screenWidth / 2;
        const isOnBottomHalf = position.top > screenHeight / 2;

        let widgetLeft, widgetTop;

        if (isOnRightSide) {
          widgetLeft = position.left - widgetSize.width + WIDGET_CONFIG.ICON_SIZE;
        } else {
          widgetLeft = position.left;
        }

        if (isOnBottomHalf) {
          console.log("isOnBottomHalf")
          widgetTop = position.top - widgetSize.height + WIDGET_CONFIG.ICON_SIZE;
        } else {
          console.log("isOnTopHalf")
          widgetTop = position.top;
        }

        const constrainedLeft = Math.max(0, Math.min(screenWidth - widgetSize.width, widgetLeft));
        const constrainedTop = Math.max(0, Math.min(screenHeight - widgetSize.height, widgetTop));

        setPosition({ left: constrainedLeft, top: constrainedTop });
      } else {
        // Minimizing: Calculate icon position based on widget location
        const isOnRightSide = position.left + widgetSize.width > window.innerWidth / 2;
        const isOnBottomHalf = position.top - widgetSize.height> window.innerHeight / 2;

        let iconLeft, iconTop;

        if (isOnRightSide) {
          // Icon at right edge of widget
          iconLeft = position.left + widgetSize.width - WIDGET_CONFIG.ICON_SIZE;
        } else {
          // Icon at left edge of widget
          iconLeft = position.left;
        }

        if (isOnBottomHalf) {
          console.log("isOnBottomHalf")
          // Icon at bottom edge of widget
          iconTop = position.top + widgetSize.height - WIDGET_CONFIG.ICON_SIZE;
        } else {
          console.log("isOnTopHalf")
          // Icon at top edge of widget
          iconTop = position.top;
        }

        setPosition({ left: iconLeft, top: iconTop });
      }

      setIsMinimized(!isMinimized);
    },
    [isMinimized, position, widgetSize, hasDragged]
  );

  // Update DOM position when position state changes
  useEffect(() => {
    if (widgetRef.current) {
      widgetRef.current.style.transform = `translate(${position.left}px, ${position.top}px)`;
    }
  }, [position]);

  // renderCount.current++;
  // console.log(`ContentApp render #${renderCount.current}`);

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