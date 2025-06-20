// hooks/useChat.ts
import { useState, useCallback } from 'react';
import { MESSAGE_TYPES } from '../utils/constant';
import { ChatMessage } from '../types/chat';

export interface ChatHookReturn {
    chatInput: string;
    chatMessages: ChatMessage[];
    isTyping: boolean;
    handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    sendMessage: (messageOrInput?: string, addToChat?: boolean) => Promise<string>;
    addMessage: (message: Partial<ChatMessage>) => void;
    addMessages: (messages: Partial<ChatMessage>[]) => void;
    clearMessages: () => void;
    removeMessage: (messageId: string) => void;
    updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
    setIsTyping: (typing: boolean) => void;
    addUserMessage: (content: string) => void;
    addAssistantMessage: (content: string) => void;
}

// Dummy function to replace file context
const getAllContentAsString = async (): Promise<string> => {
    return '';
};

export const useChat = (): ChatHookReturn => {
    const [chatInput, setChatInput] = useState<string>('');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [isTyping, setIsTyping] = useState<boolean>(false);

    // Method to directly add assistant messages to the chat
    const addAssistantMessage = useCallback((content: string) => {
        const newMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: MESSAGE_TYPES.ASSISTANT,
            content: content.trim(),
            timestamp: new Date()
        };

        setChatMessages(prev => [...prev, newMessage]);
    }, []);

    const sendMessage = useCallback(async (messageOrInput?: string, addToChat: boolean = true): Promise<string> => {
        // Handle both direct message sending and chat input
        let message = messageOrInput;

        // If no message is provided, use chatInput
        if (!message) {
            const chatInputTrimmed = chatInput.trim();
            if (!chatInputTrimmed) return '';

            const fileContents = await getAllContentAsString();
            message = `<user_message>${chatInputTrimmed}</user_message>`;

            if (fileContents) {
                message += `<file_content>${fileContents}<file_content>`;
            }
        }

        // Only add user message to chat if it's from chatInput (not auto-init)
        if (!messageOrInput && chatInput.trim()) {
            const userMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: MESSAGE_TYPES.USER,
                content: chatInput.trim(),
                timestamp: new Date()
            };
            setChatMessages(prev => [...prev, userMessage]);
        }

        // Always show typing when sending a message
        setIsTyping(true);

        try {
            console.log('🚀 Sending to backend:', message.substring(0, 100) + '...');

            // Send directly to background script
            const reply = await chrome.runtime.sendMessage({
                type: 'CHAT_MESSAGE',
                data: { message: message }
            });

            const responseContent = reply.content || "I do not find any response, sorry.";

            // Add the assistant response to chat messages
            if (addToChat) addAssistantMessage(responseContent);

            return responseContent;

        } catch (error) {
            console.error('❌ Error sending message:', error);
            const errorContent = "Sorry, I'm experiencing technical difficulties. Please try again later.";

            addAssistantMessage(errorContent);

            return errorContent;

        } finally {
            setIsTyping(false);
        }
    }, [chatInput, addAssistantMessage]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setChatInput(e.target.value);

        const textarea = e.target;
        textarea.style.height = 'auto';

        const scrollHeight = textarea.scrollHeight;
        const minHeight = 44;
        const maxHeight = 400;

        const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
        textarea.style.height = `${newHeight}px`;
        textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }, []);

    const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();

            // Send message - user message and response will be added automatically
            sendMessage();

            // Clear input and reset textarea height
            setChatInput('');

            setTimeout(() => {
                const target = e.target as HTMLTextAreaElement;
                if (target) {
                    target.style.height = '44px';
                    target.style.overflowY = 'hidden';
                }
            }, 0);
        }
    }, [sendMessage]);

    // Method to directly add messages to the chat
    const addMessage = useCallback((message: Partial<ChatMessage>) => {
        const newMessage: ChatMessage = {
            id: message.id || `msg-${Date.now()}`,
            type: message.type || MESSAGE_TYPES.ASSISTANT,
            content: message.content || '',
            timestamp: message.timestamp || new Date(),
            ...message
        };

        setChatMessages(prev => [...prev, newMessage]);
    }, []);

    // Method to directly add user messages to the chat
    const addUserMessage = useCallback((content: string) => {
        const newMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: MESSAGE_TYPES.USER,
            content: content,
            timestamp: new Date()
        };

        setChatMessages(prev => [...prev, newMessage]);
    }, []);

    // Method to add multiple messages at once
    const addMessages = useCallback((messages: Partial<ChatMessage>[]) => {
        const newMessages: ChatMessage[] = messages.map((message, index) => ({
            id: message.id || `msg-${Date.now() + index}`,
            type: message.type || MESSAGE_TYPES.ASSISTANT,
            content: message.content || '',
            timestamp: message.timestamp || new Date(),
            ...message
        }));

        setChatMessages(prev => [...prev, ...newMessages]);
    }, []);

    // Method to clear all messages
    const clearMessages = useCallback(() => {
        setChatMessages([]);
    }, []);

    // Method to remove a specific message by ID
    const removeMessage = useCallback((messageId: string) => {
        setChatMessages(prev => prev.filter(msg => msg.id !== messageId));
    }, []);

    // Method to update a specific message
    const updateMessage = useCallback((messageId: string, updates: Partial<ChatMessage>) => {
        setChatMessages(prev =>
            prev.map(msg =>
                msg.id === messageId ? { ...msg, ...updates } : msg
            )
        );
    }, []);

    return {
        chatInput,
        chatMessages,
        isTyping,
        handleInputChange,
        handleKeyPress,
        sendMessage,
        addMessage,
        addMessages,
        clearMessages,
        removeMessage,
        updateMessage,
        setIsTyping,
        addUserMessage,
        addAssistantMessage
    };
};