import React, { useState, useEffect } from 'react'
import type { ChatMessage } from '../types/chat'
import { MESSAGE_TYPES } from '../utils/constant'

interface NotificationPosition {
    top: number
    left: number
    width: number
    height: number
    side: 'left' | 'right'
}

interface IconPosition {
    left: number
    top: number
}

interface CurrentNotification {
    id: string
    messageId: string
    content: string
    displayContent: string
    type: string
    timestamp: number
}

interface NotificationsProps {
    iconPosition: IconPosition
    chatMessages: ChatMessage[]
    isMinimized: boolean
    isThinking: boolean
    onNotificationClick?: (e: React.MouseEvent) => void
}

const Notifications: React.FC<NotificationsProps> = ({
    iconPosition,
    chatMessages,
    isMinimized,
    isThinking,
    onNotificationClick,
}) => {
    const [currentNotification, setCurrentNotification] =
        useState<CurrentNotification | null>(null)
    const [lastProcessedMessageId, setLastProcessedMessageId] = useState<
        string | null
    >(null)

    // Calculate notification positioning using transform approach
    const getNotificationPosition = (
        content: string = '',
        isThinkingNotification: boolean = false
    ): NotificationPosition => {
        const iconWidth = 48
        const iconHeight = 48
        const iconCenterY = iconPosition.top + iconHeight / 2

        const screenWidth = window.innerWidth
        const screenHeight = window.innerHeight

        // Approximate notification dimensions for bounds checking
        const notificationWidth = isThinkingNotification ? 80 : 240
        const notificationHeight = isThinkingNotification ? 40 : 60

        const spacing = 12

        let position = { top: 0, left: 0 }
        let finalSide: 'left' | 'right'

        // Determine which side of the icon to place the notification
        const preferredSide =
            iconPosition.left > screenWidth / 2 ? 'left' : 'right'

        if (preferredSide === 'left') {
            // Try to position on left side of icon
            position.left = iconPosition.left - 1

            // Check if notification would go off left edge after transform
            const finalLeft = position.left - notificationWidth
            if (finalLeft < 10) {
                // Switch to right side
                position.left = iconPosition.left + iconWidth + spacing
                finalSide = 'right'
            } else {
                finalSide = 'left'
            }
        } else {
            // Try to position on right side of icon
            position.left = iconPosition.left + iconWidth + spacing

            // Check if notification would go off right edge
            if (position.left + notificationWidth > screenWidth - 10) {
                // Switch to left side
                position.left = iconPosition.left - spacing
                finalSide = 'left'
            } else {
                finalSide = 'right'
            }
        }

        // Vertically center the notification with the icon
        position.top = iconCenterY - notificationHeight / 2
        position.top = Math.max(
            10,
            Math.min(position.top, screenHeight - notificationHeight - 10)
        )

        return {
            ...position,
            width: notificationWidth,
            height: notificationHeight,
            side: finalSide,
        }
    }

    // Process latest assistant message
    useEffect(() => {
        if (!isMinimized) {
            setCurrentNotification(null)
            return
        }

        const lastMessage = chatMessages[chatMessages.length - 1]

        if (
            lastMessage &&
            lastMessage.type === MESSAGE_TYPES.ASSISTANT &&
            lastMessage.id !== lastProcessedMessageId
        ) {
            // Truncate content for display but keep original for width calculation
            const displayContent =
                lastMessage.content.length > 120
                    ? `${lastMessage.content.substring(0, 120)}...`
                    : lastMessage.content

            setCurrentNotification({
                id: `notification-${lastMessage.id}`,
                messageId: lastMessage.id,
                content: lastMessage.content,
                displayContent: displayContent,
                type: lastMessage.type,
                timestamp: Date.now(),
            })

            setLastProcessedMessageId(lastMessage.id)

            // Auto-hide after 5 seconds
            setTimeout(() => {
                setCurrentNotification(null)
            }, 5000)
        }
    }, [chatMessages, isMinimized, lastProcessedMessageId])

    // Clear notification when expanded
    useEffect(() => {
        if (!isMinimized) {
            setCurrentNotification(null)
        }
    }, [isMinimized])

    if (!isMinimized || (!isThinking && !currentNotification)) {
        return null
    }

    // Calculate positions for both thinking and message notifications
    const thinkingPosition = getNotificationPosition('', true)
    const messagePosition = currentNotification
        ? getNotificationPosition(currentNotification.displayContent, false)
        : null

    return (
        <div className='message-notifications-container'>
            {/* thinking indicator */}
            {isThinking && (
                <div
                    className='message-notification thinking'
                    style={{
                        position: 'fixed',
                        top: thinkingPosition.top,
                        left: thinkingPosition.left,
                        transform:
                            thinkingPosition.side === 'left'
                                ? 'translateX(-100%)'
                                : 'translateX(0)',
                        zIndex: 10000,
                    }}
                >
                    <div className='notification-content'>
                        <div className='thinking-indicator'>
                            <div className='thinking-dot'></div>
                            <div className='thinking-dot'></div>
                            <div className='thinking-dot'></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Latest assistant message */}
            {!isThinking && currentNotification && messagePosition && (
                <div
                    className='message-notification assistant'
                    style={{
                        position: 'fixed',
                        top: messagePosition.top,
                        left: messagePosition.left,
                        transform:
                            messagePosition.side === 'left'
                                ? 'translateX(-100%)'
                                : 'translateX(0)',
                        zIndex: 10000,
                    }}
                    onClick={onNotificationClick}
                >
                    <div className='notification-content'>
                        <div className='notification-text'>
                            {currentNotification.displayContent}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Notifications
