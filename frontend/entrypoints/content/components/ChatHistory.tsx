// Chat.tsx - Fixed component name and props with messages data
import React, { useEffect, useState } from "react";
import MessageContent from "./MessageContent";
import type { ChatMessage } from "../types/chat";
import { ChatHistoryProps } from "../types/components";
import { MESSAGE_TYPES } from "../utils/constant";

const ChatHistory: React.FC<ChatHistoryProps> = ({
  chatMessages,
  isThinking,
  chatMessagesRef,
}) => {
  // Initialize with fake messages for testing
  const [messages, setMessages] = useState<ChatMessage[]>();

  // Use chatMessages prop if provided, otherwise use default messages
  const displayMessages = chatMessages?.length > 0 ? chatMessages : (messages || []);

  useEffect(() => {
    console.log("🚀 Chat messages:", displayMessages);
    if (chatMessagesRef?.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [displayMessages, isThinking, chatMessagesRef]);

  return (
    <div className="chat-messages" ref={chatMessagesRef}>
      {displayMessages.map((message) => (
        <div key={message.id} className={`chat-message ${message.type}`}>
          <div className="message-content">
            <div className="message-text">
              <MessageContent content={message.content} />
            </div>
          </div>
        </div>
      ))}
      {isThinking && (
        <div className="chat-message assistant thinking">
          <div className="message-content">
            <div className="message-text">
              <div className="thinking-indicator">
                <div className="thinking-dot"></div>
                <div className="thinking-dot"></div>
                <div className="thinking-dot"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHistory;
