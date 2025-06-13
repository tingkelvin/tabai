// components/MessageNotifications.jsx
import React, { useState, useEffect } from 'react';

const MessageNotifications = ({
    iconPosition,
    chatMessages,
    isMinimized,
    isTyping,
    onNotificationClick
}) => {
    const [currentNotification, setCurrentNotification] = useState(null);
    const [lastProcessedMessageId, setLastProcessedMessageId] = useState(null);

    // Calculate notification positioning
    const getNotificationPosition = (isTypingNotification = false) => {
        const iconCenterX = iconPosition.left + 24;
        const iconCenterY = iconPosition.top + 24;

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const notificationWidth = isTypingNotification ? 80 : 280;
        const notificationHeight = 60;
        const spacing = 8;

        let position = { top: 0, left: 0 };

        // Simple rule: if icon on right half, notifications go left; if icon on left half, notifications go right
        const isIconOnRight = iconPosition.left > screenWidth / 2;

        if (isIconOnRight) {
            // Icon on right - position notifications to the left
            position.left = iconPosition.left - notificationWidth + 20;
        } else {
            // Icon on left - position notifications to the right
            position.left = iconPosition.left + 48 + spacing;
        }

        position.top = iconCenterY - (notificationHeight / 2);

        // Keep within screen bounds
        position.left = Math.max(10, Math.min(position.left, screenWidth - notificationWidth - 10));
        position.top = Math.max(10, Math.min(position.top, screenHeight - notificationHeight - 10));

        return { ...position };
    };

    // Process latest assistant message
    useEffect(() => {
        if (!isMinimized) {
            setCurrentNotification(null);
            return;
        }

        const lastMessage = chatMessages[chatMessages.length - 1];

        if (lastMessage &&
            lastMessage.type === 'assistant' &&
            lastMessage.id !== lastProcessedMessageId) {

            setCurrentNotification({
                id: `notification-${lastMessage.id}`,
                messageId: lastMessage.id,
                content: lastMessage.content,
                type: lastMessage.type,
                timestamp: Date.now()
            });

            setLastProcessedMessageId(lastMessage.id);

            // Auto-hide after 5 seconds
            setTimeout(() => {
                setCurrentNotification(null);
            }, 5000);
        }
    }, [chatMessages, isMinimized, lastProcessedMessageId]);

    // Clear notification when expanded
    useEffect(() => {
        if (!isMinimized) {
            setCurrentNotification(null);
        }
    }, [isMinimized]);

    if (!isMinimized || (!isTyping && !currentNotification)) {
        return null;
    }

    const position = getNotificationPosition(false); // Use same position for both

    return (
        <div className="message-notifications-container">
            {/* Typing indicator */}
            {isTyping && (
                <div
                    className="message-notification typing"
                    style={{
                        top: position.top,
                        left: position.left,
                    }}
                >
                    <div className="notification-content">
                        <div className="typing-indicator">
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Latest assistant message */}
            {!isTyping && currentNotification && (
                <div
                    className="message-notification assistant"
                    style={{
                        top: position.top,
                        left: position.left,
                    }}
                    onClick={() => onNotificationClick && onNotificationClick(currentNotification)}
                >
                    <div className="notification-content">
                        <div className="notification-text">
                            {currentNotification.content.length > 100
                                ? `${currentNotification.content.substring(0, 100)}...`
                                : currentNotification.content
                            }
                        </div>
                        <div className="notification-indicator">
                            <div className="pulse-dot"></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessageNotifications;