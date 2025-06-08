import React, { useRef, useEffect } from 'react';
import { parseMarkdownLine, parseMessageContent } from '../utils/helpers';

const ChatMessages = ({ 
  chatMessages, 
  isTyping, 
  chatMessagesRef 
}) => {
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages, isTyping]);

  return (
    <div className="chat-messages" ref={chatMessagesRef}>
      {chatMessages.map((message) => (
        <div key={message.id} className={`chat-message ${message.type}`}>
          <div className="message-content">
            <div className="message-text">
              {parseMessageContent(message.content)}
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