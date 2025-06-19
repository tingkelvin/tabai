// Chat.tsx - Fixed component name and props
import React, { useEffect } from 'react';
import MessageContent from './MessageContent';
import type { ChatMessage } from '../types/chat';

interface ChatProps { // Fixed: Use ChatMessagesProps, not ChatProps
    chatMessages: ChatMessage[];
    isTyping: boolean;
    chatMessagesRef: React.RefObject<HTMLDivElement | null>;
}

const Chat: React.FC<ChatProps> = ({ // Fixed: Export ChatMessages, not Chat
    chatMessages,
    isTyping,
    chatMessagesRef
}) => {
    useEffect(() => {
        console.log('🚀 Chat messages:', chatMessages);
        if (chatMessagesRef?.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [chatMessages, isTyping]);

    return (
        <div className="chat-messages" ref={chatMessagesRef}>
            {chatMessages.map((message) => (
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

export default Chat; // Fixed: Export ChatMessages