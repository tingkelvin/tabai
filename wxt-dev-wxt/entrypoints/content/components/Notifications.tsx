import React, { useState, useEffect } from 'react';
import type { ChatMessage } from '../types/chat';
import { MESSAGE_TYPES } from '../utils/constant';

interface NotificationPosition {
    top: number;
    left: number;
    width: number;
    height: number;
    side: 'left' | 'right';
}

interface IconPosition {
    left: number;
    top: number;
}

interface CurrentNotification {
    id: string;
    messageId: string;
    content: string;
    displayContent: string;
    type: string;
    timestamp: number;
}

interface NotificationsProps {
    iconPosition: IconPosition;
    chatMessages: ChatMessage[];
    isMinimized: boolean;
    isTyping: boolean;
    onNotificationClick?: (e: React.MouseEvent) => void
}

const Notifications: React.FC<NotificationsProps> = ({
    iconPosition,
    chatMessages,
    isMinimized,
    isTyping,
    onNotificationClick
}) => {
    const [currentNotification, setCurrentNotification] = useState<CurrentNotification | null>(null);
    const [lastProcessedMessageId, setLastProcessedMessageId] = useState<string | null>(null);

    // Calculate notification positioning based on content length
    const getNotificationPosition = (content: string = '', isTypingNotification: boolean = false): NotificationPosition => {
        const iconWidth = 48;
        const iconHeight = 48;
        const iconCenterX = iconPosition.left + (iconWidth / 2);
        const iconCenterY = iconPosition.top + (iconHeight / 2);

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        const notificationWidth = isTypingNotification ? 80 : 240;
        const notificationHeight = isTypingNotification ? 40 : 60;
        const spacing = 12;

        let position = { top: 0, left: 0 };

        // Determine which side of the icon to place the notification
        const isIconOnRight = iconPosition.left > screenWidth / 2;

        if (isIconOnRight) {
            // Icon on right side - position notification to the left of icon
            // Anchor from the right edge of the notification to the left edge of the icon
            position.left = iconPosition.left - notificationWidth - spacing;
        } else {
            // Icon on left side - position notification to the right of icon
            // Anchor from the left edge of the notification to the right edge of the icon
            position.left = iconPosition.left + iconWidth + spacing;
        }

        // Vertically center the notification with the icon
        position.top = iconCenterY - (notificationHeight / 2);

        // Ensure notification stays within screen bounds with different logic for each side
        if (isIconOnRight) {
            // For left-positioned notifications, ensure it doesn't go off the left edge
            position.left = Math.max(10, position.left);
            // If it would be cut off, position it to the right instead
            if (position.left < 10) {
                position.left = iconPosition.left + iconWidth + spacing;
            }
        } else {
            // For right-positioned notifications, ensure it doesn't go off the right edge
            position.left = Math.min(position.left, screenWidth - notificationWidth - 10);
            // If it would be cut off, position it to the left instead
            if (position.left + notificationWidth > screenWidth - 10) {
                position.left = iconPosition.left - notificationWidth - spacing;
            }
        }

        position.top = Math.max(10, Math.min(position.top, screenHeight - notificationHeight - 10));
        console.log(position);

        return {
            ...position,
            width: notificationWidth,
            height: notificationHeight,
            side: isIconOnRight ? 'left' : 'right' // Track which side for debugging
        };
    };

    // Process latest assistant message
    useEffect(() => {
        if (!isMinimized) {
            setCurrentNotification(null);
            return;
        }

        const lastMessage = chatMessages[chatMessages.length - 1];

        if (lastMessage &&
            lastMessage.type === MESSAGE_TYPES.ASSISTANT &&
            lastMessage.id !== lastProcessedMessageId) {

            // Truncate content for display but keep original for width calculation
            const displayContent = lastMessage.content.length > 120
                ? `${lastMessage.content.substring(0, 120)}...`
                : lastMessage.content;

            setCurrentNotification({
                id: `notification-${lastMessage.id}`,
                messageId: lastMessage.id,
                content: lastMessage.content,
                displayContent: displayContent,
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

    // Calculate positions for both typing and message notifications
    const typingPosition = getNotificationPosition('', true);
    const messagePosition = currentNotification ?
        getNotificationPosition(currentNotification.displayContent, false) : null;

    return (
        <div className="message-notifications-container">
            {/* Typing indicator */}
            {isTyping && (
                <div
                    className="message-notification typing"
                    style={{
                        position: 'fixed',
                        top: typingPosition.top,
                        left: typingPosition.left,
                        width: typingPosition.width,
                        height: typingPosition.height,
                        zIndex: 10000,
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
            {!isTyping && currentNotification && messagePosition && (
                <div
                    className="message-notification assistant"
                    style={{
                        position: 'fixed',
                        top: messagePosition.top,
                        left: messagePosition.left,
                        width: messagePosition.width,
                        height: messagePosition.height,
                        zIndex: 10000,
                    }}
                    onClick={onNotificationClick}
                >
                    <div className="notification-content">
                        <div className="notification-text">
                            {currentNotification.displayContent}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notifications;