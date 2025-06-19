// ContentApp.tsx - Using extracted drag utils
import React, { useState, useEffect, useRef } from "react";
import TerminalIcon from "./TerminalIcon";
import { calculateInitialPositions } from "../utils/helper";
import { createDragHandlers } from "../utils/dragUtils";
import type { ContentAppProps, Position, DragState } from '../types';
import { WIDGET_CONFIG } from "../utils/constant";

const ContentApp: React.FC<ContentAppProps> = ({
  customActions = [],
  title = "",
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(true);
  const widgetRef = useRef<HTMLDivElement>(null);
  const renderCount = useRef(0);
  const isDragging = useRef(false);
  const dragState = useRef<DragState>({ startX: 0, startY: 0, elementX: 0, elementY: 0 });
  const currentPosition = useRef<Position>({ x: 0, y: 0 });

  renderCount.current++;
  console.log(`ContentApp render #${renderCount.current} - This should be minimal now!`);

  // Create drag handlers
  const dragHandlers = createDragHandlers(
    widgetRef,
    currentPosition,
    isDragging,
    dragState,
    { width: WIDGET_CONFIG.ICON_SIZE, height: WIDGET_CONFIG.ICON_SIZE }
  );

  useEffect(() => {
    const { iconPosition } = calculateInitialPositions();
    currentPosition.current = { x: iconPosition.x, y: iconPosition.y };

    if (widgetRef.current) {
      widgetRef.current.style.transform = `translate(${iconPosition.x}px, ${iconPosition.y}px)`;
    }

    return () => {
      dragHandlers.cleanup();
    };
  }, []);

  return (
    <>
      <div
        ref={widgetRef}
        className={`terminal-widget minimized ${isDragging.current ? 'dragging' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
        }}
        onMouseDown={dragHandlers.handleMouseDown}
      >
        <TerminalIcon isTyping={true} />
      </div>
    </>
  );
};

export default ContentApp;