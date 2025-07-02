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

export const useChat = (config: chatConfig): ChatHookReturn => {
    const { useSearch, useAgent, pageState, getFileContent } = config;
    const [chatInput, setChatInput] = useState<string>('');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [isThinking, setIsThinking] = useState<boolean>(false);
    const [lastAgentResponse, setLastAgentResponse] = useState<AgentResponse | null>(null);
    const isSendingManually = useRef(false);
    const fileContent = useRef("");
    const task = useRef("");
    const lastPageStateTimestamp = useRef<number | null>(null);
    const isInitialMount = useRef(true);

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
    useEffect(() => {
        if (!useAgent) {
            task.current = "";
        }
        console.log("task: ", task.current);
    }, [useAgent]);

    const sendMessage = useCallback(async (messageOrInput?: string, addToChat: boolean = true): Promise<string> => {
        let message = messageOrInput;

        // If no message is provided, use chatInput
        if (!message) {
            isSendingManually.current = true;
            const chatInputTrimmed = chatInput.trim();
            if (!chatInputTrimmed) return '';

            // Validate task if in agent mode
            if (useAgent) {
                const validation = PromptBuilder.validateTask(chatInputTrimmed);
                if (!validation.valid) {
                    addAssistantMessage(validation.error || PROMPT_TEMPLATES.INVALID_TASK);
                    return '';
                }
                task.current = chatInputTrimmed;
            }

            // Get file content
            fileContent.current = await getFileContent();

            // Build the prompt message using PromptBuilder
            const promptConfig: PromptConfig = {
                useAgent,
                useSearch,
                task: useAgent ? chatInputTrimmed : undefined,
                userMessage: !useAgent ? chatInputTrimmed : undefined,
                fileContent: fileContent.current,
                pageState: useAgent ? pageState : null
            };

            message = PromptBuilder.buildMessage(promptConfig);

            // Debug logging
            console.log('🔧 Debug Info:', PromptBuilder.createDebugMessage(promptConfig));
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

        // Always show Thinking when sending a message
        setIsThinking(true);
        console.log('🚀 Sending to backend:', message.substring(0, 100) + '...');

        try {
            // Send directly to background script
            const response: ApiResponse<ChatResponse> = await sendBackgroundMessage('chat', {
                message: message,
                options: { useSearch: useSearch }
            });

            console.log('📡 Response from backend:', response);
            let reply = response.data?.reply || PROMPT_TEMPLATES.ERROR_GENERIC;

            // Handle agent replies
            if (useAgent) {
                // Try to parse agent response
                const agentResponse = PromptBuilder.parseAgentResponse(reply);
                if (!agentResponse) {
                    // If parsing fails, add error message and ask for retry
                    addAssistantMessage(PROMPT_TEMPLATES.PARSING_ERROR);
                    reply = PROMPT_TEMPLATES.PARSING_ERROR;
                } else {
                    // Store parsed agent reply for processing
                    setLastAgentResponse(agentResponse);
                    console.log('🤖 Parsed agent response:', agentResponse);
                }
            }

            // Add the assistant response to chat messages if not in agent mode
            if (addToChat && !useAgent) {
                addAssistantMessage(reply);
            }

            setIsThinking(false);
            isSendingManually.current = false;
            return reply;

        } catch (error) {
            console.error('❌ Error sending message:', error);
            setIsThinking(false);
            const errorMessage = PROMPT_TEMPLATES.ERROR_GENERIC;
            if (addToChat) {
                addAssistantMessage(errorMessage);
            }
            isSendingManually.current = false;
            return errorMessage;
        }

    }, [chatInput, addAssistantMessage, useSearch, useAgent, pageState, getFileContent]);

    // Auto-send message when pageState updates in agent mode
    useEffect(() => {
        // Skip on initial mount
        if (isInitialMount.current) {
            isInitialMount.current = false;
            if (pageState?.timestamp) {
                lastPageStateTimestamp.current = pageState.timestamp;
            }
            return;
        }

        // Only proceed if agent mode is enabled and we have a current task
        if (!useAgent || !task.current || !pageState?.timestamp || isSendingManually.current) {
            return;
        }

        // Check if this is a new page state update
        if (lastPageStateTimestamp.current !== pageState.timestamp) {
            console.log('🤖 Agent mode: PageState updated, auto-sending message');

            // Update the timestamp tracking
            lastPageStateTimestamp.current = pageState.timestamp;

            // Build continuation message using PromptBuilder
            const autoMessage = PromptBuilder.buildContinuationMessage(
                task.current,
                fileContent.current,
                pageState
            );

            // Send the message without adding to chat history as user message
            sendMessage(autoMessage, true);
        }
    }, [pageState?.timestamp, useAgent, sendMessage]);

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

            // Validate input before sending
            const inputTrimmed = chatInput.trim();
            if (!inputTrimmed) return;

            // Additional validation for agent mode
            if (useAgent) {
                const validation = PromptBuilder.validateTask(inputTrimmed);
                if (!validation.valid) {
                    addAssistantMessage(validation.error || PROMPT_TEMPLATES.INVALID_TASK);
                    return;
                }
            }

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
    }, [sendMessage, chatInput, useAgent, addAssistantMessage]);

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
        task.current = ""; // Also clear the current task
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
        lastAgentResponse,
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