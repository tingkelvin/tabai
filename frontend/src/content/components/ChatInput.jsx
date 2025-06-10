import React, { useState } from 'react';
import { RemoveIcon } from './Icons'; // Adjust import path

const ChatInput = ({
  fileActions = [],
  actionButtons = [],
  chatInputRef,
  chatInput,
  handleInputChange,
  handleKeyPress
}) => {
  const [hoveredAction, setHoveredAction] = useState(null);

  // Helper function to determine if button should be square
  const isSquareButton = (action) => {
    return (action.icon && (!action.label || action.label.length <= 1));
  };

  const renderActionButton = (action, index) => {
    const shouldBeSquare = isSquareButton(action);
    const isFileAction = action.className === 'file-action';
    const isHovered = hoveredAction === action.id;
    
    return (
      <button
        key={action.id || `${action.className}-${index}`}
        className={`custom-action-btn ${action.className || ''} ${shouldBeSquare ? 'square' : ''}`}
        onClick={action.onClick}
        title={isFileAction && isHovered ? 'Remove file' : action.title}
        disabled={action.disabled}
        style={action.style}
        data-single-icon={shouldBeSquare ? "true" : "false"}
        onMouseEnter={() => setHoveredAction(action.id)}
        onMouseLeave={() => setHoveredAction(null)}
      >
        {action.icon && (
          <span className="action-icon">
            {isFileAction && isHovered ? (
              <RemoveIcon size={16} />
            ) : (
              action.icon
            )}
          </span>
        )}
        {action.label}
      </button>
    );
  };

  return (
    <div className="chat-input-container">
      <textarea
        ref={chatInputRef}
        className="chat-input"
        value={chatInput}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        placeholder="Ask me anything..."
        rows="1"
        autoComplete="off"
        spellCheck="false"
      />
      
      {(fileActions.length > 0 || actionButtons.length > 0) && (
        <div className="actions-wrapper">
          {/* File actions on the left */}
          {fileActions.length > 0 && (
            <div className="file-actions-container">
              {fileActions.map((action, index) => renderActionButton(action, index))}
            </div>
          )}
          
          {/* Action buttons on the right */}
          {actionButtons.length > 0 && (
            <div className="action-buttons-container">
              {actionButtons.map((action, index) => renderActionButton(action, index))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatInput;