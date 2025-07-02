import { MESSAGE_TYPES } from "../utils/constant";
import { AgentResponse } from "../utils/prompMessages";

export interface ChatMessage {
    id: string;
    type: keyof typeof MESSAGE_TYPES;
    content: string;
    timestamp: Date;
}

export interface ChatHookReturn {
    chatInput: string;
    chatMessages: ChatMessage[];
    isThinking: boolean;
    handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    sendMessage: (messageOrInput?: string, addToChat?: boolean) => Promise<string>;
    lastAgentResponse: AgentResponse | null;
    addMessage: (message: Partial<ChatMessage>) => void;
    addMessages: (messages: Partial<ChatMessage>[]) => void;
    clearMessages: () => void;
    removeMessage: (messageId: string) => void;
    updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
    setIsThinking: (typing: boolean) => void;
    addUserMessage: (content: string) => void;
    addAssistantMessage: (content: string) => void;
}

