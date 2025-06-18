// ContentApp.tsx - With Message Notifications
import React, { useState, useEffect, useRef, useCallback } from "react";
import TerminalIcon from "./TerminalIcon";
import { calculateInitialPositions } from "../utils/helper";

interface ContentAppProps {
  customActions?: any[];
  title?: string;
}

const ContentApp: React.FC<ContentAppProps> = ({
  customActions = [],
  title = "",
}) => {
  console.log("content script loaded");

  const { widgetPosition: initialWidgetPos, iconPosition: initialIconPos } = calculateInitialPositions();
  return (
    <>
        <div
          className={`extension-widget minimized`}
          style={{
            top: initialIconPos.top,
            left: initialIconPos.left,
          }}
          
        >
          <TerminalIcon  isTyping={true} />
        </div>
    </>
  );
};

export default ContentApp;
