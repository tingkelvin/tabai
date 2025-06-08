import React from 'react';
import { parseMarkdownLine } from '../utils/helpers';

const ChatMessages = ({ 
  chatMessages, 
  isTyping, 
  chatMessagesRef 
}) => {
  return (
    <div className="chat-messages" ref={chatMessagesRef}>
      {chatMessages.map((message) => (
        <div key={message.id} className={`chat-message ${message.type}`}>
          <div className="message-content">
            <div className="message-text">
              {message.content.split('\n').map((line, index) => (
                <div key={index}>
                  {parseMarkdownLine(line)}
                  {index < message.content.split('\n').length - 1 && <br />}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
      
      {isTyping && (
        <div className="chat-message assistant typing">
          <div className="message-content">
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessages; 