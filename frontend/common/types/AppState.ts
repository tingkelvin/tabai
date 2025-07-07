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

    // UI state
    isMinimized: true,

    // Timestamps for state management
    lastUpdated: Date.now(),
    sessionId: crypto.randomUUID(),
};