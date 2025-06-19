// ContentApp.tsx - Fixed to restore icon position on minimize
import React, { useState, useEffect, useRef, useCallback } from 'react'

// Components import
import TerminalIcon from './TerminalIcon'
import TerminalHeader from './TerminalHeader'
import Chat from './Chat'
import ChatInput from './ChatInput'

// Utils
import { calculateInitialPositions } from '../utils/helper'

// Types import
import type { ContentAppProps, Position } from '../types'
import type { ChatMessage } from '../types/chat'
import { WIDGET_CONFIG } from '../utils/constant'
import { useDrag } from '../hooks/useDrag'

const ContentApp: React.FC<ContentAppProps> = ({ title = '' }) => {
    // console.log("contentscript loaded");

    const [isMinimized, setIsMinimized] = useState<boolean>(true)
    const [chatInput, setChatInput] = useState<string>('')

    // Separate positions for icon and widget
    const [iconPosition, setIconPosition] = useState<Position>(() => {
        const { iconPosition } = calculateInitialPositions()
        return iconPosition
    })
    const [widgetPosition, setWidgetPosition] = useState<Position>(() => {
        const { iconPosition } = calculateInitialPositions()
        return iconPosition
    })

    const widgetRef = useRef<HTMLDivElement>(null)
    const chatMessagesRef = useRef<HTMLDivElement>(null)
    const chatInputRef = useRef<HTMLTextAreaElement>(null)
    const renderCount = useRef(0)

    const [widgetSize, setWidgetSize] = useState({
        width: WIDGET_CONFIG.DEFAULT_WIDTH,
        height: WIDGET_CONFIG.DEFAULT_HEIGHT,
    })

    const [messages, setMessages] = useState<ChatMessage[]>([])

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setChatInput(e.target.value)
    }

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            console.log('Sending:', chatInput)
            setChatInput('')
        }
    }

    // Use different drag handlers for minimized vs expanded states
    const { handleMouseDown: handleIconDrag, hasDragged: iconHasDragged } =
        useDrag(widgetRef, (newPosition) => {
            if (isMinimized) {
                setIconPosition(newPosition)
            }
        })

    const { handleMouseDown: handleWidgetDrag, hasDragged: widgetHasDragged } =
        useDrag(widgetRef, (newPosition) => {
            if (!isMinimized) {
                setWidgetPosition(newPosition)
            }
        })

    const currentPosition = isMinimized ? iconPosition : widgetPosition
    const currentHasDragged = isMinimized ? iconHasDragged : widgetHasDragged
    const currentHandleMouseDown = isMinimized
        ? handleIconDrag
        : handleWidgetDrag

    const handleToggle = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation()
            if (currentHasDragged) return

            if (isMinimized) {
                // Expanding: Calculate widget position based on current icon location
                const screenWidth = window.innerWidth
                const screenHeight = window.innerHeight
                const isOnRightSide = iconPosition.left > screenWidth / 2
                const isOnBottomHalf = iconPosition.top > screenHeight / 2

                let widgetLeft, widgetTop

                if (isOnRightSide) {
                    widgetLeft =
                        iconPosition.left -
                        widgetSize.width +
                        WIDGET_CONFIG.ICON_SIZE
                } else {
                    widgetLeft = iconPosition.left
                }

                if (isOnBottomHalf) {
                    console.log('isOnBottomHalf')
                    widgetTop =
                        iconPosition.top -
                        widgetSize.height +
                        WIDGET_CONFIG.ICON_SIZE
                } else {
                    console.log('isOnTopHalf')
                    widgetTop = iconPosition.top
                }

                const constrainedLeft = Math.max(
                    0,
                    Math.min(screenWidth - widgetSize.width, widgetLeft)
                )
                const constrainedTop = Math.max(
                    0,
                    Math.min(screenHeight - widgetSize.height, widgetTop)
                )

                setWidgetPosition({
                    left: constrainedLeft,
                    top: constrainedTop,
                })
            } else {
                // Minimizing: Position will automatically use iconPosition
                // No need to update positions here
            }

            setIsMinimized(!isMinimized)
        },
        [isMinimized, iconPosition, widgetSize, currentHasDragged]
    )

    // Update DOM position when position state changes
    useEffect(() => {
        if (widgetRef.current) {
            widgetRef.current.style.transform = `translate(${currentPosition.left}px, ${currentPosition.top}px)`
        }
    }, [currentPosition])

    // renderCount.current++;
    // console.log(`ContentApp render #${renderCount.current}`);

    return (
        <>
            {isMinimized ? (
                <div
                    ref={widgetRef}
                    className='terminal-widget minimized'
                    onMouseDown={currentHandleMouseDown}
                >
                    <TerminalIcon isTyping={true} onClick={handleToggle} />
                </div>
            ) : (
                <div
                    ref={widgetRef}
                    className='terminal-widget expanded'
                    onMouseDown={currentHandleMouseDown}
                >
                    <TerminalHeader
                        dragging={false}
                        startDrag={currentHandleMouseDown}
                        handleMinimize={handleToggle}
                        title={title}
                    />
                    <div className='terminal-content'>
                        <div className='chat-section'>
                            <Chat
                                chatMessagesRef={chatMessagesRef}
                                chatMessages={messages}
                                isTyping={false}
                            />
                            <ChatInput
                                fileActions={[]}
                                buttons={[]}
                                chatInputRef={chatInputRef}
                                chatInput={chatInput}
                                handleInputChange={handleInputChange}
                                handleKeyPress={handleKeyPress}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default ContentApp
