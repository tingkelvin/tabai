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

// Optimized drag hook
const useOptimizedDrag = (
  elementRef: React.RefObject<HTMLElement>,
  onDragEnd?: (position: Position) => void,
  constraints?: {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
  }
) => {
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragState = useRef({ startX: 0, startY: 0, elementX: 0, elementY: 0 });
  const animationFrameId = useRef<number | null>(null);

  const constrainPosition = useCallback(
    (x: number, y: number) => {
      if (!constraints) return { x, y };

      const constrainedX = Math.max(
        constraints.minX ?? -Infinity,
        Math.min(constraints.maxX ?? Infinity, x)
      );
      const constrainedY = Math.max(
        constraints.minY ?? -Infinity,
        Math.min(constraints.maxY ?? Infinity, y)
      );

      return { x: constrainedX, y: constrainedY };
    },
    [constraints]
  );

  const updateElementPosition = useCallback(
    (x: number, y: number) => {
      if (!elementRef.current) return;

      const { x: constrainedX, y: constrainedY } = constrainPosition(x, y);
      elementRef.current.style.transform = `translate(${constrainedX}px, ${constrainedY}px)`;
    },
    [elementRef, constrainPosition]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current || !elementRef.current) return;

      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }

      animationFrameId.current = requestAnimationFrame(() => {
        const deltaX = e.clientX - dragState.current.startX;
        const deltaY = e.clientY - dragState.current.startY;

        const newX = dragState.current.elementX + deltaX;
        const newY = dragState.current.elementY + deltaY;

        updateElementPosition(newX, newY);

        if (
          !hasDragged.current &&
          (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)
        ) {
          hasDragged.current = true;
          elementRef.current?.classList.add("dragging");
        }
      });
    },
    [elementRef, updateElementPosition]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;

      isDragging.current = false;

      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }

      elementRef.current?.classList.remove("dragging");

      if (elementRef.current && onDragEnd) {
        const computedStyle = getComputedStyle(elementRef.current);
        const transform = computedStyle.transform;

        let finalX = 0,
          finalY = 0;
        if (transform && transform !== "none") {
          const matrix = new DOMMatrix(transform);
          finalX = matrix.m41;
          finalY = matrix.m42;
        }

        onDragEnd({ left: finalX, top: finalY });
      }

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      setTimeout(() => {
        hasDragged.current = false;
      }, 10);
    },
    [elementRef, onDragEnd, handleMouseMove]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!elementRef.current) return;

      e.preventDefault();
      e.stopPropagation();

      isDragging.current = true;
      hasDragged.current = false;

      const computedStyle = getComputedStyle(elementRef.current);
      const transform = computedStyle.transform;

      let currentX = 0,
        currentY = 0;
      if (transform && transform !== "none") {
        const matrix = new DOMMatrix(transform);
        currentX = matrix.m41;
        currentY = matrix.m42;
      }

      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        elementX: currentX,
        elementY: currentY,
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [elementRef, handleMouseMove, handleMouseUp]
  );

  return {
    handleMouseDown,
    isDragging: isDragging.current,
    hasDragged: hasDragged.current,
  };
};

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

  const { handleMouseDown, hasDragged } = useOptimizedDrag(
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
