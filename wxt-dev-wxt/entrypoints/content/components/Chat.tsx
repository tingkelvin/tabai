// Chat.tsx - Fixed component name and props with messages data
import React, { useEffect, useState } from "react";
import MessageContent from "./MessageContent";
import type { ChatMessage } from "../types/chat";

interface ChatProps {
  chatMessages: ChatMessage[];
  isTyping: boolean;
  chatMessagesRef: React.RefObject<HTMLDivElement | null>;
}

const Chat: React.FC<ChatProps> = ({
  chatMessages,
  isTyping,
  chatMessagesRef,
}) => {
  // Initialize with default messages
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "user",
      content: "Hello! Can you help me with JavaScript?",
      timestamp: Date.now() - 300000,
    },
    {
      id: "2",
      type: "assistant",
      content:
        "Of course! I'd be happy to help you with JavaScript. What specific topic would you like to learn about?",
      timestamp: Date.now() - 250000,
    },
    {
      id: "3",
      type: "user",
      content: "How do I create a function?",
      timestamp: Date.now() - 200000,
    },
    {
      id: "4",
      type: "assistant",
      content:
        'Here are the main ways to create functions in JavaScript:\n\n```javascript\n// Function declaration\nfunction myFunction() {\n  return "Hello";\n}\n\n// Arrow function\nconst myArrowFunction = () => {\n  return "Hello";\n};\n```',
      timestamp: Date.now() - 150000,
    },
  ]);

  // Use chatMessages prop if provided, otherwise use default messages
  const displayMessages = chatMessages.length > 0 ? chatMessages : messages;

  useEffect(() => {
    console.log("🚀 Chat messages:", displayMessages);
    if (chatMessagesRef?.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [displayMessages, isTyping, chatMessagesRef]);

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
      {isTyping && (
        <div className="chat-message assistant typing">
          <div className="message-content">
            <div className="message-text">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
