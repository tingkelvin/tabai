// ContentApp.tsx - With Message Notifications
import React, { useState, useEffect, useRef, useCallback } from "react";
import TerminalIcon from "./TerminalIcon";
import { calculateInitialPositions } from "../utils/helper";
import { usePosition } from '../hooks/usePosition';
import type { ContentAppProps, CustomAction } from '../types';

const ContentApp: React.FC<ContentAppProps> = ({
  customActions = [],
  title = "",
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(true);
  const { widgetPosition: initialWidgetPos, iconPosition: initialIconPos } = calculateInitialPositions();
  // Position management
  const [widgetPosition, updateWidgetPosition, constrainWidgetPosition] = usePosition(initialWidgetPos);
  const [iconPosition, updateIconPosition, constrainIconPosition] = usePosition(initialIconPos);
  console.log("content script loaded");


  return (
    <>
      <div
        className={`terminal-widget minimized`}
        style={{
          top: iconPosition.top,
          left: iconPosition.left,
        }}

      >
        <TerminalIcon isTyping={true} />
      </div>
    </>
  );
};

export default ContentApp;
