// hooks/useChat.ts
import { useState, useCallback, useRef } from 'react';
import { MESSAGE_TYPES } from '../utils/constant';
import { ChatMessage, ChatHookReturn } from '../types/chat';
import { sendMessage as sendBackgroundMessage } from '@/entrypoints/background/types/messages';
import { ApiResponse, ChatResponse } from '@/entrypoints/background/types/api';
import { ChatOptions } from '@/entrypoints/background/types/api';
import { ChatRequest } from '@/entrypoints/background/types/api';
import { PageState } from '../types/page';
import { getFileIcon } from '../components/Icons';
// Dummy function to replace file context
const getAllContentAsString = async (): Promise<string> => {
    return '';
};

export interface chatConfig {
    useSearch?: boolean
    useAgent?: boolean
    pageState?: PageState | null
    getFileContent: () => Promise<string>
}

export const useChat = (config: chatConfig): ChatHookReturn => {
    const { useSearch, useAgent, pageState, getFileContent } = config;
    const [chatInput, setChatInput] = useState<string>('');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [isThinking, setIsThinking] = useState<boolean>(false);
    const [lastAgentReply, setLastAgentReply] = useState<string>(''); // Add this
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

    useEffect(() => {
        if (!useAgent) task.current = ""
        console.log("task: ", task)
    }, [useAgent])

    const sendMessage = useCallback(async (messageOrInput?: string, addToChat: boolean = true): Promise<string> => {
        // Handle both direct message sending and chat input
        let message = messageOrInput;

        // If no message is provided, use chatInput
        if (!message) {
            isSendingManually.current = true;
            const chatInputTrimmed = chatInput.trim();
            if (!chatInputTrimmed) return '';
            fileContent.current = await getFileContent();

            if (useAgent) {
                message = `<task>${chatInputTrimmed}</task>`;
            }
            else {
                message = `<user_message>${chatInputTrimmed}</user_message>`;
            }

            if (fileContent.current) {
                message += `<context>${fileContent.current}</context>`;
            }
            // Add pageState only when agent mode is enabled
            if (useAgent && pageState) {
                task.current = chatInputTrimmed
                message += `<page_state>${JSON.stringify(pageState.domSnapshot?.root.clickableElementsToString())}</page_state>`;
                message += `<instructions>
                    Complete the task by interacting with the page elements, it preserves the hierarchy structure of the web.
                    
                    Actions available:
                    - "click" - you can only click buttons, links, or interactive elements
                    - "fill" - you can only fill text into input elements like <input >
                    - "select" - you can only choose from dropdown/select elements likw <select >
                    Return only JSON with actions and reasoning, do not include any other text:
                    {
                    "actions": [
                        {"id": 0, "type": "fill", "value": "your_suggested_input"},
                        {"id": 3, "type": "select", "value": "your_suggested_option"},
                        {"id": 5, "type": "click"}
                    ],
                    "reasoning": "Brief explanation of the action sequence"
                    }
            </instructions>`;

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

        // Always show Thinking when sending a message
        setIsThinking(true);
        console.log('🚀 Sending to backend:', message.substring(0, 100) + '...');
        // Send directly to background script
        const response: ApiResponse<ChatResponse> = await sendBackgroundMessage('chat', { message: message, options: { useSearch: useSearch } });
        console.log('📡 Response from backend:', response);
        let reply = response.data?.reply || 'I do not find any response, sorry.';
        // const fileContent = await getFileContent()
        // console.log(fileContent)
        // Add the assistant response to chat messages if not in agent mode
        // Handle agent replies with callback
        if (useAgent) {
            setLastAgentReply(reply); // Store agent reply for processing
        }

        if (addToChat && !useAgent)
            addAssistantMessage(reply);
        setIsThinking(false);
        isSendingManually.current = false;
        return reply;

    }, [chatInput, addAssistantMessage, useSearch, useAgent, pageState]);

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
            // Create a message about the page state update
            let autoMessage = `<task>Page updated. Continue with task: ${task.current}</task><context>${fileContent.current}</context>`;
            autoMessage += `<page_state>${pageState.domSnapshot?.root.clickableElementsToString()}</page_state>`;
            autoMessage += `<instructions>
                    Complete the task by interacting with the page elements, it preserves the hierarchy structure of the web.
                    
                    Actions available:
                    - "click" - you can only click buttons, links, or interactive elements
                    - "fill" - you can only fill text into input elements like <input >
                    - "select" - you can only choose from dropdown/select elements likw <select >
                    Return only JSON with actions and reasoning, do not include any other text:
                    {
                    "actions": [
                        {"id": 0, "type": "fill", "value": "your_suggested_input"},
                        {"id": 3, "type": "select", "value": "your_suggested_option"},
                        {"id": 5, "type": "click"}
                    ],
                    "reasoning": "Brief explanation of the action sequence"
                    }
            </instructions>`;

            // Send the message without adding to chat history as user message
            // (the assistant response will still be added)
            sendMessage(autoMessage, true);
        }
    }, [pageState?.timestamp, useAgent, task.current, sendMessage]);

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
        isThinking,
        lastAgentReply, // Add this to return object
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