// ContentApp.tsx - Simplified with enhanced useDrag hook
import React, { useState, useRef } from 'react'

// Components import
import TerminalIcon from './TerminalIcon'
import TerminalHeader from './TerminalHeader'
import Chat from './Chat'
import ChatInput from './ChatInput'

// Types import
import type { ContentAppProps } from '../types'
import type { ChatMessage } from '../types/chat'
import { WIDGET_CONFIG } from '../utils/constant'
import { useDrag } from '../hooks/useDrag'

const ContentApp: React.FC<ContentAppProps> = ({ title = '' }) => {
    const [chatInput, setChatInput] = useState<string>('')
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [widgetSize, setWidgetSize] = useState({
        width: WIDGET_CONFIG.DEFAULT_WIDTH,
        height: WIDGET_CONFIG.DEFAULT_HEIGHT,
    })

    const widgetRef = useRef<HTMLDivElement>(null)
    const chatMessagesRef = useRef<HTMLDivElement>(null)
    const chatInputRef = useRef<HTMLTextAreaElement>(null)

    // Enhanced useDrag hook now handles all position logic and toggle functionality
    const { handleMouseDown, handleToggle, hasDragged, isMinimized } = useDrag(
        widgetRef,
        {
            widgetSize,
        }
    )

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

    return (
        <>
            {isMinimized ? (
                <div
                    ref={widgetRef}
                    className='terminal-widget minimized'
                    onMouseDown={handleMouseDown}
                >
                    <TerminalIcon isTyping={true} onClick={handleToggle} />
                </div>
            ) : (
                <div
                    ref={widgetRef}
                    className='terminal-widget expanded'
                    onMouseDown={handleMouseDown}
                >
                    <TerminalHeader
                        dragging={false}
                        startDrag={handleMouseDown}
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
