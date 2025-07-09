import { AgentAction } from "@/entrypoints/content/hooks/useAgent";

export interface AppState {
    // Chat state
    chatMessages: any[];
    isThinking: boolean;

    // Mode states
    useSearch: boolean;
    useAgent: boolean;

    // File state
    fileContentAsString: string;

    // Page state
    pageStateAsString: string;

    // Agent state
    task: string;
    actionsExecuted: AgentAction[];

    // UI state
    isMinimized: boolean;

    // Timestamps for state management
    lastUpdated: number;
    sessionId: string;
}


export const defaultAppState: AppState = {
    // Chat state
    chatMessages: [],
    isThinking: false,

    // Mode states
    useSearch: false,
    useAgent: false,

    fileContentAsString: "",

    // Page state
    pageStateAsString: "default",

    // Agent state
    task: "",
    actionsExecuted: [],

    // UI state
    isMinimized: true,

    // Timestamps for state management
    lastUpdated: Date.now(),
    sessionId: crypto.randomUUID(),
};