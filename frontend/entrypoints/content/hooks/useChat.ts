// hooks/useChat.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { MESSAGE_TYPES } from '../utils/constant';
import { ChatMessage, ChatHookReturn } from '../types/chat';
import { sendMessage as sendBackgroundMessage } from '@/entrypoints/background/types/messages';
import { ApiResponse, ChatResponse } from '@/entrypoints/background/types/api';
import { ChatOptions } from '@/entrypoints/background/types/api';
import { ChatRequest } from '@/entrypoints/background/types/api';
import { PageState } from '../types/page';
import { AgentResponse, PROMPT_TEMPLATES, PromptBuilder, PromptConfig } from '../utils/prompMessages';



export interface chatConfig {
    useSearch?: boolean;
    useAgent?: boolean;
    pageState?: PageState | null;
    getFileContent: () => Promise<string>;
}

export const useChat = (): ChatHookReturn => {
    const [chatInput, setChatInput] = useState<string>('');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [isThinking, setIsThinking] = useState<boolean>(false);
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

    // Clear task when agent mode is disabled

    const sendMessage = useCallback(async (message: string, options: ChatOptions): Promise<string> => {
        // Only add user message to chat if it's from chatInput (not auto-init)
        if (chatInput.trim()) {
            const userMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: MESSAGE_TYPES.USER,
                content: chatInput.trim(),
                timestamp: new Date()
            };
            setChatMessages(prev => [...prev, userMessage]);
        }

        console.log('🚀 Sending to backend:', message.substring(0, 100) + '...');
        const response: ApiResponse<ChatResponse> = await sendBackgroundMessage('chat', {
            message: message,
            options: options
        });

        console.log('📡 Response from backend:', response);
        const reply = response.data?.reply || PROMPT_TEMPLATES.ERROR_GENERIC;
        return reply;
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
    }, [sendMessage, chatInput, addAssistantMessage]);

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
        isThinking,
        handleInputChange,
        handleKeyPress,
        sendMessage,
        addMessage,
        addMessages,
        clearMessages,
        removeMessage,
        updateMessage,
        setIsThinking,
        addUserMessage,
        addAssistantMessage
    };
};