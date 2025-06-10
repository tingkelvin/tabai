import React from 'react';

const ChatInput = ({
  visibleActions,
  chatInputRef,
  chatInput,
  handleInputChange,
  handleKeyPress
}) => {
  // Helper function to determine if button should be square
  const isSquareButton = (action) => {
    // Button is square if it has only an icon and no label, or label is single character
    return (action.icon && (!action.label || action.label.length <= 1));
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
      
      {visibleActions.length > 0 && (
        <div className="custom-actions-container">
          {visibleActions.map((action, index) => {
            const shouldBeSquare = isSquareButton(action);
            
            return (
              <button
                key={action.id || index}
                className={`custom-action-btn ${action.className || ''} ${shouldBeSquare ? 'square' : ''}`}
                onClick={action.onClick}
                title={action.title}
                disabled={action.disabled}
                style={action.style}
                data-single-icon={shouldBeSquare ? "true" : "false"}
              >
                {action.icon && <span className="action-icon">{action.icon}</span>}
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChatInput;