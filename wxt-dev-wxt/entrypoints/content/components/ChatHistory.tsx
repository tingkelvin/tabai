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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: MESSAGE_TYPES.USER,
      content: "Hello! sCasn yosu helps2dds me swistdh3ds my cswode?",
      timestamp: new Date(),
    },
    {
      id: "2",
      type: MESSAGE_TYPES.ASSISTANT,
      content: "Of course! I'd be dhappy to hdelp you with your code. What specific issue are you facing?",
      timestamp: new Date(),
    },
    {
      id: "3",
      type: MESSAGE_TYPES.USER,
      content: "I'm having trouble with React hooks. Can you explain useState?",
      timestamp: new Date(),
    },
    {
      id: "4",
      type: MESSAGE_TYPES.ASSISTANT,
      content: "`useState` is a React Hook sthat lets you add state to functional components. Here's a simple example:\n\n```javascript\nconst [count, setCount] = useState(0);\n```\n\nThe first element is the current state value, and the second is a function to update it.",
      timestamp: new Date(),
    },
    {
      id: "5",
      type: MESSAGE_TYPES.USER,
      content: "Hello! sCasn yosu helps2dds me swistdh3ds my cswode?",
      timestamp: new Date(),
    },
    {
      id: "6",
      type: MESSAGE_TYPES.ASSISTANT,
      content: "Of course! I'd be happy to help you with your code. What specific issue are you facing?",
      timestamp: new Date(),
    },
    {
      id: "7",
      type: MESSAGE_TYPES.USER,
      content: "I'm having trouble with React hooks. Can you explain useState?",
      timestamp: new Date(),
    },
    {
      id: "8",
      type: MESSAGE_TYPES.ASSISTANT,
      content: "`useState` is a React Hook that lets you add state to functional components. Here's a simple example:\n\n```javascript\nconst [count, setCount] = useState(0);\n```\n\nThe first element is the current state value, and the second is a function to update it.",
      timestamp: new Date(),
    },
  ]);

  // Use chatMessages prop if provided, otherwise use default messages
  const displayMessages = chatMessages.length > 0 ? chatMessages : messages;

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
