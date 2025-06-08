import React from 'react';

const ChatInput = ({
  visibleActions,
  chatInputRef,
  chatInput,
  handleInputChange,
  handleKeyPress
}) => {
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
          {visibleActions.map((action, index) => (
            <button
              key={action.id || index}
              className={`custom-action-btn ${action.className || ''}`}
              onClick={action.onClick}
              title={action.title}
              disabled={action.disabled}
              style={action.style}
            >
              {action.icon && <span className="action-icon">{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatInput; 