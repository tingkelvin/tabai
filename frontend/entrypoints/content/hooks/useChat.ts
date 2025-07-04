// hooks/useChat.ts
import { useState, useCallback } from 'react';
import { MESSAGE_TYPES } from '../utils/constant';
import { ChatMessage, ChatHookReturn } from '../types/chat';
import { sendMessage as sendBackgroundMessage } from '@/entrypoints/background/types/messages';
import { ApiResponse, ChatResponse } from '@/entrypoints/background/types/api';
import { ChatOptions } from '@/entrypoints/background/types/api';
import { PROMPT_TEMPLATES } from '../utils/prompMessages';

interface UseChatProps {
    chatMessages: ChatMessage[];
    isThinking: boolean;
    onMessagesChange: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
    onThinkingChange: (thinking: boolean) => void;
}

export const useChat = ({
    chatMessages,
    isThinking,
    onMessagesChange,
    onThinkingChange
}: UseChatProps): ChatHookReturn => {
    const [chatInput, setChatInput] = useState<string>('');

    // In component
    useEffect(() => {
        const loadMessages = async () => {
            const messages = await sendBackgroundMessage('getChatMessages');
            onMessagesChange(messages);
        };
        loadMessages();
    }, []);

    const addUserMessage = useCallback(async (content: string) => {
        const newMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: MESSAGE_TYPES.USER,
            content: content,
            timestamp: new Date()
        };
        await sendBackgroundMessage('addChatMessage', newMessage);
        const messages = await sendBackgroundMessage('getChatMessages');
        onMessagesChange(messages);
    }, [onMessagesChange]);

    const addAssistantMessage = useCallback(async (content: string) => {
        const newMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: MESSAGE_TYPES.ASSISTANT,
            content: content.trim(),
            timestamp: new Date()
        };
        await sendBackgroundMessage('addChatMessage', newMessage);
        const messages = await sendBackgroundMessage('getChatMessages');
        onMessagesChange(messages);
    }, [onMessagesChange]);

    const sendMessage = useCallback(async (message: string, options: ChatOptions): Promise<string> => {
        console.log('🚀 Sending to backend:', message.substring(0, 100) + '...');
        const response: ApiResponse<ChatResponse> = await sendBackgroundMessage('chat', {
            message: message,
            options: options
        });

        console.log('📡 Response from backend:', response);
        return response.data?.reply || PROMPT_TEMPLATES.ERROR_GENERIC;
    }, [chatInput, addUserMessage]);

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
            setChatInput('');
            setTimeout(() => {
                const target = e.target as HTMLTextAreaElement;
                if (target) {
                    target.style.height = '44px';
                    target.style.overflowY = 'hidden';
                }
            }, 0);
        }
    }, []);

    const setIsThinking = useCallback((thinking: boolean) => {
        onThinkingChange(thinking);
    }, [onThinkingChange]);

    return {
        chatInput,
        chatMessages,
        isThinking,
        handleInputChange,
        handleKeyPress,
        sendMessage,
        addUserMessage,
        addAssistantMessage,
        setIsThinking,
        // Add other methods as needed
        addMessage: () => { },
        addMessages: () => { },
        clearMessages: () => { },
        removeMessage: () => { },
        updateMessage: () => { },
    };
};